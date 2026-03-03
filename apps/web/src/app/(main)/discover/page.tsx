"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/app-image";
import {
  Disc3,
  Newspaper,
  CloudSun,
  Trophy,
  Church,
  Megaphone,
  ArrowRight,
  Radio,
  ChevronRight,
  Headphones,
  Podcast,
  CloudRain,
  Globe,
  Dribbble,
  ShieldCheck,
  Play,
  MapPin,
  Gift,
  CalendarDays,
  ShoppingBag,
  Mic,
  Music,
} from "lucide-react";
import {
  ALL_SHOWS,
  WEEKDAY_SHOWS,
  SATURDAY_SHOWS,
  SUNDAY_SHOWS,
  GOSPEL_SHOWS,
  type ShowData,
} from "@/data/shows";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

// ─── Category helpers ──────────────────────────────────────────────────

const MIXSQUAD_SHOWS = ALL_SHOWS.filter((s) => s.category === "mixsquad");
const SPORTS_SHOWS: ShowData[] = []; // placeholder for future Duke sports shows
const MAIN_SHOWS = [...WEEKDAY_SHOWS, ...SATURDAY_SHOWS, ...SUNDAY_SHOWS.filter((s) => s.category === "sunday")];

// ─── Helper: initials from name ────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Show card (circular image + name) ─────────────────────────────────

function DiscoverShowCard({ show }: { show: ShowData }) {
  return (
    <Link
      href={`/shows/${show.id}`}
      className="group flex w-40 shrink-0 flex-col items-center gap-3 sm:w-44"
    >
      {/* Circular image */}
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-transparent bg-card transition-all group-hover:border-[#74ddc7] group-hover:shadow-lg group-hover:shadow-[#74ddc7]/20 sm:h-36 sm:w-36">
        {show.imageUrl || show.showImageUrl ? (
          <AppImage
            src={show.imageUrl || show.showImageUrl!}
            alt={show.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${show.gradient}`}>
            <span className="text-2xl font-bold text-white">
              {getInitials(show.name)}
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-[#74ddc7]">
          {show.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{show.hostNames}</p>
      </div>
    </Link>
  );
}

// ─── Horizontal scrollable rail ────────────────────────────────────────

function ShowRail({ shows }: { shows: ShowData[] }) {
  if (shows.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-sm text-muted-foreground/70">
          Shows coming soon. Stay tuned!
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-6 px-6">
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {shows.map((show) => (
          <DiscoverShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────

interface DiscoverSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}

function DiscoverSection({
  icon,
  title,
  description,
  badge,
  children,
}: DiscoverSectionProps) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h2>
          {badge && (
            <Badge className="bg-white/10 text-foreground/70 hover:bg-white/15 text-xs border-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

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
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 md:-mx-8">
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

      {/* ── 1. Curated DJ Mixshows ──────────────────────────────────────── */}
      <DiscoverSection
        icon={<Disc3 className="h-6 w-6 text-[#ec4899]" />}
        title="Curated DJ Mixshows"
        description="Our curated mixshows bring together top DJs, exclusive blends, and genre-spanning sets that keep the energy going around the clock."
        badge="Mix Squad"
      >
        <ShowRail shows={MIXSQUAD_SHOWS} />
      </DiscoverSection>

      {/* ── 2. Live Shows & Podcasts ────────────────────────────────────── */}
      <DiscoverSection
        icon={<Podcast className="h-6 w-6 text-[#7401df]" />}
        title="Live Shows &amp; Podcasts"
        description="From live shows to podcasts, listeners enjoy fresh voices, exclusive content, and on-demand experiences from top personalities."
      >
        <ShowRail shows={MAIN_SHOWS} />
      </DiscoverSection>

      {/* ── 3. News & Weather ───────────────────────────────────────────── */}
      <DiscoverSection
        icon={<Newspaper className="h-6 w-6 text-[#3b82f6]" />}
        title="News &amp; Weather"
        description="Stay informed with local updates, national headlines, and real-time weather alerts for the Fayetteville area."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Globe, label: "Local News", desc: "Fayetteville-area coverage", color: "text-[#3b82f6] bg-[#3b82f6]/10" },
            { icon: Newspaper, label: "National Headlines", desc: "Top stories daily", color: "text-[#06b6d4] bg-[#06b6d4]/10" },
            { icon: CloudSun, label: "Weather Forecast", desc: "7-day outlook", color: "text-[#f59e0b] bg-[#f59e0b]/10" },
            { icon: CloudRain, label: "Weather Alerts", desc: "Severe weather updates", color: "text-[#ef4444] bg-[#ef4444]/10" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-input"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DiscoverSection>

      {/* ── 4. Duke Sports ──────────────────────────────────────────────── */}
      <DiscoverSection
        icon={<Trophy className="h-6 w-6 text-[#3b82f6]" />}
        title="Duke Sports"
        description="Comprehensive coverage of Duke Blue Devils football and basketball — scores, highlights, and post-game analysis."
        badge="Go Blue Devils"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-input">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
              <Dribbble className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Duke Basketball</p>
              <p className="text-sm text-muted-foreground">
                Game previews, recaps, and Blue Devils basketball talk
              </p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-foreground/20" />
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-input">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Duke Football</p>
              <p className="text-sm text-muted-foreground">
                Season updates, interviews, and in-depth game coverage
              </p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-foreground/20" />
          </div>
        </div>
      </DiscoverSection>

      {/* ── 5. Sunday Gospel Caravan ─────────────────────────────────────── */}
      <DiscoverSection
        icon={<Church className="h-6 w-6 text-[#f59e0b]" />}
        title="Sunday Gospel Caravan"
        description="Bringing uplifting music, inspiring messages, and a community of faith together every Sunday on WCCG 104.5 FM."
        badge="Sundays"
      >
        <ShowRail shows={GOSPEL_SHOWS} />
      </DiscoverSection>

      {/* ── 6. Advertise With Us CTA ────────────────────────────────────── */}
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
