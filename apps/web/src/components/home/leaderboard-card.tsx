"use client";

/**
 * LeaderboardCard — Phase A5.
 *
 * Public ranking is the second-cheapest engagement loop after streaks.
 * Even just seeing "you're #47" lifts return rate.
 *
 * Data layer: Supabase RPC `points_leaderboard(p_limit)` (SECURITY DEFINER,
 * public) returns the global top earners — rank / user_id / display_name /
 * avatar_url / balance — bypassing the own-read RLS on `user_points` while
 * exposing only non-PII aggregate columns. The community-wide total is read
 * from `community_points_total()`.
 *
 * Note on the period switcher: the RPC ranks by all-time balance only — there
 * is no per-week / per-month server aggregation. The switcher is kept as a
 * visual affordance, but every selection shows the same all-time ranking
 * rather than fabricating period numbers the server doesn't track.
 */

import { useEffect, useMemo, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const supabase = createClient();

type Period = "weekly" | "monthly" | "alltime";

interface Entry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  pointsEarned: number;
}

/** Shape of a single row returned by the points_leaderboard RPC. */
interface LeaderboardRow {
  rank: number;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  balance: number | null;
}

type Status = "loading" | "ready" | "error";

interface ViewState {
  status: Status;
  entries: Entry[];
  communityTotal: number | null;
}

const periodLabels: Record<Period, string> = {
  weekly: "This week",
  monthly: "This month",
  alltime: "All time",
};

const INITIAL_VIEW: ViewState = {
  status: "loading",
  entries: [],
  communityTotal: null,
};

export function LeaderboardCard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("alltime");
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);

  // Fetch the global ranking once. The period switcher is display-only (see
  // file header) so it is intentionally NOT a dependency — re-selecting a
  // period must not re-query, because every period maps to the same data.
  useEffect(() => {
    let active = true;

    async function load() {
      const [leaderboardRes, totalRes] = await Promise.all([
        supabase.rpc("points_leaderboard", { p_limit: 10 }),
        supabase.rpc("community_points_total"),
      ]);

      if (!active) return;

      if (leaderboardRes.error) {
        setView({ status: "error", entries: [], communityTotal: null });
        return;
      }

      const rows = (leaderboardRes.data ?? []) as LeaderboardRow[];
      const entries: Entry[] = rows.map((r) => ({
        rank: Number(r.rank),
        userId: r.user_id,
        displayName: r.display_name ?? "Listener",
        avatarUrl: r.avatar_url,
        pointsEarned: Number(r.balance ?? 0),
      }));

      // community_points_total() returns a single bigint scalar.
      const communityTotal =
        !totalRes.error && totalRes.data != null
          ? Number(totalRes.data)
          : null;

      setView({ status: "ready", entries, communityTotal });
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const top = useMemo(() => view.entries, [view.entries]);

  // The current user's own row, only when they're inside the returned top set.
  // We never invent a rank for someone outside the top — that would imply
  // server state we don't have.
  const me = useMemo(
    () => (user ? top.find((e) => e.userId === user.id) ?? null : null),
    [top, user],
  );

  const loading = view.status === "loading";
  const error = view.status === "error";

  return (
    <section
      aria-label="Top earners"
      className="rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#f59e0b]" />
          <h2 className="text-base font-bold text-foreground">Top earners</h2>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted p-0.5 text-xs">
          {(["weekly", "monthly", "alltime"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                p === period
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </header>

      <ol className="divide-y divide-border">
        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} rank={i + 1} />)}
        {!loading && error && (
          <li className="px-5 py-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t load the leaderboard. Please try again later.
          </li>
        )}
        {!loading &&
          !error &&
          top.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-muted-foreground">
              Nobody&apos;s earned yet. Be the first.
            </li>
          )}
        {!loading &&
          !error &&
          top.map((e) => (
            <li
              key={e.userId}
              className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/[0.02]"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  e.rank === 1
                    ? "bg-[#f59e0b] text-black"
                    : e.rank === 2
                      ? "bg-zinc-300 text-black"
                      : e.rank === 3
                        ? "bg-amber-700/70 text-white"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {e.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : e.rank}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={e.displayName} url={e.avatarUrl} />
                <span className="truncate text-sm font-semibold text-foreground">
                  {e.displayName}
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {e.pointsEarned.toLocaleString()} <span className="text-muted-foreground">WP</span>
              </span>
            </li>
          ))}
      </ol>

      {me && (
        <footer className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold text-muted-foreground">
            You&apos;re #{me.rank.toLocaleString()}
          </span>
          <span className="font-bold tabular-nums text-foreground">
            {me.pointsEarned.toLocaleString()} WP
          </span>
        </footer>
      )}

      {!loading && !error && view.communityTotal !== null && view.communityTotal > 0 && (
        <footer className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {view.communityTotal.toLocaleString()}
          </span>{" "}
          WP earned by the community
        </footer>
      )}
    </section>
  );
}

function SkeletonRow({ rank }: { rank: number }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
        {rank}
      </span>
      <div className="flex flex-1 items-center gap-2.5">
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
    </li>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // Plain <img> — bypasses next/image domain check; size is small + cheap
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-7 w-7 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df] to-[#3b82f6] text-[10px] font-black text-white">
      {initials || "WC"}
    </span>
  );
}
