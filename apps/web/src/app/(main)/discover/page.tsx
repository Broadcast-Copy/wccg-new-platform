"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import {
  Megaphone,
  ArrowRight,
  Radio,
  Play,
  MapPin,
  Gift,
  CalendarDays,
  ShoppingBag,
  Mic,
  Disc3,
  CloudSun,
  Newspaper,
  Dribbble,
  ShieldCheck,
  Church,
} from "lucide-react";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

// ─── Quick Link Cards ─────────────────────────────────────────────────

const quickLinks = [
  { href: "/channels", icon: Radio, label: "Live Channels", desc: "6 streams, 24/7", color: "from-[#74ddc7] to-[#0d9488]" },
  { href: "/events", icon: CalendarDays, label: "Events", desc: "Concerts & community", color: "from-[#f59e0b] to-[#d97706]" },
  { href: "/community", icon: MapPin, label: "Directory", desc: "118+ local services", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { href: "/mixes", icon: Disc3, label: "DJ Mixes", desc: "Browse & play", color: "from-[#ec4899] to-[#be185d]" },
  { href: "/rewards", icon: Gift, label: "mY1045 Perks", desc: "Earn points", color: "from-[#7401df] to-[#4c1d95]" },
  { href: "/marketplace", icon: ShoppingBag, label: "Marketplace", desc: "Merch & vendors", color: "from-[#ef4444] to-[#b91c1c]" },
  { href: "/creators", icon: Mic, label: "Creator Hub", desc: "Submit your music", color: "from-[#06b6d4] to-[#0891b2]" },
  { href: "/advertise", icon: Megaphone, label: "Advertise", desc: "Reach our audience", color: "from-[#f97316] to-[#ea580c]" },
];

// ─── Page component ────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { open: openStreamPlayer } = useStreamPlayer();

  return (
    <div className="space-y-12">
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-8 overflow-hidden rounded-b-2xl sm:-mx-6 md:-mx-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0d1b2a] to-[#1a0533]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#74ddc7]/10 via-transparent to-[#7401df]/10" />

        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div className="relative px-6 py-16 sm:px-10 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 border border-[#74ddc7]/20">
              <Radio className="mr-1 h-3 w-3" />
              WCCG 104.5 FM
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Discover What&apos;s On
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              20+ shows, 6 live channels, community events, local services, and
              exclusive perks&mdash;all in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={openStreamPlayer}
                className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-6"
              >
                <Play className="mr-2 h-4 w-4" />
                Listen Live
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-white/20 text-white hover:bg-white/5 hover:text-white px-6"
                asChild
              >
                <Link href="/shows">
                  Browse All Shows
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Where Every Beat Belongs ──────────────────────────────────── */}
      <section className="space-y-8 py-4">
        {/* Heading */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Where Every Beat Belongs.
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Legacy streams and fresh new sounds. Exclusive shows, real conversations,
            nonstop laughs, and live coverage of Duke Football and Basketball.
          </p>
        </div>

        {/* Feature Cards — 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Curated DJ Mixshows */}
          <Link href="/mix-squad" className="group rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 transition-all hover:border-[#74ddc7]/30 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/shows/crank-corleone.png" alt="DJ" fill className="object-cover" />
              </div>
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/shows/bootleg-kev-show.png" alt="DJ" fill className="object-cover" />
              </div>
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/incognito.png" alt="DJ" fill className="object-cover" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">Curated DJ Mixshows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our curated mixshows bring together top DJs, exclusive blends, and genre-spanning sets that keep the energy moving.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
              Meet The Mix Squad
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Card 2: Live Shows & Podcasts */}
          <Link href="/shows-podcasts" className="group rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 transition-all hover:border-[#74ddc7]/30 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/angela-yee.png" alt="Host" fill className="object-cover" />
              </div>
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/yung-joc.png" alt="Host" fill className="object-cover" />
              </div>
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/incognito.png" alt="Host" fill className="object-cover" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">Live Shows &amp; Podcasts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                From live shows to podcasts, listeners enjoy fresh voices, exclusive content, and on-demand experiences.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
              Discover Shows
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Card 3: Diverse News & Weather */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#00a651] text-white font-bold text-lg sm:text-xl leading-tight text-center px-1">
                <span>BN<br/>Network</span>
              </div>
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#f47920]">
                <CloudSun className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#4566b0]">
                <Newspaper className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">Diverse News &amp; Weather</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Delivering local updates, national headlines, and real-time weather alerts when you need them most.
              </p>
            </div>
          </div>

          {/* Card 4: Duke Sports */}
          <Link href="/sports" className="group rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 transition-all hover:border-[#74ddc7]/30 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#003087]">
                <Dribbble className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#003087]">
                <ShieldCheck className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">Duke Sports</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Duke Sports brings you the excitement of Blue Devil football and basketball all season long.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
              Duke Blue Devils
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Card 5: Sunday Gospel Caravan */}
          <Link href="/gospel-caravan" className="group rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 transition-all hover:border-[#74ddc7]/30 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#d4a017] to-[#b8860b]">
                <Church className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df] to-[#4c1d95]">
                <Mic className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">Sunday Gospel Caravan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bringing uplifting music, inspiring messages, and a community of faith together every Sunday.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
              Gospel Caravan
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Card 6: Legacy Streaming */}
          <Link href="/channels" className="group rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 transition-all hover:border-[#74ddc7]/30 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#0d9488]">
                <Radio className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#ec4899]">
                <Disc3 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-[#74ddc7] transition-colors">Legacy Streaming</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These timeless streams carry the music, culture, and community that built our legacy.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
              Browse Channels
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Quick Links Grid ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-input hover:-translate-y-0.5"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${link.color}`}>
                <link.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">{link.label}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Advertise With Us CTA ────────────────────────────────────── */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d9488] to-[#7401df] p-8 md:p-12">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          }} />

          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Megaphone className="h-8 w-8 text-white" />
            </div>

            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Advertise With Us
              </h2>
              <p className="max-w-lg text-sm text-white/70">
                Reach thousands of engaged listeners across the Fayetteville
                metro area and 9 surrounding NC counties. WCCG 104.5 FM puts your
                message in front of the community that matters most.
              </p>
            </div>

            <Button
              size="lg"
              className="shrink-0 rounded-full bg-white text-[#0d9488] font-bold hover:bg-white/90 px-6"
              asChild
            >
              <Link href="/advertise">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
