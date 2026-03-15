import Link from "next/link";
import { Podcast, Headphones, ArrowRight, Sparkles, Rss, Clock, Mic } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { ALL_SHOWS } from "@/data/shows";
import { getHostsByShowId } from "@/data/hosts";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Podcasts | WCCG 104.5 FM",
  description:
    "Browse podcasts on WCCG 104.5 FM — on-demand shows, interviews, and exclusive audio content.",
};

// Shows that have podcast RSS feeds or are explicitly podcast-style
function getPodcasts() {
  // Include shows with podcastRss, plus shows that have "podcast" in the name
  const podcasts = ALL_SHOWS.filter(
    (s) => s.podcastRss || s.name.toLowerCase().includes("podcast")
  );

  // Also include syndicated shows that likely have podcast feeds
  const syndicated = ALL_SHOWS.filter(
    (s) => s.isSyndicated && !podcasts.some((p) => p.id === s.id)
  );

  return [...podcasts, ...syndicated];
}

export default function PodcastsPage() {
  const podcasts = getPodcasts();
  // All remaining shows that air live
  const allLiveShows = ALL_SHOWS.filter(
    (s) => s.isActive && !s.name.includes("General Programming") && !s.name.includes("ABC")
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(116,1,223,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)",
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#3b82f6] shadow-xl shadow-purple-500/20">
              <Podcast className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Podcast Directory
              </h1>
              <p className="text-base text-white/60 max-w-2xl">
                On-demand audio content from WCCG 104.5 FM — listen anytime, anywhere.
                Catch up on episodes, interviews, and exclusive content.
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Podcast className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white/70">Podcasts</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{podcasts.length}</p>
            </div>
            <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-[#74ddc7]" />
                <span className="text-sm font-medium text-white/70">On Demand</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">24/7</p>
            </div>
            <div className="rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Rss className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white/70">RSS Feeds</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {podcasts.filter((p) => p.podcastRss).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Podcast Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Available Podcasts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {podcasts.map((show) => {
            const hosts = getHostsByShowId(show.id);
            return (
              <Link
                key={show.id}
                href={`/shows/${show.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-[#7401df]/30 hover:shadow-lg"
              >
                {/* Image / Gradient header */}
                <div className={`relative h-32 bg-gradient-to-br ${show.gradient}`}>
                  {(show.showImageUrl || show.imageUrl) && (
                    <AppImage
                      src={(show.showImageUrl || show.imageUrl)!}
                      alt={show.name}
                      fill
                      className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    {show.podcastRss && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-[#7401df]/80 text-white px-2 py-0.5 rounded-full">
                        <Rss className="h-2.5 w-2.5" /> RSS
                      </span>
                    )}
                    {show.isSyndicated && (
                      <span className="text-[10px] font-bold uppercase bg-white/20 text-white px-2 py-0.5 rounded-full">
                        Syndicated
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-foreground group-hover:text-[#7401df] transition-colors line-clamp-1">
                    {show.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {show.hostNames}
                  </p>
                  {show.description && (
                    <p className="text-xs text-muted-foreground/70 line-clamp-2">
                      {show.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {show.timeSlot}
                    </span>
                    <span>{show.days}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* All Shows available as podcasts */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">All Shows</h2>
        <p className="text-sm text-muted-foreground">
          Browse all WCCG shows — many are available to stream on-demand after airing live.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allLiveShows
            .filter((s) => !podcasts.some((p) => p.id === s.id))
            .map((show) => (
              <Link
                key={show.id}
                href={`/shows/${show.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-[#74ddc7]/30"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${show.gradient}`}>
                  {(show.showImageUrl || show.imageUrl) ? (
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                      <AppImage
                        src={(show.showImageUrl || show.imageUrl)!}
                        alt={show.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <Mic className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">
                    {show.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{show.hostNames}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[#74ddc7] transition-colors shrink-0" />
              </Link>
            ))}
        </div>
      </section>

      {/* Launch Your Podcast CTA */}
      <section>
        <Link
          href="/creators/podcast"
          className="group relative block overflow-hidden rounded-2xl bg-gradient-to-r from-[#7401df] to-[#3b82f6] p-8 md:p-12 transition-all hover:shadow-2xl hover:shadow-purple-500/20"
        >
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          }} />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Launch Your Own Podcast
              </h2>
              <p className="max-w-lg text-sm text-white/70">
                Have a podcast idea? WCCG provides hosting, distribution to Apple &amp; Spotify,
                on-air promotion, and studio access. Apply to join the creator program.
              </p>
            </div>
            <Button
              size="lg"
              className="shrink-0 rounded-full bg-white text-[#7401df] font-bold hover:bg-white/90 px-6"
            >
              Apply Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Link>
      </section>
    </div>
  );
}
