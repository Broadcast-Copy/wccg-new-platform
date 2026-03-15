import Link from "next/link";
import { Radio, Podcast, ArrowRight, Mic2, Headphones } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";

export const metadata = {
  title: "Live Shows & Podcasts | WCCG 104.5 FM",
  description:
    "Choose your experience — tune into live radio shows or browse on-demand podcasts on WCCG 104.5 FM.",
};

export default function ShowsPodcastsPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 40%, rgba(116,221,199,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(116,1,223,0.3) 0%, transparent 50%)",
            }}
          />
        </div>
        <div className="relative px-6 py-12 sm:px-10 sm:py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#7401df] shadow-xl shadow-purple-500/20 mb-5">
            <Mic2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Live Shows &amp; Podcasts
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/60 leading-relaxed">
            From live on-air programming to on-demand podcasts — choose the content
            experience that fits your vibe.
          </p>
        </div>
      </div>

      {/* Two Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Live Shows Card */}
        <Link
          href="/shows"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-[#74ddc7]/40 hover:shadow-2xl hover:shadow-[#74ddc7]/10 hover:-translate-y-1"
        >
          {/* Gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#dc2626]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative p-6 sm:p-8 space-y-5">
            {/* Icon + Badge */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#dc2626] to-[#991b1b] shadow-lg shadow-red-500/20">
                <Radio className="h-7 w-7 text-white" />
              </div>
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                On Air
              </span>
            </div>

            {/* Host avatars */}
            <div className="flex items-center -space-x-3">
              {[
                { src: "/images/hosts/yung-joc.png", alt: "Yung Joc" },
                { src: "/images/hosts/angela-yee.png", alt: "Angela Yee" },
                { src: "/images/hosts/incognito.png", alt: "Incognito" },
                { src: "/images/shows/bootleg-kev-show.png", alt: "Bootleg Kev" },
              ].map((host) => (
                <div
                  key={host.alt}
                  className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-card bg-muted"
                >
                  <AppImage src={host.src} alt={host.alt} fill className="object-cover" />
                </div>
              ))}
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-bold text-muted-foreground">
                +16
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">
                Live Shows
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                20+ live shows broadcasting daily — morning takeovers, afternoon vibes,
                late night sessions, gospel programming, and DJ mixshows.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <Mic2 className="h-3 w-3" /> 20+ Shows
              </span>
              <span className="flex items-center gap-1">
                <Headphones className="h-3 w-3" /> 24/7 Programming
              </span>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#74ddc7] group-hover:gap-3 transition-all">
              Browse Live Shows
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>

        {/* Podcasts Card */}
        <Link
          href="/podcasts"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-[#7401df]/40 hover:shadow-2xl hover:shadow-[#7401df]/10 hover:-translate-y-1"
        >
          {/* Gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#7401df]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative p-6 sm:p-8 space-y-5">
            {/* Icon + Badge */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df] to-[#4c1d95] shadow-lg shadow-purple-500/20">
                <Podcast className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                On Demand
              </span>
            </div>

            {/* Podcast art placeholders */}
            <div className="flex items-center -space-x-3">
              {[
                { color: "from-[#f59e0b] to-[#d97706]" },
                { color: "from-[#ec4899] to-[#be185d]" },
                { color: "from-[#3b82f6] to-[#1d4ed8]" },
                { color: "from-[#22c55e] to-[#15803d]" },
              ].map((p, i) => (
                <div
                  key={i}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br ${p.color}`}
                >
                  <Podcast className="h-5 w-5 text-white" />
                </div>
              ))}
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-bold text-muted-foreground">
                +
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground group-hover:text-[#7401df] transition-colors">
                Podcasts
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Listen on your schedule — interviews, deep dives, storytelling, and
                exclusive conversations you won&apos;t hear anywhere else.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <Podcast className="h-3 w-3" /> On Demand
              </span>
              <span className="flex items-center gap-1">
                <Headphones className="h-3 w-3" /> Book Studio Time
              </span>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#7401df] group-hover:gap-3 transition-all">
              Explore Podcasts
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
