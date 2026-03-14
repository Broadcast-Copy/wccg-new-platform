/**
 * Playlists / My Mix — localStorage persistence for user-specific playlists.
 *
 * Each user's playlists are stored under `wccg_playlists_{email}`.
 * Playlists contain songs saved from listening history or now-playing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Song {
  title: string;
  artist: string;
  albumArt?: string;
  addedAt: string; // ISO date string
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songs: Song[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageKey(email: string): string {
  return `wccg_playlists_${email}`;
}

function generateId(): string {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Load all playlists for a user */
export function loadPlaylists(email: string): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw) as Playlist[];
  } catch {
    // ignore
  }
  return [];
}

/** Save (upsert) a playlist for a user */
export function savePlaylist(email: string, playlist: Playlist): void {
  if (typeof window === "undefined") return;
  try {
    const playlists = loadPlaylists(email);
    const idx = playlists.findIndex((p) => p.id === playlist.id);

    if (idx >= 0) {
      playlists[idx] = { ...playlist, updatedAt: new Date().toISOString() };
    } else {
      playlists.push(playlist);
    }

    localStorage.setItem(storageKey(email), JSON.stringify(playlists));
  } catch {
    // ignore
  }
}

/** Delete a playlist by ID */
export function deletePlaylist(email: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const playlists = loadPlaylists(email).filter((p) => p.id !== id);
    localStorage.setItem(storageKey(email), JSON.stringify(playlists));
  } catch {
    // ignore
  }
}

/** Add a song to a playlist */
export function addSongToPlaylist(
  email: string,
  playlistId: string,
  song: Omit<Song, "addedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const playlists = loadPlaylists(email);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    playlist.songs.push({
      ...song,
      addedAt: new Date().toISOString(),
    });
    playlist.updatedAt = new Date().toISOString();

    localStorage.setItem(storageKey(email), JSON.stringify(playlists));
  } catch {
    // ignore
  }
}

/** Remove a song from a playlist by index */
export function removeSongFromPlaylist(
  email: string,
  playlistId: string,
  songIndex: number
): void {
  if (typeof window === "undefined") return;
  try {
    const playlists = loadPlaylists(email);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    playlist.songs.splice(songIndex, 1);
    playlist.updatedAt = new Date().toISOString();

    localStorage.setItem(storageKey(email), JSON.stringify(playlists));
  } catch {
    // ignore
  }
}

/** Create a new empty playlist, returns the created playlist */
export function createPlaylist(
  email: string,
  name: string,
  description: string = ""
): Playlist {
  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: generateId(),
    name,
    description,
    songs: [],
    createdAt: now,
    updatedAt: now,
  };

  savePlaylist(email, playlist);
  return playlist;
}
