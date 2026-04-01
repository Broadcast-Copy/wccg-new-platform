"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Music, ListMusic, Globe, User, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSupabase } from "@/components/providers/supabase-provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistSong {
  title: string;
  artist: string;
  addedAt: string;
}

interface PublicPlaylist {
  id: string;
  name: string;
  description: string | null;
  songs: PlaylistSong[];
  share_count: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PlaylistInner() {
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();
  const playlistId = searchParams.get("id");

  const [playlist, setPlaylist] = useState<PublicPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!playlistId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    async function fetchPlaylist() {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_playlists")
        .select("id, name, description, songs, share_count, created_at, updated_at")
        .eq("id", playlistId)
        .eq("is_public", true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPlaylist(data as PublicPlaylist);
      }
      setLoading(false);
    }

    fetchPlaylist();
  }, [supabase, playlistId]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // --- Loading ---
  if (loading) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="space-y-2 mt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Not found ---
  if (notFound || !playlist) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ListMusic className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Playlist not found
          </h2>
          <p className="text-sm text-muted-foreground">
            This playlist may be private, deleted, or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const songs = (playlist.songs ?? []) as PlaylistSong[];

  return (
    <div className="container max-w-2xl py-12 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-teal-500" />
          <span className="text-xs font-medium text-teal-500 uppercase tracking-widest">
            Shared Playlist
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{playlist.name}</h1>
        {playlist.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {playlist.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Music className="h-3.5 w-3.5" />
            {songs.length} {songs.length === 1 ? "song" : "songs"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Created {fmtDate(playlist.created_at)}
          </span>
          {playlist.share_count > 0 && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {playlist.share_count} shares
            </span>
          )}
        </div>
      </div>

      {/* Song list */}
      <Card className="overflow-hidden border-border bg-card">
        <div className="h-1 bg-gradient-to-r from-purple-600 to-teal-500" />
        <div className="divide-y divide-border">
          {songs.length === 0 ? (
            <div className="p-8 text-center">
              <Music className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                This playlist has no songs yet
              </p>
            </div>
          ) : (
            songs.map((song, i) => (
              <div
                key={`${song.title}-${i}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Track number */}
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0 tabular-nums">
                  {i + 1}
                </span>

                {/* Icon */}
                <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-teal-500/20 to-purple-600/20 border border-border flex items-center justify-center">
                  <Music className="h-4 w-4 text-teal-500" />
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

                {/* Added date */}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {fmtDate(song.addedAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Shared from WCCG 104.5 FM
        </p>
      </div>
    </div>
  );
}

export default function PublicPlaylistPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <PlaylistInner />
    </Suspense>
  );
}
