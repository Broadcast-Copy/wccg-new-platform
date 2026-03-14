"use client";

import Link from "next/link";
import { LEADERBOARD_DATA } from "@/data/leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";

function rankMedal(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47";
  if (rank === 2) return "\uD83E\uDD48";
  if (rank === 3) return "\uD83E\uDD49";
  return `#${rank}`;
}

function TrendIcon({ change }: { change: number }) {
  if (change > 0)
    return <TrendingUp className="h-3 w-3 text-[#22c55e]" />;
  if (change < 0)
    return <TrendingDown className="h-3 w-3 text-[#ef4444]" />;
  return <Minus className="h-3 w-3 text-muted-foreground/40" />;
}

export function LeaderboardCard() {
  const top3 = LEADERBOARD_DATA.slice(0, 3);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md hover:border-[#7401df]/30">
      {/* Header gradient */}
      <div className="h-1.5 bg-gradient-to-r from-[#f59e0b] via-[#74ddc7] to-[#7401df]" />

      <CardContent className="p-5 space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#f59e0b]" />
            <h3 className="text-sm font-bold text-foreground">Weekly Leaderboard</h3>
          </div>
          <Badge variant="outline" className="text-[10px] border-[#74ddc7]/20 text-[#74ddc7]">
            Live
          </Badge>
        </div>

        {/* Top 3 */}
        <div className="space-y-2.5">
          {top3.map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-border/50 px-3 py-2.5"
            >
              <span className="text-lg leading-none">{rankMedal(entry.rank)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {entry.displayName}
                </p>
                <p className="text-[11px] text-muted-foreground/70">{entry.city}, NC</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-xs font-medium tabular-nums">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {entry.pointsEarned}
                </span>
                <TrendIcon change={entry.rankChange} />
              </div>
            </div>
          ))}
        </div>

        {/* Link */}
        <Link
          href="/leaderboard"
          className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-white/5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          View Full Leaderboard
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
