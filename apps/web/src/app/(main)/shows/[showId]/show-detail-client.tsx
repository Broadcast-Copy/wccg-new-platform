"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { FollowButton } from "@/components/social/follow-button";
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
  Radio,
  Mail,
  Youtube,
  ExternalLink,
  Users,
  SkipForward,
  SkipBack,
  Volume2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface ShowHost {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  isPrimary: boolean;
}

interface Episode {
  id: string;
  showId: string;
  title: string;
  description: string | null;
  airDate: string | null;
  duration: number | null;
  audioUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Show {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  hosts: ShowHost[];
  episodes: Episode[];
  createdAt: string;
  updatedAt: string;
}

// ─── Shared data imports ────────────────────────────────────────────────

import { getShowById, getShowBySlug, type ShowData } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";
import { YouTubeGrid } from "@/components/youtube/youtube-grid";

// ─── Local data fallback ────────────────────────────────────────────────

function localShowFallback(showId: string): Show | null {
  const data: ShowData | undefined =
    getShowById(showId) || getShowBySlug(showId);
  if (!data) return null;
  const hosts = getHostsByShowId(data.id);
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    imageUrl: data.showImageUrl || data.imageUrl,
    isActive: data.isActive,
    hosts: hosts.map((h, i) => ({
      id: h.id,
      name: h.name,
      slug: h.id,
      bio: h.bio,
      avatarUrl: h.imageUrl,
      email: null,
      isPrimary: i === 0,
    })),
    episodes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

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

// ─── Podcast Player ─────────────────────────────────────────────────────

function PodcastPlayer({
  episodes,
  showName,
  onPlay,
  isPlaying,
  currentStream,
}: {
  episodes: Episode[];
  showName: string;
  onPlay: (ep: Episode) => void;
  isPlaying: boolean;
  currentStream: string | null;
}) {
  const [idx, setIdx] = useState(0);
  const ep = episodes[idx];

  if (!episodes.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/50">
        <div className="text-center space-y-2">
          <Mic className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No podcast episodes available yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const playing = isPlaying && ep?.audioUrl && currentStream === ep.audioUrl;

  return (
    <div className="space-y-4">
      {/* Now Playing */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-purple-600 to-teal-500 flex items-center justify-center">
              <Mic className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Now Playing</p>
              <p className="font-semibold truncate text-lg">{ep?.title ?? showName}</p>
              <p className="text-sm text-gray-400 truncate">{showName}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-white text-gray-900 hover:bg-gray-200"
              onClick={() => ep && onPlay(ep)}
              disabled={!ep?.audioUrl}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setIdx(Math.min(episodes.length - 1, idx + 1))}
              disabled={idx === episodes.length - 1}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-3 h-1 rounded-full bg-white/20">
            <div className="h-1 w-1/3 rounded-full bg-teal-400" />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>0:00</span>
            <span>{ep?.duration ? formatDuration(ep.duration) : "--:--"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {episodes.map((e, i) => {
          const isThis = isPlaying && e.audioUrl && currentStream === e.audioUrl;
          return (
            <button
              key={e.id}
              onClick={() => { setIdx(i); if (e.audioUrl) onPlay(e); }}
              className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                i === idx ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {isThis ? (
                  <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${i === idx ? "font-semibold" : "font-medium"}`}>
                  {e.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {e.airDate && <span>{formatDate(e.airDate)}</span>}
                  {e.duration && <span>{formatDuration(e.duration)}</span>}
                </div>
              </div>
              {e.audioUrl && <Play className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── YouTube Feed ───────────────────────────────────────────────────────

function YouTubeFeed({ showId, showName }: { showId: string; showName: string }) {
  const showData = getShowById(showId);
  const youtube = showData?.youtube;

  if (!youtube) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border bg-muted/50">
        <div className="text-center space-y-2">
          <Youtube className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">YouTube content coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <YouTubeGrid
      channelUrl={youtube.channelUrl}
      searchQuery={youtube.searchQuery || showName}
      title={`${showName} Videos`}
      maxVideos={6}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

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
    (async () => {
      try {
        setLoading(true);
        const data = await apiClient<Show>(`/shows/${showId}`);
        if (!cancelled) { setShow(data); setError(null); }
      } catch {
        // Fallback to local static data when API is unavailable
        const local = localShowFallback(showId);
        if (!cancelled) {
          if (local) { setShow(local); setError(null); }
          else setError("Show not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showId]);

  function handlePlay(episode: Episode) {
    if (!episode.audioUrl) return;
    if (isPlaying && currentStream === episode.audioUrl) pause();
    else play(episode.audioUrl, { streamName: show?.name ?? "Episode", title: episode.title });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/shows" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Shows
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

  if (error || !show) {
    return (
      <div className="space-y-6">
        <Link href="/shows" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Shows
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">{error ?? "Show not found."}</p>
        </div>
      </div>
    );
  }

  const showData = getShowById(show.id);
  const schedule = showData?.timeSlot ?? null;
  const hasYT = !!showData?.youtube?.channelUrl;

  return (
    <div className="space-y-8">
      <Link href="/shows" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Shows
      </Link>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl">
        {show.imageUrl ? (
          <div className="h-56 w-full bg-cover bg-center sm:h-72 lg:h-80" style={{ backgroundImage: `url(${show.imageUrl})` }} />
        ) : (
          <div className="h-56 w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-teal-800 sm:h-72 lg:h-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={show.isActive ? "default" : "secondary"} className="text-xs">
                  {show.isActive ? "On Air" : "Off Air"}
                </Badge>
                {schedule && (
                  <Badge variant="outline" className="border-white/30 text-white text-xs">
                    <Clock className="mr-1 h-3 w-3" />{schedule}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{show.name}</h1>
              {show.hosts.length > 0 && (
                <p className="text-white/70 text-sm sm:text-base">
                  Hosted by {show.hosts.map((h) => h.name).join(", ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FollowButton targetType="show" targetId={show.id} size="sm" />
              <FavoriteButton itemType="show" itemId={show.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content (matching original site: Podcasts, The Show, All Hosts, Videos) */}
      <Tabs defaultValue="podcasts" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="podcasts" className="flex-1 sm:flex-initial">
            <Mic className="mr-2 h-4 w-4" />Podcasts
          </TabsTrigger>
          <TabsTrigger value="show" className="flex-1 sm:flex-initial">
            <Radio className="mr-2 h-4 w-4" />The Show
          </TabsTrigger>
          <TabsTrigger value="hosts" className="flex-1 sm:flex-initial">
            <Users className="mr-2 h-4 w-4" />All Hosts
          </TabsTrigger>
          {hasYT && (
            <TabsTrigger value="videos" className="flex-1 sm:flex-initial">
              <Youtube className="mr-2 h-4 w-4" />Videos
            </TabsTrigger>
          )}
        </TabsList>

        {/* Podcasts Tab — shows podcast episodes + YouTube content from the talent */}
        <TabsContent value="podcasts">
          <div className="space-y-8">
            {/* Podcast episodes (when available) */}
            {show.episodes.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <PodcastPlayer episodes={show.episodes} showName={show.name} onPlay={handlePlay} isPlaying={isPlaying} currentStream={currentStream} />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Show Info</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Episodes</span>
                        <span className="font-medium">{show.episodes.length}</span>
                      </div>
                      <Separator />
                      {schedule && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Schedule</span>
                            <span className="font-medium text-right text-xs">{schedule}</span>
                          </div>
                          <Separator />
                        </>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={show.isActive ? "default" : "secondary"} className="text-xs">
                          {show.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* YouTube content — the talent's videos synced into the podcasts tab */}
            <YouTubeFeed showId={show.id} showName={show.name} />

            {/* Show info sidebar when no podcast episodes */}
            {show.episodes.length === 0 && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2" />
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Show Info</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {schedule && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Schedule</span>
                            <span className="font-medium text-right text-xs">{schedule}</span>
                          </div>
                          <Separator />
                        </>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={show.isActive ? "default" : "secondary"} className="text-xs">
                          {show.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Connect</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <a href="mailto:programming@wccg1045fm.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Mail className="h-4 w-4" />programming@wccg1045fm.com
                      </a>
                      <Link href="/contact" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="h-4 w-4" />Contact Us
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* The Show Tab */}
        <TabsContent value="show">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>About {show.name}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {show.description ?? "Show description coming soon."}
                  </p>
                </CardContent>
              </Card>
              {schedule && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />Broadcast Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-4">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{schedule}</p>
                        <p className="text-sm text-muted-foreground">Eastern Time (ET) on WCCG 104.5 FM</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div>
              {show.hosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mic className="h-4 w-4 text-primary" />Hosts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {show.hosts.map((host) => (
                      <Link key={host.id} href={`/hosts/${host.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                        <Avatar className="h-10 w-10">
                          {host.avatarUrl && <AvatarImage src={host.avatarUrl} alt={host.name} />}
                          <AvatarFallback className="text-xs">{getInitials(host.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{host.name}</p>
                          {host.isPrimary && <p className="text-xs text-muted-foreground">Primary Host</p>}
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* All Hosts Tab */}
        <TabsContent value="hosts">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {show.hosts.length > 0 ? show.hosts.map((host) => (
              <Link key={host.id} href={`/hosts/${host.id}`}>
                <Card className="h-full transition-all hover:shadow-lg hover:bg-muted/50">
                  <CardContent className="p-6 text-center space-y-4">
                    <Avatar className="h-24 w-24 mx-auto">
                      {host.avatarUrl && <AvatarImage src={host.avatarUrl} alt={host.name} />}
                      <AvatarFallback className="text-xl">{getInitials(host.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{host.name}</h3>
                      {host.isPrimary && <Badge variant="outline" className="mt-1 text-xs">Primary Host</Badge>}
                    </div>
                    {host.bio && <p className="text-sm text-muted-foreground line-clamp-3">{host.bio}</p>}
                    {host.email && (
                      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />{host.email}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )) : (
              <div className="col-span-full flex h-32 items-center justify-center rounded-lg border bg-muted/50">
                <p className="text-sm text-muted-foreground">No hosts assigned to this show yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Videos Tab */}
        {hasYT && (
          <TabsContent value="videos">
            <YouTubeFeed showId={show.id} showName={show.name} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
