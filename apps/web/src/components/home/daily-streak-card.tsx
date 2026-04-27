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
 * Streak source: server (/points/streak) when authed, falls back to a
 * localStorage projection so the card is never empty.
 */

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { apiClient } from "@/lib/api-client";

interface ServerStreak {
  streakDays: number;
  lastListenDay: string | null;
  streakStarted: string | null;
}

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
    if (raw) return JSON.parse(raw);
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

  const [streak, setStreak] = useState<{ days: number; lastDay: string | null }>(() => {
    const local = loadLocalStreak();
    return { days: local.count, lastDay: local.lastDay };
  });

  // When user starts listening today, optimistically advance the local streak.
  useEffect(() => {
    if (!isPlaying) return;
    const next = markListenedToday();
    setStreak({ days: next.count, lastDay: next.lastDay });
  }, [isPlaying]);

  // Best-effort server reconciliation.
  useEffect(() => {
    let cancelled = false;
    apiClient<ServerStreak>("/points/streak")
      .then((s) => {
        if (cancelled) return;
        // Prefer the server number when it's higher; preserve optimistic local
        // if the server hasn't caught up yet (eventual consistency).
        setStreak((prev) => ({
          days: Math.max(prev.days, s.streakDays ?? 0),
          lastDay: s.lastListenDay ?? prev.lastDay,
        }));
      })
      .catch(() => {
        // Unauthed or offline — local value already shown.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
