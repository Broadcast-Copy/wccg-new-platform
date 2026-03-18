"use client";

import { AppImage as Image } from "@/components/ui/app-image";
import Link from "next/link";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Pause, Play, Radio, Users, Headphones } from "lucide-react";

// ---------------------------------------------------------------------------
// Channel logo mapping — maps stream IDs to logo file paths
// ---------------------------------------------------------------------------
const CHANNEL_LOGOS: Record<string, string> = {
  stream_wccg: "/images/logos/wccg-logo.png",
  stream_soul: "/images/logos/soul-1045-logo.png",
  stream_hot: "/images/logos/hot-1045-logo.png",
  stream_vibe: "/images/logos/the-vibe-logo.png",
  stream_yard: "/images/logos/yard-riddim-logo.png",
  stream_mixsquad: "/images/logos/mix-squad-logo.png",
};

// Category accent colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
  MAIN: { bg: "bg-purple-500/10", text: "text-purple-400", ring: "ring-purple-500/20", gradient: "from-purple-600 to-violet-700" },
  GOSPEL: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20", gradient: "from-amber-600 to-orange-700" },
  HIP_HOP: { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/20", gradient: "from-red-600 to-rose-700" },
  RNB: { bg: "bg-pink-500/10", text: "text-pink-400", ring: "ring-pink-500/20", gradient: "from-pink-600 to-fuchsia-700" },
  JAZZ: { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20", gradient: "from-blue-600 to-indigo-700" },
  TALK: { bg: "bg-teal-500/10", text: "text-teal-400", ring: "ring-teal-500/20", gradient: "from-teal-600 to-cyan-700" },
  SPORTS: { bg: "bg-green-500/10", text: "text-green-400", ring: "ring-green-500/20", gradient: "from-green-600 to-emerald-700" },
  COMMUNITY: { bg: "bg-indigo-500/10", text: "text-indigo-400", ring: "ring-indigo-500/20", gradient: "from-indigo-600 to-blue-700" },
};

function getCategoryColors(category?: string) {
  return CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS.MAIN;
}

interface ChannelCardProps {
  streamId: string;
  name: string;
  description?: string;
  streamUrl?: string;
  category?: string;
  isLive?: boolean;
  albumArt?: string;
  currentTrack?: string;
  currentArtist?: string;
  listenerCount?: number;
}

export function ChannelCard({
  streamId,
  name,
  description,
  streamUrl,
  category,
  isLive = false,
  albumArt,
  currentTrack,
  currentArtist,
  listenerCount,
}: ChannelCardProps) {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const isThisStreamPlaying = isPlaying && currentStream === streamUrl;
  const colors = getCategoryColors(category);
  const logo = CHANNEL_LOGOS[streamId];

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isThisStreamPlaying) {
      pause();
    } else if (streamUrl) {
      play(streamUrl, {
        title: currentTrack,
        artist: currentArtist,
        streamName: name,
        albumArt: albumArt ?? logo,
      });
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link href={`/shows?stream=${streamId}`} className="block group">
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 ${
          isThisStreamPlaying ? "ring-2 ring-primary/40 border-primary/30 shadow-lg shadow-primary/10" : ""
        }`}
      >
        {/* Top gradient accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${colors.gradient}`} />

        {/* Card Content */}
        <div className="p-5">
          {/* Header: Logo + Info + Favorite */}
          <div className="flex items-start gap-4">
            {/* Channel Logo */}
            <div className={`relative flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden bg-gradient-to-br ${colors.gradient} ring-1 ${colors.ring} shadow-lg`}>
              {logo ? (
                <Image
                  src={logo}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Radio className="h-7 w-7 text-foreground/80" />
                </div>
              )}
              {/* Live pulse overlay */}
              {isLive && (
                <div className="absolute inset-0 bg-green-500/20 animate-pulse" />
              )}
            </div>

            {/* Channel Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base leading-tight truncate group-hover:text-primary transition-colors">
                    {name}
                  </h3>
                  {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {description}
                    </p>
                  )}
                </div>
                <div onClick={handleFavoriteClick} className="flex-shrink-0">
                  <FavoriteButton itemType="stream" itemId={streamId} />
                </div>
              </div>

              {/* Badges */}
              <div className="mt-2 flex items-center gap-2">
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-green-400 ring-1 ring-green-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                  </span>
                )}
                {category && (
                  <Badge
                    variant="secondary"
                    className={`${colors.bg} ${colors.text} border-0 text-[11px] font-medium`}
                  >
                    {category.replace("_", " ")}
                  </Badge>
                )}
                {listenerCount != null && listenerCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {listenerCount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border/50" />

          {/* Now Playing + Play Button */}
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              onClick={handleTogglePlay}
              aria-label={isThisStreamPlaying ? "Pause" : "Play"}
              className={`h-10 w-10 rounded-full transition-all duration-200 ${
                isThisStreamPlaying
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : "bg-muted hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:scale-105"
              }`}
            >
              {isThisStreamPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>

            {currentTrack || currentArtist ? (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Headphones className="h-3 w-3 text-primary/60 flex-shrink-0" />
                  <p className="truncate text-sm font-medium">{currentTrack || "Unknown Track"}</p>
                </div>
                {currentArtist && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5 pl-[18px]">
                    {currentArtist}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Headphones className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isThisStreamPlaying ? "Now playing" : "Tap to tune in"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Active playing indicator — animated border glow */}
        {isThisStreamPlaying && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-primary/30 animate-pulse" />
        )}
      </div>
    </Link>
  );
}
