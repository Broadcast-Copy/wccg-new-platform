/**
 * Station Song History — fetches playlist data from SongIQ / SecureNet.
 *
 * Primary source: SongIQ JSON endpoint (live, no auth needed).
 * Fallback: Supabase `song_history` table.
 *
 * This is the STATION-wide playlist (every song that played), as opposed
 * to the per-user listening-history.ts (only songs a user personally heard).
 */

import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SONGIQ_URL =
  "https://streamdb7web.securenetsystems.net/player_status_update/WCCG_history.txt";

// Module-level cache to avoid redundant network calls
let _songIQCache: { data: SongHistoryEntry[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SongHistoryEntry {
  id: string;
  title: string;
  artist: string;
  album_art: string | null;
  album: string | null;
  duration: number | null; // seconds
  stream_id: string;
  played_at: string; // ISO timestamp
}

export interface SongHistoryGroup {
  label: string; // "Now", "Earlier Today", "Yesterday", etc.
  songs: SongHistoryEntry[];
}

// SongIQ JSON shape
interface SongIQSong {
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  programStartTS: string; // "13 Mar 2026 15:49:56"
}

interface SongIQResponse {
  playHistory: {
    song: SongIQSong[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (entryDate.getTime() === today.getTime()) return "Today";
  if (entryDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get the current Eastern Time UTC offset, accounting for EDT/EST.
 * EDT (March–November): -0400
 * EST (November–March): -0500
 */
function getEasternOffset(): string {
  // Create a date and check if it's in EDT or EST by comparing
  // the timezone offset for a date in the Eastern timezone
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  // If standard offset differs from current, DST is active
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  // Use a reliable method: check if a known Eastern city is in DST
  try {
    const eastern = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "short",
    }).format(now);
    if (eastern.includes("EDT")) return "-0400";
    if (eastern.includes("EST")) return "-0500";
  } catch {
    // Fallback
  }
  // Fallback: assume EDT in summer, EST in winter
  const month = now.getMonth(); // 0-indexed
  return month >= 2 && month <= 10 ? "-0400" : "-0500";
}

/**
 * Parse SongIQ timestamp "13 Mar 2026 15:49:56" → ISO string.
 * Dynamically detects EST vs EDT.
 */
function parseSongIQTimestamp(ts: string): string {
  // Format: "DD Mon YYYY HH:MM:SS"
  const offset = getEasternOffset();
  const d = new Date(ts + ` GMT${offset}`);
  if (isNaN(d.getTime())) {
    // Fallback — let the browser parse it
    return new Date(ts).toISOString();
  }
  return d.toISOString();
}

/**
 * Convert a SongIQ song to our standard format.
 */
function songIQToEntry(song: SongIQSong, index: number): SongHistoryEntry {
  return {
    id: `songiq-${index}-${song.programStartTS}`,
    title: song.title,
    artist: song.artist,
    album_art: song.cover || null,
    album: song.album || null,
    duration: song.duration ? parseInt(song.duration, 10) || null : null,
    stream_id: "WCCG",
    played_at: parseSongIQTimestamp(song.programStartTS),
  };
}

// ---------------------------------------------------------------------------
// SongIQ Fetch (primary)
// ---------------------------------------------------------------------------

async function fetchFromSongIQ(): Promise<SongHistoryEntry[] | null> {
  // Return cached data if fresh enough
  if (_songIQCache && Date.now() - _songIQCache.timestamp < CACHE_TTL_MS) {
    return _songIQCache.data;
  }

  try {
    const resp = await fetch(SONGIQ_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return _songIQCache?.data ?? null;

    const json: SongIQResponse = await resp.json();
    const songs = json?.playHistory?.song;
    if (!Array.isArray(songs) || songs.length === 0) return _songIQCache?.data ?? null;

    const entries = songs.map((s, i) => songIQToEntry(s, i));
    _songIQCache = { data: entries, timestamp: Date.now() };
    return entries;
  } catch {
    // Return stale cache rather than nothing
    return _songIQCache?.data ?? null;
  }
}

// ---------------------------------------------------------------------------
// Supabase Fetch (fallback)
// ---------------------------------------------------------------------------

async function fetchFromSupabase(
  streamId: string,
  limit: number,
): Promise<SongHistoryEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("song_history")
    .select("id, title, artist, album_art, stream_id, played_at")
    .eq("stream_id", streamId)
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("Failed to fetch song history from Supabase:", error?.message);
    return [];
  }

  // Add missing fields with defaults for Supabase rows
  return (data as Array<Omit<SongHistoryEntry, "album" | "duration">>).map(
    (row) => ({ ...row, album: null, duration: null }),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the station's song history.
 * Tries SongIQ first, falls back to Supabase.
 * Returns the most recent songs, grouped by date.
 */
export async function fetchSongHistory(
  streamId = "WCCG",
  limit = 50,
): Promise<{ songs: SongHistoryEntry[]; groups: SongHistoryGroup[] }> {
  // Try SongIQ first
  let songs = await fetchFromSongIQ();

  // Fallback to Supabase
  if (!songs || songs.length === 0) {
    songs = await fetchFromSupabase(streamId, limit);
  }

  if (songs.length === 0) {
    return { songs: [], groups: [] };
  }

  // Apply limit
  songs = songs.slice(0, limit);

  // Group by date
  const groupMap = new Map<string, SongHistoryEntry[]>();
  for (const song of songs) {
    const label = getDateLabel(song.played_at);
    const arr = groupMap.get(label) || [];
    arr.push(song);
    groupMap.set(label, arr);
  }

  const groups: SongHistoryGroup[] = [];
  for (const [label, entries] of groupMap) {
    groups.push({ label, songs: entries });
  }

  return { songs, groups };
}

/**
 * Fetch today's song history only.
 * Tries SongIQ first (which only returns recent songs anyway).
 */
export async function fetchTodaySongs(
  streamId = "WCCG",
  limit = 30,
): Promise<SongHistoryEntry[]> {
  // Try SongIQ first — it returns the most recent ~30 songs
  const songIQSongs = await fetchFromSongIQ();
  if (songIQSongs && songIQSongs.length > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return songIQSongs
      .filter((s) => new Date(s.played_at).getTime() >= todayStart.getTime())
      .slice(0, limit);
  }

  // Fallback to Supabase
  const supabase = createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("song_history")
    .select("id, title, artist, album_art, stream_id, played_at")
    .eq("stream_id", streamId)
    .gte("played_at", todayStart.toISOString())
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as Array<Omit<SongHistoryEntry, "album" | "duration">>).map(
    (row) => ({ ...row, album: null, duration: null }),
  );
}

export { formatTime };
