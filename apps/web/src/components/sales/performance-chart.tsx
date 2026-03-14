"use client";

import { useState } from "react";
import type { DailyData } from "@/data/advertiser-performance";

interface PerformanceChartProps {
  data: DailyData[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const maxImpressions = Math.max(...data.map((d) => d.impressions));
  // Round up to a nice number for Y-axis
  const yMax = Math.ceil(maxImpressions / 1000) * 1000;

  const yLabels = [yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0];

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatNumber(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-foreground mb-4">Daily Impressions</h3>

      <div className="relative overflow-x-auto">
        <div className="flex min-w-[600px]">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between pr-3 py-1 shrink-0 w-12">
            {yLabels.map((label) => (
              <span
                key={label}
                className="text-[10px] text-muted-foreground text-right leading-none"
              >
                {formatNumber(label)}
              </span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {yLabels.map((label) => (
                <div
                  key={label}
                  className="border-t border-foreground/[0.06] w-full"
                />
              ))}
            </div>

            {/* Bars */}
            <div className="relative flex items-end gap-[2px] h-48">
              {data.map((day, i) => {
                const heightPct = (day.impressions / yMax) * 100;
                const isHovered = hoveredIndex === i;

                return (
                  <div
                    key={day.date}
                    className="flex-1 relative flex flex-col items-center justify-end h-full"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 bg-card border border-border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none">
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(day.date)}
                        </p>
                        <p className="text-xs font-bold text-foreground">
                          {day.impressions.toLocaleString()} impressions
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {day.redemptions} redemptions
                        </p>
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-sm transition-colors ${
                        isHovered
                          ? "bg-[#74ddc7]"
                          : "bg-[#7401df]/60 hover:bg-[#7401df]"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels (show every 5th) */}
            <div className="flex mt-2">
              {data.map((day, i) => (
                <div key={day.date} className="flex-1 text-center">
                  {i % 5 === 0 && (
                    <span className="text-[9px] text-muted-foreground">
                      {formatDate(day.date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
