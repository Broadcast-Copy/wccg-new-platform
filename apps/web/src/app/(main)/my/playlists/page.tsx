"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ListMusic,
  Music,
  Trash2,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  Globe,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistSong {
  title: string;
  artist: string;
  addedAt: string;
}

interface UserPlaylist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  songs: PlaylistSong[];
  is_public: boolean;
  share_count: number;
  created_at: string;
  updated_at: string;
}

interface SongHistoryEntry {
  id: string;
  title: string;
  artist: string;
  played_at: string;
}

// ---------------------------------------------------------------------------
// Seed songs (when history is empty)
// ---------------------------------------------------------------------------

const SEED_SONGS: { title: string; artist: string }[] = [
  { title: "Blessed & Free", artist: "Kane Brown ft. H.E.R." },
  { title: "Good Days", artist: "SZA" },
  { title: "Peaches", artist: "Justin Bieber ft. Daniel Caesar" },
  { title: "Leave The Door Open", artist: "Silk Sonic" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Kiss Me More", artist: "Doja Cat ft. SZA" },
  { title: "Montero", artist: "Lil Nas X" },
  { title: "Stay", artist: "The Kid LAROI & Justin Bieber" },
  { title: "Heat Waves", artist: "Glass Animals" },
  { title: "Need To Know", artist: "Doja Cat" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlaylistsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  // --- state ---
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<PlaylistSong[]>([]);
  const [saving, setSaving] = useState(false);

  // song history
  const [history, setHistory] = useState<SongHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // recently played feed
  const [recentFeed, setRecentFeed] = useState<SongHistoryEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // add-to-playlist dropdown
  const [addDropdownSong, setAddDropdownSong] = useState<SongHistoryEntry | null>(null);

  // share copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- fetch playlists ---
  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setPlaylists(data as UserPlaylist[]);
    }
    setLoading(false);
  }, [supabase, user]);

  // --- fetch song history for create form ---
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("song_history")
      .select("id, title, artist, played_at")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .limit(30);

    setHistory((data as SongHistoryEntry[]) ?? []);
    setHistoryLoading(false);
  }, [supabase, user]);

  // --- fetch recent feed (all users) ---
  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    const { data } = await supabase
      .from("song_history")
      .select("id, title, artist, played_at")
      .order("played_at", { ascending: false })
      .limit(20);

    setRecentFeed((data as SongHistoryEntry[]) ?? []);
    setFeedLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (user) {
      fetchPlaylists();
      fetchFeed();
    } else {
      setLoading(false);
      setFeedLoading(false);
    }
  }, [user, fetchPlaylists, fetchFeed]);

  // --- create playlist ---
  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("user_playlists").insert({
      user_id: user.id,
      name: newName.trim(),
      description: newDesc.trim() || null,
      songs: selectedSongs,
      is_public: isPublic,
      share_count: 0,
    });

    if (error) {
      toast.error("Failed to create playlist");
    } else {
      toast.success(`Playlist "${newName.trim()}" created!`);
      setNewName("");
      setNewDesc("");
      setIsPublic(false);
      setSelectedSongs([]);
      setShowCreate(false);
      fetchPlaylists();
    }
    setSaving(false);
  };

  // --- delete playlist ---
  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase
      .from("user_playlists")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (!error) {
      toast.success(`"${name}" deleted`);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  // --- share playlist ---
  const handleShare = async (playlist: UserPlaylist) => {
    if (!playlist.is_public) {
      toast.error("Make this playlist public before sharing");
      return;
    }

    const shareUrl = `${window.location.origin}/playlists?id=${playlist.id}`;

    // Increment share_count
    await supabase
      .from("user_playlists")
      .update({ share_count: (playlist.share_count ?? 0) + 1 })
      .eq("id", playlist.id);

    // Update local state
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlist.id
          ? { ...p, share_count: (p.share_count ?? 0) + 1 }
          : p
      )
    );

    // Try native share, fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({
          title: playlist.name,
          text: `Check out my "${playlist.name}" playlist on WCCG 104.5 FM!`,
          url: shareUrl,
        });
        toast.success("Shared!");
        return;
      } catch {
        // user cancelled or not supported
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopiedId(playlist.id);
    toast.success("Share link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- add song to playlist from feed ---
  const handleAddToPlaylistFromFeed = async (
    playlistId: string,
    song: SongHistoryEntry
  ) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const updatedSongs: PlaylistSong[] = [
      ...playlist.songs,
      {
        title: song.title,
        artist: song.artist,
        addedAt: new Date().toISOString(),
      },
    ];

    const { error } = await supabase
      .from("user_playlists")
      .update({ songs: updatedSongs, updated_at: new Date().toISOString() })
      .eq("id", playlistId);

    if (!error) {
      toast.success(`Added to "${playlist.name}"`);
      fetchPlaylists();
    }
    setAddDropdownSong(null);
  };

  // --- add song chip to create form ---
  const addSongToSelection = (title: string, artist: string) => {
    if (selectedSongs.some((s) => s.title === title && s.artist === artist))
      return;
    setSelectedSongs((prev) => [
      ...prev,
      { title, artist, addedAt: new Date().toISOString() },
    ]);
  };

  const removeSongFromSelection = (idx: number) => {
    setSelectedSongs((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- format helpers ---
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  // --- loading ---
  if (authLoading) {
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

  // --- auth guard ---
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

  // --- available songs for create form ---
  const availableSongs =
    history.length > 0
      ? history.map((h) => ({ title: h.title, artist: h.artist }))
      : SEED_SONGS;

  return (
    <div className="container py-8 space-y-8">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Playlists</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save and organize your favorite songs from WCCG
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(true);
            fetchHistory();
          }}
          className="bg-teal-500 text-white hover:bg-teal-500/80 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Playlist
        </Button>
      </div>

      {/* ---- Create Playlist Form ---- */}
      {showCreate && (
        <Card className="border-teal-500/30 bg-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-400" />
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create New Playlist
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDesc("");
                  setIsPublic(false);
                  setSelectedSongs([]);
                }}
                className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Playlist"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Description
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What's this playlist about?"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Public / Private toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? "bg-teal-500" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-foreground flex items-center gap-1.5">
                {isPublic ? (
                  <>
                    <Globe className="h-3.5 w-3.5 text-teal-500" /> Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                    Private
                  </>
                )}
              </span>
            </div>

            {/* Add songs */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Add Songs{" "}
                {history.length === 0 && !historyLoading && (
                  <span className="normal-case font-normal">
                    (Popular WCCG tracks)
                  </span>
                )}
              </label>

              {/* Selected chips */}
              {selectedSongs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSongs.map((s, i) => (
                    <span
                      key={`${s.title}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 text-xs text-teal-400"
                    >
                      <Music className="h-3 w-3" />
                      {s.title} - {s.artist}
                      <button
                        onClick={() => removeSongFromSelection(i)}
                        className="ml-0.5 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Songs list */}
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background">
                {historyLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading songs...
                  </div>
                ) : (
                  availableSongs.map((song, i) => {
                    const isSelected = selectedSongs.some(
                      (s) =>
                        s.title === song.title && s.artist === song.artist
                    );
                    return (
                      <div
                        key={`${song.title}-${i}`}
                        className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-teal-500/5 transition-colors"
                      >
                        <div className="h-8 w-8 shrink-0 rounded bg-gradient-to-br from-teal-500/20 to-purple-600/20 border border-border flex items-center justify-center">
                          <Music className="h-3 w-3 text-teal-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {song.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {song.artist}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            addSongToSelection(song.title, song.artist)
                          }
                          disabled={isSelected}
                          className={`h-7 w-7 flex items-center justify-center rounded-full shrink-0 transition-colors ${
                            isSelected
                              ? "bg-teal-500/20 text-teal-500"
                              : "text-muted-foreground hover:text-teal-500 hover:bg-teal-500/10"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDesc("");
                  setIsPublic(false);
                  setSelectedSongs([]);
                }}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="flex-1 bg-teal-500 text-white hover:bg-teal-500/80 font-semibold"
              >
                {saving ? "Saving..." : "Create Playlist"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ---- Playlists Grid ---- */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : playlists.length > 0 ? (
        <div className="space-y-3">
          {playlists.map((playlist) => {
            const isExpanded = expandedId === playlist.id;
            const songs = (playlist.songs ?? []) as PlaylistSong[];

            return (
              <Card
                key={playlist.id}
                className="overflow-hidden border-border bg-card hover:border-teal-500/30 transition-colors"
              >
                <div className="h-1 bg-gradient-to-r from-purple-600 to-teal-500" />
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : playlist.id)
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {playlist.name}
                        </h3>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {playlist.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {playlist.description}
                        </p>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Song count */}
                      <Badge
                        variant="secondary"
                        className="bg-teal-500/10 text-teal-500 border-0"
                      >
                        {songs.length}{" "}
                        {songs.length === 1 ? "song" : "songs"}
                      </Badge>

                      {/* Public/Private badge */}
                      <Badge
                        variant="outline"
                        className={`border-0 ${
                          playlist.is_public
                            ? "bg-green-500/10 text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {playlist.is_public ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" /> Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" /> Private
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{fmtDate(playlist.created_at)}</span>
                      {playlist.share_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Share2 className="h-3 w-3" />
                          {playlist.share_count} shares
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {/* Share */}
                      {playlist.is_public && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShare(playlist)}
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-teal-500 hover:bg-teal-500/10"
                        >
                          {copiedId === playlist.id ? (
                            <Check className="h-3.5 w-3.5 text-teal-500" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {/* Copy link */}
                      {playlist.is_public && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const url = `${window.location.origin}/playlists?id=${playlist.id}`;
                            await navigator.clipboard.writeText(url);
                            setCopiedId(playlist.id);
                            toast.success("Link copied!");
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDelete(playlist.id, playlist.name)
                        }
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded songs list */}
                  {isExpanded && (
                    <div className="mt-3 space-y-1 border-t border-border pt-3">
                      {songs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          No songs in this playlist yet
                        </p>
                      ) : (
                        songs.map((song, i) => (
                          <div
                            key={`${song.title}-${i}`}
                            className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2"
                          >
                            <div className="h-7 w-7 shrink-0 rounded bg-gradient-to-br from-teal-500/20 to-purple-600/20 border border-border flex items-center justify-center">
                              <Music className="h-3 w-3 text-teal-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {song.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {song.artist}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {fmtDate(song.addedAt)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/10 to-purple-600/10">
            <ListMusic className="h-8 w-8 text-teal-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No playlists yet
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Save songs from your listening history to create personalized
            playlists!
          </p>
          <Button
            onClick={() => {
              setShowCreate(true);
              fetchHistory();
            }}
            className="bg-teal-500 text-white hover:bg-teal-500/80 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Your First Playlist
          </Button>
        </div>
      )}

      {/* ---- Song History Feed ---- */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Recently Played on WCCG
          </h2>
        </div>

        {feedLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : recentFeed.length === 0 ? (
          <Card className="border-border bg-card p-6 text-center">
            <Music className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recently played songs yet
            </p>
          </Card>
        ) : (
          <div className="space-y-1">
            {recentFeed.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 hover:border-teal-500/20 transition-colors"
              >
                <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-teal-500/20 to-purple-600/20 border border-border flex items-center justify-center">
                  <Music className="h-4 w-4 text-teal-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {track.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {track.artist}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mr-2">
                  {fmtTime(track.played_at)}
                </span>

                {/* Add to playlist dropdown */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setAddDropdownSong(
                        addDropdownSong?.id === track.id ? null : track
                      )
                    }
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-teal-500 hover:bg-teal-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>

                  {addDropdownSong?.id === track.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setAddDropdownSong(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
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
                                onClick={() =>
                                  handleAddToPlaylistFromFeed(pl.id, track)
                                }
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-teal-500/10 transition-colors"
                              >
                                <ListMusic className="h-4 w-4 text-teal-500 shrink-0" />
                                <span className="truncate">{pl.name}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                                  {(pl.songs ?? []).length}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center">
                              <Music className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                              <p className="text-xs text-muted-foreground">
                                No playlists yet. Create one first!
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
