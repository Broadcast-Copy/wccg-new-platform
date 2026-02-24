"use client";

import { useState, useMemo } from "react";
import {
  Radio,
  Headphones,
  Podcast,
  Play,
  Clock,
  Search,
  Filter,
  Music,
  History,
  TrendingUp,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ─────────────────────────────────────────────────────────────

type ContentType = "all" | "live" | "mix" | "podcast";
type DateRange = "today" | "week" | "month" | "all";

interface HistoryEntry {
  id: string;
  type: "live" | "mix" | "podcast";
  title: string;
  artist: string;
  listenedDuration: string;
  totalDuration: string | null;
  listenedMinutes: number;
  totalMinutes: number | null;
  timestamp: string;
  date: string;
  dateGroup: "Today" | "Yesterday" | "This Week" | "Earlier This Month" | "Older";
}

// ─── Mock Data ─────────────────────────────────────────────────────────

const MOCK_HISTORY: HistoryEntry[] = [
  // Today
  {
    id: "h-001",
    type: "live",
    title: "Streetz Morning Takeover",
    artist: "DJ Streetz",
    listenedDuration: "2h 15m",
    totalDuration: null,
    listenedMinutes: 135,
    totalMinutes: null,
    timestamp: "8:00 AM",
    date: "2026-02-24",
    dateGroup: "Today",
  },
  {
    id: "h-002",
    type: "live",
    title: "Way Up with Angela Yee",
    artist: "Angela Yee",
    listenedDuration: "45m",
    totalDuration: null,
    listenedMinutes: 45,
    totalMinutes: null,
    timestamp: "10:30 AM",
    date: "2026-02-24",
    dateGroup: "Today",
  },
  {
    id: "h-003",
    type: "mix",
    title: "Summer Vibes Vol. 3",
    artist: "DJ SpinWiz",
    listenedDuration: "32m",
    totalDuration: "1h 05m",
    listenedMinutes: 32,
    totalMinutes: 65,
    timestamp: "1:15 PM",
    date: "2026-02-24",
    dateGroup: "Today",
  },
  {
    id: "h-004",
    type: "podcast",
    title: "The Culture Corner - Ep. 88",
    artist: "Marcus James",
    listenedDuration: "22m",
    totalDuration: "48m",
    listenedMinutes: 22,
    totalMinutes: 48,
    timestamp: "3:45 PM",
    date: "2026-02-24",
    dateGroup: "Today",
  },
  // Yesterday
  {
    id: "h-005",
    type: "live",
    title: "Posted on the Corner",
    artist: "Big Ced",
    listenedDuration: "1h 30m",
    totalDuration: null,
    listenedMinutes: 90,
    totalMinutes: null,
    timestamp: "7:00 PM",
    date: "2026-02-23",
    dateGroup: "Yesterday",
  },
  {
    id: "h-006",
    type: "podcast",
    title: "Bootleg Kev Show - Highlights Ep. 42",
    artist: "Bootleg Kev",
    listenedDuration: "28m",
    totalDuration: "28m",
    listenedMinutes: 28,
    totalMinutes: 28,
    timestamp: "3:20 PM",
    date: "2026-02-23",
    dateGroup: "Yesterday",
  },
  {
    id: "h-007",
    type: "mix",
    title: "Late Night R&B Mix",
    artist: "DJ Rayn",
    listenedDuration: "55m",
    totalDuration: "1h 20m",
    listenedMinutes: 55,
    totalMinutes: 80,
    timestamp: "11:00 PM",
    date: "2026-02-23",
    dateGroup: "Yesterday",
  },
  {
    id: "h-008",
    type: "live",
    title: "Afternoon Drive",
    artist: "Tasha K",
    listenedDuration: "1h 10m",
    totalDuration: null,
    listenedMinutes: 70,
    totalMinutes: null,
    timestamp: "4:00 PM",
    date: "2026-02-23",
    dateGroup: "Yesterday",
  },
  // This Week
  {
    id: "h-009",
    type: "live",
    title: "Sunday Snacks",
    artist: "Chef Mike",
    listenedDuration: "3h 12m",
    totalDuration: null,
    listenedMinutes: 192,
    totalMinutes: null,
    timestamp: "Sun 7:00 PM",
    date: "2026-02-22",
    dateGroup: "This Week",
  },
  {
    id: "h-010",
    type: "podcast",
    title: "Way Up Recap - Weekly",
    artist: "Angela Yee",
    listenedDuration: "15m",
    totalDuration: "15m",
    listenedMinutes: 15,
    totalMinutes: 15,
    timestamp: "Sat 9:00 AM",
    date: "2026-02-21",
    dateGroup: "This Week",
  },
  {
    id: "h-011",
    type: "mix",
    title: "Club Bangers 2026",
    artist: "DJ TommyGee",
    listenedDuration: "1h 08m",
    totalDuration: "1h 08m",
    listenedMinutes: 68,
    totalMinutes: 68,
    timestamp: "Fri 10:00 PM",
    date: "2026-02-20",
    dateGroup: "This Week",
  },
  {
    id: "h-012",
    type: "live",
    title: "The Bootleg Kev Show",
    artist: "Bootleg Kev",
    listenedDuration: "2h 45m",
    totalDuration: null,
    listenedMinutes: 165,
    totalMinutes: null,
    timestamp: "Thu 12:00 PM",
    date: "2026-02-19",
    dateGroup: "This Week",
  },
  {
    id: "h-013",
    type: "podcast",
    title: "WCCG Community Voices - Ep. 19",
    artist: "Reverend Thomas",
    listenedDuration: "38m",
    totalDuration: "42m",
    listenedMinutes: 38,
    totalMinutes: 42,
    timestamp: "Thu 8:30 AM",
    date: "2026-02-19",
    dateGroup: "This Week",
  },
  {
    id: "h-014",
    type: "mix",
    title: "Throwback Thursday Mix",
    artist: "DJ Streetz",
    listenedDuration: "47m",
    totalDuration: "47m",
    listenedMinutes: 47,
    totalMinutes: 47,
    timestamp: "Thu 6:00 PM",
    date: "2026-02-19",
    dateGroup: "This Week",
  },
  {
    id: "h-015",
    type: "live",
    title: "Midday Vibes",
    artist: "Tasha K",
    listenedDuration: "1h 55m",
    totalDuration: null,
    listenedMinutes: 115,
    totalMinutes: null,
    timestamp: "Wed 12:00 PM",
    date: "2026-02-18",
    dateGroup: "This Week",
  },
  {
    id: "h-016",
    type: "mix",
    title: "Gospel Sundays Mix",
    artist: "DJ Grace",
    listenedDuration: "1h 22m",
    totalDuration: "1h 30m",
    listenedMinutes: 82,
    totalMinutes: 90,
    timestamp: "Wed 9:00 AM",
    date: "2026-02-18",
    dateGroup: "This Week",
  },
  {
    id: "h-017",
    type: "podcast",
    title: "Hip-Hop Headlines - Ep. 201",
    artist: "Marcus James",
    listenedDuration: "35m",
    totalDuration: "35m",
    listenedMinutes: 35,
    totalMinutes: 35,
    timestamp: "Tue 7:15 PM",
    date: "2026-02-17",
    dateGroup: "This Week",
  },
  {
    id: "h-018",
    type: "live",
    title: "Late Night Slow Jams",
    artist: "DJ Rayn",
    listenedDuration: "2h 05m",
    totalDuration: null,
    listenedMinutes: 125,
    totalMinutes: null,
    timestamp: "Tue 10:00 PM",
    date: "2026-02-17",
    dateGroup: "This Week",
  },
  // Earlier This Month
  {
    id: "h-019",
    type: "live",
    title: "Streetz Morning Takeover",
    artist: "DJ Streetz",
    listenedDuration: "2h 30m",
    totalDuration: null,
    listenedMinutes: 150,
    totalMinutes: null,
    timestamp: "Feb 14, 8:00 AM",
    date: "2026-02-14",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-020",
    type: "mix",
    title: "Valentine's Day Special Mix",
    artist: "DJ Rayn",
    listenedDuration: "1h 45m",
    totalDuration: "1h 45m",
    listenedMinutes: 105,
    totalMinutes: 105,
    timestamp: "Feb 14, 8:00 PM",
    date: "2026-02-14",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-021",
    type: "podcast",
    title: "Black History Month Special - Pt. 2",
    artist: "Reverend Thomas",
    listenedDuration: "52m",
    totalDuration: "55m",
    listenedMinutes: 52,
    totalMinutes: 55,
    timestamp: "Feb 12, 10:00 AM",
    date: "2026-02-12",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-022",
    type: "live",
    title: "Saturday Night Live on WCCG",
    artist: "DJ TommyGee",
    listenedDuration: "4h 00m",
    totalDuration: null,
    listenedMinutes: 240,
    totalMinutes: null,
    timestamp: "Feb 8, 9:00 PM",
    date: "2026-02-08",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-023",
    type: "mix",
    title: "Trap Essentials Vol. 12",
    artist: "DJ SpinWiz",
    listenedDuration: "38m",
    totalDuration: "52m",
    listenedMinutes: 38,
    totalMinutes: 52,
    timestamp: "Feb 7, 2:30 PM",
    date: "2026-02-07",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-024",
    type: "podcast",
    title: "Black History Month Special - Pt. 1",
    artist: "Reverend Thomas",
    listenedDuration: "48m",
    totalDuration: "48m",
    listenedMinutes: 48,
    totalMinutes: 48,
    timestamp: "Feb 5, 10:00 AM",
    date: "2026-02-05",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-025",
    type: "live",
    title: "Way Up with Angela Yee",
    artist: "Angela Yee",
    listenedDuration: "1h 12m",
    totalDuration: null,
    listenedMinutes: 72,
    totalMinutes: null,
    timestamp: "Feb 3, 10:00 AM",
    date: "2026-02-03",
    dateGroup: "Earlier This Month",
  },
  {
    id: "h-026",
    type: "mix",
    title: "New Month New Vibes",
    artist: "DJ Grace",
    listenedDuration: "1h 00m",
    totalDuration: "1h 00m",
    listenedMinutes: 60,
    totalMinutes: 60,
    timestamp: "Feb 1, 6:00 PM",
    date: "2026-02-01",
    dateGroup: "Earlier This Month",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getContentIcon(type: HistoryEntry["type"]) {
  switch (type) {
    case "live":
      return <Radio className="h-4 w-4" />;
    case "mix":
      return <Headphones className="h-4 w-4" />;
    case "podcast":
      return <Podcast className="h-4 w-4" />;
  }
}

function getContentColor(type: HistoryEntry["type"]): string {
  switch (type) {
    case "live":
      return "text-red-500";
    case "mix":
      return "text-teal-500";
    case "podcast":
      return "text-purple-500";
  }
}

function getContentBgColor(type: HistoryEntry["type"]): string {
  switch (type) {
    case "live":
      return "bg-red-500/10";
    case "mix":
      return "bg-teal-500/10";
    case "podcast":
      return "bg-purple-500/10";
  }
}

function getContentBadgeStyle(type: HistoryEntry["type"]): string {
  switch (type) {
    case "live":
      return "border-red-500/30 bg-red-500/10 text-red-500";
    case "mix":
      return "border-teal-500/30 bg-teal-500/10 text-teal-500";
    case "podcast":
      return "border-purple-500/30 bg-purple-500/10 text-purple-500";
  }
}

function getContentLabel(type: HistoryEntry["type"]): string {
  switch (type) {
    case "live":
      return "Live Stream";
    case "mix":
      return "DJ Mix";
    case "podcast":
      return "Podcast";
  }
}

function filterByDateRange(entries: HistoryEntry[], range: DateRange): HistoryEntry[] {
  if (range === "all") return entries;

  const allowedGroups: Record<DateRange, HistoryEntry["dateGroup"][]> = {
    today: ["Today"],
    week: ["Today", "Yesterday", "This Week"],
    month: ["Today", "Yesterday", "This Week", "Earlier This Month"],
    all: ["Today", "Yesterday", "This Week", "Earlier This Month", "Older"],
  };

  return entries.filter((e) => allowedGroups[range].includes(e.dateGroup));
}

// ─── Content Type Filter Buttons ───────────────────────────────────────

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <Music className="h-3.5 w-3.5" /> },
  { value: "live", label: "Live Streams", icon: <Radio className="h-3.5 w-3.5" /> },
  { value: "mix", label: "DJ Mixes", icon: <Headphones className="h-3.5 w-3.5" /> },
  { value: "podcast", label: "Podcasts", icon: <Podcast className="h-3.5 w-3.5" /> },
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

// ─── Date Group Ordering ───────────────────────────────────────────────

const DATE_GROUP_ORDER: HistoryEntry["dateGroup"][] = [
  "Today",
  "Yesterday",
  "This Week",
  "Earlier This Month",
  "Older",
];

// ─── Component ─────────────────────────────────────────────────────────

export default function ListeningHistoryPage() {
  const [contentType, setContentType] = useState<ContentType>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter entries
  const filteredEntries = useMemo(() => {
    let entries = MOCK_HISTORY;

    // Filter by content type
    if (contentType !== "all") {
      entries = entries.filter((e) => e.type === contentType);
    }

    // Filter by date range
    entries = filterByDateRange(entries, dateRange);

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.artist.toLowerCase().includes(q)
      );
    }

    return entries;
  }, [contentType, dateRange, searchQuery]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {};
    for (const entry of filteredEntries) {
      if (!groups[entry.dateGroup]) {
        groups[entry.dateGroup] = [];
      }
      groups[entry.dateGroup].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  const orderedGroups = DATE_GROUP_ORDER.filter(
    (group) => groupedEntries[group] && groupedEntries[group].length > 0
  );

  // Stats
  const totalMinutes = MOCK_HISTORY.reduce((sum, e) => sum + e.listenedMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Listening History</h1>
        <p className="text-muted-foreground">
          Everything you have listened to on WCCG 104.5 FM
        </p>
      </div>

      {/* ─── Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Listen Time */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Listen Time
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7401df]/10">
                <Clock className="h-4 w-4 text-[#7401df]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalHours}h {remainingMinutes}m
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-emerald-500">+3h 12m</span> from last week
            </p>
          </CardContent>
        </Card>

        {/* Tracks Played */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tracks Played
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                <TrendingUp className="h-4 w-4 text-teal-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,847</div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-emerald-500">+124</span> this month
            </p>
          </CardContent>
        </Card>

        {/* Favorite Genre */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Favorite Genre
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <Music className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hip-Hop</div>
            <p className="mt-1 text-xs text-muted-foreground">
              68% of your listening time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filter Bar ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4">
          {/* Content Type Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Filter:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_TYPES.map((ct) => (
                <Button
                  key={ct.value}
                  variant={contentType === ct.value ? "default" : "outline"}
                  size="sm"
                  className={
                    contentType === ct.value
                      ? "gap-1.5 bg-[#7401df] hover:bg-[#7401df]/90"
                      : "gap-1.5"
                  }
                  onClick={() => setContentType(ct.value)}
                >
                  {ct.icon}
                  {ct.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range + Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {DATE_RANGES.map((dr) => (
                <Button
                  key={dr.value}
                  variant={dateRange === dr.value ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDateRange(dr.value)}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {dr.label}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or artist..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── History List ────────────────────────────────────────────── */}
      {orderedGroups.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                No listening history found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search to find what you are
                looking for.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setContentType("all");
                setDateRange("all");
                setSearchQuery("");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orderedGroups.map((group) => (
            <div key={group}>
              {/* Sticky Date Group Header */}
              <div className="sticky top-0 z-10 -mx-1 mb-3 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {group}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {groupedEntries[group].length}{" "}
                    {groupedEntries[group].length === 1 ? "item" : "items"}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {groupedEntries[group].map((entry) => (
                  <HistoryItem key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Summary Footer ──────────────────────────────────────────── */}
      {orderedGroups.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredEntries.length} of {MOCK_HISTORY.length} entries
        </div>
      )}
    </div>
  );
}

// ─── History Item Component ────────────────────────────────────────────

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const hasProgress = entry.totalMinutes !== null && entry.totalMinutes > 0;
  const progressPercent = hasProgress
    ? Math.min(
        Math.round((entry.listenedMinutes / entry.totalMinutes!) * 100),
        100
      )
    : null;
  const isComplete = progressPercent === 100;

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardContent className="flex items-center gap-4 py-3">
        {/* Content Type Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getContentBgColor(
            entry.type
          )}`}
        >
          <span className={getContentColor(entry.type)}>
            {getContentIcon(entry.type)}
          </span>
        </div>

        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
            <Badge className={`shrink-0 text-[10px] ${getContentBadgeStyle(entry.type)}`}>
              {getContentLabel(entry.type)}
            </Badge>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{entry.artist}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {entry.listenedDuration}
              {hasProgress && !isComplete && (
                <span className="text-muted-foreground/60">
                  {" "}
                  / {entry.totalDuration}
                </span>
              )}
            </span>
            <span>{entry.timestamp}</span>
          </div>

          {/* Progress Bar (for partially listened content) */}
          {hasProgress && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isComplete
                      ? "bg-emerald-500"
                      : entry.type === "mix"
                        ? "bg-teal-500"
                        : "bg-purple-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {isComplete ? "Completed" : `${progressPercent}%`}
              </span>
            </div>
          )}
        </div>

        {/* Play Again Button */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
        >
          <Play className="h-3 w-3" />
          <span className="hidden sm:inline">Play Again</span>
        </Button>
      </CardContent>
    </Card>
  );
}
