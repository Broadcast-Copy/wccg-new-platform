"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LISTENER_OF_THE_WEEK } from "@/data/listener-of-the-week";
import { Star, Clock, ArrowRight, Quote } from "lucide-react";

export function ListenerOfTheWeek() {
  const listener = LISTENER_OF_THE_WEEK;

  const formattedWeek = new Date(listener.weekStartDate).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md hover:border-[#f59e0b]/30">
      {/* Gold gradient header */}
      <div className="h-1.5 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b]" />

      <CardContent className="p-0">
        {/* Top section with gradient bg */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f59e0b]/10 via-[#fbbf24]/5 to-transparent p-5 pb-4">
          <div className="absolute top-2 right-3 text-5xl opacity-10">
            {"\uD83D\uDC51"}
          </div>

          {/* Title + badge */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="Crown">
                {"\uD83D\uDC51"}
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Listener of the Week
                </h3>
                <p className="text-[11px] text-muted-foreground/70">
                  Week of {formattedWeek}
                </p>
              </div>
            </div>
            <Badge className="bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20 text-[10px] font-bold uppercase tracking-wider">
              Congratulations!
            </Badge>
          </div>

          {/* Name + city */}
          <div className="mt-4">
            <p className="text-xl font-extrabold text-foreground">
              {listener.displayName}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {listener.city}, NC
            </p>
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="tabular-nums">{listener.pointsEarned.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground/70">pts</span>
            </span>
            <span className="flex items-center gap-1 text-sm font-medium">
              <Clock className="h-3.5 w-3.5 text-[#74ddc7]" />
              <span className="tabular-nums">{listener.listeningHours}</span>
              <span className="text-xs text-muted-foreground/70">hours</span>
            </span>
          </div>
        </div>

        {/* Quote */}
        <div className="px-5 pb-5 pt-3 space-y-4">
          <div className="relative rounded-lg bg-white/[0.03] border border-border/50 p-4">
            <Quote className="absolute top-3 left-3 h-4 w-4 text-[#f59e0b]/30" />
            <p className="pl-5 text-sm italic text-muted-foreground leading-relaxed">
              &ldquo;{listener.quote}&rdquo;
            </p>
          </div>

          {/* Link */}
          <Link
            href="/leaderboard"
            className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-white/5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            View Leaderboard
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
