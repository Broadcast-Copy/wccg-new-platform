"use client";

import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Trash2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Playlist, Song } from "@/lib/playlists";

/**
 * PlaylistBuilder — create/edit form for playlists.
 *
 * Shows a dialog with name input, description textarea,
 * song list with up/down reorder buttons, and remove per song.
 */
export function PlaylistBuilder({
  open,
  onOpenChange,
  playlist,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing playlist to edit, or undefined for create mode */
  playlist?: Playlist;
  /** Called with the playlist name, description, and songs on save */
  onSave: (name: string, description: string, songs: Song[]) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);

  // Sync state when editing an existing playlist
  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description);
      setSongs([...playlist.songs]);
    } else {
      setName("");
      setDescription("");
      setSongs([]);
    }
  }, [playlist, open]);

  const moveSong = (index: number, direction: "up" | "down") => {
    const newSongs = [...songs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongs.length) return;
    [newSongs[index], newSongs[targetIndex]] = [
      newSongs[targetIndex],
      newSongs[index],
    ];
    setSongs(newSongs);
  };

  const removeSong = (index: number) => {
    setSongs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), songs);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0e0e18] border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {playlist ? "Edit Playlist" : "Create New Playlist"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Playlist"
              className="w-full rounded-lg border border-border bg-[#0a0a0f] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={2}
              className="w-full rounded-lg border border-border bg-[#0a0a0f] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7] resize-none"
            />
          </div>

          {/* Song list */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Songs ({songs.length})
            </label>
            {songs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-[#0a0a0f] px-4 py-6 text-center">
                <Music className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No songs yet. Add songs from your listening history!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {songs.map((song, i) => (
                  <div
                    key={`${song.title}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-[#0a0a0f] px-3 py-2"
                  >
                    {/* Album art or placeholder */}
                    <div className="h-8 w-8 shrink-0 rounded bg-gradient-to-br from-[#74ddc7]/20 to-[#7401df]/20 border border-border flex items-center justify-center overflow-hidden">
                      {song.albumArt ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={song.albumArt}
                          alt={song.title}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <Music className="h-3 w-3 text-[#74ddc7]" />
                      )}
                    </div>

                    {/* Song info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>

                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveSong(i, "up")}
                        disabled={i === 0}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveSong(i, "down")}
                        disabled={i === songs.length - 1}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeSong(i)}
                      className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      aria-label="Remove song"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 font-semibold"
          >
            {playlist ? "Save Changes" : "Create Playlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
