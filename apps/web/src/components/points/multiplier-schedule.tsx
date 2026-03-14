"use client";

import { useEffect, useState } from "react";
import {
  getUpcomingMultipliers,
  getCurrentMultiplier,
  type ActiveMultiplier,
  type UpcomingMultiplier,
} from "@/lib/multipliers";
import { Zap, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MULTIPLIER_SCHEDULE } from "@/data/multipliers";

const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function MultiplierSchedule() {
  const [active, setActive] = useState<ActiveMultiplier | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingMultiplier[]>([]);

  useEffect(() => {
    function refresh() {
      setActive(getCurrentMultiplier());
      setUpcoming(getUpcomingMultipliers(5));
    }
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      {/* Active multiplier highlight */}
      {active && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="animate-pulse text-lg font-bold text-amber-400">
                {active.multiplier}x
              </span>
              <span className="text-sm font-semibold text-foreground">
                Active Now!
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{active.label}</p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            LIVE
          </Badge>
        </div>
      )}

      {/* Full schedule table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Weekly Schedule</span>
          </div>
        </div>
        <div className="divide-y">
          {MULTIPLIER_SCHEDULE.map((window) => {
            const isCurrentlyActive =
              active !== null &&
              getCurrentMultiplier()?.label === window.label;

            return (
              <div
                key={window.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isCurrentlyActive ? "bg-amber-500/5" : ""
                }`}
              >
                {/* Multiplier badge */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                    window.multiplier >= 5
                      ? "bg-purple-500/20 text-purple-400"
                      : window.multiplier >= 3
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-[#74ddc7]/20 text-[#74ddc7]"
                  }`}
                >
                  {window.multiplier}x
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{window.label}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatHour(window.startHour)} &ndash;{" "}
                      {formatHour(window.endHour)}
                    </span>
                    <span className="text-foreground/20">&middot;</span>
                    <span>
                      {window.days.map((d) => DAY_LABELS[d]).join(", ")}
                    </span>
                  </div>
                </div>

                {/* Sponsor */}
                {window.sponsorName && (
                  <span className="hidden sm:inline-flex shrink-0 rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                    Sponsored by {window.sponsorName}
                  </span>
                )}

                {isCurrentlyActive && (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]"
                  >
                    NOW
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming windows */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Coming Up Next</span>
            </div>
          </div>
          <div className="divide-y">
            {upcoming.map((item, i) => (
              <div key={`${item.window.id}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={`text-sm font-bold ${
                    item.window.multiplier >= 5
                      ? "text-purple-400"
                      : item.window.multiplier >= 3
                      ? "text-amber-400"
                      : "text-[#74ddc7]"
                  }`}
                >
                  {item.window.multiplier}x
                </span>
                <span className="text-sm text-foreground truncate flex-1">
                  {item.window.label}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {item.startsAt.toLocaleDateString("en-US", {
                    weekday: "short",
                  })}{" "}
                  {formatHour(item.window.startHour)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
