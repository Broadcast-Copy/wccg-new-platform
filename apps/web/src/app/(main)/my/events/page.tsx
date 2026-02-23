"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Plus,
  Ticket,
  QrCode,
  Settings,
  Pencil,
  CalendarCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────

interface MyEvent {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  venueName: string | null;
  city: string | null;
  status: string;
  bannerUrl: string | null;
  registrationCount: number;
}

interface MyRegistration {
  id: string;
  eventId: string;
  status: string;
  ticketType: string | null;
  qrCode: string | null;
  event: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    venueName: string | null;
    city: string | null;
    bannerUrl: string | null;
    status: string;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]";
    case "DRAFT":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    case "CANCELLED":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "COMPLETED":
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
  }
}

function getRegistrationStatusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]";
    case "PENDING":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    case "CANCELLED":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "CHECKED_IN":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export default function MyEventsPage() {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [myTickets, setMyTickets] = useState<MyRegistration[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingEvents(false);
      setLoadingTickets(false);
      return;
    }

    async function fetchMyEvents() {
      try {
        const data = await apiClient<MyEvent[]>("/events?creator=me");
        setMyEvents(Array.isArray(data) ? data : []);
      } catch {
        setMyEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    async function fetchMyTickets() {
      try {
        const data = await apiClient<MyRegistration[]>("/registrations/me");
        setMyTickets(Array.isArray(data) ? data : []);
      } catch {
        setMyTickets([]);
      } finally {
        setLoadingTickets(false);
      }
    }

    fetchMyEvents();
    fetchMyTickets();
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
          <p className="text-muted-foreground">
            Please{" "}
            <Link href="/login" className="underline hover:text-foreground">
              sign in
            </Link>{" "}
            to view your events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
          <p className="text-muted-foreground">
            Manage your events and view your tickets
          </p>
        </div>
        <Link href="/events/create">
          <Button className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90">
            <Plus className="h-4 w-4" />
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-events">
        <TabsList>
          <TabsTrigger value="my-events" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            My Events
          </TabsTrigger>
          <TabsTrigger value="my-tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            My Tickets
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: My Events */}
        <TabsContent value="my-events" className="mt-6">
          {loadingEvents ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-5 w-5 animate-pulse" />
                <span>Loading your events...</span>
              </div>
            </div>
          ) : myEvents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7401df]/10">
                  <CalendarCheck className="h-8 w-8 text-[#7401df]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No events yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You haven&apos;t created any events. Start by creating your
                    first event to engage with the community!
                  </p>
                </div>
                <Link href="/events/create">
                  <Button className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90">
                    <Plus className="h-4 w-4" />
                    Create Your First Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myEvents.map((event) => (
                <Card
                  key={event.id}
                  className="overflow-hidden transition-colors hover:bg-muted/50"
                >
                  {/* Banner */}
                  <div className="relative h-32 w-full">
                    {event.bannerUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${event.bannerUrl})`,
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#7401df]/60 via-[#7401df]/40 to-[#74ddc7]/30" />
                    )}
                    <div className="absolute right-2 top-2">
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1 text-base">
                      {event.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {formatDate(event.startDate)}
                        </span>
                      </div>
                      {(event.venueName || event.city) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {[event.venueName, event.city]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Ticket className="h-3.5 w-3.5" />
                      <span>
                        {event.registrationCount}{" "}
                        {event.registrationCount === 1
                          ? "registration"
                          : "registrations"}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/my/events/${event.id}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Manage
                        </Button>
                      </Link>
                      <Link
                        href={`/events/create?edit=${event.id}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: My Tickets */}
        <TabsContent value="my-tickets" className="mt-6">
          {loadingTickets ? (
            <div className="flex h-48 items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Ticket className="h-5 w-5 animate-pulse" />
                <span>Loading your tickets...</span>
              </div>
            </div>
          ) : myTickets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#74ddc7]/10">
                  <Ticket className="h-8 w-8 text-[#74ddc7]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No tickets yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You haven&apos;t registered for any events. Browse upcoming
                    events to find something exciting!
                  </p>
                </div>
                <Link href="/events">
                  <Button className="gap-2 bg-[#74ddc7] text-black hover:bg-[#74ddc7]/90">
                    <CalendarDays className="h-4 w-4" />
                    Browse Events
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myTickets.map((registration) => (
                <Card
                  key={registration.id}
                  className="overflow-hidden transition-colors hover:bg-muted/50"
                >
                  {/* Banner */}
                  <div className="relative h-32 w-full">
                    {registration.event.bannerUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${registration.event.bannerUrl})`,
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#74ddc7]/60 via-[#74ddc7]/40 to-[#7401df]/30" />
                    )}
                    <div className="absolute right-2 top-2">
                      <Badge
                        className={getRegistrationStatusColor(
                          registration.status,
                        )}
                      >
                        {registration.status}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1 text-base">
                      {registration.event.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {formatDate(registration.event.startDate)}
                        </span>
                      </div>
                      {(registration.event.venueName ||
                        registration.event.city) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {[
                              registration.event.venueName,
                              registration.event.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {registration.ticketType && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Ticket className="h-3.5 w-3.5" />
                        <span>{registration.ticketType}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/events/${registration.eventId}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          View Event
                        </Button>
                      </Link>
                      {registration.qrCode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            // Could open a modal with QR code
                            alert(`QR Code: ${registration.qrCode}`);
                          }}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          QR
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
