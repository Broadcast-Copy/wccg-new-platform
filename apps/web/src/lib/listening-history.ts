/**
 * Listening History — Client-side storage via localStorage.
 *
 * Tracks user listening sessions from the SecureNet stream overlay.
 * Sessions record start/end times, duration, and the tracks that
 * were playing (from the now-playing API).
 *
 * Active (live) sessions are included in getHistoryEntries() with
 * real-time duration calculations so the history page updates live.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrackEntry {
  title: string;
  artist: string;
  albumArt: string | null;
  heardAt: string; // ISO date string
}

export interface ListeningSession {
  id: string;
  type: "live";
  title: string; // Last known show/track title
  artist: string; // Last known artist
  startedAt: string; // ISO date string
  endedAt: string | null; // null = still active
  durationSeconds: number;
  tracks: TrackEntry[];
}

// What the history page consumes — flattened from sessions
export interface HistoryEntry {
  id: string;
  type: "live" | "mix" | "podcast";
  title: string;
  artist: string;
  listenedDuration: string; // e.g. "2h 15m"
  totalDuration: string | null;
  listenedMinutes: number;
  totalMinutes: number | null;
  timestamp: string; // e.g. "8:00 AM" or "Feb 14, 8:00 PM"
  date: string; // YYYY-MM-DD
  dateGroup: "Today" | "Yesterday" | "This Week" | "Earlier This Month" | "Older";
  /** Whether this session is currently active (live listening right now) */
  isActive: boolean;
  /** Tracks heard during this session */
  tracks: TrackEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "wccg_listening_history";
const MAX_SESSIONS = 500; // Keep at most 500 sessions in localStorage
// Sessions older than 24h with endedAt === null are considered orphaned
const ORPHAN_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `ls-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDurationFromSeconds(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "< 1m";
}

function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (entryDate.getTime() === today.getTime()) {
    return time;
  }
  if (entryDate.getTime() === yesterday.getTime()) {
    return time;
  }

  // Same week
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  if (entryDate >= weekAgo) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    return `${dayName} ${time}`;
  }

  // Same month
  const monthStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${monthStr}, ${time}`;
}

function getDateGroup(isoDate: string): HistoryEntry["dateGroup"] {
  const date = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (entryDate.getTime() === today.getTime()) return "Today";
  if (entryDate.getTime() === yesterday.getTime()) return "Yesterday";

  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  if (entryDate >= weekAgo) return "This Week";

  // Same month/year
  if (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return "Earlier This Month";
  }

  return "Older";
}

function toDateString(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Storage operations
// ---------------------------------------------------------------------------

/** Get all saved sessions from localStorage */
export function getSessions(): ListeningSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ListeningSession[];
  } catch {
    return [];
  }
}

/** Save sessions to localStorage */
function saveSessions(sessions: ListeningSession[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only latest MAX_SESSIONS
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/** Create and store a new session, returns the session */
export function startSession(): ListeningSession {
  // End any orphaned active sessions first
  endOrphanedSessions();

  const session: ListeningSession = {
    id: generateId(),
    type: "live",
    title: "WCCG 104.5 FM",
    artist: "Live Stream",
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSeconds: 0,
    tracks: [],
  };

  const sessions = getSessions();
  sessions.unshift(session); // Add at the front (newest first)
  saveSessions(sessions);

  return session;
}

/** Update a session in storage (e.g., add track, update metadata) */
export function updateSession(
  sessionId: string,
  updates: Partial<Pick<ListeningSession, "title" | "artist" | "tracks" | "durationSeconds">>
): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;

  Object.assign(sessions[idx], updates);
  saveSessions(sessions);
}

/** Add a track to a session (only if title changed) */
export function addTrackToSession(
  sessionId: string,
  track: Omit<TrackEntry, "heardAt">
): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;

  const session = sessions[idx];
  const lastTrack = session.tracks[session.tracks.length - 1];

  // Only add if track title is different from the last entry
  if (lastTrack && lastTrack.title === track.title && lastTrack.artist === track.artist) {
    return;
  }

  session.tracks.push({
    ...track,
    heardAt: new Date().toISOString(),
  });

  // Update session title/artist to the latest track
  session.title = track.title;
  session.artist = track.artist;

  saveSessions(sessions);
}

/** End a session — set endedAt and final duration */
export function endSession(sessionId: string): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;

  const session = sessions[idx];
  const endTime = new Date();
  session.endedAt = endTime.toISOString();
  session.durationSeconds = Math.floor(
    (endTime.getTime() - new Date(session.startedAt).getTime()) / 1000
  );

  // Remove very short sessions (under 10 seconds — likely accidental)
  if (session.durationSeconds < 10) {
    sessions.splice(idx, 1);
  }

  saveSessions(sessions);
}

/**
 * End orphaned sessions — sessions that are still marked as active
 * but have been running for over 24 hours (likely from a crash/close).
 */
export function endOrphanedSessions(): void {
  const sessions = getSessions();
  const now = Date.now();
  let changed = false;

  for (const session of sessions) {
    if (session.endedAt === null) {
      const startTime = new Date(session.startedAt).getTime();
      if (now - startTime > ORPHAN_THRESHOLD_MS) {
        session.endedAt = new Date(startTime + (session.durationSeconds * 1000) || now).toISOString();
        if (session.durationSeconds === 0) {
          session.durationSeconds = Math.floor((now - startTime) / 1000);
        }
        changed = true;
      }
    }
  }

  if (changed) {
    saveSessions(sessions);
  }
}

/**
 * Convert sessions into HistoryEntry[] for the history page.
 *
 * Includes ACTIVE sessions (endedAt === null) with live-calculated duration
 * so the history page shows real-time listening data.
 */
export function getHistoryEntries(): HistoryEntry[] {
  const sessions = getSessions();
  const now = Date.now();

  return sessions
    .filter((s) => {
      // Include active sessions
      if (s.endedAt === null) return true;
      // Only include completed sessions with >=10 seconds
      return s.durationSeconds >= 10;
    })
    .map((s) => {
      const isActive = s.endedAt === null;
      // For active sessions, calculate live duration from startedAt to now
      const durationSeconds = isActive
        ? Math.floor((now - new Date(s.startedAt).getTime()) / 1000)
        : s.durationSeconds;
      const minutes = Math.max(1, Math.round(durationSeconds / 60));

      return {
        id: s.id,
        type: s.type,
        title: s.title,
        artist: s.artist,
        listenedDuration: formatDurationFromSeconds(durationSeconds),
        totalDuration: null, // Live streams have no total duration
        listenedMinutes: minutes,
        totalMinutes: null,
        timestamp: formatTimestamp(s.startedAt),
        date: toDateString(s.startedAt),
        dateGroup: getDateGroup(s.startedAt),
        isActive,
        tracks: s.tracks,
      };
    });
}

/** Get aggregate stats (includes active sessions) */
export function getListeningStats() {
  const entries = getHistoryEntries();
  const totalMinutes = entries.reduce((sum, e) => sum + e.listenedMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Count tracks across all sessions (including active)
  const totalTracks = entries.reduce((sum, e) => sum + e.tracks.length, 0);

  // Most-listened artist
  const artistCount: Record<string, number> = {};
  for (const entry of entries) {
    for (const track of entry.tracks) {
      const artist = track.artist || "Unknown";
      artistCount[artist] = (artistCount[artist] || 0) + 1;
    }
  }
  const topArtist =
    Object.entries(artistCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

  // Count active sessions
  const activeSessions = entries.filter((e) => e.isActive).length;

  return {
    totalHours,
    remainingMinutes,
    totalSessions: entries.length,
    totalTracks,
    topArtist,
    activeSessions,
  };
}

/** Clear all history (for settings/privacy) */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
