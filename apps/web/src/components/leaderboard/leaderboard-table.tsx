"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star } from "lucide-react";
import { ArcadeAvatar } from "@/components/rewards/arcade-avatar";
import type {
  ArcadeLeaderEntry,
  Loadable,
} from "@/components/rewards/arcade-data";

/**
 * Live listener leaderboard for /leaderboard.
 *
 * Presentational only: the page fetches points_leaderboard_weekly /
 * points_leaderboard (the same RPCs the Rewards Arcade uses) and passes the
 * Loadable boards down. The RPCs expose rank / display name / avatar /
 * points, so that is all we show — no city, listening hours, or rank-trend
 * columns the server doesn't track.
 */

type Board = "week" | "alltime";

const BOARD_META: Record<Board, { label: string; caption: string; empty: string }> = {
  week: {
    label: "This Week",
    caption: "Points earned since Monday 12:00 AM ET",
    empty: "Nobody's scored this week yet — the crown is up for grabs.",
  },
  alltime: {
    label: "All Time",
    caption: "All-time points balance",
    empty: "Nobody's earned yet. Be the first on the board.",
  },
};

function rankDisplay(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function YouBadge() {
  return (
    <Badge className="bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20 text-[10px]">
      You
    </Badge>
  );
}

// ─── Mobile Card ────────────────────────────────────────────────────────

function LeaderboardMobileCard({
  entry,
  isCurrentUser,
}: {
  entry: ArcadeLeaderEntry;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
        isCurrentUser
          ? "border-[#74ddc7]/40 bg-[#74ddc7]/5"
          : "border-border bg-card"
      }`}
    >
      {/* Rank */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg font-bold">
        {rankDisplay(entry.rank)}
      </div>

      <ArcadeAvatar name={entry.displayName} url={entry.avatarUrl} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {entry.displayName}
          </p>
          {isCurrentUser && <YouBadge />}
        </div>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground tabular-nums">
          {entry.points.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground/50">pts</p>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export function LeaderboardTable({
  weekly,
  allTime,
  currentUserId,
}: {
  weekly: Loadable<ArcadeLeaderEntry[]>;
  allTime: Loadable<ArcadeLeaderEntry[]>;
  currentUserId: string | null;
}) {
  const [board, setBoard] = useState<Board>("week");
  const active = board === "week" ? weekly : allTime;
  const meta = BOARD_META[board];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground/70">{meta.caption}</p>
        <div className="flex items-center gap-1 rounded-full bg-muted p-0.5 text-xs">
          {(["week", "alltime"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setBoard(key)}
              className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
                board === key
                  ? "bg-[#7401df] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {BOARD_META[key].label}
            </button>
          ))}
        </div>
      </div>

      {active.status === "loading" && <BoardSkeleton />}

      {active.status === "error" && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the leaderboard. Please try again later.
        </div>
      )}

      {active.status === "ready" && active.data.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {meta.empty}
        </div>
      )}

      {active.status === "ready" && active.data.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Listener</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.data.map((entry) => {
                  const isCurrentUser =
                    currentUserId !== null && entry.userId === currentUserId;
                  return (
                    <TableRow
                      key={entry.userId}
                      className={`border-border ${
                        isCurrentUser
                          ? "bg-[#74ddc7]/5 hover:bg-[#74ddc7]/10"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <TableCell className="text-center text-lg font-bold">
                        {rankDisplay(entry.rank)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <ArcadeAvatar
                            name={entry.displayName}
                            url={entry.avatarUrl}
                          />
                          <span className="font-semibold text-foreground">
                            {entry.displayName}
                          </span>
                          {isCurrentUser && <YouBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        <span className="flex items-center justify-end gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {entry.points.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {active.data.map((entry) => (
              <LeaderboardMobileCard
                key={entry.userId}
                entry={entry}
                isCurrentUser={
                  currentUserId !== null && entry.userId === currentUserId
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-5 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
