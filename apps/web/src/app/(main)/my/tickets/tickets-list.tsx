"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Loader2,
  Ticket,
  CalendarDays,
  MapPin,
  QrCode,
} from "lucide-react";

type RegistrationStatus = "CONFIRMED" | "CANCELLED" | "CHECKED_IN";

interface TicketType {
  id: string;
  name: string;
  price: number;
}

interface EventInfo {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  image_url: string | null;
}

interface Registration {
  id: string;
  event_id: string;
  ticket_type_id: string;
  status: RegistrationStatus;
  qr_code: string | null;
  purchased_at: string;
  checked_in_at: string | null;
  event?: EventInfo;
  ticket_type?: TicketType;
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

function formatPrice(price: number): string {
  return price == 0 ? "Free" : "$" + Number(price).toFixed(2);
}

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
  const parts = [event.venue, event.city, event.state].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <MapPin className="size-3.5 shrink-0" />
      <span className="truncate">{parts.join(", ")}</span>
    </div>
  );
}

function TicketCard({ registration }: { registration: Registration }) {
  const event = registration.event;
  const ticketType = registration.ticket_type;
  const statusConfig = STATUS_CONFIG[registration.status];

  const eventTitle = event?.title ?? "Unknown Event";
  const eventLink = event ? `/events/${event.id}` : "#";

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        {/* Event Image */}
        <Link href={eventLink} className="block">
          <EventImage src={event?.image_url} alt={eventTitle} />
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
          {event?.start_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>
                {new Date(event.start_date).toLocaleDateString("en-US", {
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

          {/* Ticket Type + Price */}
          {ticketType && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{ticketType.name}</span>
              <span className="text-muted-foreground">
                {formatPrice(ticketType.price)}
              </span>
            </div>
          )}

          {/* QR Code */}
          {registration.qr_code && registration.status !== "CANCELLED" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <QrCode className="size-3.5" />
                Show this at the door
              </div>
              <div className="flex items-center justify-center rounded-md border-2 border-dashed p-4">
                <code className="text-sm font-mono break-all text-center">
                  {registration.qr_code}
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

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Registration[]>("/registrations/me");
      setRegistrations(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load tickets"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading tickets...</span>
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
