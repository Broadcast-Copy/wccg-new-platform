import { Hero } from "@/components/home/hero";
import { LiveNowRail } from "@/components/home/live-now-rail";
import { UpNextRail } from "@/components/home/up-next-rail";
import { EventCard } from "@/components/events/event-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Radio,
  Compass,
  CalendarDays,
  Users2,
  ShoppingBag,
  Gift,
  Cloud,
  Megaphone,
  Headphones,
  Music,
} from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  venue?: string;
  imageUrl?: string;
  isFree?: boolean;
}

async function getUpcomingEvents(): Promise<EventItem[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/events?limit=3`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const platformFeatures = [
  {
    href: "/channels",
    icon: Radio,
    title: "Now Streaming",
    description: "6 channels of curated music, talk, and sports",
    color: "from-purple-500 to-purple-700",
  },
  {
    href: "/discover",
    icon: Compass,
    title: "Discover More",
    description: "Shows, DJs, podcasts, and exclusive content",
    color: "from-teal-500 to-teal-700",
  },
  {
    href: "/community",
    icon: Users2,
    title: "Community Directory",
    description: "Local services and businesses near you",
    color: "from-blue-500 to-blue-700",
  },
  {
    href: "/events",
    icon: CalendarDays,
    title: "Events & Tickets",
    description: "Local events, concerts, and community experiences",
    color: "from-orange-500 to-orange-700",
  },
  {
    href: "/marketplace",
    icon: ShoppingBag,
    title: "Marketplace",
    description: "WCCG merch and local vendor products",
    color: "from-pink-500 to-pink-700",
  },
  {
    href: "/rewards",
    icon: Gift,
    title: "mY1045 Perks",
    description: "Earn points and redeem exclusive rewards",
    color: "from-yellow-500 to-yellow-700",
  },
  {
    href: "/contact",
    icon: Megaphone,
    title: "Advertise & Promote",
    description: "Reach our audience with your brand",
    color: "from-red-500 to-red-700",
  },
  {
    href: "/contact",
    icon: Headphones,
    title: "Creator Studio",
    description: "Studio production, podcasts, and content services",
    color: "from-indigo-500 to-indigo-700",
  },
  {
    href: "/contact",
    icon: Music,
    title: "Submit Music",
    description: "Get your tracks on WCCG 104.5 FM",
    color: "from-emerald-500 to-emerald-700",
  },
];

export default async function HomePage() {
  const events = await getUpcomingEvents();

  return (
    <div className="space-y-12">
      {/* Hero Slideshow */}
      <Hero />

      {/* Now Streaming + Discover CTAs */}
      <section className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/channels"
          className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900 to-purple-700 p-6 text-white transition-transform hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3">
            <Radio className="h-8 w-8" />
            <div>
              <h3 className="text-xl font-bold">Now Streaming</h3>
              <p className="text-white/70 text-sm">6 channels live now</p>
            </div>
          </div>
          <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
        </Link>
        <Link
          href="/discover"
          className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-800 to-teal-600 p-6 text-white transition-transform hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3">
            <Compass className="h-8 w-8" />
            <div>
              <h3 className="text-xl font-bold">Discover More</h3>
              <p className="text-white/70 text-sm">Shows, DJs, and podcasts</p>
            </div>
          </div>
          <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
        </Link>
      </section>

      {/* Live Now Rail */}
      <LiveNowRail />

      {/* Up Next Rail */}
      <UpNextRail />

      {/* Platform Features Grid (matching original site) */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">
          Explore the Platform
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatures.map((feature) => (
            <Link
              key={feature.href + feature.title}
              href={feature.href}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/20"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color} text-white`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            Upcoming Events
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/events">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                eventId={event.id}
                title={event.title}
                description={event.description}
                date={new Date(event.startDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                venue={event.venue}
                ticketPrice={event.isFree ? "Free" : "Ticketed"}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              No upcoming events at the moment. Check back soon!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
