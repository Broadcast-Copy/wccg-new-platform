"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Music,
  X,
  ExternalLink,
  Clock,
  Disc3,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchMusicMetadata,
  type MusicMetadata,
} from "@/lib/music-metadata";

// ---------------------------------------------------------------------------
// Streaming service icons (inline SVGs for brand accuracy)
// ---------------------------------------------------------------------------

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function AppleMusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0019.7.248C18.972.09 18.227.048 17.48.024c-.223-.008-.445-.01-.667-.01H7.188c-.222 0-.444.002-.667.01C5.775.05 5.03.09 4.3.248a5.022 5.022 0 00-1.875.644C1.307 1.625.562 2.625.245 3.934A9.23 9.23 0 00.005 6.124c-.01.448-.01.895-.005 1.342v9.068c-.005.447-.005.895.005 1.342a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 001.875.644c.73.158 1.474.198 2.221.222.223.008.445.01.667.01h9.625c.222 0 .444-.002.667-.01.747-.024 1.491-.064 2.221-.222a5.022 5.022 0 001.875-.644c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 00.24-2.19c.01-.447.01-.895.005-1.342V7.466c.005-.447.005-.894-.005-1.342zM17.47 12.038l-.003 4.725c0 .368-.06.73-.194 1.073-.328.84-1.044 1.365-1.934 1.414-.528.03-1.042-.1-1.456-.42a1.683 1.683 0 01-.654-1.17c-.04-.42.08-.84.335-1.168.26-.337.637-.563 1.048-.646.263-.053.532-.096.798-.143.266-.046.467-.157.55-.437a1.077 1.077 0 00.04-.313V9.866a.58.58 0 00-.087-.35c-.068-.09-.194-.14-.35-.116l-5.086.958a.566.566 0 00-.345.186.567.567 0 00-.096.35l-.005 6.116c0 .468-.068.93-.244 1.368-.328.82-1.02 1.33-1.886 1.385-.528.034-1.047-.093-1.463-.408a1.683 1.683 0 01-.664-1.156c-.044-.416.072-.837.322-1.167.257-.338.632-.567 1.04-.653.264-.055.534-.1.8-.15.265-.048.46-.16.54-.44a.969.969 0 00.037-.308V7.42c0-.24.056-.468.19-.666.134-.198.324-.347.552-.4l6.396-1.465c.193-.044.39-.065.587-.045.316.032.55.174.67.47.066.158.09.328.09.498z" />
    </svg>
  );
}

function YouTubeMusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228 18.228 15.432 18.228 12 15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" />
    </svg>
  );
}

function AmazonMusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.045 18.02c.07-.116.17-.178.3-.186.248-.015.506.06.745.17a14.68 14.68 0 006.057 1.557c2.423.075 4.645-.543 6.69-1.712a18.52 18.52 0 002.494-1.636c.198-.155.394-.313.588-.475.048-.042.094-.088.15-.113.102-.046.186.003.227.1.043.1.012.195-.058.283-.087.107-.178.211-.273.312-.587.623-1.233 1.177-1.933 1.666-1.72 1.2-3.603 1.975-5.67 2.223a14.67 14.67 0 01-4.17-.138c-1.297-.237-2.528-.66-3.694-1.266-.37-.192-.727-.406-1.07-.642-.093-.065-.166-.153-.166-.153zM22.28 16.58c-.138-.192-.344-.13-.523-.078-.27.077-.5.2-.748.302-1.15.476-2.345.78-3.593.877-.9.07-1.794.02-2.675-.138-.237-.042-.468-.108-.697-.168-.083-.022-.158-.068-.266-.105.27-.32.51-.585.754-.84.744-.782 1.593-1.44 2.53-1.983.774-.447 1.58-.82 2.42-1.108.285-.098.577-.172.873-.224.116-.02.238-.014.35.02.24.076.34.27.296.527-.048.283-.177.533-.34.763-.37.526-.82.984-1.32 1.385-.298.24-.614.46-.923.69l-.032.025c.066.018.108.014.15-.004.98-.396 1.84-.967 2.547-1.76.286-.32.536-.66.677-1.066.088-.254.1-.514-.018-.76-.118-.242-.32-.372-.572-.406-.35-.048-.694.015-1.033.094-1.42.334-2.716.93-3.906 1.736-1.057.718-2 1.558-2.768 2.583-.222.296-.417.61-.583.937-.046.09-.065.197-.066.298-.002.278.166.472.436.518.158.027.316.02.472-.01.65-.123 1.24-.39 1.805-.713.508-.29.993-.615 1.477-.945l.023-.015c.045.05.01.088-.013.126-.112.19-.246.367-.393.534-.566.645-1.233 1.17-1.984 1.587-.528.294-1.083.513-1.674.61a2.28 2.28 0 01-.63.05c-.558-.044-.934-.37-1.04-.916-.033-.17-.044-.345-.04-.518.016-.617.197-1.193.47-1.74.544-1.09 1.303-2.013 2.2-2.81 1.13-1.003 2.393-1.79 3.81-2.297.73-.262 1.48-.445 2.26-.498.244-.016.488-.016.726.035.49.104.785.447.83.95.023.26-.028.514-.118.76-.27.73-.73 1.33-1.29 1.855-.175.164-.36.317-.554.462z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SongDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  artist: string;
  playedAt?: string; // ISO timestamp
  albumArt?: string | null; // existing album art from SongIQ
  album?: string | null;
  duration?: number | null; // seconds
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SongDetailModal({
  isOpen,
  onClose,
  title,
  artist,
  playedAt,
  albumArt,
  album,
  duration,
}: SongDetailModalProps) {
  const [metadata, setMetadata] = useState<MusicMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch metadata when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);

    fetchMusicMetadata(title, artist).then((data) => {
      if (!cancelled) {
        setMetadata(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, title, artist]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  // Determine best values from metadata vs props
  const artUrl =
    metadata?.artworkUrlLarge || metadata?.artworkUrl || albumArt || null;
  const albumName = metadata?.album || album || null;
  const durationMs = metadata?.durationMs || (duration ? duration * 1000 : null);
  const genre = metadata?.genre || null;
  const releaseDate = metadata?.releaseDate || null;

  const streamingLinks = [
    {
      name: "Spotify",
      url: metadata?.spotifySearchUrl || `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`,
      icon: SpotifyIcon,
      color: "#1DB954",
      bg: "bg-[#1DB954]/10 hover:bg-[#1DB954]/20",
    },
    {
      name: "Apple Music",
      url: metadata?.appleMusicUrl || `https://music.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}`,
      icon: AppleMusicIcon,
      color: "#FA243C",
      bg: "bg-[#FA243C]/10 hover:bg-[#FA243C]/20",
    },
    {
      name: "YouTube Music",
      url: metadata?.youtubeMusicSearchUrl || `https://music.youtube.com/search?q=${encodeURIComponent(`${title} ${artist}`)}`,
      icon: YouTubeMusicIcon,
      color: "#FF0000",
      bg: "bg-[#FF0000]/10 hover:bg-[#FF0000]/20",
    },
    {
      name: "Amazon Music",
      url: metadata?.amazonMusicSearchUrl || `https://music.amazon.com/search/${encodeURIComponent(`${title} ${artist}`)}`,
      icon: AmazonMusicIcon,
      color: "#25D1DA",
      bg: "bg-[#25D1DA]/10 hover:bg-[#25D1DA]/20",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Album Art */}
        <div className="relative aspect-square w-full max-h-64 overflow-hidden rounded-t-xl bg-muted">
          {artUrl ? (
            <img
              src={artUrl}
              alt={`${title} by ${artist}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/20">
              <Music className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Song Info */}
        <div className="px-5 -mt-4 relative">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding song info...
            </div>
          ) : null}

          <h2 className="text-xl font-bold truncate">{title}</h2>
          <p className="text-sm text-muted-foreground truncate">{artist}</p>

          {/* Metadata pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {albumName && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Disc3 className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{albumName}</span>
              </div>
            )}
            {durationMs && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {Math.floor(durationMs / 60000)}:{String(
                  Math.floor((durationMs % 60000) / 1000),
                ).padStart(2, "0")}
              </div>
            )}
            {genre && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Music className="h-3 w-3" />
                {genre}
              </div>
            )}
            {releaseDate && (
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(releaseDate).getFullYear()}
              </div>
            )}
          </div>

          {/* Played at */}
          {playedAt && (
            <p className="text-[11px] text-muted-foreground/60 mt-2">
              Played at{" "}
              {new Date(playedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          )}
        </div>

        {/* Listen On — Streaming Links */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Listen on
          </p>
          <div className="grid grid-cols-2 gap-2">
            {streamingLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors ${link.bg}`}
              >
                <span className="h-5 w-5 shrink-0" style={{ color: link.color }}>
                  <link.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{link.name}</span>
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>

        {/* Audio preview */}
        {metadata?.previewUrl && (
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Preview
            </p>
            <audio
              controls
              preload="none"
              className="w-full h-8 [&::-webkit-media-controls-panel]:bg-muted rounded-lg"
              src={metadata.previewUrl}
            />
          </div>
        )}

        {/* Bottom padding for safe area */}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook for managing modal state
// ---------------------------------------------------------------------------

interface SongDetailState {
  isOpen: boolean;
  title: string;
  artist: string;
  playedAt?: string;
  albumArt?: string | null;
  album?: string | null;
  duration?: number | null;
}

export function useSongDetailModal() {
  const [state, setState] = useState<SongDetailState>({
    isOpen: false,
    title: "",
    artist: "",
  });

  const open = useCallback(
    (song: Omit<SongDetailState, "isOpen">) => {
      setState({ ...song, isOpen: true });
    },
    [],
  );

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  return { ...state, open, close };
}
