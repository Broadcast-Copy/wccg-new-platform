"use client";

import { useEffect, useState, useCallback } from "react";
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
import { AppImage } from "@/components/ui/app-image";
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
  Rss,
  ListMusic,
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
import type { YouTubeVideo } from "@/lib/youtube-rss";

// ─── RSS podcast parser ─────────────────────────────────────────────────

interface RssEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string | null;
  pubDate: string;
  duration: string | null;
}

function parseRssDuration(dur: string | null): number | null {
  if (!dur) return null;
  // HH:MM:SS or MM:SS or seconds
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || null;
}

async function fetchRssEpisodes(rssUrl: string): Promise<RssEpisode[]> {
  try {
    // Use a CORS proxy for client-side RSS fetching
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return [];
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const items = xml.querySelectorAll("item");
    const episodes: RssEpisode[] = [];
    items.forEach((item, i) => {
      const title = item.querySelector("title")?.textContent ?? `Episode ${i + 1}`;
      const desc = item.querySelector("description")?.textContent ?? "";
      const enclosure = item.querySelector("enclosure");
      const audioUrl = enclosure?.getAttribute("url") ?? "";
      const imageEl = item.querySelector("image");
      const itunesImage = item.querySelector("itunes\\:image, image");
      const imageUrl = itunesImage?.getAttribute("href") ?? imageEl?.querySelector("url")?.textContent ?? null;
      const pubDate = item.querySelector("pubDate")?.textContent ?? "";
      const duration = item.querySelector("itunes\\:duration, duration")?.textContent ?? null;
      if (audioUrl) {
        episodes.push({
          id: `rss_${i}`,
          title,
          description: desc.replace(/<[^>]*>/g, "").slice(0, 200),
          audioUrl,
          imageUrl,
          pubDate,
          duration,
        });
      }
    });
    return episodes;
  } catch {
    return [];
  }
}

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
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  rssEpisodes,
  showName,
  showImage,
  onPlayEpisode,
  onPlayRss,
  isPlaying,
  currentStream,
}: {
  episodes: Episode[];
  rssEpisodes: RssEpisode[];
  showName: string;
  showImage: string | null;
  onPlayEpisode: (ep: Episode) => void;
  onPlayRss: (ep: RssEpisode) => void;
  isPlaying: boolean;
  currentStream: string | null;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const allItems = [
    ...rssEpisodes.map((e) => ({ type: "rss" as const, ...e })),
    ...episodes.map((e) => ({ type: "api" as const, ...e })),
  ];

  if (!allItems.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/30">
        <div className="text-center space-y-2">
          <Mic className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No podcast episodes available yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const current = allItems[activeIdx];
  const isCurrentPlaying =
    isPlaying &&
    ((current.type === "rss" && currentStream === current.audioUrl) ||
     (current.type === "api" && current.audioUrl && currentStream === current.audioUrl));

  function handlePlay(idx: number) {
    setActiveIdx(idx);
    const item = allItems[idx];
    if (item.type === "rss") onPlayRss(item);
    else if (item.audioUrl) onPlayEpisode(item);
  }

  return (
    <div className="space-y-4">
      {/* Now Playing Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1a0a2e] via-[#0d1b2a] to-[#162447] border border-white/10">
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 flex items-center justify-center">
              {showImage ? (
                <AppImage src={showImage} alt={showName} width={80} height={80} className="h-full w-full object-cover" />
              ) : (
                <Mic className="h-8 w-8 text-white/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#74ddc7]">Now Playing</p>
              <p className="font-semibold truncate text-lg text-white mt-0.5">
                {current?.title ?? showName}
              </p>
              <p className="text-sm text-white/50 truncate">{showName}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
              onClick={() => handlePlay(Math.max(0, activeIdx - 1))}
              disabled={activeIdx === 0}
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#5bc4af] transition-colors"
              onClick={() => handlePlay(activeIdx)}
            >
              {isCurrentPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <button
              className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
              onClick={() => handlePlay(Math.min(allItems.length - 1, activeIdx + 1))}
              disabled={activeIdx === allItems.length - 1}
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full bg-white/10">
            <div className="h-1 w-1/3 rounded-full bg-[#74ddc7]" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>0:00</span>
            <span>
              {current?.type === "rss" && current.duration
                ? current.duration
                : current?.type === "api" && current.duration
                  ? formatDuration(current.duration)
                  : "--:--"}
            </span>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
        {allItems.map((item, i) => {
          const itemPlaying =
            isPlaying &&
            ((item.type === "rss" && currentStream === item.audioUrl) ||
             (item.type === "api" && item.audioUrl && currentStream === item.audioUrl));
          return (
            <button
              key={item.id}
              onClick={() => handlePlay(i)}
              className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                i === activeIdx
                  ? "bg-[#74ddc7]/10 border border-[#74ddc7]/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                {itemPlaying ? (
                  <Volume2 className="h-4 w-4 text-[#74ddc7] animate-pulse" />
                ) : (
                  <span className="text-muted-foreground">{i + 1}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate text-foreground ${i === activeIdx ? "font-semibold" : "font-medium"}`}>
                  {item.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {item.type === "rss" && item.pubDate && (
                    <span>{formatDate(item.pubDate)}</span>
                  )}
                  {item.type === "api" && item.airDate && (
                    <span>{formatDate(item.airDate)}</span>
                  )}
                  {item.type === "rss" && item.duration && (
                    <span>{item.duration}</span>
                  )}
                  {item.type === "api" && item.duration && (
                    <span>{formatDuration(item.duration)}</span>
                  )}
                </div>
              </div>
              <Play className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── YouTube Feed ───────────────────────────────────────────────────────

function YouTubeFeed({ showId, showName, videos }: { showId: string; showName: string; videos?: YouTubeVideo[] }) {
  const showData = getShowById(showId);
  const youtube = showData?.youtube;

  if (!youtube) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/30">
        <div className="text-center space-y-2">
          <Youtube className="h-8 w-8 mx-auto text-muted-foreground/60" />
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
      videos={videos}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function ShowDetailPage({
  youtubeVideos,
}: {
  youtubeVideos?: YouTubeVideo[];
}) {
  const params = useParams<{ showId: string }>();
  const showId = params.showId;
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rssEpisodes, setRssEpisodes] = useState<RssEpisode[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
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

  // Fetch RSS episodes if show has podcastRss
  useEffect(() => {
    if (!showId) return;
    const showData = getShowById(showId);
    if (!showData?.podcastRss) return;
    let cancelled = false;
    (async () => {
      setRssLoading(true);
      const eps = await fetchRssEpisodes(showData.podcastRss!);
      if (!cancelled) {
        setRssEpisodes(eps);
        setRssLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showId]);

  const handlePlayEpisode = useCallback((episode: Episode) => {
    if (!episode.audioUrl) return;
    if (isPlaying && currentStream === episode.audioUrl) pause();
    else play(episode.audioUrl, { streamName: show?.name ?? "Episode", title: episode.title });
  }, [isPlaying, currentStream, pause, play, show?.name]);

  const handlePlayRss = useCallback((episode: RssEpisode) => {
    if (isPlaying && currentStream === episode.audioUrl) pause();
    else play(episode.audioUrl, { streamName: show?.name ?? "Episode", title: episode.title });
  }, [isPlaying, currentStream, pause, play, show?.name]);

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
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">{error ?? "Show not found."}</p>
        </div>
      </div>
    );
  }

  const showData = getShowById(show.id);
  const schedule = showData?.timeSlot ?? null;
  const days = showData?.days ?? null;
  const hasYT = !!showData?.youtube?.channelUrl;
  const segments = showData?.segments ?? [];
  const hostImage = showData?.hostImageUrl ?? null;
  const gradient = showData?.gradient ?? "from-purple-900 via-indigo-900 to-teal-800";

  return (
    <div
      className="min-h-[80vh] space-y-8"
    >
      <Link href="/shows" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Shows
      </Link>

      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Background */}
        {show.imageUrl ? (
          <div
            className="h-64 w-full bg-cover bg-center sm:h-80 lg:h-96"
            style={{ backgroundImage: `url(${show.imageUrl})` }}
          />
        ) : (
          <div className={`h-64 w-full bg-gradient-to-br ${gradient} sm:h-80 lg:h-96`} />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={`text-[10px] font-bold uppercase tracking-wider border-0 ${
                    show.isActive
                      ? "bg-[#74ddc7] text-[#0a0a0f]"
                      : "bg-white/20 text-white/70"
                  }`}
                >
                  {show.isActive ? "On Air" : "Off Air"}
                </Badge>
                {showData?.isSyndicated && (
                  <Badge className="text-[10px] font-bold uppercase tracking-wider bg-[#7401df]/80 text-white border-0">
                    Syndicated
                  </Badge>
                )}
                {schedule && (
                  <Badge variant="outline" className="border-white/20 text-white/80 text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />{schedule}
                  </Badge>
                )}
                {days && (
                  <Badge variant="outline" className="border-white/20 text-white/80 text-[10px]">
                    <Calendar className="mr-1 h-3 w-3" />{days}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl drop-shadow-lg">
                {show.name}
              </h1>
              {show.hosts.length > 0 && (
                <p className="text-white/60 text-sm sm:text-base">
                  Hosted by {show.hosts.map((h) => h.name).join(", ")}
                </p>
              )}
              {showData?.tagline && (
                <p className="text-[#74ddc7] text-sm font-medium italic">
                  {showData.tagline}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FollowButton targetType="show" targetId={show.id} size="sm" />
              <FavoriteButton itemType="show" itemId={show.id} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabbed Content ─── */}
      <Tabs defaultValue={hasYT ? "videos" : "podcasts"} className="space-y-6">
        <TabsList className="w-full sm:w-auto bg-muted/50 border border-border">
          {hasYT && (
            <TabsTrigger value="videos" className="flex-1 sm:flex-initial data-[state=active]:bg-[#74ddc7] data-[state=active]:text-[#0a0a0f]">
              <Youtube className="mr-2 h-4 w-4" />Videos
            </TabsTrigger>
          )}
          <TabsTrigger value="podcasts" className="flex-1 sm:flex-initial data-[state=active]:bg-[#74ddc7] data-[state=active]:text-[#0a0a0f]">
            <Mic className="mr-2 h-4 w-4" />Podcasts
          </TabsTrigger>
          <TabsTrigger value="show" className="flex-1 sm:flex-initial data-[state=active]:bg-[#74ddc7] data-[state=active]:text-[#0a0a0f]">
            <Radio className="mr-2 h-4 w-4" />The Show
          </TabsTrigger>
          <TabsTrigger value="hosts" className="flex-1 sm:flex-initial data-[state=active]:bg-[#74ddc7] data-[state=active]:text-[#0a0a0f]">
            <Users className="mr-2 h-4 w-4" />All Hosts
          </TabsTrigger>
        </TabsList>

        {/* ─── Podcasts Tab ─── */}
        <TabsContent value="podcasts">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {rssLoading ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Rss className="h-5 w-5 animate-pulse" />
                    <span>Loading podcast feed...</span>
                  </div>
                </div>
              ) : (
                <PodcastPlayer
                  episodes={show.episodes}
                  rssEpisodes={rssEpisodes}
                  showName={show.name}
                  showImage={show.imageUrl}
                  onPlayEpisode={handlePlayEpisode}
                  onPlayRss={handlePlayRss}
                  isPlaying={isPlaying}
                  currentStream={currentStream}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Show Info Card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-[#74ddc7]" />
                  Show Info
                </h3>
                <div className="space-y-3">
                  {(rssEpisodes.length > 0 || show.episodes.length > 0) && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Episodes</span>
                        <span className="font-medium text-card-foreground">{rssEpisodes.length + show.episodes.length}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {schedule && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Schedule</span>
                        <span className="font-medium text-card-foreground text-right text-xs">{schedule}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {days && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Days</span>
                        <span className="font-medium text-card-foreground text-xs">{days}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={`text-[10px] border-0 ${show.isActive ? "bg-[#74ddc7] text-[#0a0a0f]" : "bg-muted text-muted-foreground"}`}>
                      {show.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Segments Card */}
              {segments.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-card-foreground">Show Segments</h3>
                  <div className="flex flex-wrap gap-2">
                    {segments.map((seg) => (
                      <Badge key={seg} variant="outline" className="border-[#74ddc7]/30 text-[#74ddc7] text-[10px]">
                        {seg}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Connect Card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-card-foreground">Connect</h3>
                <div className="space-y-2">
                  <a href="mailto:programming@wccg1045fm.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#74ddc7] transition-colors">
                    <Mail className="h-4 w-4" />programming@wccg1045fm.com
                  </a>
                  <Link href="/contact" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#74ddc7] transition-colors">
                    <ExternalLink className="h-4 w-4" />Contact Us
                  </Link>
                  {showData?.podcastRss && (
                    <a href={showData.podcastRss} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#74ddc7] transition-colors">
                      <Rss className="h-4 w-4" />Podcast RSS Feed
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* YouTube content below podcasts */}
          <div className="mt-8">
            <YouTubeFeed showId={show.id} showName={show.name} videos={youtubeVideos} />
          </div>
        </TabsContent>

        {/* ─── The Show Tab ─── */}
        <TabsContent value="show">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-xl font-bold text-card-foreground">About {show.name}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {show.description ?? "Show description coming soon."}
                </p>
              </div>

              {/* Schedule */}
              {schedule && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#74ddc7]" />Broadcast Schedule
                  </h2>
                  <div className="flex items-center gap-3 rounded-lg bg-[#74ddc7]/10 border border-[#74ddc7]/20 p-4">
                    <Clock className="h-5 w-5 text-[#74ddc7]" />
                    <div>
                      <p className="font-medium text-foreground">{schedule}</p>
                      <p className="text-sm text-muted-foreground">{days} — Eastern Time (ET) on WCCG 104.5 FM</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Segments */}
              {segments.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-lg font-bold text-card-foreground">Show Segments</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {segments.map((seg) => (
                      <div key={seg} className="flex items-center gap-3 rounded-lg bg-muted/50 border border-border p-3">
                        <div className="h-8 w-8 rounded-full bg-[#74ddc7]/20 flex items-center justify-center shrink-0">
                          <Mic className="h-4 w-4 text-[#74ddc7]" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{seg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Host Image + Hosts List */}
            <div className="space-y-4">
              {hostImage && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <AppImage src={hostImage} alt={show.name} width={400} height={300} className="w-full object-cover" />
                </div>
              )}
              {show.hosts.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                    <Mic className="h-4 w-4 text-[#74ddc7]" />Hosts
                  </h3>
                  <div className="space-y-2">
                    {show.hosts.map((host) => (
                      <Link key={host.id} href={`/hosts/${host.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                        <Avatar className="h-10 w-10 border border-border">
                          {host.avatarUrl && <AvatarImage src={host.avatarUrl} alt={host.name} />}
                          <AvatarFallback className="text-xs bg-[#74ddc7]/20 text-[#74ddc7]">{getInitials(host.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{host.name}</p>
                          {host.isPrimary && <p className="text-[10px] text-[#74ddc7]">Primary Host</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── All Hosts Tab ─── */}
        <TabsContent value="hosts">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {show.hosts.length > 0 ? show.hosts.map((host) => (
              <Link key={host.id} href={`/hosts/${host.id}`}>
                <div className="h-full rounded-xl border border-border bg-card p-6 text-center space-y-4 transition-all hover:bg-muted hover:border-[#74ddc7]/30">
                  <Avatar className="h-24 w-24 mx-auto border-2 border-[#74ddc7]/30">
                    {host.avatarUrl && <AvatarImage src={host.avatarUrl} alt={host.name} />}
                    <AvatarFallback className="text-xl bg-[#74ddc7]/20 text-[#74ddc7]">{getInitials(host.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{host.name}</h3>
                    {host.isPrimary && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-[#74ddc7]/30 text-[#74ddc7]">Primary Host</Badge>
                    )}
                  </div>
                  {host.bio && <p className="text-sm text-muted-foreground line-clamp-3">{host.bio}</p>}
                  {host.email && (
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />{host.email}
                    </p>
                  )}
                </div>
              </Link>
            )) : (
              <div className="col-span-full flex h-32 items-center justify-center rounded-xl border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">No hosts assigned to this show yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Videos Tab ─── */}
        {hasYT && (
          <TabsContent value="videos">
            <YouTubeFeed showId={show.id} showName={show.name} videos={youtubeVideos} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
