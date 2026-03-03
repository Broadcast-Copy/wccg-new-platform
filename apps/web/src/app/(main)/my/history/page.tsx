"use client";

import { useState, useMemo, useEffect } from "react";
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
  Trash2,
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
import {
  getHistoryEntries,
  getListeningStats,
  clearHistory,
  type HistoryEntry,
} from "@/lib/listening-history";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

// ─── Types ─────────────────────────────────────────────────────────────

type ContentType = "all" | "live" | "mix" | "podcast";
type DateRange = "today" | "week" | "month" | "all";

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
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState({
    totalHours: 0,
    remainingMinutes: 0,
    totalSessions: 0,
    totalTracks: 0,
    topArtist: "—",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const { open: openStreamPlayer } = useStreamPlayer();

  // Load history from localStorage
  useEffect(() => {
    setHistoryEntries(getHistoryEntries());
    setStats(getListeningStats());
  }, [refreshKey]);

  // Refresh history every 30 seconds to pick up active session changes
  useEffect(() => {
    const interval = setInterval(() => {
      setHistoryEntries(getHistoryEntries());
      setStats(getListeningStats());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let entries = historyEntries;

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
  }, [contentType, dateRange, searchQuery, historyEntries]);

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

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all listening history? This cannot be undone.")) {
      clearHistory();
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listening History</h1>
          <p className="text-muted-foreground">
            Everything you have listened to on WCCG 104.5 FM
          </p>
        </div>
        {historyEntries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-500/10"
            onClick={handleClearHistory}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear History
          </Button>
        )}
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
              {stats.totalHours > 0 || stats.remainingMinutes > 0
                ? `${stats.totalHours}h ${stats.remainingMinutes}m`
                : "0m"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {stats.totalSessions} session{stats.totalSessions !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Tracks Heard */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tracks Heard
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                <TrendingUp className="h-4 w-4 text-teal-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTracks.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Unique songs identified
            </p>
          </CardContent>
        </Card>

        {/* Top Artist */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Heard Artist
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <Music className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.topArtist}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on track plays
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
                {historyEntries.length === 0
                  ? "No listening history yet"
                  : "No listening history found"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                {historyEntries.length === 0
                  ? "Start listening to WCCG 104.5 FM and your history will appear here automatically."
                  : "Try adjusting your filters or search to find what you are looking for."}
              </p>
            </div>
            {historyEntries.length === 0 ? (
              <Button
                size="sm"
                className="gap-1.5 bg-[#74ddc7] text-background hover:bg-[#74ddc7]/80"
                onClick={openStreamPlayer}
              >
                <Radio className="h-3.5 w-3.5" />
                Listen Live
              </Button>
            ) : (
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
            )}
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
                    {groupedEntries[group].length === 1 ? "session" : "sessions"}
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
          Showing {filteredEntries.length} of {historyEntries.length} sessions
        </div>
      )}
    </div>
  );
}

// ─── History Item Component ────────────────────────────────────────────

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const { open: openStreamPlayer } = useStreamPlayer();

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
          onClick={openStreamPlayer}
        >
          <Play className="h-3 w-3" />
          <span className="hidden sm:inline">Listen</span>
        </Button>
      </CardContent>
    </Card>
  );
}
