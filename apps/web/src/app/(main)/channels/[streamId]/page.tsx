"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Play,
  Pause,
  Radio,
  Users,
  Music,
  Wifi,
  Signal,
} from "lucide-react";

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

  function handlePlayPause() {
    if (!stream || !streamUrl) return;
    if (isThisPlaying) {
      pause();
    } else {
      play(streamUrl, { streamName: stream.name });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/channels"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Link>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Radio className="h-5 w-5 animate-pulse" />
            <span>Loading stream...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="space-y-6">
        <Link
          href="/channels"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {error ?? "Stream not found."}
          </p>
        </div>
      </div>
    );
  }

  const statusColor =
    stream.status === "ACTIVE"
      ? "default"
      : stream.status === "INACTIVE"
        ? "secondary"
        : "outline";

  return (
    <div className="space-y-8">
      <Link
        href="/channels"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Channels
      </Link>

      <div className="relative overflow-hidden rounded-xl border">
        {stream.imageUrl ? (
          <div
            className="h-48 w-full bg-cover bg-center sm:h-64"
            style={{ backgroundImage: `url(${stream.imageUrl})` }}
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 sm:h-64" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {metadata?.isLive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
                <Badge variant={statusColor}>{stream.status}</Badge>
                <Badge variant="outline" className="border-white/30 text-white">
                  {stream.category}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {stream.name}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <FavoriteButton itemType="STREAM" itemId={stream.id} />
              <Button
                size="lg"
                onClick={handlePlayPause}
                disabled={!streamUrl}
                className="gap-2"
              >
                {isThisPlaying ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Play
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {stream.description && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {stream.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5 text-primary" />
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metadata?.currentTitle || metadata?.currentArtist ? (
                <div className="space-y-1">
                  {metadata.currentTitle && (
                    <p className="text-lg font-medium">
                      {metadata.currentTitle}
                    </p>
                  )}
                  {metadata.currentArtist && (
                    <p className="text-muted-foreground">
                      {metadata.currentArtist}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No track information available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {metadata?.listenerCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(metadata?.listenerCount ?? 0) === 1
                      ? "Listener"
                      : "Listeners"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stream.source && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Signal className="h-5 w-5 text-primary" />
                  Stream Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stream.source.format && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-medium uppercase">
                      {stream.source.format}
                    </span>
                  </div>
                )}
                {stream.source.bitrate && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Bitrate</span>
                      <span className="font-medium">
                        {stream.source.bitrate} kbps
                      </span>
                    </div>
                  </>
                )}
                {stream.source.mountPoint && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mount Point</span>
                      <span className="font-mono text-xs">
                        {stream.source.mountPoint}
                      </span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi
                      className={`h-3.5 w-3.5 ${
                        metadata?.isLive
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">
                      {metadata?.isLive ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
