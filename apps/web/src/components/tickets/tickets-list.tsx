"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Ticket,
  CalendarDays,
  MapPin,
  QrCode,
} from "lucide-react";

type RegistrationStatus = "CONFIRMED" | "CANCELLED" | "CHECKED_IN";

interface EventInfo {
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  venue: string | null;
  imageUrl: string | null;
}

interface Registration {
  id: string;
  eventId: string;
  ticketTypeId: string | null;
  status: RegistrationStatus;
  qrCode: string | null;
  purchasedAt: string;
  checkedInAt: string | null;
  // The events embed can be null under RLS (e.g. event later unpublished).
  event: EventInfo | null;
  ticketName: string;
}

const STATUS_CONFIG: Record<
  RegistrationStatus,
  { label: string; className: string }
> = {
  CONFIRMED: {
    label: "Confirmed",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
  },
  CHECKED_IN: {
    label: "Checked In",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  },
};

function EventImage({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  if (src) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-violet-600">
      <Ticket className="size-10 text-white/70" />
    </div>
  );
}

function VenueText({ event }: { event: EventInfo }) {
  if (!event.venue) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">{event.venue}</span>
    </div>
  );
}

function TicketCard({ registration }: { registration: Registration }) {
  const event = registration.event;
  const statusConfig = STATUS_CONFIG[registration.status];

  const eventTitle = event?.title ?? "Unknown Event";
  const eventLink = registration.eventId
    ? `/events/${registration.eventId}`
    : "#";

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        {/* Event Image */}
        <Link href={eventLink} className="block">
          <EventImage src={event?.imageUrl} alt={eventTitle} />
        </Link>

        <div className="space-y-3 p-4">
          {/* Title + Status */}
          <div className="flex items-start justify-between gap-2">
            <Link href={eventLink} className="group flex-1">
              <h3 className="font-semibold leading-tight group-hover:underline">
                {eventTitle}
              </h3>
            </Link>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Date */}
          {event?.startDate && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>
                {new Date(event.startDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}

          {/* Venue */}
          {event && <VenueText event={event} />}

          {/* Ticket Name */}
          {registration.ticketName && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{registration.ticketName}</span>
            </div>
          )}

          {/* QR Code */}
          {registration.qrCode && registration.status !== "CANCELLED" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <QrCode className="size-3.5" />
                Show this at the door
              </div>
              <div className="flex items-center justify-center rounded-md border-2 border-dashed p-4">
                <code className="text-sm font-mono break-all text-center">
                  {registration.qrCode}
                </code>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TicketsList() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchRegistrations() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (active) {
            setSignedIn(false);
            setRegistrations([]);
          }
          return;
        }

        // My registrations (RLS: auth.uid() = user_id), joined to the event
        // and the ticket type for display.
        const { data, error } = await supabase
          .from("event_registrations")
          .select(
            `id, event_id, ticket_type_id, status, qr_code, purchased_at, checked_in_at,
             ticket_types ( name ),
             events ( title, slug, start_date, end_date, venue, image_url )`,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        type EventEmbed = {
          title: string;
          slug: string;
          start_date: string;
          end_date: string;
          venue: string | null;
          image_url: string | null;
        };
        type Row = {
          id: string;
          event_id: string;
          ticket_type_id: string | null;
          status: RegistrationStatus;
          qr_code: string | null;
          purchased_at: string;
          checked_in_at: string | null;
          // Supabase may type to-one embeds as arrays; normalize at runtime.
          ticket_types: { name: string } | { name: string }[] | null;
          events: EventEmbed | EventEmbed[] | null;
        };

        const mapped: Registration[] = (
          (data as unknown as Row[] | null) ?? []
        ).map((row) => {
          const ev = Array.isArray(row.events) ? row.events[0] : row.events;
          const ticket = Array.isArray(row.ticket_types)
            ? row.ticket_types[0]
            : row.ticket_types;
          return {
            id: row.id,
            eventId: row.event_id,
            ticketTypeId: row.ticket_type_id,
            status: row.status,
            qrCode: row.qr_code,
            purchasedAt: row.purchased_at,
            checkedInAt: row.checked_in_at,
            event: ev
              ? {
                  title: ev.title,
                  slug: ev.slug,
                  startDate: ev.start_date,
                  endDate: ev.end_date,
                  venue: ev.venue,
                  imageUrl: ev.image_url,
                }
              : null,
            ticketName: ticket?.name ?? "",
          };
        });

        if (active) setRegistrations(mapped);
      } catch {
        // Query failed — the empty state UI will display.
        if (active) setRegistrations([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchRegistrations();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading tickets...</span>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="rounded-lg border p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Ticket className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Sign in to see your tickets</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link
                href="/login"
                className="underline hover:text-foreground"
              >
                Sign in
              </Link>{" "}
              to view your event registrations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="rounded-lg border p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Ticket className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">You have no tickets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse{" "}
              <Link
                href="/events"
                className="underline hover:text-foreground"
              >
                events
              </Link>{" "}
              to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {registrations.map((reg) => (
        <TicketCard key={reg.id} registration={reg} />
      ))}
    </div>
  );
}
