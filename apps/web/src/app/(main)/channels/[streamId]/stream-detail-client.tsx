"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Users,
  Music,
  Signal,
  Headphones,
  Share2,
  Clock,
  Zap,
} from "lucide-react";

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
// Component
// ---------------------------------------------------------------------------

export default function StreamDetailPage() {
  const params = useParams<{ streamId: string }>();
  const streamId = params.streamId;

  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load stream",
          );
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
            {/* Channel Logo — Large */}
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
                  <Radio className="h-12 w-12 text-white/60" />
                </div>
              )}
            </div>

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
                <Badge variant="outline" className="border-white/30 text-white/90 backdrop-blur-sm">
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {stream.name}
              </h1>

              {/* Description */}
              {stream.description && (
                <p className="text-base text-white/70 max-w-2xl leading-relaxed">
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
                      : "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/20"
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
                  className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
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
      {/* Content Grid                                                      */}
      {/* ================================================================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Now Playing Card */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
              <Music className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Now Playing</h2>
              {isThisPlaying && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-green-500 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Streaming
                </span>
              )}
            </div>
            <div className="px-6 py-5">
              {metadata?.currentTitle || metadata?.currentArtist ? (
                <div className="flex items-center gap-4">
                  {/* Album Art or Logo */}
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {metadata.albumArt ? (
                      <Image
                        src={metadata.albumArt}
                        alt="Album art"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : logo ? (
                      <Image
                        src={logo}
                        alt={stream.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Headphones className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    {metadata.currentTitle && (
                      <p className="text-lg font-semibold truncate">
                        {metadata.currentTitle}
                      </p>
                    )}
                    {metadata.currentArtist && (
                      <p className="text-muted-foreground truncate">
                        {metadata.currentArtist}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Headphones className="h-5 w-5" />
                  <p className="text-sm">
                    No track information available — tune in to listen live
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* About Card */}
          {stream.description && (
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
                <Radio className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">About This Channel</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {stream.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column — 1/3 */}
        <div className="space-y-6">
          {/* Listeners Card */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {metadata?.listenerCount?.toLocaleString() ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(metadata?.listenerCount ?? 0) === 1
                    ? "Active Listener"
                    : "Active Listeners"}
                </p>
              </div>
            </div>
          </div>

          {/* Stream Info Card */}
          {stream.source && (
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
                <Signal className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Stream Details</h2>
              </div>
              <div className="px-6 py-4 space-y-0">
                {/* Status */}
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        metadata?.isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {metadata?.isLive ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                {/* Format */}
                {stream.source.format && (
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">Format</span>
                    <span className="text-sm font-medium uppercase">
                      {stream.source.format}
                    </span>
                  </div>
                )}

                {/* Bitrate */}
                {stream.source.bitrate && (
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">Bitrate</span>
                    <span className="text-sm font-medium">
                      {stream.source.bitrate} kbps
                    </span>
                  </div>
                )}

                {/* Mount */}
                {stream.source.mountPoint && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">Mount</span>
                    <span className="text-sm font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      {stream.source.mountPoint}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Quick Links</h2>
            </div>
            <div className="p-3 space-y-1">
              <Link
                href="/channels"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <Radio className="h-4 w-4" />
                All Channels
              </Link>
              <Link
                href="/shows"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <Headphones className="h-4 w-4" />
                Shows & Podcasts
              </Link>
              <Link
                href="/schedule"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <Clock className="h-4 w-4" />
                Full Schedule
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
