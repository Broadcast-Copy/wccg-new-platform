"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Ticket,
  CheckCircle,
} from "lucide-react";

// ─── Types matching API response (camelCase from NestJS format methods) ───

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantitySold: number;
  description: string | null;
  isActive: boolean;
}

interface Organizer {
  userId: string;
  role: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  startDate: string;
  endDate: string;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  maxAttendees: number | null;
  isFree: boolean;
  isVirtual: boolean;
  virtualUrl: string | null;
  bannerUrl: string | null;
  status: string;
  visibility: string;
  ticketTypes: TicketType[];
  organizers: Organizer[];
  registrationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RegistrationResult {
  id: string;
  eventId: string;
  status: string;
  qrCode: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(price: number, isFree: boolean): string {
  if (isFree || price === 0) return "Free";
  return `$${price.toFixed(2)}`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "DRAFT":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    case "COMPLETED":
      return "outline";
    default:
      return "secondary";
  }
}

// ─── Component ───────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState<RegistrationResult | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;
    async function fetchEvent() {
      try {
        setLoading(true);
        const data = await apiClient<EventDetail>(`/events/${eventId}`);
        if (!cancelled) {
          setEvent(data);
          setError(null);
          // Auto-select first active ticket type with availability
          const firstActive = data.ticketTypes.find(
            (t) => t.isActive && t.quantity - t.quantitySold > 0,
          );
          if (firstActive) {
            setSelectedTicketId(firstActive.id);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load event",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // ─── Register handler ──────────────────────────────────────────────

  async function handleRegister() {
    if (!eventId) return;
    setRegistering(true);
    setRegisterError(null);

    try {
      const result = await apiClient<RegistrationResult>(
        `/events/${eventId}/register`,
        {
          method: "POST",
          body: JSON.stringify({
            ticketTypeId: selectedTicketId ?? undefined,
          }),
        },
      );
      setRegistered(result);
    } catch (err: unknown) {
      setRegisterError(
        err instanceof Error ? err.message : "Registration failed",
      );
    } finally {
      setRegistering(false);
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-5 w-5 animate-pulse" />
            <span>Loading event...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────

  if (error || !event) {
    return (
      <div className="space-y-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {error ?? "Event not found."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Derived values ────────────────────────────────────────────────────

  const isCancelled = event.status === "CANCELLED";
  const isCompleted = event.status === "COMPLETED";
  const canRegister =
    !isCancelled && !isCompleted && event.status === "PUBLISHED";

  // Build full address string
  const addressParts = [event.address, event.city, event.state, event.zipCode].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  // ─── Main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      {/* Banner Image */}
      <div className="relative overflow-hidden rounded-xl border">
        {event.bannerUrl ? (
          <div
            className="h-48 w-full bg-cover bg-center sm:h-72"
            style={{
              backgroundImage: `url(${event.bannerUrl})`,
            }}
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 sm:h-72" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(event.status)}>
                {event.status}
              </Badge>
              {event.isFree && (
                <Badge variant="outline" className="border-white/30 text-white">
                  Free Event
                </Badge>
              )}
              {event.category && (
                <Badge variant="outline" className="border-white/30 text-white">
                  {event.category}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">
                    {formatDateTime(event.startDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    to {formatDateTime(event.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue / Location */}
          {(event.venueName || fullAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {event.venueName && (
                  <p className="font-medium">{event.venueName}</p>
                )}
                {fullAddress && (
                  <p className="text-sm text-muted-foreground">
                    {fullAddress}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Organizers */}
          {event.organizers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Organizers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.organizers.map((org) => (
                    <div
                      key={org.userId}
                      className="flex items-center gap-3"
                    >
                      <Avatar>
                        {org.avatarUrl ? (
                          <AvatarImage
                            src={org.avatarUrl}
                            alt={org.displayName ?? "Organizer"}
                          />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(org.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {org.displayName ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {org.role.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendance Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {event.registrationCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.registrationCount === 1
                      ? "Attendee registered"
                      : "Attendees registered"}
                  </p>
                </div>
              </div>
              {event.maxAttendees && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">
                      {event.registrationCount} / {event.maxAttendees}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(
                          (event.registrationCount / event.maxAttendees) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ticket Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.ticketTypes.length > 0 ? (
                event.ticketTypes.map((ticket) => {
                  const available = ticket.quantity - ticket.quantitySold;
                  const isSoldOut = available <= 0;
                  const isSelected = selectedTicketId === ticket.id;
                  const isInactive = !ticket.isActive;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      disabled={isSoldOut || isInactive || !canRegister}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/50"
                      } ${
                        isSoldOut || isInactive
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{ticket.name}</p>
                        <p className="font-semibold text-sm">
                          {formatPrice(ticket.price, event.isFree)}
                        </p>
                      </div>
                      {ticket.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {ticket.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {isSoldOut
                            ? "Sold out"
                            : `${available} remaining`}
                        </span>
                        {isSelected && !isSoldOut && (
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  {event.isFree
                    ? "This is a free event. No tickets required."
                    : "No ticket types available."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Registration */}
          {registered ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-3">
                <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
                <div>
                  <p className="font-semibold">You are registered!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirmation code:
                  </p>
                  <p className="font-mono text-sm font-bold">
                    {registered.qrCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : canRegister ? (
            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleRegister}
                disabled={registering}
              >
                <Ticket className="h-4 w-4" />
                {registering ? "Registering..." : "Register for Event"}
              </Button>
              {registerError && (
                <p className="text-sm text-destructive text-center">
                  {registerError}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isCancelled
                  ? "This event has been cancelled."
                  : isCompleted
                    ? "This event has already ended."
                    : "Registration is not currently available."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
