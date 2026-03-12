/**
 * Station Song History — fetches the full playlist log from Supabase.
 *
 * This is the STATION-wide playlist (every song that played), as opposed
 * to the per-user listening-history.ts (only songs a user personally heard).
 */

import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SongHistoryEntry {
  id: string;
  title: string;
  artist: string;
  album_art: string | null;
  stream_id: string;
  played_at: string; // ISO timestamp
}

export interface SongHistoryGroup {
  label: string; // "Now", "Earlier Today", "Yesterday", etc.
  songs: SongHistoryEntry[];
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

// ---------------------------------------------------------------------------
// Fetch from Supabase
// ---------------------------------------------------------------------------

/**
 * Fetch the station's song history from Supabase.
 * Returns the most recent `limit` songs, grouped by date.
 */
export async function fetchSongHistory(
  streamId = "WCCG",
  limit = 50,
): Promise<{ songs: SongHistoryEntry[]; groups: SongHistoryGroup[] }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("song_history")
    .select("id, title, artist, album_art, stream_id, played_at")
    .eq("stream_id", streamId)
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.warn("Failed to fetch song history:", error?.message);
    return { songs: [], groups: [] };
  }

  const songs = data as SongHistoryEntry[];

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
 */
export async function fetchTodaySongs(
  streamId = "WCCG",
  limit = 30,
): Promise<SongHistoryEntry[]> {
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

  return data as SongHistoryEntry[];
}

export { formatTime };
