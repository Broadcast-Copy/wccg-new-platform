/**
 * Listening History — Client-side storage via localStorage.
 *
 * Tracks user listening sessions from the SecureNet stream overlay.
 * Sessions record start/end times, duration, and the tracks that
 * were playing (from the now-playing API).
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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "wccg_listening_history";
const MAX_SESSIONS = 500; // Keep at most 500 sessions in localStorage

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

/** Convert sessions into HistoryEntry[] for the history page */
export function getHistoryEntries(): HistoryEntry[] {
  const sessions = getSessions();

  return sessions
    .filter((s) => s.endedAt !== null) // Only completed sessions
    .filter((s) => s.durationSeconds >= 10) // Skip accidental opens
    .map((s) => {
      const minutes = Math.max(1, Math.round(s.durationSeconds / 60));
      return {
        id: s.id,
        type: s.type,
        title: s.title,
        artist: s.artist,
        listenedDuration: formatDurationFromSeconds(s.durationSeconds),
        totalDuration: null, // Live streams have no total duration
        listenedMinutes: minutes,
        totalMinutes: null,
        timestamp: formatTimestamp(s.startedAt),
        date: toDateString(s.startedAt),
        dateGroup: getDateGroup(s.startedAt),
      };
    });
}

/** Get aggregate stats */
export function getListeningStats() {
  const entries = getHistoryEntries();
  const totalMinutes = entries.reduce((sum, e) => sum + e.listenedMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Count unique tracks across all sessions
  const sessions = getSessions().filter((s) => s.endedAt !== null);
  const totalTracks = sessions.reduce((sum, s) => sum + s.tracks.length, 0);

  // Most-listened artist
  const artistCount: Record<string, number> = {};
  for (const session of sessions) {
    for (const track of session.tracks) {
      const artist = track.artist || "Unknown";
      artistCount[artist] = (artistCount[artist] || 0) + 1;
    }
  }
  const topArtist =
    Object.entries(artistCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

  return {
    totalHours,
    remainingMinutes,
    totalSessions: entries.length,
    totalTracks,
    topArtist,
  };
}

/** Clear all history (for settings/privacy) */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
