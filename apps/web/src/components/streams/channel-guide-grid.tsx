"use client";

import { useState, useEffect, useMemo } from "react";
import { AppImage as Image } from "@/components/ui/app-image";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import { Radio, Sparkles, Lock, Megaphone } from "lucide-react";
import { ALL_SHOWS } from "@/data/shows";
import type { ShowData } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";
import { parseTime12h } from "@/lib/time-utils";

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
  stream_soul: "Hot R&B and Urban AC",
  stream_hot: "Today's Hottest Hits",
  stream_vibe: "Non-stop Vibes & Chill",
  stream_yard: "Caribbean & Reggae",
  stream_mixsquad: "Live Sets, Exclusive Remixes, and High-Energy Mixes",
};

// Channel featured artists
const CHANNEL_ARTISTS: Record<string, string> = {
  stream_wccg: "J. Cole, Kendrick Lamar, Cardi B, Future, Glorilla, Chris Brown...",
  stream_soul: "Beyonce, SZA, H.E.R., The Weeknd, Rihanna, Alicia Keys...",
  stream_hot: "Drake, Doja Cat, SZA, Lil Baby, Metro Boomin...",
  stream_vibe: "H.E.R., Daniel Caesar, Khalid, Jhené Aiko, Lucky Daye...",
  stream_yard: "Shaggy, Sean Paul, Vybz Kartel, Alkaline...",
  stream_mixsquad: "DJ Ricoveli, DJ SpinWiz, DJ Rayn, DJ TommyGee Mixx, DJ Yodo...",
};

// Live status is driven by each station's `status` field (lib/stations.ts).

// ---------------------------------------------------------------------------
// Schedule-based current show detection
// ---------------------------------------------------------------------------

function getCurrentShowForStream(streamId: string): ShowData | null {
  // Station schedule is US Eastern — resolve "now" in America/New_York so the
  // live show is correct regardless of the viewer's timezone.
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = dayNames[dayIndex];

  const shows = ALL_SHOWS.filter((s) => s.streamId === streamId && s.isActive);

  for (const show of shows) {
    let matchesDay = false;
    if (show.days === "Every Day") matchesDay = true;
    else if (show.days === "Monday - Friday") matchesDay = dayIndex >= 1 && dayIndex <= 5;
    else if (show.days === "Saturday") matchesDay = dayIndex === 6;
    else if (show.days === "Sunday") matchesDay = dayIndex === 0;
    else if (show.days === currentDay) matchesDay = true;
    if (!matchesDay) continue;

    if (!show.timeSlot) continue;
    const parts = show.timeSlot.split(" - ");
    if (parts.length !== 2) continue;
    const startMin = parseTime12h(parts[0]);
    const endMin = parseTime12h(parts[1]);
    if (startMin < 0 || endMin < 0) continue;

    if (endMin <= startMin) {
      if (currentMinutes >= startMin || currentMinutes < endMin) return show;
    } else {
      if (currentMinutes >= startMin && currentMinutes < endMin) return show;
    }
  }
  return null;
}

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
// Wide Channel Tile — matches reference layout
// ---------------------------------------------------------------------------

function ChannelTile({ stream }: { stream: Stream }) {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const logo = CHANNEL_LOGOS[stream.id];
  const subtitle = CHANNEL_SUBTITLES[stream.id] || stream.description || "";
  const artists = CHANNEL_ARTISTS[stream.id] || "";
  const isLive = stream.status === "ACTIVE";
  const isThisPlaying = isPlaying && currentStream === stream.streamUrl;

  // Tick every minute so currentShow updates in real-time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // Force a tick on mount so client-side picks up the real time
    setTick(1);
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentShow = useMemo(() => isLive ? getCurrentShowForStream(stream.id) : null, [isLive, stream.id, tick]);
  const showImage =
    (currentShow?.showImageUrl || currentShow?.imageUrl) ||
    stream.metadata?.currentShowImage ||
    null;
  const currentShowHosts = currentShow ? getHostsByShowId(currentShow.id) : [];

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLive || !stream.streamUrl) return;
    if (isThisPlaying) {
      pause();
    } else {
      play(stream.streamUrl, { streamName: stream.name, albumArt: logo });
    }
  };

  return (
    <div
      id={`channel-${stream.id}`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lg shadow-sm dark:shadow-none"
    >
      {/* LIVE NOW badge — upper right corner of card */}
      {isLive && (
        <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
          <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
          Live
        </span>
      )}
      <div className="flex items-stretch">
        {/* ── Left: Logo ── */}
        <div className="flex items-center p-3 sm:p-4">
          <Link
            href={stream.slug ? `/listen/${stream.slug}` : `/shows?stream=${stream.id}`}
            className="relative flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-lg overflow-hidden bg-foreground/[0.03] border border-border"
          >
            {logo ? (
              <Image
                src={logo}
                alt={stream.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Radio className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </Link>
        </div>

        {/* ── Center: Info ── */}
        <div className="flex-1 min-w-0 py-3 sm:py-4 pr-3 space-y-1 sm:space-y-1.5">
          <Link href={stream.slug ? `/listen/${stream.slug}` : `/shows?stream=${stream.id}`}>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">
              {stream.name}
            </h3>
          </Link>

          {subtitle && (
            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium">
              {subtitle}
            </p>
          )}

          {/* Now live — current show + hosts */}
          {currentShow && (
            <div className="pt-1">
              <div className="flex items-center gap-2">
                {currentShowHosts.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {currentShowHosts.slice(0, 3).map((host) =>
                      host.imageUrl ? (
                        <Image
                          key={host.id}
                          src={host.imageUrl}
                          alt={host.name}
                          width={20}
                          height={20}
                          className="h-5 w-5 rounded-full ring-1 ring-border object-cover"
                        />
                      ) : (
                        <span
                          key={host.id}
                          className="flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-border bg-foreground/10 text-[9px] font-bold text-foreground"
                        >
                          {host.name.charAt(0)}
                        </span>
                      ),
                    )}
                  </div>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  On air now
                </span>
              </div>
              <Link
                href={`/shows/${currentShow.id}`}
                className="block text-sm font-bold text-foreground hover:text-[#74ddc7] transition-colors leading-tight"
              >
                {currentShow.name}
              </Link>
              {currentShow.hostNames && (
                <p className="text-xs text-muted-foreground">with {currentShow.hostNames}</p>
              )}
            </div>
          )}

          {artists && (
            <p className="text-sm text-muted-foreground mt-2">{artists}</p>
          )}

          {!isLive && (
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
              Coming Soon
            </p>
          )}

          {/* Action links */}
          {isLive && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
              {stream.slug && (
                <Link
                  href={`/listen/${stream.slug}`}
                  className="text-xs font-semibold text-[#74ddc7] hover:underline underline-offset-2"
                >
                  ▶ Listen now
                </Link>
              )}
              <Link
                href={`/shows?stream=${stream.id}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Show Information & Schedules
              </Link>
            </div>
          )}

          {/* Advertise link — bottom center of info section */}
          <div className="flex justify-center pt-2">
            <Link
              href={`/advertise?channel=${stream.id}`}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground/70 hover:text-[#74ddc7] transition-colors uppercase tracking-wider font-medium"
            >
              <Megaphone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Advertise on this channel
            </Link>
          </div>
        </div>

        {/* ── Right: Status / Live Now ── */}
        <div className="flex flex-col items-center justify-center gap-1.5 px-3 sm:px-6 py-3 border-l border-border bg-foreground/[0.02] min-w-[100px] sm:min-w-[160px]">
          {isLive ? (
            <>
              {showImage ? (
                <button
                  onClick={handleTogglePlay}
                  className="relative h-18 w-18 sm:h-22 sm:w-22 rounded-lg overflow-hidden border border-border hover:border-[#74ddc7]/50 transition-colors"
                >
                  <Image
                    src={showImage}
                    alt="Current Show"
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                </button>
              ) : (
                <button
                  onClick={handleTogglePlay}
                  className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg bg-foreground/[0.06] hover:bg-[#74ddc7]/20 transition-colors"
                >
                  <Radio className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
              <span className="text-[10px] sm:text-[11px] font-semibold text-foreground uppercase tracking-wider text-center leading-tight max-w-[140px]">
                {currentShow ? currentShow.name : "Live Now"}
              </span>
            </>
          ) : (
            <>
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-[11px] sm:text-xs font-semibold text-foreground">
                Coming Soon
              </span>
            </>
          )}
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
                  : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground/80"
              }`}
            >
              {cat.icon && <cat.icon className="h-3.5 w-3.5" />}
              {cat.label}
              {cat.key === "All" && (
                <span
                  className={`ml-0.5 text-xs ${isActive ? "text-[#0a0a0f]/60" : "text-muted-foreground/70"}`}
                >
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
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-foreground/[0.02]">
          <Radio className="h-8 w-8 text-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {selectedCategory === "All"
              ? "No channels available at the moment."
              : `No ${CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? selectedCategory} channels available.`}
          </p>
          <p className="text-xs text-foreground/20 mt-1">
            Check back soon for new content
          </p>
        </div>
      )}
    </div>
  );
}
