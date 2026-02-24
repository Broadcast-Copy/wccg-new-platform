import { ShowCard } from "@/components/shows/show-card";
import { Mic2, Zap, Podcast } from "lucide-react";
import { ALL_SHOWS } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";

export const metadata = {
  title: "Shows | WCCG 104.5 FM",
  description: "Explore all shows and podcasts on WCCG 104.5 FM — live shows, mixshows, gospel, and more.",
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/shows`, { next: { revalidate: 300 } });
    if (!res.ok) return getLocalShows();
    const data = await res.json();
    return data.length > 0 ? data : getLocalShows();
  } catch {
    return getLocalShows();
  }
}

export default async function ShowsPage() {
  const shows = await getShows();
  const activeShows = shows.filter((s) => s.isActive);
  const inactiveShows = shows.filter((s) => !s.isActive);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-pink-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 20% 50%, rgba(236,72,153,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(139,92,246,0.2) 0%, transparent 50%)` }} />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-xl shadow-pink-500/20">
              <Mic2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Show Directory</h1>
              <p className="text-base text-gray-400 max-w-2xl">Explore all shows on WCCG 104.5 FM — live morning shows, afternoon drives, late night sessions, gospel, mixshows, and podcasts.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-pink-400" /><span className="text-sm font-medium text-gray-300">Active Shows</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{activeShows.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Podcast className="h-4 w-4 text-purple-400" /><span className="text-sm font-medium text-gray-300">Total Shows</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{shows.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /><span className="text-sm font-medium text-gray-300">On Air</span></div>
              <p className="mt-1 text-2xl font-bold text-white">24/7</p>
            </div>
          </div>
        </div>
      </div>

      {activeShows.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Active Shows</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeShows.map((show) => (
              <ShowCard key={show.id} showId={show.id} title={show.name} description={show.description}
                hostName={show.hosts?.find((h) => h.isPrimary)?.name ?? show.hosts?.[0]?.name} imageUrl={show.imageUrl}
                hosts={show.hosts?.map((h) => ({ name: h.name, avatarUrl: h.avatarUrl }))} />
            ))}
          </div>
        </section>
      ) : (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <Mic2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Show listings will appear once the API is connected.</p>
        </div>
      )}

      {inactiveShows.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Past Shows</h2>
          <div className="grid gap-5 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveShows.map((show) => (
              <ShowCard key={show.id} showId={show.id} title={show.name} description={show.description}
                hostName={show.hosts?.find((h) => h.isPrimary)?.name ?? show.hosts?.[0]?.name} imageUrl={show.imageUrl}
                hosts={show.hosts?.map((h) => ({ name: h.name, avatarUrl: h.avatarUrl }))} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
