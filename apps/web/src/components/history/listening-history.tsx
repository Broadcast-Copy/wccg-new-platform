"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radio,
  Headphones,
  Podcast,
  Info,
  Clock,
  Search,
  Filter,
  Music,
  History,
  TrendingUp,
  CalendarDays,
  RotateCcw,
  Timer,
  Square,
  Award,
  Eye,
  EyeOff,
  ChevronDown,
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
  getSessions,
  type HistoryEntry,
} from "@/lib/listening-history";
import {
  fetchTodaySongs,
  formatTime as formatSongTime,
  type SongHistoryEntry,
} from "@/lib/song-history";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import {
  getListeningPoints,
  getListeningProgress,
} from "@/hooks/use-listening-points";
import {
  SongDetailModal,
  useSongDetailModal,
} from "@/components/song-detail-modal";

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

export function ListeningHistory() {
  const [contentType, setContentType] = useState<ContentType>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Initialize with data immediately to avoid flash of empty state on navigation
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => {
    try { return getHistoryEntries(); } catch { return []; }
  });
  const [showMissed, setShowMissed] = useState(false);
  const [stats, setStats] = useState(() => {
    try { return getListeningStats(); } catch {
      return {
        totalHours: 0,
        remainingMinutes: 0,
        totalSessions: 0,
        totalTracks: 0,
        topArtist: "—",
        activeSessions: 0,
        lastSessionDate: null as string | null,
        lastSessionTimestamp: null as string | null,
      };
    }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [missedSongs, setMissedSongs] = useState<SongHistoryEntry[]>([]);
  const [missedLoading, setMissedLoading] = useState(false);

  const { open: openStreamPlayer } = useStreamPlayer();
  const songModal = useSongDetailModal();

  // Load history from localStorage
  useEffect(() => {
    setHistoryEntries(getHistoryEntries());
    setStats(getListeningStats());
  }, [refreshKey]);

  // Fetch "Songs You Missed" when toggled on
  useEffect(() => {
    if (!showMissed) return;
    let cancelled = false;
    setMissedLoading(true);

    async function load() {
      try {
        const stationSongs = await fetchTodaySongs("WCCG", 50);

        // Get all listening sessions to find time ranges when user was listening
        const sessions = getSessions();
        const listeningRanges: { start: number; end: number }[] = sessions.map(
          (s) => ({
            start: new Date(s.startedAt).getTime(),
            end: s.endedAt ? new Date(s.endedAt).getTime() : Date.now(),
          }),
        );

        // A song is "missed" if it played while the user was NOT in any session
        const missed = stationSongs.filter((song) => {
          const playedAt = new Date(song.played_at).getTime();
          return !listeningRanges.some(
            (r) => playedAt >= r.start && playedAt <= r.end,
          );
        });

        if (!cancelled) setMissedSongs(missed);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setMissedLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [showMissed, refreshKey]);

  // Refresh history every 10 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHistoryEntries(getHistoryEntries());
      setStats(getListeningStats());
    }, 10_000);
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

  // Separate active entries from completed ones
  const activeEntries = useMemo(
    () => filteredEntries.filter((e) => e.isActive),
    [filteredEntries],
  );
  const completedEntries = useMemo(
    () => filteredEntries.filter((e) => !e.isActive),
    [filteredEntries],
  );

  // Group completed entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {};
    for (const entry of completedEntries) {
      if (!groups[entry.dateGroup]) {
        groups[entry.dateGroup] = [];
      }
      groups[entry.dateGroup].push(entry);
    }
    return groups;
  }, [completedEntries]);

  const orderedGroups = DATE_GROUP_ORDER.filter(
    (group) => groupedEntries[group] && groupedEntries[group].length > 0
  );

  const hasAnyEntries = activeEntries.length > 0 || orderedGroups.length > 0;

  return (
    <>
      {/* ─── Songs You Missed Toggle ───────────────────────────────── */}
      {historyEntries.length > 0 && (
        <div className="flex justify-end -mt-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowMissed((v) => !v)}
          >
            {showMissed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            Songs You Missed
          </Button>
        </div>
      )}

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
                : "0h 0m"}
            </div>
            {stats.activeSessions > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Across {stats.totalSessions} session{stats.totalSessions !== 1 ? "s" : ""}
                <span className="text-[#74ddc7] ml-1">
                  ({stats.activeSessions} live now)
                </span>
              </p>
            )}
            {stats.lastSessionDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last session: {stats.lastSessionDate}{stats.lastSessionTimestamp ? ` at ${stats.lastSessionTimestamp}` : ""}
              </p>
            )}
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

      {/* ─── Active Sessions (Now Playing) ────────────────────────────── */}
      {activeEntries.length > 0 && (
        <ActiveSessionsSection
          entries={activeEntries}
          onSessionEnded={() => setRefreshKey((k) => k + 1)}
          onSongClick={(title, artist) => songModal.open({ title, artist })}
        />
      )}

      {/* ─── Songs You Missed ──────────────────────────────────────── */}
      {showMissed && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Music className="h-4 w-4 text-amber-500" />
              Songs You Missed
              <Badge variant="outline" className="ml-auto text-[10px] border-amber-500/30 text-amber-600">
                {missedSongs.length} songs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missedLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <RotateCcw className="h-4 w-4 animate-spin mr-2" />
                Loading station history...
              </div>
            ) : missedSongs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t missed any songs today! Keep listening.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {missedSongs.slice(0, 12).map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-card p-2.5 transition-colors hover:bg-muted/50"
                  >
                    {song.album_art ? (
                      <img
                        src={song.album_art}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                        <Music className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{song.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatSongTime(song.played_at)}
                      </span>
                      <button
                        className="text-[10px] text-amber-600 hover:text-amber-500 font-medium"
                        onClick={() =>
                          songModal.open({
                            title: song.title,
                            artist: song.artist,
                            playedAt: song.played_at,
                            albumArt: song.album_art,
                            album: song.album,
                            duration: song.duration,
                          })
                        }
                      >
                        More Info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── History List ────────────────────────────────────────────── */}
      {!hasAnyEntries ? (
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
                className="gap-1.5 bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80"
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
      ) : orderedGroups.length > 0 ? (
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
      ) : null}

      {/* ─── Summary Footer ──────────────────────────────────────────── */}
      {hasAnyEntries && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredEntries.length} of {historyEntries.length} sessions
          {stats.activeSessions > 0 && (
            <span className="text-[#74ddc7] ml-1">
              ({stats.activeSessions} active)
            </span>
          )}
        </div>
      )}

      {/* ─── Song Detail Modal ─────────────────────────────────────── */}
      <SongDetailModal
        isOpen={songModal.isOpen}
        onClose={songModal.close}
        title={songModal.title}
        artist={songModal.artist}
        playedAt={songModal.playedAt}
        albumArt={songModal.albumArt}
        album={songModal.album}
        duration={songModal.duration}
      />
    </>
  );
}

// ─── Active Sessions Section (single tile / accordion for multiples) ──

function ActiveSessionsSection({
  entries,
  onSessionEnded,
  onSongClick,
}: {
  entries: HistoryEntry[];
  onSessionEnded: () => void;
  onSongClick: (title: string, artist: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Always show the first (primary) session
  const primary = entries[0];
  const extras = entries.slice(1);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-3 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#74ddc7]" />
          </span>
          <h2 className="text-sm font-semibold text-[#74ddc7] uppercase tracking-wider">
            Listening Now
          </h2>
          {entries.length > 1 && (
            <Badge variant="secondary" className="text-[10px]">
              {entries.length} sessions
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {/* Primary active session — always visible */}
        <ActiveSessionItem
          entry={primary}
          onSessionEnded={onSessionEnded}
          onSongClick={onSongClick}
        />

        {/* If multiple sessions, show accordion toggle */}
        {extras.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-[#74ddc7] hover:text-[#74ddc7] hover:bg-[#74ddc7]/10"
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded
                ? "Hide additional sessions"
                : `Show ${extras.length} more active session${extras.length > 1 ? "s" : ""}`}
            </Button>

            {expanded && (
              <div className="space-y-2">
                {extras.map((entry) => (
                  <ActiveSessionItem
                    key={entry.id}
                    entry={entry}
                    onSessionEnded={onSessionEnded}
                    onSongClick={onSongClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Active Session Item Component ─────────────────────────────────────

/**
 * Renders an active (currently listening) session with:
 * - Real-time session duration (e.g., "1h 23m 45s")
 * - Accumulated points for the current session
 * - An "End Session" button that stops the audio player
 */
function ActiveSessionItem({
  entry,
  onSessionEnded,
  onSongClick,
}: {
  entry: HistoryEntry;
  onSessionEnded: () => void;
  onSongClick: (title: string, artist: string) => void;
}) {
  const { stop } = useAudioPlayer();
  const { close } = useStreamPlayer();

  // ── Real-time duration ──────────────────────────────────────────────
  const [elapsed, setElapsed] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Find the session startedAt from localStorage to get precise start time
    const sessions = getSessions();
    const session = sessions.find((s) => s.id === entry.id);
    const startTime = session
      ? new Date(session.startedAt).getTime()
      : Date.now();

    const tick = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(diff);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      if (h > 0) {
        setElapsed(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      } else if (m > 0) {
        setElapsed(`${m}m ${String(s).padStart(2, "0")}s`);
      } else {
        setElapsed(`${s}s`);
      }
    };

    tick(); // Initial tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [entry.id]);

  // ── Session points calculation ──────────────────────────────────────
  // 1 point per 90 seconds of listening
  const sessionPoints = Math.floor(elapsedSeconds / 90);
  const totalPoints = getListeningPoints();
  const progressToNext = getListeningProgress();

  // ── End session handler ─────────────────────────────────────────────
  const handleEndSession = useCallback(() => {
    stop();   // Stop audio playback
    close();  // Close stream player (ends listening tracker)
    // Small delay to let the tracker end the session in localStorage
    setTimeout(() => {
      onSessionEnded();
    }, 300);
  }, [stop, close, onSessionEnded]);

  return (
    <>
    <Card className="border-[#74ddc7]/30 bg-[#74ddc7]/5 transition-colors hover:bg-accent/50">
      <CardContent className="flex flex-col gap-3 py-3">
        {/* Top row: icon + info + end button */}
        <div className="flex items-center gap-4">
          {/* Content Type Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#74ddc7]/15">
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-50" />
              <Radio className="relative h-4 w-4 text-[#74ddc7]" />
            </span>
          </div>

          {/* Main Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{entry.streamName}</h3>
              <Badge className="shrink-0 text-[10px] border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7] animate-pulse">
                LIVE
              </Badge>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{entry.title !== entry.streamName ? entry.title : entry.artist}</span>
              <span>{entry.timestamp}</span>
              {entry.tracks.length > 0 && (
                <span className="text-[#74ddc7]">
                  {entry.tracks.length} track{entry.tracks.length !== 1 ? "s" : ""} heard
                </span>
              )}
            </div>
          </div>

          {/* End Session Button */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={handleEndSession}
          >
            <Square className="h-3 w-3" />
            <span className="hidden sm:inline">End Session</span>
          </Button>
        </div>

        {/* Bottom row: session duration + points */}
        <div className="flex flex-wrap items-center gap-4 pl-14">
          {/* Session Duration */}
          <div className="flex items-center gap-1.5 rounded-md bg-[#74ddc7]/10 px-2.5 py-1">
            <Timer className="h-3.5 w-3.5 text-[#74ddc7]" />
            <span className="text-sm font-mono font-semibold text-[#74ddc7]">
              {elapsed}
            </span>
            <span className="text-[10px] text-[#74ddc7]/70 uppercase tracking-wider">
              Session Duration
            </span>
          </div>

          {/* Session Points — links to Points & Rewards */}
          <Link href="/my/points" className="no-underline">
            <div className="flex items-center gap-1.5 rounded-md bg-[#7401df]/10 px-2.5 py-1 transition-colors hover:bg-[#7401df]/20 cursor-pointer">
              <Award className="h-3.5 w-3.5 text-[#7401df]" />
              <span className="text-sm font-semibold text-[#7401df]">
                {sessionPoints}
              </span>
              <span className="text-[10px] text-[#7401df]/70 uppercase tracking-wider">
                {sessionPoints === 1 ? "Point" : "Points"} earned
              </span>
              {/* Progress toward next point */}
              <div className="ml-1 h-1.5 w-12 rounded-full bg-[#7401df]/20">
                <div
                  className="h-1.5 rounded-full bg-[#7401df] transition-all"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          </Link>
        </div>

      </CardContent>
    </Card>

    {/* Track list — songs heard during this session, rendered outside the card */}
    {entry.tracks.length > 0 && (
      <div className="space-y-2 mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Songs This Session ({entry.tracks.length})
        </h4>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {entry.tracks.map((track, i) => (
            <button
              key={`${track.title}-${i}`}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:bg-muted/50 group w-full"
              onClick={() => onSongClick(track.title, track.artist)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#74ddc7]/10">
                <Music className="h-3.5 w-3.5 text-[#74ddc7]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{track.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
              </div>
              <Info className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    )}
  </>
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
    <Card
      className={`transition-colors hover:bg-accent/50 ${
        entry.isActive
          ? "border-[#74ddc7]/30 bg-[#74ddc7]/5"
          : ""
      }`}
    >
      <CardContent className="flex items-center gap-4 py-3">
        {/* Content Type Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            entry.isActive ? "bg-[#74ddc7]/15" : getContentBgColor(entry.type)
          }`}
        >
          {entry.isActive ? (
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-50" />
              <Radio className="relative h-4 w-4 text-[#74ddc7]" />
            </span>
          ) : (
            <span className={getContentColor(entry.type)}>
              {getContentIcon(entry.type)}
            </span>
          )}
        </div>

        {/* Main Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {entry.type === "live" ? entry.streamName : entry.title}
            </h3>
            {entry.isActive ? (
              <Badge className="shrink-0 text-[10px] border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7] animate-pulse">
                LIVE
              </Badge>
            ) : (
              <Badge className={`shrink-0 text-[10px] ${getContentBadgeStyle(entry.type)}`}>
                {entry.type === "live" ? entry.streamName : getContentLabel(entry.type)}
              </Badge>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{entry.type === "live" && entry.title !== entry.streamName ? entry.title : entry.artist}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {entry.listenedDuration}
              {entry.isActive && (
                <span className="text-[#74ddc7]"> (listening)</span>
              )}
              {hasProgress && !isComplete && (
                <span className="text-muted-foreground/60">
                  {" "}
                  / {entry.totalDuration}
                </span>
              )}
            </span>
            <span>{entry.timestamp}</span>
            {entry.isActive && entry.tracks.length > 0 && (
              <span className="text-[#74ddc7]">
                {entry.tracks.length} track{entry.tracks.length !== 1 ? "s" : ""} heard
              </span>
            )}
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

        {/* Listening Indicator / Replay */}
        {entry.isActive ? (
          <div className="flex items-center gap-1 shrink-0 text-[#74ddc7]">
            <div className="flex gap-0.5">
              <span className="inline-block w-0.5 h-3 bg-[#74ddc7] rounded-full animate-[bounce_1s_ease-in-out_infinite]" />
              <span className="inline-block w-0.5 h-3 bg-[#74ddc7] rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
              <span className="inline-block w-0.5 h-3 bg-[#74ddc7] rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-end shrink-0 gap-1">
            <Badge variant="outline" className={`text-[10px] ${getContentBadgeStyle(entry.type)}`}>
              {entry.listenedDuration}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
