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
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Discover What&apos;s On
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
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
                className="rounded-full border-white/20 text-foreground hover:bg-white/5 hover:text-foreground px-6"
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

      {/* ── Community Banner ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch">
          {/* Left: Community image */}
          <div className="relative w-full sm:w-[45%] aspect-[4/3] overflow-hidden">
            <AppImage
              src="/images/discover-hero-1.png"
              alt="WCCG 104.5 FM Community"
              fill
              className="object-cover"
            />
          </div>

          {/* Right: Text content */}
          <div className="flex-1 px-5 py-5 sm:px-7 sm:py-6 flex flex-col justify-center space-y-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
              WCCG 104.5 FM + Community<br />
              Always Free, Always Local!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              Your free access to nonstop hits, exclusive interviews, giveaways, and local
              event perks — all in one place.
            </p>
            <p className="text-xs font-bold text-foreground">
              No Subscription. No Gimmicks.
            </p>
          </div>
        </div>
      </section>

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

        {/* 2×2 Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Curated DJ Mixshows */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/shows/crank-corleone.png" alt="DJ" fill className="object-cover" />
              </div>
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/shows/bootleg-kev-show.png" alt="DJ" fill className="object-cover" />
              </div>
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/incognito.png" alt="DJ" fill className="object-cover" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">Curated DJ Mixshows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our curated mixshows bring together top DJs, exclusive blends, and genre-spanning sets that keep the energy moving.
              </p>
            </div>
          </div>

          {/* Card 2: Live Shows & Podcasts */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/angela-yee.png" alt="Host" fill className="object-cover" />
              </div>
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/shorty-corleone.png" alt="Host" fill className="object-cover" />
              </div>
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                <AppImage src="/images/hosts/yung-joc.png" alt="Host" fill className="object-cover" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">Live Shows &amp; Podcasts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                From live shows to podcasts, listeners enjoy fresh voices, exclusive content, and on-demand experiences.
              </p>
            </div>
          </div>

          {/* Card 3: Diverse News & Weather */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00a651] text-white font-bold text-xs leading-tight text-center px-1">
                <span>BN<br/>Network</span>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f47920]">
                <CloudSun className="h-8 w-8 text-white" />
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4566b0]">
                <Newspaper className="h-8 w-8 text-white" />
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
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003087]">
                <Dribbble className="h-8 w-8 text-white" />
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003087]">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">Duke Sports</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Duke Sports brings you the excitement of Blue Devil football and basketball all season long.
              </p>
            </div>
          </div>
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
