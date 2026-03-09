"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";
import { apiClient } from "@/lib/api-client";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Play,
  Pause,
  Radio,
  Share2,
  Clock,
  Info,
  Lock,
  Megaphone,
  User,
  Calendar,
} from "lucide-react";
import { ALL_SHOWS, getDayPart } from "@/data/shows";
import type { ShowData } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";

// ---------------------------------------------------------------------------
// Channel logo mapping
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
const CATEGORY_COLORS: Record<string, { gradient: string; glow: string }> = {
  MAIN: { gradient: "from-purple-600 via-violet-600 to-indigo-700", glow: "shadow-purple-500/20" },
  GOSPEL: { gradient: "from-amber-600 via-orange-600 to-yellow-700", glow: "shadow-amber-500/20" },
  HIP_HOP: { gradient: "from-red-600 via-rose-600 to-pink-700", glow: "shadow-red-500/20" },
  RNB: { gradient: "from-pink-600 via-fuchsia-600 to-purple-700", glow: "shadow-pink-500/20" },
  JAZZ: { gradient: "from-blue-600 via-indigo-600 to-violet-700", glow: "shadow-blue-500/20" },
  TALK: { gradient: "from-teal-600 via-cyan-600 to-blue-700", glow: "shadow-teal-500/20" },
  SPORTS: { gradient: "from-green-600 via-emerald-600 to-teal-700", glow: "shadow-green-500/20" },
  COMMUNITY: { gradient: "from-indigo-600 via-blue-600 to-cyan-700", glow: "shadow-indigo-500/20" },
};

function getCategoryColor(category?: string) {
  return CATEGORY_COLORS[category ?? ""] ?? CATEGORY_COLORS.MAIN;
}

// Fallback stream data when API is unavailable
const FALLBACK_STREAMS: Record<string, { name: string; description: string; category: string; status: string; streamUrl: string }> = {
  stream_wccg: { name: "WCCG 104.5 FM", description: "Hip Hop and Hot R&B — Fayetteville's #1 for Hip Hop, Sports, Reactions & Podcasts.", category: "MAIN", status: "active", streamUrl: "https://ice66.securenetsystems.net/WCCG" },
  stream_soul: { name: "Soul 104.5", description: "Hot R&B and Urban AC — the best in classic and contemporary R&B.", category: "RNB", status: "coming_soon", streamUrl: "" },
  stream_hot: { name: "Hot 104.5", description: "Today's Hottest Hits — the biggest pop and hip-hop tracks.", category: "HIP_HOP", status: "coming_soon", streamUrl: "" },
  stream_vibe: { name: "The Vibe", description: "Non-stop Vibes & Chill — smooth R&B, neo-soul, and chill beats.", category: "RNB", status: "coming_soon", streamUrl: "" },
  stream_yard: { name: "Yard Riddim", description: "Caribbean & Reggae — dancehall, soca, and reggae vibes.", category: "COMMUNITY", status: "coming_soon", streamUrl: "" },
  stream_mixsquad: { name: "Mix Squad Radio", description: "Live Sets, Exclusive Remixes, and High-Energy Mixes from top DJs.", category: "HIP_HOP", status: "coming_soon", streamUrl: "" },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreamSource {
  id: string;
  primaryUrl: string | null;
  fallbackUrl: string | null;
  mountPoint: string | null;
  format: string | null;
  bitrate: number | null;
}

interface StreamMetadataInfo {
  currentTitle: string | null;
  currentArtist: string | null;
  currentTrack: string | null;
  albumArt: string | null;
  listenerCount: number;
  isLive: boolean;
  lastUpdated: string | null;
}

interface Stream {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  status: string;
  sortOrder: number;
  imageUrl: string | null;
  source: StreamSource | null;
  metadata: StreamMetadataInfo | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format schedule line, e.g. "Weekdays: 6:00 AM – 10:00 AM, EST" */
function formatScheduleLine(show: ShowData): string | null {
  if (!show.timeSlot && !show.days) return null;
  const dayLabel =
    show.days === "Monday - Friday"
      ? "Weekdays"
      : show.days === "Every Day"
        ? "Daily"
        : (show.days ?? "");
  const timePart = show.timeSlot ? show.timeSlot.replace(" - ", " \u2013 ") : "";
  if (dayLabel && timePart) return `${dayLabel}: ${timePart}, EST`;
  return timePart || dayLabel;
}

/** Get show image — try show image, then host image, then first host with avatar */
function getShowImage(show: ShowData): string | null {
  if (show.showImageUrl) return show.showImageUrl;
  if (show.imageUrl) return show.imageUrl;
  // Try to find a host with an image
  const hosts = getHostsByShowId(show.id);
  const hostWithImage = hosts.find((h) => h.imageUrl);
  return hostWithImage?.imageUrl ?? null;
}

/** Parse a 12-hour time string like "6:00 AM" into minutes since midnight */
function parseTime12h(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

/** Determine if a show is currently airing based on its timeSlot and days */
function getCurrentShow(shows: ShowData[]): ShowData | null {
  const now = new Date();
  const dayIndex = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = dayNames[dayIndex];

  for (const show of shows) {
    // Check if the show airs on the current day
    let matchesDay = false;
    if (show.days === "Every Day") {
      matchesDay = true;
    } else if (show.days === "Monday - Friday") {
      matchesDay = dayIndex >= 1 && dayIndex <= 5;
    } else if (show.days === "Saturday") {
      matchesDay = dayIndex === 6;
    } else if (show.days === "Sunday") {
      matchesDay = dayIndex === 0;
    } else if (show.days === currentDay) {
      matchesDay = true;
    }
    if (!matchesDay) continue;

    // Check if the current time falls within the show's time slot
    if (!show.timeSlot) continue;
    const parts = show.timeSlot.split(" - ");
    if (parts.length !== 2) continue;
    const startMin = parseTime12h(parts[0]);
    const endMin = parseTime12h(parts[1]);
    if (startMin < 0 || endMin < 0) continue;

    // Handle overnight shows (e.g. "10:00 PM - 12:00 AM")
    if (endMin <= startMin) {
      if (currentMinutes >= startMin || currentMinutes < endMin) return show;
    } else {
      if (currentMinutes >= startMin && currentMinutes < endMin) return show;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Program Tile — wide tile matching reference layout
// ---------------------------------------------------------------------------

function ProgramTile({ show }: { show: ShowData }) {
  const imageUrl = getShowImage(show);
  const scheduleLine = formatScheduleLine(show);
  const dayPart = getDayPart(show);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* ── Left: Show Image + Program Info ── */}
        <div className="flex flex-col items-center flex-shrink-0">
          <Link
            href={`/shows/${show.id}`}
            className="relative w-full sm:w-44 md:w-52 h-48 sm:h-auto overflow-hidden bg-muted"
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={show.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 208px"
              />
            ) : (
              <div className="flex h-full min-h-[160px] w-full items-center justify-center bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10">
                <User className="h-12 w-12 text-muted-foreground/40" />
              </div>
            )}
            {/* Gradient overlay on mobile */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:hidden" />
          </Link>

          {/* Program Info link — under the image */}
          <Link
            href={`/shows/${show.id}`}
            className="flex items-center gap-1.5 py-2.5 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center border-t border-border sm:border-t-0 bg-foreground/[0.02]"
          >
            <Info className="h-3 w-3" />
            <span className="font-medium">Program Info</span>
          </Link>
        </div>

        {/* ── Center: Details ── */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 space-y-2.5">
          {/* Title */}
          <Link href={`/shows/${show.id}`}>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight group-hover:text-[#74ddc7] transition-colors line-clamp-2 uppercase tracking-wide">
              {show.name}
            </h3>
          </Link>

          {/* Schedule line */}
          {scheduleLine && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
              <span className="font-medium">{scheduleLine}</span>
            </div>
          )}

          {/* Description */}
          {show.description && (
            <p className="text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed">
              {show.description}
            </p>
          )}

          {/* Day part badge */}
          {dayPart && (
            <div className="pt-0.5">
              <Badge
                variant="outline"
                className="bg-foreground/[0.04] text-muted-foreground border-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
              >
                {dayPart}
              </Badge>
              {show.isSyndicated && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                >
                  Syndicated
                </Badge>
              )}
            </div>
          )}

          {/* Action links */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 pt-1">
            <Link
              href="/rewards"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Lock className="h-3 w-3" />
              <span className="underline underline-offset-2 uppercase tracking-wider font-semibold text-[11px]">
                Unlocked: Exclusive Content
              </span>
            </Link>

            <Link
              href={`/advertise?show=${show.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-primary transition-colors"
            >
              <Megaphone className="h-3 w-3" />
              <span className="underline underline-offset-2 uppercase tracking-wider font-semibold text-[11px]">
                Advertise on This Show
              </span>
            </Link>
          </div>
        </div>

        {/* ── Right: Unlocked / Coming 2026 ── */}
        <div className="hidden sm:flex flex-col items-center justify-center gap-2 px-6 py-4 border-l border-border bg-foreground/[0.02] min-w-[140px] md:min-w-[160px]">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            Unlocked
          </span>
          <span className="text-xs text-[#74ddc7] font-medium">
            Coming 2026
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule Day Tab
// ---------------------------------------------------------------------------

type DayFilter = "weekday" | "saturday" | "sunday" | "all";

const DAY_TABS: { key: DayFilter; label: string }[] = [
  { key: "all", label: "All Shows" },
  { key: "weekday", label: "Mon – Fri" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreamDetailPage() {
  const params = useParams<{ streamId: string }>();
  const streamId = params.streamId;

  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");

  const { play, pause, isPlaying, currentStream } = useAudioPlayer();

  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;
    async function fetchStream() {
      try {
        setLoading(true);
        const data = await apiClient<Stream>(`/streams/${streamId}`);
        if (!cancelled) {
          setStream(data);
          setError(null);
        }
      } catch {
        // API unavailable — use fallback stream data
        if (!cancelled) {
          const fallback = FALLBACK_STREAMS[streamId];
          if (fallback) {
            setStream({
              id: streamId,
              name: fallback.name,
              slug: streamId.replace("stream_", ""),
              description: fallback.description,
              category: fallback.category,
              status: fallback.status,
              sortOrder: 0,
              imageUrl: null,
              source: fallback.streamUrl ? { id: streamId, primaryUrl: fallback.streamUrl, fallbackUrl: null, mountPoint: null, format: "audio/mpeg", bitrate: 128 } : null,
              metadata: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setError(null);
          } else {
            setError("Stream not found");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStream();
    return () => {
      cancelled = true;
    };
  }, [streamId]);

  // Get shows for this channel
  const channelShows = useMemo(() => {
    return ALL_SHOWS.filter((s) => s.streamId === streamId && s.isActive);
  }, [streamId]);

  // Determine the currently airing show (if any)
  const currentShow = useMemo(() => getCurrentShow(channelShows), [channelShows]);
  const currentShowImage = currentShow ? getShowImage(currentShow) : null;

  // Filter shows by day
  const filteredShows = useMemo(() => {
    if (dayFilter === "all") return channelShows;
    if (dayFilter === "weekday")
      return channelShows.filter(
        (s) => s.category === "weekday" || (s.category === "gospel" && s.days === "Sunday") === false && s.days === "Monday - Friday",
      );
    if (dayFilter === "saturday")
      return channelShows.filter((s) => s.category === "saturday" || s.days === "Saturday");
    if (dayFilter === "sunday")
      return channelShows.filter(
        (s) => s.category === "sunday" || s.category === "gospel" || s.days === "Sunday",
      );
    return channelShows;
  }, [channelShows, dayFilter]);

  // Group shows by day category for "all" view
  const groupedShows = useMemo(() => {
    if (dayFilter !== "all") return null;
    const weekday = channelShows.filter((s) => s.days === "Monday - Friday");
    const saturday = channelShows.filter((s) => s.days === "Saturday");
    const sunday = channelShows.filter((s) => s.days === "Sunday");
    const other = channelShows.filter(
      (s) => s.days !== "Monday - Friday" && s.days !== "Saturday" && s.days !== "Sunday",
    );
    return { weekday, saturday, sunday, other };
  }, [channelShows, dayFilter]);

  const streamUrl = stream?.source?.primaryUrl ?? null;
  const isThisPlaying = isPlaying && streamUrl !== null && currentStream === streamUrl;
  const metadata = stream?.metadata;
  const logo = CHANNEL_LOGOS[streamId];
  const colors = getCategoryColor(stream?.category);

  function handlePlayPause() {
    if (!stream || !streamUrl) return;
    if (isThisPlaying) {
      pause();
    } else {
      play(streamUrl, {
        streamName: stream.name,
        albumArt: logo,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/channels"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Link>
        <div className="flex h-72 items-center justify-center rounded-2xl border border-border/30 bg-muted/10">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Radio className="h-8 w-8 animate-pulse" />
            <span className="text-sm">Loading stream...</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error State
  // -------------------------------------------------------------------------
  if (error || !stream) {
    return (
      <div className="space-y-6">
        <Link
          href="/channels"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Link>
        <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10">
          <Radio className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {error ?? "Stream not found."}
          </p>
          <Link
            href="/channels"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Browse all channels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/channels"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Channels
      </Link>

      {/* ================================================================= */}
      {/* Hero Banner                                                       */}
      {/* ================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-border/30">
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-90`} />
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-black/10 rounded-full blur-3xl" />
        </div>
        {/* Image overlay if available */}
        {stream.imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
            style={{ backgroundImage: `url(${stream.imageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Hero Content */}
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Channel Logo / Currently Airing Show Image */}
            {currentShowImage ? (
              <div className="relative flex-shrink-0">
                {/* Currently airing show image */}
                <div className={`relative h-28 w-28 sm:h-36 sm:w-36 rounded-2xl overflow-hidden bg-black/30 ring-2 ring-white/20 shadow-2xl ${colors.glow} backdrop-blur-sm`}>
                  <Image
                    src={currentShowImage}
                    alt={currentShow?.name ?? stream.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 112px, 144px"
                    priority
                  />
                  {/* NOW LIVE overlay badge */}
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Now Live
                    </span>
                  </div>
                </div>
                {/* Small channel logo overlay in bottom-right corner */}
                {logo && (
                  <div className="absolute -bottom-2 -right-2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden bg-black/60 ring-2 ring-white/30 shadow-lg backdrop-blur-sm">
                    <Image
                      src={logo}
                      alt={stream.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className={`relative flex-shrink-0 h-28 w-28 sm:h-36 sm:w-36 rounded-2xl overflow-hidden bg-black/30 ring-2 ring-white/20 shadow-2xl ${colors.glow} backdrop-blur-sm`}>
                {logo ? (
                  <Image
                    src={logo}
                    alt={stream.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 112px, 144px"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Radio className="h-12 w-12 text-foreground/60" />
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {metadata?.isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300 ring-1 ring-green-400/30 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    LIVE NOW
                  </span>
                )}
                <Badge variant="outline" className="border-white/30 text-foreground/90 backdrop-blur-sm">
                  {stream.category.replace("_", " ")}
                </Badge>
                <Badge
                  variant="outline"
                  className={`border-white/20 backdrop-blur-sm ${
                    stream.status === "ACTIVE" ? "text-green-300" : "text-gray-300"
                  }`}
                >
                  {stream.status}
                </Badge>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                {stream.name}
              </h1>

              {/* Description */}
              {stream.description && (
                <p className="text-base text-foreground/70 max-w-2xl leading-relaxed">
                  {stream.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handlePlayPause}
                  disabled={!streamUrl}
                  className={`gap-2 rounded-full px-8 transition-all duration-200 ${
                    isThisPlaying
                      ? "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/20"
                      : "bg-white/15 text-foreground hover:bg-white/25 backdrop-blur-sm border border-white/20"
                  }`}
                >
                  {isThisPlaying ? (
                    <>
                      <Pause className="h-5 w-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Play Now
                    </>
                  )}
                </Button>
                <FavoriteButton itemType="STREAM" itemId={stream.id} />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-foreground/60 hover:text-foreground hover:bg-foreground/10 rounded-full"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: stream.name,
                        url: window.location.href,
                      });
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Show Information & Schedules                                      */}
      {/* ================================================================= */}
      {channelShows.length > 0 && (
        <section id="schedule" className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  Show Information & Schedules
                </h2>
                <p className="text-sm text-muted-foreground">
                  {channelShows.length} program{channelShows.length !== 1 ? "s" : ""} on {stream.name}
                </p>
              </div>
            </div>
          </div>

          {/* Day Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {DAY_TABS.map((tab) => {
              const isActive = dayFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setDayFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#74ddc7] text-[#0a0a0f] shadow-md shadow-[#74ddc7]/20"
                      : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground/80"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Show Tiles */}
          {dayFilter === "all" && groupedShows ? (
            <div className="space-y-8">
              {/* Weekday Shows */}
              {groupedShows.weekday.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    Monday – Friday
                    <span className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="flex flex-col gap-4">
                    {groupedShows.weekday.map((show) => (
                      <ProgramTile key={show.id} show={show} />
                    ))}
                  </div>
                </div>
              )}

              {/* Saturday Shows */}
              {groupedShows.saturday.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    Saturday
                    <span className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="flex flex-col gap-4">
                    {groupedShows.saturday.map((show) => (
                      <ProgramTile key={show.id} show={show} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sunday Shows */}
              {groupedShows.sunday.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    Sunday
                    <span className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="flex flex-col gap-4">
                    {groupedShows.sunday.map((show) => (
                      <ProgramTile key={show.id} show={show} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other (e.g. "Every Day" streams) */}
              {groupedShows.other.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    24/7 Programming
                    <span className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="flex flex-col gap-4">
                    {groupedShows.other.map((show) => (
                      <ProgramTile key={show.id} show={show} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredShows.length > 0 ? (
                filteredShows.map((show) => (
                  <ProgramTile key={show.id} show={show} />
                ))
              ) : (
                <div className="flex flex-col h-32 items-center justify-center rounded-2xl border border-dashed border-border bg-foreground/[0.02]">
                  <Radio className="h-6 w-6 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No shows scheduled for this day
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
