"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  loadPlaylists,
  savePlaylist,
  deletePlaylist as deletePlaylistLib,
  addSongToPlaylist,
  removeSongFromPlaylist,
  createPlaylist as createPlaylistLib,
  type Playlist,
  type Song,
} from "@/lib/playlists";

/**
 * usePlaylists — React hook wrapping playlists.ts with state management.
 *
 * Uses the authenticated user's email as the storage key.
 * Provides CRUD operations that auto-persist to localStorage.
 */
export function usePlaylists() {
  const { user } = useAuth();
  const email = user?.email ?? null;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Load playlists on mount and when email changes
  useEffect(() => {
    if (email) {
      setPlaylists(loadPlaylists(email));
    } else {
      setPlaylists([]);
    }
  }, [email]);

  /** Reload playlists from localStorage */
  const reload = useCallback(() => {
    if (email) {
      setPlaylists(loadPlaylists(email));
    }
  }, [email]);

  /** Create a new playlist */
  const createPlaylist = useCallback(
    (name: string, description: string = "") => {
      if (!email) return null;
      const playlist = createPlaylistLib(email, name, description);
      reload();
      return playlist;
    },
    [email, reload]
  );

  /** Delete a playlist by ID */
  const deletePlaylist = useCallback(
    (id: string) => {
      if (!email) return;
      deletePlaylistLib(email, id);
      reload();
    },
    [email, reload]
  );

  /** Add a song to a playlist */
  const addSong = useCallback(
    (playlistId: string, song: Omit<Song, "addedAt">) => {
      if (!email) return;
      addSongToPlaylist(email, playlistId, song);
      reload();
    },
    [email, reload]
  );

  /** Remove a song from a playlist by index */
  const removeSong = useCallback(
    (playlistId: string, idx: number) => {
      if (!email) return;
      removeSongFromPlaylist(email, playlistId, idx);
      reload();
    },
    [email, reload]
  );

  /** Update a playlist (e.g., reorder songs, rename) */
  const updatePlaylist = useCallback(
    (playlist: Playlist) => {
      if (!email) return;
      savePlaylist(email, playlist);
      reload();
    },
    [email, reload]
  );

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    addSong,
    removeSong,
    updatePlaylist,
    reload,
  };
}
