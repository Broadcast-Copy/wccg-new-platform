"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Radio,
  Headphones,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShiftType = "on-air" | "production" | "office" | "engineering";

interface Shift {
  id: string;
  staffName: string;
  staffRole: string;
  type: ShiftType;
  day: number; // 0=Mon, 1=Tue, ... 6=Sun
  startHour: number; // 0-23
  endHour: number; // 0-23
  notes?: string;
}

interface WeekSchedule {
  weekStart: string; // ISO date of Monday
  shifts: Shift[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonday(offsetWeeks: number): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offsetWeeks * 7;
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().split("T")[0];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_COLORS: Record<ShiftType, { bg: string; border: string; text: string }> = {
  "on-air": { bg: "bg-[#74ddc7]/15", border: "border-[#74ddc7]/30", text: "text-[#74ddc7]" },
  production: { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-400" },
  office: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
  engineering: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400" },
};

const SHIFT_LABELS: Record<ShiftType, string> = {
  "on-air": "On-Air",
  production: "Production",
  office: "Office",
  engineering: "Engineering",
};

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function buildSeedShifts(): Shift[] {
  return [
    // On-Air shifts — Monday through Friday
    { id: "sh1", staffName: "DJ Smooth", staffRole: "Morning Show Host", type: "on-air", day: 0, startHour: 6, endHour: 10, notes: "The Morning Praise" },
    { id: "sh2", staffName: "DJ Smooth", staffRole: "Morning Show Host", type: "on-air", day: 1, startHour: 6, endHour: 10 },
    { id: "sh3", staffName: "DJ Smooth", staffRole: "Morning Show Host", type: "on-air", day: 2, startHour: 6, endHour: 10 },
    { id: "sh4", staffName: "DJ Smooth", staffRole: "Morning Show Host", type: "on-air", day: 3, startHour: 6, endHour: 10 },
    { id: "sh5", staffName: "DJ Smooth", staffRole: "Morning Show Host", type: "on-air", day: 4, startHour: 6, endHour: 10 },

    { id: "sh6", staffName: "Lady Soul", staffRole: "Midday Host", type: "on-air", day: 0, startHour: 10, endHour: 15 },
    { id: "sh7", staffName: "Lady Soul", staffRole: "Midday Host", type: "on-air", day: 1, startHour: 10, endHour: 15 },
    { id: "sh8", staffName: "Lady Soul", staffRole: "Midday Host", type: "on-air", day: 2, startHour: 10, endHour: 15 },
    { id: "sh9", staffName: "Lady Soul", staffRole: "Midday Host", type: "on-air", day: 3, startHour: 10, endHour: 15 },
    { id: "sh10", staffName: "Lady Soul", staffRole: "Midday Host", type: "on-air", day: 4, startHour: 10, endHour: 15 },

    { id: "sh11", staffName: "DJ Quick", staffRole: "Afternoon Drive Host", type: "on-air", day: 0, startHour: 15, endHour: 19 },
    { id: "sh12", staffName: "DJ Quick", staffRole: "Afternoon Drive Host", type: "on-air", day: 1, startHour: 15, endHour: 19 },
    { id: "sh13", staffName: "DJ Quick", staffRole: "Afternoon Drive Host", type: "on-air", day: 2, startHour: 15, endHour: 19 },
    { id: "sh14", staffName: "DJ Quick", staffRole: "Afternoon Drive Host", type: "on-air", day: 3, startHour: 15, endHour: 19 },
    { id: "sh15", staffName: "DJ Quick", staffRole: "Afternoon Drive Host", type: "on-air", day: 4, startHour: 15, endHour: 19 },

    // Weekend on-air
    { id: "sh16", staffName: "DJ Smooth", staffRole: "Weekend Show", type: "on-air", day: 5, startHour: 8, endHour: 12, notes: "Saturday Morning Gospel" },
    { id: "sh17", staffName: "Lady Soul", staffRole: "Weekend Show", type: "on-air", day: 5, startHour: 12, endHour: 17, notes: "Saturday Soul Sessions" },
    { id: "sh18", staffName: "DJ Quick", staffRole: "Weekend Show", type: "on-air", day: 6, startHour: 10, endHour: 14, notes: "Sunday Inspirations" },

    // Production shifts
    { id: "sh19", staffName: "Chris Morgan", staffRole: "Production Director", type: "production", day: 0, startHour: 9, endHour: 17 },
    { id: "sh20", staffName: "Chris Morgan", staffRole: "Production Director", type: "production", day: 1, startHour: 9, endHour: 17 },
    { id: "sh21", staffName: "Chris Morgan", staffRole: "Production Director", type: "production", day: 2, startHour: 9, endHour: 17 },
    { id: "sh22", staffName: "Chris Morgan", staffRole: "Production Director", type: "production", day: 3, startHour: 9, endHour: 17 },
    { id: "sh23", staffName: "Chris Morgan", staffRole: "Production Director", type: "production", day: 4, startHour: 9, endHour: 17 },

    // Office shifts
    { id: "sh24", staffName: "Devon Robinson", staffRole: "Operations Manager", type: "office", day: 0, startHour: 8, endHour: 17 },
    { id: "sh25", staffName: "Devon Robinson", staffRole: "Operations Manager", type: "office", day: 1, startHour: 8, endHour: 17 },
    { id: "sh26", staffName: "Devon Robinson", staffRole: "Operations Manager", type: "office", day: 2, startHour: 8, endHour: 17 },
    { id: "sh27", staffName: "Devon Robinson", staffRole: "Operations Manager", type: "office", day: 3, startHour: 8, endHour: 17 },
    { id: "sh28", staffName: "Devon Robinson", staffRole: "Operations Manager", type: "office", day: 4, startHour: 8, endHour: 17 },

    { id: "sh29", staffName: "Sarah Mitchell", staffRole: "Traffic/Office Manager", type: "office", day: 0, startHour: 8, endHour: 16 },
    { id: "sh30", staffName: "Sarah Mitchell", staffRole: "Traffic/Office Manager", type: "office", day: 1, startHour: 8, endHour: 16 },
    { id: "sh31", staffName: "Sarah Mitchell", staffRole: "Traffic/Office Manager", type: "office", day: 2, startHour: 8, endHour: 16 },
    { id: "sh32", staffName: "Sarah Mitchell", staffRole: "Traffic/Office Manager", type: "office", day: 3, startHour: 8, endHour: 16 },
    { id: "sh33", staffName: "Sarah Mitchell", staffRole: "Traffic/Office Manager", type: "office", day: 4, startHour: 8, endHour: 16 },

    { id: "sh34", staffName: "Patricia Young", staffRole: "Office Assistant", type: "office", day: 0, startHour: 9, endHour: 15 },
    { id: "sh35", staffName: "Patricia Young", staffRole: "Office Assistant", type: "office", day: 2, startHour: 9, endHour: 15 },
    { id: "sh36", staffName: "Patricia Young", staffRole: "Office Assistant", type: "office", day: 4, startHour: 9, endHour: 15 },

    // Engineering
    { id: "sh37", staffName: "James Carter", staffRole: "Chief Engineer", type: "engineering", day: 0, startHour: 8, endHour: 16 },
    { id: "sh38", staffName: "James Carter", staffRole: "Chief Engineer", type: "engineering", day: 2, startHour: 8, endHour: 16 },
    { id: "sh39", staffName: "James Carter", staffRole: "Chief Engineer", type: "engineering", day: 4, startHour: 8, endHour: 16 },
    { id: "sh40", staffName: "James Carter", staffRole: "Chief Engineer", type: "engineering", day: 5, startHour: 9, endHour: 13, notes: "Transmitter site maintenance" },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShiftSchedulingPage() {
  const [mounted, setMounted] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filterType, setFilterType] = useState("all");

  const weekStart = getMonday(weekOffset);

  useEffect(() => {
    setShifts(loadOrSeed("ops_shifts", buildSeedShifts()));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  // Visible time range
  const startHour = 5;
  const endHour = 20;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const filteredShifts = filterType === "all" ? shifts : shifts.filter((s) => s.type === filterType);

  // Compute week date labels
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekLabel = (() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} - ${fmt(end)}, ${end.getFullYear()}`;
  })();

  // Count staff scheduled
  const uniqueStaff = new Set(shifts.map((s) => s.staffName)).size;
  const onAirShifts = shifts.filter((s) => s.type === "on-air").length;
  const totalHours = shifts.reduce((sum, s) => sum + (s.endHour - s.startHour), 0);

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
      <PageHeader
        icon={Calendar}
        iconColor="text-yellow-400"
        iconBg="bg-yellow-500/10 border-yellow-500/20"
        title="Shift Scheduling"
        description="Weekly staff schedules for WCCG 104.5 FM"
        badge={weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : `${weekOffset > 0 ? "+" : ""}${weekOffset}w`}
        badgeColor="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Staff Scheduled" value={uniqueStaff} icon={Users} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="On-Air Shifts" value={onAirShifts} icon={Radio} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Total Shift Hours" value={totalHours} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Week" value={weekLabel} icon={Calendar} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Filter:</span>
        {(["all", "on-air", "production", "office", "engineering"] as const).map((type) => {
          const isActive = filterType === type;
          const color = type === "all" ? null : SHIFT_COLORS[type as ShiftType];
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isActive
                  ? color
                    ? `${color.bg} ${color.border} ${color.text}`
                    : "bg-foreground/10 border-foreground/20 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "on-air" && <Radio className="h-3 w-3" />}
              {type === "production" && <Headphones className="h-3 w-3" />}
              {type === "office" && <Briefcase className="h-3 w-3" />}
              {type === "engineering" && <Clock className="h-3 w-3" />}
              {type === "all" ? "All" : SHIFT_LABELS[type as ShiftType]}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.entries(SHIFT_COLORS) as [ShiftType, typeof SHIFT_COLORS[ShiftType]][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded ${color.bg} border ${color.border}`} />
            <span className="text-xs text-muted-foreground">{SHIFT_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Schedule grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header row — days */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
              <div className="p-3 text-xs text-muted-foreground font-medium">Time</div>
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`p-3 text-center border-l border-border ${isToday ? "bg-[#74ddc7]/5" : ""}`}
                  >
                    <p className={`text-xs font-semibold ${isToday ? "text-[#74ddc7]" : "text-foreground"}`}>{SHORT_DAYS[i]}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border last:border-0">
                <div className="p-2 text-[10px] text-muted-foreground font-mono flex items-start justify-end pr-3 pt-3">
                  {formatHour(hour)}
                </div>
                {DAYS.map((_, dayIdx) => {
                  const isToday = weekDates[dayIdx].toDateString() === new Date().toDateString();
                  const dayShifts = filteredShifts.filter(
                    (s) => s.day === dayIdx && s.startHour <= hour && s.endHour > hour
                  );
                  // Only render the block at the start hour
                  const startingShifts = filteredShifts.filter(
                    (s) => s.day === dayIdx && s.startHour === hour
                  );

                  return (
                    <div
                      key={dayIdx}
                      className={`border-l border-border min-h-[48px] p-0.5 relative ${isToday ? "bg-[#74ddc7]/5" : ""}`}
                    >
                      {startingShifts.map((shift) => {
                        const color = SHIFT_COLORS[shift.type];
                        const span = shift.endHour - shift.startHour;
                        return (
                          <div
                            key={shift.id}
                            className={`${color.bg} ${color.border} border rounded-md px-1.5 py-1 text-[10px] leading-tight`}
                            style={{
                              height: `${span * 48 - 4}px`,
                              position: "absolute",
                              left: "2px",
                              right: "2px",
                              top: "2px",
                              zIndex: 1,
                            }}
                          >
                            <p className={`font-semibold ${color.text} truncate`}>{shift.staffName}</p>
                            <p className="text-muted-foreground truncate">{formatHour(shift.startHour)}-{formatHour(shift.endHour)}</p>
                            {shift.notes && <p className="text-muted-foreground truncate mt-0.5 italic">{shift.notes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff summary table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Staff Summary</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-3">Staff Member</th>
                <th className="text-left font-medium px-4 py-3">Role</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-center font-medium px-4 py-3">Shifts</th>
                <th className="text-center font-medium px-4 py-3">Hours</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Days</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(shifts.map((s) => s.staffName))).map((name) => {
                const staffShifts = shifts.filter((s) => s.staffName === name);
                const staffHours = staffShifts.reduce((sum, s) => sum + (s.endHour - s.startHour), 0);
                const staffDays = Array.from(new Set(staffShifts.map((s) => s.day))).sort();
                const staffType = staffShifts[0].type;
                const color = SHIFT_COLORS[staffType];

                return (
                  <tr key={name} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 font-medium text-foreground">{name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{staffShifts[0].staffRole}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${color.bg} ${color.border} ${color.text}`}>
                        {SHIFT_LABELS[staffType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-foreground">{staffShifts.length}</td>
                    <td className="px-4 py-3 text-center text-foreground">{staffHours}h</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {staffDays.map((d) => SHORT_DAYS[d]).join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
