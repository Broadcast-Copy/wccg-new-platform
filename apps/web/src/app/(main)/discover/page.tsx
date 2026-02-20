import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

// ─── Metadata ──────────────────────────────────────────────────────────────

export const metadata = {
  title: "Discover | WCCG 104.5 FM",
  description:
    "Your free access to nonstop hits, exclusive interviews, giveaways, and local event perks — all in one place.",
};

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Data fetching ─────────────────────────────────────────────────────────

async function getShows(): Promise<Show[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/shows`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ─── Category helpers ──────────────────────────────────────────────────────

const GOSPEL_PREFIXES = [
  "show_praise_mix",
  "show_marvin_sapp",
  "show_grace",
  "show_encouraging",
  "show_family_fellowship",
  "show_progressive",
  "show_lewis_chapel",
];

function categorizeShows(shows: Show[]) {
  const mixSquad: Show[] = [];
  const gospel: Show[] = [];
  const sports: Show[] = [];
  const mainShows: Show[] = [];

  for (const show of shows) {
    if (show.id.startsWith("show_mix_squad")) {
      mixSquad.push(show);
    } else if (GOSPEL_PREFIXES.some((prefix) => show.id.startsWith(prefix))) {
      gospel.push(show);
    } else if (show.id.startsWith("show_duke_")) {
      sports.push(show);
    } else {
      mainShows.push(show);
    }
  }

  return { mixSquad, gospel, sports, mainShows };
}

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

// ─── Show card (circular image + name) ─────────────────────────────────────

function DiscoverShowCard({ show }: { show: Show }) {
  const hostName =
    show.hosts?.find((h) => h.isPrimary)?.name ?? show.hosts?.[0]?.name;

  return (
    <Link
      href={`/shows/${show.id}`}
      className="group flex w-40 shrink-0 flex-col items-center gap-3 sm:w-44"
    >
      {/* Circular image */}
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-transparent bg-muted transition-all group-hover:border-teal-500 group-hover:shadow-lg group-hover:shadow-teal-500/20 sm:h-36 sm:w-36">
        {show.imageUrl ? (
          <img
            src={show.imageUrl}
            alt={show.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 to-purple-700">
            <span className="text-2xl font-bold text-white">
              {getInitials(show.name)}
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-sm font-semibold leading-tight transition-colors group-hover:text-teal-400">
          {show.name}
        </p>
        {hostName && (
          <p className="mt-0.5 text-xs text-muted-foreground">{hostName}</p>
        )}
      </div>
    </Link>
  );
}

// ─── Horizontal scrollable rail ────────────────────────────────────────────

function ShowRail({ shows }: { shows: Show[] }) {
  if (shows.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Shows coming soon. Stay tuned!
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-6 px-6">
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {shows.map((show) => (
          <DiscoverShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────

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
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {badge && (
            <Badge variant="secondary" className="text-xs">
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

// ─── Page component ────────────────────────────────────────────────────────

export default async function DiscoverPage() {
  const shows = await getShows();
  const { mixSquad, gospel, sports, mainShows } = categorizeShows(shows);

  return (
    <div className="space-y-12">
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-6 overflow-hidden rounded-b-2xl sm:-mx-6 md:-mx-8">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-teal-950 to-purple-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-purple-600/20" />

        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div className="relative px-6 py-16 sm:px-10 sm:py-20 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30">
              <Radio className="mr-1 h-3 w-3" />
              WCCG 104.5 FM
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Discover What&apos;s On
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Your free access to nonstop hits, exclusive interviews, giveaways,
              and local event perks&mdash;all in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/channels">
                  <Headphones className="mr-2 h-4 w-4" />
                  Listen Live
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/shows">
                  Browse All Shows
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. Curated DJ Mixshows ──────────────────────────────────────── */}
      <DiscoverSection
        icon={<Disc3 className="h-6 w-6 text-teal-500" />}
        title="Curated DJ Mixshows"
        description="Our curated mixshows bring together top DJs, exclusive blends, and genre-spanning sets that keep the energy going around the clock."
        badge="Mix Squad"
      >
        <ShowRail shows={mixSquad} />
      </DiscoverSection>

      {/* ── 2. Live Shows & Podcasts ────────────────────────────────────── */}
      <DiscoverSection
        icon={<Podcast className="h-6 w-6 text-purple-500" />}
        title="Live Shows &amp; Podcasts"
        description="From live shows to podcasts, listeners enjoy fresh voices, exclusive content, and on-demand experiences from top personalities."
      >
        <ShowRail shows={mainShows} />
      </DiscoverSection>

      {/* ── 3. News & Weather ───────────────────────────────────────────── */}
      <DiscoverSection
        icon={<Newspaper className="h-6 w-6 text-blue-500" />}
        title="News &amp; Weather"
        description="Stay informed with local updates, national headlines, and real-time weather alerts for the Charlotte area."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Local News</p>
                <p className="text-xs text-muted-foreground">
                  Charlotte-area coverage
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                <Newspaper className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">National Headlines</p>
                <p className="text-xs text-muted-foreground">
                  Top stories daily
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <CloudSun className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Weather Forecast</p>
                <p className="text-xs text-muted-foreground">
                  7-day outlook
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <CloudRain className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Weather Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Severe weather updates
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DiscoverSection>

      {/* ── 4. Duke Sports ──────────────────────────────────────────────── */}
      <DiscoverSection
        icon={<Trophy className="h-6 w-6 text-blue-600" />}
        title="Duke Sports"
        description="Comprehensive coverage of Duke Blue Devils football and basketball — scores, highlights, and post-game analysis."
        badge="Go Blue Devils"
      >
        {sports.length > 0 ? (
          <ShowRail shows={sports} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="group transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-700/10 text-blue-600">
                  <Dribbble className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold">Duke Basketball</p>
                  <p className="text-sm text-muted-foreground">
                    Game previews, recaps, and Blue Devils basketball talk
                  </p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="group transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-700/10 text-blue-600">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold">Duke Football</p>
                  <p className="text-sm text-muted-foreground">
                    Season updates, interviews, and in-depth game coverage
                  </p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        )}
      </DiscoverSection>

      {/* ── 5. Sunday Gospel Caravan ─────────────────────────────────────── */}
      <DiscoverSection
        icon={<Church className="h-6 w-6 text-amber-500" />}
        title="Sunday Gospel Caravan"
        description="Bringing uplifting music, inspiring messages, and a community of faith together every Sunday on WCCG 104.5 FM."
        badge="Sundays"
      >
        <ShowRail shows={gospel} />
      </DiscoverSection>

      {/* ── 6. Advertise With Us ─────────────────────────────────────────── */}
      <section>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-600 to-purple-700 text-white">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          }} />

          <CardContent className="relative flex flex-col items-center gap-6 py-12 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Megaphone className="h-8 w-8" />
            </div>

            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Advertise With Us
              </h2>
              <p className="max-w-lg text-sm text-teal-100">
                Reach thousands of engaged listeners across the Charlotte
                metro area. Whether you&apos;re a local business or a national
                brand, WCCG 104.5 FM puts your message in front of the
                community that matters most.
              </p>
            </div>

            <Button
              size="lg"
              variant="secondary"
              className="shrink-0 bg-white text-teal-700 hover:bg-white/90"
              asChild
            >
              <Link href="/advertise">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
