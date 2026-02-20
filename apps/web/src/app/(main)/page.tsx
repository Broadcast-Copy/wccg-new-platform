import { Hero } from "@/components/home/hero";
import { LiveNowRail } from "@/components/home/live-now-rail";
import { UpNextRail } from "@/components/home/up-next-rail";
import { EventCard } from "@/components/events/event-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Radio, Calendar, Mic2 } from "lucide-react";

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

export default async function HomePage() {
  const events = await getUpcomingEvents();

  return (
    <div className="space-y-12">
      <Hero />

      <LiveNowRail />

      <UpNextRail />

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

      {/* Quick Links */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Explore</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/channels"
            className="group flex items-center gap-4 rounded-lg border p-6 transition-colors hover:bg-accent"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-foreground">
                Channel Guide
              </h3>
              <p className="text-sm text-muted-foreground">
                Browse all streams
              </p>
            </div>
          </Link>
          <Link
            href="/schedule"
            className="group flex items-center gap-4 rounded-lg border p-6 transition-colors hover:bg-accent"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-foreground">
                Weekly Schedule
              </h3>
              <p className="text-sm text-muted-foreground">
                See what&apos;s on
              </p>
            </div>
          </Link>
          <Link
            href="/shows"
            className="group flex items-center gap-4 rounded-lg border p-6 transition-colors hover:bg-accent"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mic2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-foreground">
                Show Directory
              </h3>
              <p className="text-sm text-muted-foreground">
                Discover shows
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
