import { Mic2, Zap, Podcast, Radio } from "lucide-react";
import { ALL_SHOWS, getDayPart, getShowById } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";
import Link from "next/link";
import { ShowFilter } from "@/components/shows/show-filter";

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
  imageUrl?: string;
  isActive: boolean;
  hosts: ShowHost[];
  timeSlot?: string;
  days?: string;
  dayPart?: string;
  category?: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
  streamId?: string;
  isSyndicated?: boolean;
  createdAt: string;
  updatedAt: string;
}

function getLocalShows(): Show[] {
  return ALL_SHOWS.map((s) => {
    const hosts = getHostsByShowId(s.id);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      imageUrl: s.showImageUrl || s.imageUrl || undefined,
      isActive: s.isActive,
      timeSlot: s.timeSlot,
      days: s.days,
      dayPart: getDayPart(s),
      category: s.category,
      streamId: s.streamId,
      isSyndicated: s.isSyndicated,
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

export default async function ShowsPage() {
  const shows = await getShows();

  return (
    <div className="space-y-8">
      {/* Hero */}
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

      {/* Streaming channels quick link */}
      <div className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] border border-border px-4 py-3">
        <Radio className="h-4 w-4 text-primary/60 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          All shows air on our streaming channels.{" "}
          <Link
            href="/channels"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium"
          >
            Browse all channels
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
        }))}
      />
    </div>
  );
}
