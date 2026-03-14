"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface SponsorStatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: number;
  trendDirection: "up" | "down";
}

export function SponsorStatsCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
}: SponsorStatsCardProps) {
  const isPositive = trendDirection === "up";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7401df]/10">
          <Icon className="h-4 w-4 text-[#7401df]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <div className="flex items-center gap-1 mt-2">
        {isPositive ? (
          <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-red-400" />
        )}
        <span
          className={`text-xs font-medium ${
            isPositive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {trend}%
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs last period</span>
      </div>
    </div>
  );
}
