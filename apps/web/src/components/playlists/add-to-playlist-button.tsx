"use client";

import { useState } from "react";
import { Plus, ListMusic, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaylists } from "@/hooks/use-playlists";
import { PlaylistBuilder } from "@/components/playlists/playlist-builder";
import { toast } from "sonner";
import type { Song } from "@/lib/playlists";

/**
 * AddToPlaylistButton — small button that opens a dropdown to add a song
 * to an existing playlist or create a new one.
 */
export function AddToPlaylistButton({
  song,
}: {
  song: { title: string; artist: string; albumArt?: string };
}) {
  const { playlists, addSong, createPlaylist, updatePlaylist } = usePlaylists();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
    addSong(playlistId, {
      title: song.title,
      artist: song.artist,
      albumArt: song.albumArt,
    });
    toast.success(`Added to "${playlistName}"`, {
      icon: "🎵",
      duration: 2000,
    });
    setDropdownOpen(false);
  };

  const handleCreateNew = (
    name: string,
    description: string,
    songs: Song[]
  ) => {
    const newPlaylist = createPlaylist(name, description);
    if (newPlaylist) {
      // Add the current song to the new playlist
      addSong(newPlaylist.id, {
        title: song.title,
        artist: song.artist,
        albumArt: song.albumArt,
      });
      toast.success(`Created "${name}" and added song`, {
        icon: "🎵",
        duration: 2000,
      });
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label="Add to playlist"
        className="h-7 w-7 rounded-full text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      {/* Dropdown */}
      {dropdownOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />

          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-[#0e0e18] shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Add to Playlist
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {playlists.length > 0 ? (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-[#74ddc7]/10 transition-colors"
                  >
                    <ListMusic className="h-4 w-4 text-[#74ddc7] shrink-0" />
                    <span className="truncate">{pl.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {pl.songs.length}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <Music className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    No playlists yet
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-border">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setBuilderOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Create New Playlist
              </button>
            </div>
          </div>
        </>
      )}

      <PlaylistBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSave={handleCreateNew}
      />
    </div>
  );
}
