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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  ArrowLeft,
  Mic,
  Play,
  Pause,
  Calendar,
  Clock,
} from "lucide-react";

// ─── Types matching API response (snake_case from Prisma/NestJS) ─────────

interface ShowHost {
  host: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
  };
  is_primary: boolean;
}

interface Episode {
  id: string;
  title: string;
  description: string | null;
  air_date: string | null;
  duration: number | null;
  audio_url: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Show {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  show_hosts: ShowHost[];
  show_episodes: Episode[];
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────

export default function ShowDetailPage() {
  const params = useParams<{ showId: string }>();
  const showId = params.showId;

  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { play, pause, isPlaying, currentStream } = useAudioPlayer();

  useEffect(() => {
    if (!showId) return;

    let cancelled = false;
    async function fetchShow() {
      try {
        setLoading(true);
        const data = await apiClient<Show>(`/shows/${showId}`);
        if (!cancelled) {
          setShow(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load show",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchShow();
    return () => {
      cancelled = true;
    };
  }, [showId]);

  // ─── Episode play/pause handler ─────────────────────────────────────

  function handleEpisodePlay(episode: Episode) {
    if (!episode.audio_url) return;
    if (isPlaying && currentStream === episode.audio_url) {
      pause();
    } else {
      play(episode.audio_url, {
        streamName: show?.name ?? "Episode",
        title: episode.title,
      });
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/shows"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shows
        </Link>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mic className="h-5 w-5 animate-pulse" />
            <span>Loading show...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────

  if (error || !show) {
    return (
      <div className="space-y-6">
        <Link
          href="/shows"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shows
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {error ?? "Show not found."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/shows"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shows
      </Link>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl border">
        {show.image_url ? (
          <div
            className="h-48 w-full bg-cover bg-center sm:h-64"
            style={{ backgroundImage: `url(${show.image_url})` }}
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 sm:h-64" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={show.is_active ? "default" : "secondary"}>
                  {show.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {show.name}
              </h1>
            </div>
            <FavoriteButton itemType="show" itemId={show.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {show.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Show</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {show.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs: Episodes */}
          <Tabs defaultValue="episodes">
            <TabsList>
              <TabsTrigger value="episodes">
                Episodes ({show.show_episodes.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="episodes" className="mt-4">
              {show.show_episodes.length > 0 ? (
                <div className="space-y-3">
                  {show.show_episodes.map((episode) => {
                    const isEpisodePlaying =
                      isPlaying &&
                      episode.audio_url !== null &&
                      currentStream === episode.audio_url;

                    return (
                      <Card key={episode.id}>
                        <CardContent className="flex items-center gap-4 pt-6">
                          {/* Play button */}
                          {episode.audio_url ? (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 shrink-0 rounded-full"
                              onClick={() => handleEpisodePlay(episode)}
                            >
                              {isEpisodePlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted">
                              <Mic className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}

                          {/* Episode info */}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {episode.title}
                            </p>
                            {episode.description && (
                              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                                {episode.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              {episode.air_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(episode.air_date)}
                                </span>
                              )}
                              {episode.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(episode.duration)}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No episodes available yet.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Hosts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                Hosts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {show.show_hosts.length > 0 ? (
                <div className="space-y-3">
                  {show.show_hosts.map((sh) => (
                    <Link
                      key={sh.host.id}
                      href={`/hosts/${sh.host.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <Avatar>
                        {sh.host.avatar_url ? (
                          <AvatarImage
                            src={sh.host.avatar_url}
                            alt={sh.host.name}
                          />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(sh.host.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sh.host.name}
                        </p>
                        {sh.is_primary && (
                          <p className="text-xs text-muted-foreground">
                            Primary Host
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hosts assigned yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Show Stats */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Episodes</span>
                <span className="font-medium">{show.show_episodes.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={show.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {show.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hosts</span>
                <span className="font-medium">{show.show_hosts.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
