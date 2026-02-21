import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Plus, MapPin, Ticket } from "lucide-react";

export const metadata = {
  title: "Events | WCCG 104.5 FM",
  description: "Discover upcoming events, concerts, and community experiences in Fayetteville, NC.",
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/events`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-orange-950/60 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 30% 40%, rgba(249,115,22,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.2) 0%, transparent 50%)` }} />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-500/20">
              <CalendarDays className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Events &amp; Experiences</h1>
              <p className="text-base text-gray-400 max-w-2xl">Discover upcoming events, concerts, and community experiences in Fayetteville. Attend events to earn mY1045 points.</p>
            </div>
            <Button asChild className="rounded-full gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20">
              <Link href="/events/create"><Plus className="h-4 w-4" />Create Event</Link>
            </Button>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-orange-400" /><span className="text-sm font-medium text-gray-300">Upcoming</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{events.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal-400" /><span className="text-sm font-medium text-gray-300">Location</span></div>
              <p className="mt-1 text-2xl font-bold text-white">Fayetteville</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-amber-400" /><span className="text-sm font-medium text-gray-300">Perks</span></div>
              <p className="mt-1 text-2xl font-bold text-white">Earn Pts</p>
            </div>
          </div>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} eventId={event.id} title={event.title} description={event.description}
              date={new Date(event.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              venue={event.venue} ticketPrice={event.isFree ? "Free" : "Ticketed"} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No upcoming events at the moment.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for new events and experiences</p>
          <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
            <Link href="/events/create"><Plus className="mr-1 h-3 w-3" />Create an Event</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
