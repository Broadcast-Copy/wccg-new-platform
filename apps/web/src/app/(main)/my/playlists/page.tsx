"use client";

import { useState } from "react";
import { Plus, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaylists } from "@/hooks/use-playlists";
import { useAuth } from "@/hooks/use-auth";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { PlaylistBuilder } from "@/components/playlists/playlist-builder";
import type { Playlist, Song } from "@/lib/playlists";
import { toast } from "sonner";

export default function PlaylistsPage() {
  const { user, isLoading } = useAuth();
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
  } = usePlaylists();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | undefined>(
    undefined
  );

  const handleCreate = (name: string, description: string, songs: Song[]) => {
    const playlist = createPlaylist(name, description);
    if (playlist) {
      // If songs were provided in the builder, update with them
      if (songs.length > 0) {
        updatePlaylist({ ...playlist, songs });
      }
      toast.success(`Playlist "${name}" created!`, { icon: "🎵" });
    }
  };

  const handleEdit = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setBuilderOpen(true);
  };

  const handleSaveEdit = (
    name: string,
    description: string,
    songs: Song[]
  ) => {
    if (!editingPlaylist) return;
    updatePlaylist({
      ...editingPlaylist,
      name,
      description,
      songs,
    });
    setEditingPlaylist(undefined);
    toast.success("Playlist updated!", { icon: "🎵" });
  };

  const handleDelete = (id: string) => {
    const playlist = playlists.find((p) => p.id === id);
    deletePlaylist(id);
    toast.success(`"${playlist?.name}" deleted`, { duration: 2000 });
  };

  const handleOpenCreate = () => {
    setEditingPlaylist(undefined);
    setBuilderOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ListMusic className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Sign in to create playlists
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your personal playlists to save your favorite
            songs from WCCG 104.5 FM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Playlists</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save and organize your favorite songs from WCCG
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create New Playlist
        </Button>
      </div>

      {/* Playlist grid */}
      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/10 to-[#7401df]/10">
            <ListMusic className="h-8 w-8 text-[#74ddc7]" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No playlists yet
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Save songs from your listening history to create personalized
            playlists!
          </p>
          <Button
            onClick={handleOpenCreate}
            className="bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Your First Playlist
          </Button>
        </div>
      )}

      {/* Playlist builder dialog */}
      <PlaylistBuilder
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) setEditingPlaylist(undefined);
        }}
        playlist={editingPlaylist}
        onSave={editingPlaylist ? handleSaveEdit : handleCreate}
      />
    </div>
  );
}
