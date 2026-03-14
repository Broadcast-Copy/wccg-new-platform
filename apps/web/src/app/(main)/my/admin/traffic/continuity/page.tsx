"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { loadOrSeed, persist, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContinuityEntry {
  id: string;
  time: string;
  program: string;
  source: "Live" | "Recorded" | "Syndicated" | "Satellite" | "Automated";
  commercialBreaks: number;
  spotsInBreaks: number;
  notes: string;
  status: "Complete" | "Pending" | "Missing";
}

interface DailyLog {
  date: string;
  signOn: string;
  signOff: string;
  entries: ContinuityEntry[];
  completedBy: string;
  status: "Complete" | "Partial" | "Missing";
}

// ---------------------------------------------------------------------------
// Seed generator
// ---------------------------------------------------------------------------

function generateContinuityLog(dateStr: string): DailyLog {
  const entries: ContinuityEntry[] = [
    { id: "cl1", time: "05:00", program: "Automated Overnight / Gospel Music", source: "Automated", commercialBreaks: 2, spotsInBreaks: 6, notes: "", status: "Complete" },
    { id: "cl2", time: "06:00", program: "The Morning Praise with DJ Smooth", source: "Live", commercialBreaks: 4, spotsInBreaks: 16, notes: "EAS Weekly Test at 6:15 AM", status: "Complete" },
    { id: "cl3", time: "07:00", program: "Morning Praise Hour 2", source: "Live", commercialBreaks: 4, spotsInBreaks: 18, notes: "Community Calendar segment at 7:45", status: "Complete" },
    { id: "cl4", time: "08:00", program: "Morning Praise Hour 3", source: "Live", commercialBreaks: 4, spotsInBreaks: 16, notes: "News & Weather at 8:00, 8:30", status: "Complete" },
    { id: "cl5", time: "09:00", program: "Morning Praise Hour 4", source: "Live", commercialBreaks: 3, spotsInBreaks: 12, notes: "Guest interview: Pastor James Robinson", status: "Complete" },
    { id: "cl6", time: "10:00", program: "Midday Praise with Lady Soul", source: "Live", commercialBreaks: 3, spotsInBreaks: 10, notes: "", status: "Complete" },
    { id: "cl7", time: "11:00", program: "Midday Praise Hour 2", source: "Live", commercialBreaks: 3, spotsInBreaks: 10, notes: "", status: "Complete" },
    { id: "cl8", time: "12:00", program: "Lunchtime Gospel Mix", source: "Live", commercialBreaks: 4, spotsInBreaks: 14, notes: "Traffic report at 12:15, 12:45", status: "Complete" },
    { id: "cl9", time: "13:00", program: "Afternoon Gospel", source: "Automated", commercialBreaks: 3, spotsInBreaks: 10, notes: "", status: "Complete" },
    { id: "cl10", time: "14:00", program: "Afternoon Gospel Hour 2", source: "Automated", commercialBreaks: 3, spotsInBreaks: 10, notes: "", status: "Complete" },
    { id: "cl11", time: "15:00", program: "Afternoon Drive with DJ Quick", source: "Live", commercialBreaks: 4, spotsInBreaks: 16, notes: "", status: "Complete" },
    { id: "cl12", time: "16:00", program: "Afternoon Drive Hour 2", source: "Live", commercialBreaks: 4, spotsInBreaks: 16, notes: "1 missed spot — Cape Fear Auto :30 at 16:22", status: "Complete" },
    { id: "cl13", time: "17:00", program: "Afternoon Drive Hour 3", source: "Live", commercialBreaks: 4, spotsInBreaks: 16, notes: "Traffic report at 17:15, 17:45", status: "Complete" },
    { id: "cl14", time: "18:00", program: "Evening Praise", source: "Live", commercialBreaks: 3, spotsInBreaks: 10, notes: "", status: "Complete" },
    { id: "cl15", time: "19:00", program: "Syndicated: Bobby Jones Gospel Hour", source: "Syndicated", commercialBreaks: 4, spotsInBreaks: 12, notes: "Network commercial avails filled locally", status: "Complete" },
    { id: "cl16", time: "20:00", program: "Syndicated: Bobby Jones Hour 2", source: "Syndicated", commercialBreaks: 4, spotsInBreaks: 12, notes: "", status: "Complete" },
    { id: "cl17", time: "21:00", program: "Quiet Storm Gospel", source: "Automated", commercialBreaks: 2, spotsInBreaks: 6, notes: "", status: "Complete" },
    { id: "cl18", time: "22:00", program: "Quiet Storm Gospel Hour 2", source: "Automated", commercialBreaks: 2, spotsInBreaks: 6, notes: "", status: "Complete" },
    { id: "cl19", time: "23:00", program: "Overnight Automation", source: "Automated", commercialBreaks: 1, spotsInBreaks: 3, notes: "Sign-off announcements at 23:55", status: "Complete" },
  ];

  return {
    date: dateStr,
    signOn: "05:00 AM",
    signOff: "12:00 AM",
    entries,
    completedBy: "Mike Johnson",
    status: "Complete",
  };
}

// ---------------------------------------------------------------------------
// Past week log status (for overview)
// ---------------------------------------------------------------------------

const PAST_LOGS = [
  { date: "2026-03-08", status: "Complete" as const, completedBy: "Mike Johnson" },
  { date: "2026-03-09", status: "Complete" as const, completedBy: "Mike Johnson" },
  { date: "2026-03-10", status: "Complete" as const, completedBy: "Sarah Mitchell" },
  { date: "2026-03-11", status: "Complete" as const, completedBy: "Mike Johnson" },
  { date: "2026-03-12", status: "Partial" as const, completedBy: "Mike Johnson" },
  { date: "2026-03-13", status: "Complete" as const, completedBy: "Mike Johnson" },
  { date: "2026-03-14", status: "Complete" as const, completedBy: "Mike Johnson" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContinuityLogPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [log, setLog] = useState<DailyLog | null>(null);

  useEffect(() => {
    setMounted(true);
    const key = `wccg:traffic-continuity:${selectedDate}`;
    const data = loadOrSeed<DailyLog>(key, [generateContinuityLog(selectedDate)]);
    setLog(data[0] || null);
  }, [selectedDate]);

  if (!mounted || !log) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const changeDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const totalBreaks = log.entries.reduce((s, e) => s + e.commercialBreaks, 0);
  const totalSpots = log.entries.reduce((s, e) => s + e.spotsInBreaks, 0);
  const completeEntries = log.entries.filter((e) => e.status === "Complete").length;
  const missingEntries = log.entries.filter((e) => e.status === "Missing").length;

  const sourceColor: Record<string, string> = {
    Live: "text-emerald-400",
    Recorded: "text-blue-400",
    Syndicated: "text-purple-400",
    Satellite: "text-orange-400",
    Automated: "text-muted-foreground",
  };

  const columns: Column<ContinuityEntry>[] = [
    { key: "time", label: "Time", render: (r) => <span className="font-mono text-xs">{r.time}</span> },
    { key: "program", label: "Program / Segment", sortable: true, sortKey: (r) => r.program, render: (r) => <span className="font-medium text-sm">{r.program}</span> },
    { key: "source", label: "Source", render: (r) => <span className={`text-xs font-medium ${sourceColor[r.source] || ""}`}>{r.source}</span> },
    { key: "breaks", label: "Breaks", align: "center", render: (r) => <span className="text-sm">{r.commercialBreaks}</span> },
    { key: "spots", label: "Spots", align: "center", render: (r) => <span className="text-sm">{r.spotsInBreaks}</span> },
    { key: "notes", label: "Notes", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.notes || "---"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "Complete" ? "Completed" : r.status} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={FileCheck} title="Continuity Log" description="FCC continuity and program log — daily entries" badge="FCC" badgeColor="bg-red-500/10 text-red-400 border-red-500/20">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
          <button onClick={() => changeDate(1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Program Entries" value={log.entries.length} icon={Radio} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Commercial Breaks" value={totalBreaks} icon={Clock} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Total Spots Logged" value={totalSpots} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Missing Entries" value={missingEntries} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Sign on/off info */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-6 flex-wrap">
        <div><span className="text-xs text-muted-foreground">Sign On</span><p className="text-sm font-medium">{log.signOn}</p></div>
        <div className="h-8 w-px bg-border" />
        <div><span className="text-xs text-muted-foreground">Sign Off</span><p className="text-sm font-medium">{log.signOff}</p></div>
        <div className="h-8 w-px bg-border" />
        <div><span className="text-xs text-muted-foreground">Completed By</span><p className="text-sm font-medium">{log.completedBy}</p></div>
        <div className="h-8 w-px bg-border" />
        <div><span className="text-xs text-muted-foreground">Log Status</span><p className="mt-0.5"><StatusBadge status={log.status === "Complete" ? "Completed" : log.status === "Partial" ? "Pending" : "Overdue"} /></p></div>
      </div>

      {/* Past week status */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Past 7 Days</h2>
        <div className="grid grid-cols-7 gap-2">
          {PAST_LOGS.map((d) => (
            <button
              key={d.date}
              onClick={() => setSelectedDate(d.date)}
              className={`rounded-lg border p-2 text-center transition-all hover:border-[#74ddc7]/40 ${
                selectedDate === d.date ? "ring-2 ring-[#74ddc7] border-[#74ddc7]/40" : "border-border"
              }`}
            >
              <p className="text-[10px] text-muted-foreground">{new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</p>
              <p className="text-xs font-medium">{new Date(d.date + "T12:00:00").getDate()}</p>
              <div className={`h-1.5 w-1.5 rounded-full mx-auto mt-1 ${
                d.status === "Complete" ? "bg-emerald-400" : d.status === "Partial" ? "bg-yellow-400" : "bg-red-400"
              }`} />
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={log.entries}
        keyField="id"
        searchable
        searchPlaceholder="Search program..."
        searchFilter={(r, q) => r.program.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q)}
      />
    </div>
  );
}
