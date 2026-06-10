"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArcadeAvatar } from "./arcade-avatar";
import type { ArcadeLeaderEntry, Loadable } from "./arcade-data";

type Board = "week" | "alltime";

const MAX_ROWS = 25;

/**
 * Arcade leaderboard — "This Week" (points_leaderboard_weekly) and "All Time"
 * (points_leaderboard) tabs with a top-3 podium and the signed-in user's row
 * highlighted. Signed-out visitors still see the boards plus a join CTA.
 */
export function ArcadeLeaderboard({
  weekly,
  allTime,
  currentUserId,
  signedIn,
}: {
  weekly: Loadable<ArcadeLeaderEntry[]>;
  allTime: Loadable<ArcadeLeaderEntry[]>;
  currentUserId: string | null;
  signedIn: boolean;
}) {
  const [board, setBoard] = useState<Board>("week");
  const active = board === "week" ? weekly : allTime;

  return (
    <section aria-label="Leaderboard" className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#f59e0b]" />
          <h2 className="text-lg font-bold text-foreground">Leaderboard</h2>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted p-0.5 text-xs">
          {(
            [
              { key: "week", label: "This Week" },
              { key: "alltime", label: "All Time" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setBoard(t.key)}
              className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
                board === t.key
                  ? "bg-[#7401df] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 py-5">
        {active.status === "loading" && <BoardSkeleton />}

        {active.status === "error" && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Couldn&apos;t load the leaderboard. Please try again later.
          </p>
        )}

        {active.status === "ready" && active.data.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {board === "week"
              ? "Nobody's scored this week yet — the crown is up for grabs."
              : "Nobody's earned yet. Be the first on the board."}
          </p>
        )}

        {active.status === "ready" && active.data.length > 0 && (
          <>
            <Podium
              entries={active.data.slice(0, 3)}
              currentUserId={currentUserId}
            />
            <ol className="mt-4 divide-y divide-border rounded-xl border border-border">
              {active.data.slice(3, MAX_ROWS).map((e) => {
                const isMe = currentUserId !== null && e.userId === currentUserId;
                return (
                  <li
                    key={e.userId}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      isMe
                        ? "bg-[#74ddc7]/10"
                        : "hover:bg-foreground/[0.02]"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-center text-sm font-black tabular-nums text-muted-foreground">
                      {e.rank}
                    </span>
                    <ArcadeAvatar name={e.displayName} url={e.avatarUrl} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {e.displayName}
                      {isMe && (
                        <Badge className="ml-2 border-[#74ddc7]/20 bg-[#74ddc7]/10 text-[10px] text-[#74ddc7]">
                          You
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                      {e.points.toLocaleString()}{" "}
                      <span className="font-medium text-muted-foreground">WP</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {!signedIn && (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#7401df]/40 bg-[#7401df]/5 px-5 py-4 text-center sm:flex-row sm:text-left">
            <p className="flex-1 text-sm text-muted-foreground">
              Want your name up here? Join free — every minute of listening
              earns WP toward the board.
            </p>
            <Button
              size="sm"
              className="shrink-0 rounded-full bg-[#7401df] font-bold text-white hover:bg-[#7401df]/90"
              asChild
            >
              <Link href="/register">Join the arcade</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────

const PODIUM_STYLES: Record<
  number,
  { pedestal: string; ring: string; medal: string }
> = {
  1: {
    pedestal: "h-20 bg-gradient-to-t from-[#f59e0b]/30 to-[#f59e0b]/10 border-[#f59e0b]/40",
    ring: "ring-2 ring-[#f59e0b]",
    medal: "🥇",
  },
  2: {
    pedestal: "h-14 bg-gradient-to-t from-zinc-400/25 to-zinc-400/5 border-zinc-400/40",
    ring: "ring-2 ring-zinc-400",
    medal: "🥈",
  },
  3: {
    pedestal: "h-10 bg-gradient-to-t from-amber-700/30 to-amber-700/5 border-amber-700/40",
    ring: "ring-2 ring-amber-700",
    medal: "🥉",
  },
};

function Podium({
  entries,
  currentUserId,
}: {
  entries: ArcadeLeaderEntry[];
  currentUserId: string | null;
}) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  // Display order: 2nd — 1st — 3rd (classic podium).
  const slots = [second, first, third];

  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {slots.map((entry, i) => {
        if (!entry) return <div key={`empty_${i}`} />;
        const style = PODIUM_STYLES[entry.rank] ?? PODIUM_STYLES[3];
        const isMe = currentUserId !== null && entry.userId === currentUserId;
        const isChamp = entry.rank === 1;
        return (
          <div key={entry.userId} className="flex flex-col items-center gap-2">
            <div className="relative">
              {isChamp && (
                <Crown
                  aria-hidden
                  className="absolute -top-5 left-1/2 h-5 w-5 -translate-x-1/2 text-[#f59e0b]"
                />
              )}
              <div className={`rounded-full ${style.ring}`}>
                <ArcadeAvatar
                  name={entry.displayName}
                  url={entry.avatarUrl}
                  size={isChamp ? "lg" : "sm"}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 text-base" aria-hidden>
                {style.medal}
              </span>
            </div>
            <div className="min-w-0 text-center">
              <p className="max-w-[8rem] truncate text-xs font-bold text-foreground sm:max-w-[10rem] sm:text-sm">
                {entry.displayName}
                {isMe && (
                  <span className="ml-1 text-[10px] font-bold text-[#74ddc7]">
                    (You)
                  </span>
                )}
              </p>
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                {entry.points.toLocaleString()} WP
              </p>
            </div>
            <div
              className={`w-full rounded-t-lg border border-b-0 ${style.pedestal}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div>
      {/* Podium skeleton */}
      <div className="grid grid-cols-3 items-end gap-3">
        {[14, 20, 10].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div
              className="w-full animate-pulse rounded-t-lg bg-muted"
              style={{ height: `${h * 4}px` }}
            />
          </div>
        ))}
      </div>
      {/* Row skeletons */}
      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5">
            <div className="h-4 w-6 animate-pulse rounded bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
