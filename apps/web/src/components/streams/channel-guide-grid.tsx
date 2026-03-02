"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/ui/app-image";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import { Radio, Sparkles, Play, Pause, Megaphone } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreamMetadata {
  currentTitle?: string;
  currentArtist?: string;
  currentTrack?: string;
  albumArt?: string;
  listenerCount?: number;
  isLive?: boolean;
  lastUpdated?: string;
  currentShowName?: string;
  currentShowImage?: string;
}

interface Stream {
  id: string;
  name: string;
  slug: string;
  description?: string;
  streamUrl?: string;
  category?: string;
  status?: string;
  sortOrder?: number;
  imageUrl?: string;
  metadata?: StreamMetadata;
  createdAt?: string;
  updatedAt?: string;
}

interface ChannelGuideGridProps {
  streams: Stream[];
}

// ---------------------------------------------------------------------------
// Channel logos
// ---------------------------------------------------------------------------

const CHANNEL_LOGOS: Record<string, string> = {
  stream_wccg: "/images/logos/wccg-logo.png",
  stream_soul: "/images/logos/soul-1045-logo.png",
  stream_hot: "/images/logos/hot-1045-logo.png",
  stream_vibe: "/images/logos/the-vibe-logo.png",
  stream_yard: "/images/logos/yard-riddim-logo.png",
  stream_mixsquad: "/images/logos/mix-squad-logo.png",
};

// Channel subtitles
const CHANNEL_SUBTITLES: Record<string, string> = {
  stream_wccg: "Hip Hop and Hot R&B",
  stream_soul: "Classic Soul & R&B",
  stream_hot: "Today's Hottest Hits",
  stream_vibe: "Non-stop Vibes & Chill",
  stream_yard: "Caribbean & Reggae",
  stream_mixsquad: "DJ Mixes & Live Sets",
};

// Channel featured artists
const CHANNEL_ARTISTS: Record<string, string> = {
  stream_wccg: "J. Cole, Kendrick Lamar, Cardi B, Future, Glorilla, Chris Brown...",
  stream_soul: "Aretha Franklin, Marvin Gaye, Al Green, Stevie Wonder...",
  stream_hot: "Drake, Doja Cat, SZA, Lil Baby, Metro Boomin...",
  stream_vibe: "H.E.R., Daniel Caesar, Khalid, Jhené Aiko, Lucky Daye...",
  stream_yard: "Shaggy, Sean Paul, Vybz Kartel, Alkaline...",
  stream_mixsquad: "Guest DJs, live mixes, exclusive sets...",
};

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { key: "All", label: "All Channels", icon: Sparkles },
  { key: "MAIN", label: "Main" },
  { key: "GOSPEL", label: "Gospel" },
  { key: "HIP_HOP", label: "Hip Hop" },
  { key: "RNB", label: "R&B" },
  { key: "JAZZ", label: "Jazz" },
  { key: "TALK", label: "Talk" },
  { key: "SPORTS", label: "Sports" },
  { key: "COMMUNITY", label: "Community" },
];

// ---------------------------------------------------------------------------
// Wide Channel Tile
// ---------------------------------------------------------------------------

function ChannelTile({ stream }: { stream: Stream }) {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const isThisPlaying = isPlaying && currentStream === stream.streamUrl;
  const logo = CHANNEL_LOGOS[stream.id];
  const subtitle = CHANNEL_SUBTITLES[stream.id] || stream.description || "";
  const artists = CHANNEL_ARTISTS[stream.id] || "";
  const showImage = stream.metadata?.currentShowImage || stream.metadata?.albumArt;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isThisPlaying) {
      pause();
    } else if (stream.streamUrl) {
      play(stream.streamUrl, {
        title: stream.metadata?.currentTrack,
        artist: stream.metadata?.currentArtist,
        streamName: stream.name,
        albumArt: stream.metadata?.albumArt ?? logo,
      });
    }
  };

  return (
    <div
      id={`channel-${stream.id}`}
      className={`group relative overflow-hidden rounded-2xl border bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.05] ${
        isThisPlaying
          ? "border-[#74ddc7]/30 shadow-lg shadow-[#74ddc7]/5"
          : "border-white/[0.08] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-stretch">
        {/* Left: Logo + Station Info */}
        <div className="flex flex-1 items-center gap-4 sm:gap-5 p-4 sm:p-6">
          {/* Station Logo */}
          <Link
            href={`/channels/${stream.id}`}
            className="relative flex-shrink-0 h-16 w-16 sm:h-[88px] sm:w-[88px] rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
          >
            {logo ? (
              <Image
                src={logo}
                alt={stream.name}
                fill
                className="object-cover"
                sizes="88px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Radio className="h-8 w-8 text-white/40" />
              </div>
            )}
          </Link>

          {/* Station Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <Link href={`/channels/${stream.id}`}>
              <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-[#74ddc7] transition-colors">
                {stream.name}
              </h3>
            </Link>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#74ddc7]/70 font-medium">{subtitle}</p>
            )}
            {artists && (
              <p className="text-xs sm:text-sm text-white/40 line-clamp-1 hidden sm:block">{artists}</p>
            )}

            {/* Links */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 pt-1">
              <Link
                href={`/channels/${stream.id}`}
                className="text-[11px] sm:text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
              >
                Show Information & Schedules
              </Link>
              <Link
                href={`/advertise?channel=${stream.id}`}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-white/30 hover:text-[#74ddc7] transition-colors uppercase tracking-wider font-medium"
              >
                <Megaphone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Advertise on this channel
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Live Now / Play */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 sm:px-8 py-4 border-l border-white/[0.06] bg-white/[0.02] min-w-[100px] sm:min-w-[140px]">
          <button
            onClick={handleTogglePlay}
            className="relative group/play"
            aria-label={isThisPlaying ? "Pause" : "Play"}
          >
            {showImage ? (
              <div className="relative h-14 w-14 sm:h-20 sm:w-20 rounded-xl overflow-hidden ring-2 ring-white/[0.08] group-hover/play:ring-[#74ddc7]/30 transition-all">
                <Image
                  src={showImage}
                  alt="Live Now"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/play:opacity-100 transition-opacity">
                  {isThisPlaying ? (
                    <Pause className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  ) : (
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white ml-0.5" />
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-xl transition-all ${
                  isThisPlaying
                    ? "bg-[#74ddc7] text-[#0a0a0f]"
                    : "bg-white/[0.06] text-white/50 hover:bg-[#74ddc7]/20 hover:text-[#74ddc7]"
                }`}
              >
                {isThisPlaying ? (
                  <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5" />
                )}
              </div>
            )}
            {isThisPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#74ddc7]" />
              </span>
            )}
          </button>
          <span className="text-[10px] sm:text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            {isThisPlaying ? "Playing" : "Live Now"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChannelGuideGrid({ streams }: ChannelGuideGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredStreams =
    selectedCategory === "All"
      ? streams
      : streams.filter(
          (s) => s.category?.toUpperCase() === selectedCategory.toUpperCase(),
        );

  const categoriesWithStreams = CATEGORIES.filter(
    (cat) =>
      cat.key === "All" ||
      streams.some((s) => s.category?.toUpperCase() === cat.key.toUpperCase()),
  );

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categoriesWithStreams.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#74ddc7] text-[#0a0a0f] shadow-md shadow-[#74ddc7]/20"
                  : "bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/80"
              }`}
            >
              {cat.icon && <cat.icon className="h-3.5 w-3.5" />}
              {cat.label}
              {cat.key === "All" && (
                <span className={`ml-0.5 text-xs ${isActive ? "text-[#0a0a0f]/60" : "text-white/30"}`}>
                  {streams.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Wide Channel Tiles — stacked vertically */}
      {filteredStreams.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredStreams.map((stream) => (
            <ChannelTile key={stream.id} stream={stream} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
          <Radio className="h-8 w-8 text-white/20 mb-3" />
          <p className="text-sm font-medium text-white/40">
            {selectedCategory === "All"
              ? "No channels available at the moment."
              : `No ${CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? selectedCategory} channels available.`}
          </p>
          <p className="text-xs text-white/20 mt-1">Check back soon for new content</p>
        </div>
      )}
    </div>
  );
}
