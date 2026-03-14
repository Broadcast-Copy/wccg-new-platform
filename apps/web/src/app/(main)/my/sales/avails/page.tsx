"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Radio,
  TrendingDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DayPart = "Morning Drive" | "Midday" | "Afternoon Drive" | "Evening" | "Overnight";

interface AvailSlot {
  date: string; // YYYY-MM-DD
  dayPart: DayPart;
  totalSpots: number;
  soldSpots: number;
}

const DAYPARTS: DayPart[] = ["Morning Drive", "Midday", "Afternoon Drive", "Evening", "Overnight"];
const DAYPART_HOURS: Record<DayPart, string> = {
  "Morning Drive": "6AM-10AM",
  Midday: "10AM-3PM",
  "Afternoon Drive": "3PM-7PM",
  Evening: "7PM-12AM",
  Overnight: "12AM-6AM",
};

const KEY = "wccg_sales_avails";

// ---------------------------------------------------------------------------
// Seed Data Builder
// ---------------------------------------------------------------------------

function buildSeedAvails(): AvailSlot[] {
  const slots: AvailSlot[] = [];
  const baseDate = new Date("2026-03-01");
  const spotsPerDaypart: Record<DayPart, number> = {
    "Morning Drive": 16,
    Midday: 20,
    "Afternoon Drive": 16,
    Evening: 12,
    Overnight: 8,
  };

  for (let d = 0; d < 31; d++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    for (const dp of DAYPARTS) {
      const total = spotsPerDaypart[dp];
      // Weekdays more sold, weekends lighter
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      let soldPct: number;
      if (dp === "Morning Drive") soldPct = isWeekend ? 0.4 : 0.7 + Math.random() * 0.25;
      else if (dp === "Afternoon Drive") soldPct = isWeekend ? 0.35 : 0.6 + Math.random() * 0.2;
      else if (dp === "Midday") soldPct = isWeekend ? 0.25 : 0.4 + Math.random() * 0.3;
      else if (dp === "Evening") soldPct = 0.2 + Math.random() * 0.3;
      else soldPct = 0.05 + Math.random() * 0.15;

      slots.push({
        date: dateStr,
        dayPart: dp,
        totalSpots: total,
        soldSpots: Math.round(total * soldPct),
      });
    }
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AvailsPage() {
  const [slots, setSlots] = useState<AvailSlot[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filterDaypart, setFilterDaypart] = useState<DayPart | "All">("All");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    setMounted(true);
    setSlots(loadOrSeed(KEY, buildSeedAvails()));
  }, []);

  if (!mounted) return null;

  // Date range for current view (week)
  const baseMonday = new Date("2026-03-02"); // first Monday of March 2026
  const startDate = new Date(baseMonday);
  startDate.setDate(startDate.getDate() + weekOffset * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split("T")[0]);
  }

  const displayDayparts = filterDaypart === "All" ? DAYPARTS : [filterDaypart];

  // Stats
  const totalAvail = slots.reduce((s, sl) => s + (sl.totalSpots - sl.soldSpots), 0);
  const totalSold = slots.reduce((s, sl) => s + sl.soldSpots, 0);
  const totalCapacity = slots.reduce((s, sl) => s + sl.totalSpots, 0);
  const sellThrough = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;
  const criticalSlots = slots.filter((sl) => {
    const avail = (sl.totalSpots - sl.soldSpots) / sl.totalSpots;
    return avail < 0.25;
  }).length;

  function getAvailColor(total: number, sold: number): string {
    const availPct = (total - sold) / total;
    if (availPct >= 0.75) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (availPct >= 0.25) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }

  function getAvailBg(total: number, sold: number): string {
    const availPct = (total - sold) / total;
    if (availPct >= 0.75) return "bg-emerald-500/5";
    if (availPct >= 0.25) return "bg-yellow-500/5";
    return "bg-red-500/5";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CalendarDays}
        title="Avails Report"
        description="Available advertising inventory by daypart and date."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Available" value={totalAvail.toString()} icon={Radio} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Total Sold" value={totalSold.toString()} icon={Radio} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Sell-Through" value={`${sellThrough}%`} icon={TrendingDown} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Near Sold-Out" value={criticalSlots.toString()} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/40" />
          <span className="text-xs text-muted-foreground">75%+ Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-yellow-500/40" />
          <span className="text-xs text-muted-foreground">25-75% Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500/40" />
          <span className="text-xs text-muted-foreground">&lt;25% Available</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterDaypart("All")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterDaypart === "All" ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All Dayparts
          </button>
          {DAYPARTS.map((dp) => (
            <button
              key={dp}
              type="button"
              onClick={() => setFilterDaypart(dp)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterDaypart === dp ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {dp}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekOffset((w) => w - 1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-foreground min-w-[160px] text-center">
            {formatDate(startDate.toISOString())} — {formatDate(endDate.toISOString())}
          </span>
          <button type="button" onClick={() => setWeekOffset((w) => w + 1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Avails Grid */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-3 sticky left-0 bg-card z-10">Daypart</th>
              {weekDates.map((d) => {
                const day = new Date(d);
                const dayName = day.toLocaleDateString("en-US", { weekday: "short" });
                const dayNum = day.getDate();
                return (
                  <th key={d} className="text-center font-medium px-3 py-3 min-w-[90px]">
                    <div>{dayName}</div>
                    <div className="text-muted-foreground/60">{dayNum}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayDayparts.map((dp) => (
              <tr key={dp} className="border-b border-border last:border-0">
                <td className="px-4 py-3 sticky left-0 bg-card z-10">
                  <div className="font-medium text-foreground text-xs">{dp}</div>
                  <div className="text-[10px] text-muted-foreground">{DAYPART_HOURS[dp]}</div>
                </td>
                {weekDates.map((date) => {
                  const slot = slots.find((s) => s.date === date && s.dayPart === dp);
                  if (!slot) {
                    return (
                      <td key={date} className="px-3 py-3 text-center text-muted-foreground/40 text-xs">—</td>
                    );
                  }
                  const avail = slot.totalSpots - slot.soldSpots;
                  return (
                    <td key={date} className={`px-3 py-3 text-center ${getAvailBg(slot.totalSpots, slot.soldSpots)}`}>
                      <div className={`inline-flex flex-col items-center rounded-lg border px-2 py-1 ${getAvailColor(slot.totalSpots, slot.soldSpots)}`}>
                        <span className="text-xs font-bold">{avail}</span>
                        <span className="text-[9px] opacity-70">of {slot.totalSpots}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Daily Totals */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Daily Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {weekDates.map((date) => {
            const daySlots = slots.filter((s) => s.date === date);
            const dayTotal = daySlots.reduce((s, sl) => s + sl.totalSpots, 0);
            const daySold = daySlots.reduce((s, sl) => s + sl.soldSpots, 0);
            const dayAvail = dayTotal - daySold;
            const pct = dayTotal > 0 ? Math.round((dayAvail / dayTotal) * 100) : 0;
            const day = new Date(date);
            return (
              <div key={date} className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                <p className="text-lg font-bold text-foreground mt-1">{dayAvail}</p>
                <p className="text-[10px] text-muted-foreground">of {dayTotal} ({pct}%)</p>
                <div className="w-full bg-muted rounded-full h-1 mt-2">
                  <div className={`h-1 rounded-full ${pct >= 75 ? "bg-emerald-500" : pct >= 25 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
