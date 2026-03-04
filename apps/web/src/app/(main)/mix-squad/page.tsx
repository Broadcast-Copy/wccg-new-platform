import Link from "next/link";
import {
  ArrowRight,
  Disc3,
  Headphones,
  Play,
  Radio,
  Music,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import {
  ALL_HOSTS,
  MIXSQUAD_HOSTS,
  WEEKEND_HOSTS,
  SUNDAY_HOSTS,
  type HostData,
} from "@/data/hosts";

export const metadata = {
  title: "The Mix Squad | WCCG 104.5 FM",
  description:
    "Meet the DJs of The Mix Squad — WCCG 104.5 FM's curated roster of DJs delivering non-stop mixes, live sets, and exclusive blends 24/7.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** All DJs — mixsquad + weekend + sunday categories */
function getAllDJs(): HostData[] {
  return ALL_HOSTS.filter(
    (h) =>
      h.category === "mixsquad" ||
      h.category === "weekend" ||
      h.category === "sunday"
  );
}

// ---------------------------------------------------------------------------
// DJ Card Component
// ---------------------------------------------------------------------------

function DJCard({ dj }: { dj: HostData }) {
  return (
    <Link
      href={`/hosts/${dj.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-[#74ddc7]/40 hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1"
    >
      {/* DJ Photo */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/20">
        {dj.imageUrl ? (
          <AppImage
            src={dj.imageUrl}
            alt={dj.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-5xl font-black text-foreground/10">
              {getInitials(dj.name)}
            </span>
          </div>
        )}

        {/* Hover overlay with play button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#74ddc7] shadow-lg scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
          <Headphones className="h-5 w-5 text-[#0a0a0f]" />
        </div>

        {/* Category badge */}
        {dj.category === "weekend" && (
          <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white bg-[#f59e0b]/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
            Weekend
          </div>
        )}
        {dj.category === "sunday" && (
          <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white bg-[#3b82f6]/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
            Sunday
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-1.5">
        <h3 className="font-bold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">
          {dj.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {dj.bio}
        </p>
        <div className="flex items-center gap-1 pt-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
          View Profile
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MixSquadPage() {
  const allDJs = getAllDJs();
  const coreDJs = MIXSQUAD_HOSTS;
  const weekendDJs = WEEKEND_HOSTS;
  const sundayDJs = SUNDAY_HOSTS;

  return (
    <div className="space-y-10">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/60 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-15">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(116,1,223,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.3) 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Decorative dots pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Mix Squad Logo */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-purple-500/20 shrink-0">
              <AppImage
                src="/images/logos/mix-squad-logo.png"
                alt="The Mix Squad"
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                  The Mix Squad
                </h1>
                <span className="hidden sm:inline text-[10px] text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                  WCCG 104.5 FM
                </span>
              </div>
              <p className="text-base text-muted-foreground max-w-2xl">
                Our curated roster of DJs delivering non-stop mixes, live sets,
                and exclusive blends. From hip hop to R&amp;B, dancehall to
                Afrobeats &mdash; the Mix Squad keeps the energy moving 24/7.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button
                  size="sm"
                  asChild
                  className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80 px-5"
                >
                  <Link href="/channels/stream_mixsquad">
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Listen to MixxSquadd Radio
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-full border-white/20 text-foreground hover:bg-white/5 px-5"
                >
                  <Link href="/mixes">
                    <Music className="mr-2 h-3.5 w-3.5" />
                    Browse Mixes
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#74ddc7]" />
                <span className="text-sm font-medium text-gray-300">
                  DJs
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {allDJs.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#7401df]" />
                <span className="text-sm font-medium text-gray-300">
                  Live Stream
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">24/7</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Disc3 className="h-4 w-4 text-[#ec4899]" />
                <span className="text-sm font-medium text-gray-300">
                  Genres
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">6+</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Core Mix Squad DJs ──────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7401df] to-[#4c1d95]">
            <Disc3 className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            MixxSquadd Radio DJs
          </h2>
          <span className="text-xs text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium">
            {coreDJs.length} DJs
          </span>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {coreDJs.map((dj) => (
            <DJCard key={dj.id} dj={dj} />
          ))}
        </div>
      </section>

      {/* ── Weekend DJs ─────────────────────────────────────────────── */}
      {weekendDJs.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
              <Headphones className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Weekend DJs
            </h2>
            <span className="text-xs text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium">
              {weekendDJs.length} DJs
            </span>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {weekendDJs.map((dj) => (
              <DJCard key={dj.id} dj={dj} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sunday DJs ──────────────────────────────────────────────── */}
      {sundayDJs.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]">
              <Music className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Sunday Night DJs
            </h2>
            <span className="text-xs text-muted-foreground bg-foreground/[0.06] px-2 py-0.5 rounded-full font-medium">
              {sundayDJs.length} DJs
            </span>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sundayDJs.map((dj) => (
              <DJCard key={dj.id} dj={dj} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Section ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7401df] to-[#ec4899] p-8 md:p-12">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Want to Join The Mix Squad?
          </h2>
          <p className="max-w-md text-white/70 text-sm md:text-base">
            If you&apos;re a DJ looking to showcase your mixes to thousands of
            listeners, we want to hear from you. Submit your mix for a chance to
            be featured on MixxSquadd Radio.
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-white text-[#7401df] font-bold hover:bg-white/90 shadow-lg px-6"
            >
              <Link href="/creators">
                Submit Your Mix
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full border-white/30 text-white hover:bg-foreground/10 px-6"
            >
              <Link href="/channels/stream_mixsquad">Listen Live</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
