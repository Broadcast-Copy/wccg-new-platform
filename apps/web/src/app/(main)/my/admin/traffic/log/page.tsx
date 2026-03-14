"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Radio,
  Tv,
  Megaphone,
  Music,
  Mic,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { loadOrSeed, persist, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  id: string;
  time: string;          // "06:00"
  endTime: string;       // "06:15"
  contentType: "Commercial" | "PSA" | "Promo" | "Music" | "Talk" | "ID" | "Liner";
  client: string;
  title: string;
  duration: string;      // ":15" | ":30" | ":60"
  status: "Scheduled" | "Aired" | "Missed";
  daypart: string;
  hour: number;
}

// ---------------------------------------------------------------------------
// Seed data — a realistic day
// ---------------------------------------------------------------------------

function generateDayLog(dateStr: string): LogEntry[] {
  const entries: LogEntry[] = [];
  let id = 0;

  const commercials = [
    { client: "Cape Fear Auto Group", title: "Spring Clearance Sale", duration: ":30" },
    { client: "Fort Bragg FCU", title: "Mortgage Refinance", duration: ":60" },
    { client: "Cross Creek Mall", title: "Weekend Shopping Event", duration: ":30" },
    { client: "Fayetteville Kia", title: "Employee Pricing", duration: ":30" },
    { client: "Lowe's Home Improvement", title: "Spring Garden Sale", duration: ":30" },
    { client: "Carolina Ale House", title: "Lunch Specials", duration: ":15" },
    { client: "McDonald's Fayetteville", title: "McRib is Back", duration: ":30" },
    { client: "Walmart Skibo Rd", title: "Rollback Prices", duration: ":15" },
    { client: "State Farm - J. Williams", title: "Auto Insurance Quote", duration: ":30" },
    { client: "NC Lottery", title: "Powerball Jackpot", duration: ":30" },
    { client: "Fayetteville Tech", title: "Fall Enrollment", duration: ":30" },
    { client: "Crown Complex", title: "Gospel Concert", duration: ":60" },
  ];

  const psas = [
    { client: "American Red Cross", title: "Blood Drive Awareness", duration: ":30" },
    { client: "Cumberland County Health", title: "Flu Vaccination", duration: ":30" },
    { client: "NAACP Fayetteville", title: "Voter Registration", duration: ":15" },
    { client: "Fayetteville Fire Dept", title: "Smoke Detector Check", duration: ":15" },
  ];

  const promos = [
    { client: "WCCG 104.5", title: "Morning Show Contest", duration: ":30" },
    { client: "WCCG 104.5", title: "Gospel Brunch Sunday", duration: ":15" },
    { client: "WCCG 104.5", title: "Listen & Win Cash", duration: ":30" },
  ];

  const getDaypart = (h: number) => {
    if (h >= 6 && h < 10) return "Morning Drive";
    if (h >= 10 && h < 15) return "Midday";
    if (h >= 15 && h < 19) return "Afternoon Drive";
    if (h >= 19 && h < 24) return "Evening";
    return "Overnight";
  };

  for (let hour = 6; hour <= 23; hour++) {
    // Station ID at top of each hour
    entries.push({
      id: `log-${++id}`,
      time: `${hour.toString().padStart(2, "0")}:00`,
      endTime: `${hour.toString().padStart(2, "0")}:00`,
      contentType: "ID",
      client: "WCCG 104.5 FM",
      title: "Legal Station ID",
      duration: ":05",
      status: "Aired",
      daypart: getDaypart(hour),
      hour,
    });

    // Music blocks
    entries.push({
      id: `log-${++id}`,
      time: `${hour.toString().padStart(2, "0")}:01`,
      endTime: `${hour.toString().padStart(2, "0")}:15`,
      contentType: "Music",
      client: "WCCG 104.5",
      title: "Music Block A",
      duration: "14:00",
      status: "Aired",
      daypart: getDaypart(hour),
      hour,
    });

    // Commercial break 1 - 3 spots
    const spotsPerBreak = hour >= 6 && hour < 10 ? 4 : hour >= 15 && hour < 19 ? 4 : 3;
    for (let s = 0; s < spotsPerBreak; s++) {
      const comm = commercials[(hour * 3 + s) % commercials.length];
      const missedChance = Math.random();
      entries.push({
        id: `log-${++id}`,
        time: `${hour.toString().padStart(2, "0")}:${(15 + s).toString().padStart(2, "0")}`,
        endTime: `${hour.toString().padStart(2, "0")}:${(16 + s).toString().padStart(2, "0")}`,
        contentType: "Commercial",
        client: comm.client,
        title: comm.title,
        duration: comm.duration,
        status: missedChance > 0.92 ? "Missed" : "Aired",
        daypart: getDaypart(hour),
        hour,
      });
    }

    // Promo
    const promo = promos[hour % promos.length];
    entries.push({
      id: `log-${++id}`,
      time: `${hour.toString().padStart(2, "0")}:20`,
      endTime: `${hour.toString().padStart(2, "0")}:20`,
      contentType: "Promo",
      client: promo.client,
      title: promo.title,
      duration: promo.duration,
      status: "Aired",
      daypart: getDaypart(hour),
      hour,
    });

    // Music block B
    entries.push({
      id: `log-${++id}`,
      time: `${hour.toString().padStart(2, "0")}:21`,
      endTime: `${hour.toString().padStart(2, "0")}:35`,
      contentType: "Music",
      client: "WCCG 104.5",
      title: "Music Block B",
      duration: "14:00",
      status: "Aired",
      daypart: getDaypart(hour),
      hour,
    });

    // Commercial break 2
    for (let s = 0; s < (spotsPerBreak - 1); s++) {
      const comm = commercials[(hour * 5 + s + 3) % commercials.length];
      entries.push({
        id: `log-${++id}`,
        time: `${hour.toString().padStart(2, "0")}:${(35 + s).toString().padStart(2, "0")}`,
        endTime: `${hour.toString().padStart(2, "0")}:${(36 + s).toString().padStart(2, "0")}`,
        contentType: "Commercial",
        client: comm.client,
        title: comm.title,
        duration: comm.duration,
        status: "Aired",
        daypart: getDaypart(hour),
        hour,
      });
    }

    // PSA once every other hour
    if (hour % 2 === 0) {
      const psa = psas[(hour / 2) % psas.length];
      entries.push({
        id: `log-${++id}`,
        time: `${hour.toString().padStart(2, "0")}:40`,
        endTime: `${hour.toString().padStart(2, "0")}:40`,
        contentType: "PSA",
        client: psa.client,
        title: psa.title,
        duration: psa.duration,
        status: "Aired",
        daypart: getDaypart(hour),
        hour,
      });
    }

    // Talk segment during morning drive
    if (hour >= 7 && hour <= 9) {
      entries.push({
        id: `log-${++id}`,
        time: `${hour.toString().padStart(2, "0")}:45`,
        endTime: `${hour.toString().padStart(2, "0")}:55`,
        contentType: "Talk",
        client: "WCCG 104.5",
        title: hour === 7 ? "Community Calendar" : hour === 8 ? "News & Weather" : "Guest Interview",
        duration: "10:00",
        status: "Aired",
        daypart: getDaypart(hour),
        hour,
      });
    }

    // Liner
    entries.push({
      id: `log-${++id}`,
      time: `${hour.toString().padStart(2, "0")}:55`,
      endTime: `${hour.toString().padStart(2, "0")}:55`,
      contentType: "Liner",
      client: "WCCG 104.5",
      title: "Station Liner / Sweeper",
      duration: ":10",
      status: "Aired",
      daypart: getDaypart(hour),
      hour,
    });
  }

  return entries;
}

const CONTENT_ICONS: Record<string, { icon: typeof Radio; color: string }> = {
  Commercial: { icon: Tv, color: "text-emerald-400" },
  PSA: { icon: Megaphone, color: "text-blue-400" },
  Promo: { icon: Radio, color: "text-purple-400" },
  Music: { icon: Music, color: "text-[#74ddc7]" },
  Talk: { icon: Mic, color: "text-yellow-400" },
  ID: { icon: Radio, color: "text-orange-400" },
  Liner: { icon: Radio, color: "text-muted-foreground" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrafficLogPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [filterHour, setFilterHour] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    setMounted(true);
    const key = `wccg:traffic-log:${selectedDate}`;
    const data = loadOrSeed<LogEntry>(key, generateDayLog(selectedDate));
    setEntries(data);
  }, [selectedDate]);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const changeDate = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Filter
  let filtered = entries;
  if (filterHour !== null) filtered = filtered.filter((e) => e.hour === filterHour);
  if (filterType !== "all") filtered = filtered.filter((e) => e.contentType === filterType);

  // Stats
  const commercials = entries.filter((e) => e.contentType === "Commercial");
  const scheduled = commercials.length;
  const aired = commercials.filter((e) => e.status === "Aired").length;
  const missed = commercials.filter((e) => e.status === "Missed").length;
  const fillRate = scheduled > 0 ? Math.round((aired / scheduled) * 100) : 0;

  // Hour breakdown for fill rate
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  const columns: Column<LogEntry>[] = [
    {
      key: "time",
      label: "Time",
      sortable: true,
      sortKey: (r) => r.time,
      render: (r) => <span className="font-mono text-xs">{r.time}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (r) => {
        const info = CONTENT_ICONS[r.contentType] || { icon: Radio, color: "text-muted-foreground" };
        const Icon = info.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${info.color}`} />
            <span className="text-xs">{r.contentType}</span>
          </div>
        );
      },
    },
    {
      key: "client",
      label: "Client / Source",
      sortable: true,
      sortKey: (r) => r.client,
      render: (r) => <span className="font-medium text-sm">{r.client}</span>,
    },
    {
      key: "title",
      label: "Title",
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.title}</span>,
    },
    {
      key: "duration",
      label: "Dur",
      align: "center",
      render: (r) => <span className="font-mono text-xs">{r.duration}</span>,
    },
    {
      key: "daypart",
      label: "Daypart",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.daypart}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortKey: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Calendar}
        title="Traffic Log"
        description="Daily program and commercial schedule"
        badge="Log"
        badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      >
        {/* Day picker */}
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
          <button onClick={() => changeDate(1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scheduled Spots" value={scheduled} icon={Calendar} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Spots Aired" value={aired} icon={Activity} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Missed" value={missed} icon={Activity} color="text-red-400" bg="bg-red-500/10" />
        <StatCard label="Fill Rate" value={`${fillRate}%`} icon={Activity} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" trend={fillRate >= 95 ? "On target" : "Below target"} trendUp={fillRate >= 95} />
      </div>

      {/* Hour-by-hour fill rate bar */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Hourly Fill Rate</h2>
        <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
          <div className="flex gap-1 min-w-[600px]">
            {hours.map((h) => {
              const hourComm = entries.filter((e) => e.hour === h && e.contentType === "Commercial");
              const hSched = hourComm.length;
              const hAired = hourComm.filter((e) => e.status === "Aired").length;
              const pct = hSched > 0 ? Math.round((hAired / hSched) * 100) : 100;
              const isSelected = filterHour === h;
              return (
                <button
                  key={h}
                  onClick={() => setFilterHour(isSelected ? null : h)}
                  className={`flex-1 text-center rounded-lg p-2 transition-all ${isSelected ? "ring-2 ring-[#74ddc7]" : "hover:bg-muted/30"}`}
                >
                  <div className="text-[10px] text-muted-foreground">{h > 12 ? `${h - 12}P` : h === 12 ? "12P" : `${h}A`}</div>
                  <div className="relative h-12 bg-muted/20 rounded mt-1">
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded transition-all ${
                        pct === 100 ? "bg-emerald-500/40" : pct >= 80 ? "bg-yellow-500/40" : "bg-red-500/40"
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{pct}%</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Filter:</span>
        {["all", "Commercial", "PSA", "Promo", "Music", "Talk"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterType === t
                ? "border-[#74ddc7] bg-[#74ddc7]/10 text-[#74ddc7]"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all" ? "All Types" : t}
          </button>
        ))}
        {filterHour !== null && (
          <button
            onClick={() => setFilterHour(null)}
            className="px-3 py-1 text-xs rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400"
          >
            Hour: {filterHour > 12 ? `${filterHour - 12} PM` : filterHour === 12 ? "12 PM" : `${filterHour} AM`} x
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search client or title..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)}
      />
    </div>
  );
}
