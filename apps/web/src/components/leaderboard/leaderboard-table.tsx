"use client";

import { useState, useEffect } from "react";
import { LEADERBOARD_DATA, weekStartDate, type LeaderboardEntry } from "@/data/leaderboard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Clock, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function rankDisplay(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47";
  if (rank === 2) return "\uD83E\uDD48";
  if (rank === 3) return "\uD83E\uDD49";
  return `#${rank}`;
}

function RankChange({ change }: { change: number }) {
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[#22c55e]">
        <TrendingUp className="h-3 w-3" />+{change}
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[#ef4444]">
        <TrendingDown className="h-3 w-3" />{change}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/50">
      <Minus className="h-3 w-3" />
    </span>
  );
}

// ─── Mobile Card ────────────────────────────────────────────────────────

function LeaderboardMobileCard({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
        isCurrentUser
          ? "border-[#74ddc7]/40 bg-[#74ddc7]/5"
          : "border-border bg-card"
      }`}
    >
      {/* Rank */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg font-bold">
        {rankDisplay(entry.rank)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {entry.displayName}
          </p>
          {isCurrentUser && (
            <Badge className="bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20 text-[10px]">
              You
            </Badge>
          )}
          <RankChange change={entry.rankChange} />
        </div>
        <p className="text-xs text-muted-foreground/70">{entry.city}, NC</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            {entry.pointsEarned.toLocaleString()} pts
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {entry.listeningHours}h
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground tabular-nums">
          {entry.totalPoints.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground/50">total pts</p>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export function LeaderboardTable() {
  const { user } = useAuth();
  const [entries] = useState<LeaderboardEntry[]>(LEADERBOARD_DATA);

  const formattedWeek = new Date(weekStartDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground/70">
          Week of {formattedWeek}
        </p>
        <Badge variant="outline" className="text-[10px] border-[#74ddc7]/20 text-[#74ddc7]">
          Updated Daily
        </Badge>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead>Listener</TableHead>
              <TableHead className="text-center">City</TableHead>
              <TableHead className="text-right">This Week</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-16 text-center">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isCurrentUser = !!(user?.email && entry.email === user.email);
              return (
                <TableRow
                  key={entry.rank}
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {entry.displayName}
                      </span>
                      {isCurrentUser && (
                        <Badge className="bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20 text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {entry.city}, NC
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <span className="flex items-center justify-end gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {entry.pointsEarned.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {entry.listeningHours}h
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {entry.totalPoints.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <RankChange change={entry.rankChange} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => {
          const isCurrentUser = !!(user?.email && entry.email === user.email);
          return (
            <LeaderboardMobileCard
              key={entry.rank}
              entry={entry}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>
    </div>
  );
}
