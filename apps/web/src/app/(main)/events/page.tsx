import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

export const metadata = {
  title: "Events | WCCG 104.5 FM",
};

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  venue?: string;
  imageUrl?: string;
  isFree?: boolean;
}

async function getEvents(): Promise<EventItem[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/events`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Discover upcoming events and community experiences
          </p>
        </div>
        <Button asChild>
          <Link href="/events/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
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
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              venue={event.venue}
              ticketPrice={event.isFree ? "Free" : "Ticketed"}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            No upcoming events at the moment. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
