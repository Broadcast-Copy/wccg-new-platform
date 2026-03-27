import { Mic2, Zap, Podcast, Radio, Clock } from "lucide-react";
import { ALL_SHOWS, getDayPart, getShowById } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";
import { fetchYouTubeVideos } from "@/lib/youtube-rss";
import Link from "next/link";
import { ShowFilter } from "@/components/shows/show-filter";
import { AppImage } from "@/components/ui/app-image";

export const metadata = {
  title: "Shows | WCCG 104.5 FM",
  description:
    "Explore all shows and podcasts on WCCG 104.5 FM — live shows, mixshows, gospel, and more.",
};

interface ShowHost {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  isPrimary?: boolean;
}

interface Show {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  imageUrl?: string;
  isActive: boolean;
  hosts: ShowHost[];
  timeSlot?: string;
  days?: string;
  dayPart?: string;
  category?: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
  streamId?: string;
  isSyndicated?: boolean;
  youtube?: { channelUrl: string; latestVideoId?: string; latestVideoTitle?: string; latestThumbnailUrl?: string };
  podcastRss?: string;
  createdAt: string;
  updatedAt: string;
}

async function getLocalShows(): Promise<Show[]> {
  // Fetch latest YouTube videos for shows that have channel IDs
  const showsWithYT = ALL_SHOWS.filter((s) => s.youtube?.channelId);
  const ytResults = await Promise.allSettled(
    showsWithYT.map((s) => fetchYouTubeVideos(s.youtube!.channelId!, 1))
  );
  const ytMap = new Map<string, { videoId: string; title: string; thumbnailUrl: string }>();
  showsWithYT.forEach((s, i) => {
    const result = ytResults[i];
    if (result.status === "fulfilled" && result.value.length > 0) {
      const v = result.value[0];
      ytMap.set(s.id, { videoId: v.videoId, title: v.title, thumbnailUrl: v.thumbnailUrl });
    }
  });

  return ALL_SHOWS.map((s) => {
    const hosts = getHostsByShowId(s.id);
    const latestVideo = ytMap.get(s.id);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      tagline: s.tagline,
      imageUrl: s.showImageUrl || s.imageUrl || undefined,
      isActive: s.isActive,
      timeSlot: s.timeSlot,
      days: s.days,
      dayPart: getDayPart(s),
      category: s.category,
      streamId: s.streamId,
      isSyndicated: s.isSyndicated,
      youtube: s.youtube ? {
        channelUrl: s.youtube.channelUrl,
        latestVideoId: latestVideo?.videoId,
        latestVideoTitle: latestVideo?.title,
        latestThumbnailUrl: latestVideo?.thumbnailUrl,
      } : undefined,
      podcastRss: s.podcastRss,
      hosts: hosts.map((h, i) => ({
        id: h.id,
        name: h.name,
        slug: h.id,
        avatarUrl: h.imageUrl ?? undefined,
        isPrimary: i === 0,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

async function getShows(): Promise<Show[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/shows`, { next: { revalidate: 300 } });
    if (!res.ok) return getLocalShows();
    const data = await res.json();
    if (data.length > 0) {
      return data.map((show: Show) => {
        const localShow = getShowById(show.id);
        return {
          ...show,
          tagline: show.tagline ?? localShow?.tagline,
          timeSlot: show.timeSlot ?? localShow?.timeSlot,
          days: show.days ?? localShow?.days,
          dayPart:
            show.dayPart ?? (localShow ? getDayPart(localShow) : undefined),
          category: show.category ?? localShow?.category,
          streamId: show.streamId ?? localShow?.streamId,
          isSyndicated: show.isSyndicated ?? localShow?.isSyndicated,
        };
      });
    }
    return getLocalShows();
  } catch {
    return getLocalShows();
  }
}

/** Determine which show is currently on air (EST-aware, server-side) */
function getWhatsOnNow(shows: Show[]): Show | null {
  const now = new Date();
  const estStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const est = new Date(estStr);
  const currentDay = est.getDay();
  const currentHour = est.getHours();
  const currentMin = est.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;

  const dayMap: Record<number, string[]> = {
    0: ["sunday", "every day"],
    1: ["monday", "monday - friday", "every day"],
    2: ["tuesday", "monday - friday", "every day"],
    3: ["wednesday", "monday - friday", "every day"],
    4: ["thursday", "monday - friday", "every day"],
    5: ["friday", "monday - friday", "every day"],
    6: ["saturday", "every day"],
  };

  const parseTime = (t: string): number => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return -1;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  for (const show of shows) {
    if (!show.isActive || !show.timeSlot || !show.days) continue;
    if (show.timeSlot === "Hourly" || show.timeSlot === "On Demand" || show.timeSlot === "24/7") continue;
    if (show.name === "General Programming" || show.name === "Overnights") continue;

    const dayLower = show.days.toLowerCase();
    const validDays = dayMap[currentDay] || [];
    if (!validDays.some((d) => dayLower.includes(d))) continue;

    const parts = show.timeSlot.split(" - ");
    if (parts.length !== 2) continue;
    const start = parseTime(parts[0]);
    let end = parseTime(parts[1]);

    if (parts[1].trim().toLowerCase() === "midnight") {
      if (currentMinutes >= start) return show;
      continue;
    }
    if (parts[0].trim().toLowerCase() === "midnight") {
      if (currentMinutes < end) return show;
      continue;
    }
    if (start < 0 || end < 0) continue;

    if (end <= start) {
      if (currentMinutes >= start || currentMinutes < end) return show;
    } else {
      if (currentMinutes >= start && currentMinutes < end) return show;
    }
  }

  return null;
}

export default async function ShowsPage() {
  const shows = await getShows();
  const onAirShow = getWhatsOnNow(shows);
  const onAirImage =
    onAirShow?.hosts?.find((h) => h.avatarUrl)?.avatarUrl ?? onAirShow?.imageUrl;

  return (
    <div className="space-y-8">
      {/* What's On Now banner */}
      {onAirShow ? (
        <Link
          href={`/shows/${onAirShow.id}`}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/80 via-gray-900 to-gray-900 border border-red-500/30 hover:border-red-500/50 transition-all"
        >
          <div className="absolute inset-0 opacity-20">
            {onAirImage && (
              <AppImage
                src={onAirImage}
                alt=""
                fill
                className="object-cover blur-2xl"
                sizes="100vw"
              />
            )}
          </div>
          <div className="relative flex items-center gap-4 sm:gap-6 px-5 py-4 sm:px-8 sm:py-5">
            {/* Live pulse */}
            <div className="flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 shadow-lg shadow-red-500/30 flex-shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Now</span>
            </div>

            {/* Show image */}
            {onAirImage && (
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                <AppImage
                  src={onAirImage}
                  alt={onAirShow.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}

            {/* Show info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-red-300 transition-colors truncate uppercase tracking-wide">
                {onAirShow.name}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                {onAirShow.hosts?.[0]?.name && (
                  <span className="text-sm text-white/60">{onAirShow.hosts[0].name}</span>
                )}
                {onAirShow.timeSlot && (
                  <span className="text-sm text-white/40 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {onAirShow.timeSlot.replace(" - ", " \u2013 ")} EST
                  </span>
                )}
              </div>
            </div>

            {/* Listen CTA */}
            <span className="hidden sm:flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white group-hover:bg-red-500/30 transition-colors flex-shrink-0">
              <Radio className="h-4 w-4" />
              Tune In
            </span>
          </div>
        </Link>
      ) : (
        /* Fallback hero when nothing specific is on air */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-pink-950/50 to-gray-900 border border-border/30">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(236,72,153,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(139,92,246,0.2) 0%, transparent 50%)`,
              }}
            />
          </div>
          <div className="relative px-6 py-10 sm:px-10 sm:py-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-xl shadow-pink-500/20">
                <Mic2 className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                  Show Directory
                </h1>
                <p className="text-base text-white/60 max-w-2xl">
                  Explore all shows on WCCG 104.5 FM — live morning shows,
                  afternoon drives, late night sessions, gospel, mixshows, and
                  podcasts.
                </p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mic2 className="h-4 w-4 text-pink-400" />
                  <span className="text-sm font-medium text-white/70">
                    Active Shows
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {shows.filter((s) => s.isActive).length}
                </p>
              </div>
              <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Podcast className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-white/70">
                    Total Shows
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {shows.length}
                </p>
              </div>
              <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-white/70">
                    On Air
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">24/7</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streaming channels quick link */}
      <div className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] border border-border px-4 py-3">
        <Radio className="h-4 w-4 text-primary/60 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          All shows air on our streaming channels. Use the station filter below to browse by channel, or{" "}
          <Link
            href="/channels"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium"
          >
            view the stream guide
          </Link>
        </p>
      </div>

      {/* Filterable Shows */}
      <ShowFilter
        shows={shows.map((show) => ({
          id: show.id,
          name: show.name,
          slug: show.slug,
          description: show.description,
          tagline: show.tagline,
          imageUrl: show.imageUrl,
          isActive: show.isActive,
          hosts: show.hosts?.map((h) => ({
            name: h.name,
            avatarUrl: h.avatarUrl,
            isPrimary: h.isPrimary,
          })) ?? [],
          timeSlot: show.timeSlot,
          days: show.days,
          dayPart: show.dayPart,
          category: show.category,
          streamId: show.streamId,
          isSyndicated: show.isSyndicated,
          youtube: show.youtube ? {
            channelUrl: show.youtube.channelUrl,
            latestVideoId: show.youtube.latestVideoId,
            latestVideoTitle: show.youtube.latestVideoTitle,
            latestThumbnailUrl: show.youtube.latestThumbnailUrl,
          } : undefined,
          podcastRss: show.podcastRss,
        }))}
      />
    </div>
  );
}
