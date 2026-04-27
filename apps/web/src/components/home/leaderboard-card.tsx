"use client";

/**
 * LeaderboardCard — Phase A5.
 *
 * Public ranking is the second-cheapest engagement loop after streaks.
 * Even just seeing "you're #47 this week" lifts return rate.
 *
 * Renders top-5 + the current user's rank from /points/leaderboard.
 * Period switcher: weekly (default) → monthly → all-time.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Trophy } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Period = "weekly" | "monthly" | "alltime";

interface Entry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  pointsEarned: number;
}

interface LeaderboardResponse {
  period: Period;
  top: Entry[];
  me: { rank: number; pointsEarned: number } | null;
}

const periodLabels: Record<Period, string> = {
  weekly: "This week",
  monthly: "This month",
  alltime: "All time",
};

export function LeaderboardCard() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient<LeaderboardResponse>(`/points/leaderboard?period=${period}&limit=5`)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Couldn't load leaderboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const top = useMemo(() => data?.top ?? [], [data]);

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
            {/* 401 just means the user isn't logged in yet — soft nudge */}
            <Link href="/login" className="font-semibold text-[#74ddc7] hover:underline">
              Sign in
            </Link>{" "}
            to see the leaderboard.
          </li>
        )}
        {!loading &&
          !error &&
          top.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-muted-foreground">
              Nobody's earned yet this {period === "weekly" ? "week" : period === "monthly" ? "month" : "period"}. Be the first.
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

      {data?.me && (
        <footer className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold text-muted-foreground">
            You're #{data.me.rank.toLocaleString()}
          </span>
          <span className="font-bold tabular-nums text-foreground">
            {data.me.pointsEarned.toLocaleString()} WP
          </span>
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
