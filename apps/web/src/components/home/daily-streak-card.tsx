"use client";

/**
 * DailyStreakCard — Phase A4.
 *
 * The cheapest engagement loop in software. Three states:
 *
 *   - Not yet listened today  →  "Tap play to claim today's +25 WP"
 *   - Listened today          →  "✓ Locked in. 12-day streak. Back tomorrow."
 *   - Streak just hit a multiple of 7 → "Week milestone — keep it going."
 *
 * ── Streak source / known gap ────────────────────────────────────────────
 * There is NO consecutive-day streak stored on the server. `user_points` only
 * carries single DATE markers (`last_share_date`, `last_bounty_date`) and
 * `total_listening_ms` — nothing that counts an unbroken run of days, and
 * there is no streak RPC. So the streak *number* is a best-effort LOCAL
 * projection (localStorage), exactly as before. What we DO read from the
 * server, when signed in, is `last_bounty_date` — the daily bounty is awarded
 * on the first listen of the day, so that date is a truthful "claimed today"
 * signal. We never display a streak count sourced from the server, because
 * the server doesn't track one. (See report: a streak field/RPC is missing.)
 */

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const supabase = createClient();

const LS_KEY = "wccg_daily_streak";

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

interface LocalStreak {
  lastDay: string | null;
  count: number;
}

function loadLocalStreak(): LocalStreak {
  if (typeof window === "undefined") return { lastDay: null, count: 0 };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LocalStreak;
  } catch {
    // ignore
  }
  return { lastDay: null, count: 0 };
}

function saveLocalStreak(s: LocalStreak) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/**
 * Mark today as listened locally, advancing the streak when consecutive.
 */
function markListenedToday(): LocalStreak {
  const today = todayET();
  const cur = loadLocalStreak();
  if (cur.lastDay === today) return cur;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayET = yesterday.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  const next: LocalStreak = {
    lastDay: today,
    count: cur.lastDay === yesterdayET ? cur.count + 1 : 1,
  };
  saveLocalStreak(next);
  return next;
}

export function DailyStreakCard() {
  const { isPlaying } = useAudioPlayer();
  const { toggle } = useStreamPlayer();
  const { user } = useAuth();

  const [streak, setStreak] = useState<{ days: number; lastDay: string | null }>(() => {
    const local = loadLocalStreak();
    return { days: local.count, lastDay: local.lastDay };
  });

  // When the user is listening, optimistically advance the LOCAL streak.
  // The mutation + setState run after an awaited microtask boundary (never
  // synchronously in the effect body) and are guarded by `active`.
  useEffect(() => {
    if (!isPlaying) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const next = markListenedToday();
      setStreak({ days: next.count, lastDay: next.lastDay });
    });
    return () => {
      active = false;
    };
  }, [isPlaying]);

  // Best-effort server reconciliation of the "claimed today" signal.
  //
  // No streak count exists server-side, so we only read `last_bounty_date`
  // (set on the first listen of the day) to confirm today's claim across
  // devices. The streak number stays the local projection.
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function syncClaimed() {
      const { data, error } = await supabase
        .from("user_points")
        .select("last_bounty_date, last_share_date")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!active || error || !data) return;

      const today = todayET();
      // last_bounty_date / last_share_date are DATE columns (YYYY-MM-DD).
      const claimedDay = data.last_bounty_date ?? data.last_share_date ?? null;
      if (claimedDay === today) {
        setStreak((prev) =>
          prev.lastDay === today
            ? prev
            : { days: Math.max(prev.days, 1), lastDay: today },
        );
      }
    }

    void syncClaimed();
    return () => {
      active = false;
    };
  }, [user]);

  const today = todayET();
  const claimedToday = streak.lastDay === today;

  return (
    <section
      aria-label="Daily listening streak"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#3b1d0a] via-[#2b1108] to-[#1a0a05] p-5 text-white shadow-lg"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#f59e0b]/30 blur-3xl"
      />

      <div className="relative z-10 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/20 ring-1 ring-[#f59e0b]/40">
          <Flame className={`h-7 w-7 text-[#f59e0b] ${claimedToday ? "" : "opacity-50"}`} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
            Daily Streak
          </p>
          <p className="mt-0.5 text-xl font-black leading-tight">
            {streak.days > 0 ? `${streak.days}-day streak` : "Start your streak"}
          </p>
          <p className="mt-0.5 text-sm text-white/70">
            {claimedToday
              ? "Locked in for today. Back tomorrow for +25 WP."
              : "Tap play and listen for 60 seconds to claim today's +25 WP."}
          </p>
        </div>

        {!claimedToday && (
          <button
            type="button"
            onClick={toggle}
            className="rounded-full bg-white px-4 py-2 text-sm font-black text-black shadow-lg transition-colors hover:bg-white/90"
          >
            {isPlaying ? "Listening…" : "Claim"}
          </button>
        )}
      </div>

      {/* 14-day mini calendar — purely visual, will be DB-backed in Phase B */}
      <div className="relative z-10 mt-4 flex items-center gap-1">
        {Array.from({ length: 14 }).map((_, i) => {
          const filled = i >= 14 - streak.days;
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                filled ? "bg-[#f59e0b]" : "bg-white/10"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}
