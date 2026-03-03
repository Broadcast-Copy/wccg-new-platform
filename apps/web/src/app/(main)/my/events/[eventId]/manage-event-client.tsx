"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Ticket,
  CheckCircle,
  DollarSign,
  Pencil,
  UserCheck,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  startDate: string;
  endDate: string;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  isFree: boolean;
  maxAttendees: number | null;
  registrationCount: number;
}

interface Registration {
  id: string;
  userId: string;
  displayName: string | null;
  email: string | null;
  ticketType: string | null;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export default function ManageEventClient() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const [eventData, regsData] = await Promise.allSettled([
          apiClient<EventDetail>(`/events/${eventId}`),
          apiClient<Registration[]>(`/events/${eventId}/registrations`),
        ]);

        if (!cancelled) {
          if (eventData.status === "fulfilled") {
            setEvent(eventData.value);
          } else {
            setError("Failed to load event details.");
          }

          if (regsData.status === "fulfilled") {
            setRegistrations(
              Array.isArray(regsData.value) ? regsData.value : [],
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load event data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [eventId, user]);

  // ─── Check-in handler ────────────────────────────────────────────────

  async function handleCheckIn(registrationId: string) {
    setCheckingIn(registrationId);
    try {
      await apiClient(`/registrations/${registrationId}/checkin`, {
        method: "POST",
      });
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId
            ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() }
            : r,
        ),
      );
    } catch {
      // Silently handle — could show toast
    } finally {
      setCheckingIn(null);
    }
  }

  // ─── Derived stats ───────────────────────────────────────────────────

  const totalRegistrations = registrations.length;
  const checkedInCount = registrations.filter((r) => r.checkedIn).length;
  const revenue = 0; // Placeholder — would come from API

  // ─── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/my/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Events
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

  // ─── Auth check ──────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Event</h1>
          <p className="text-muted-foreground">
            Please{" "}
            <Link href="/login" className="underline hover:text-foreground">
              sign in
            </Link>{" "}
            to manage your events.
          </p>
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────

  if (error || !event) {
    return (
      <div className="space-y-6">
        <Link
          href="/my/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Events
        </Link>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {error ?? "Event not found."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/my/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Events
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {event.title}
            </h1>
            <Badge className={getStatusColor(event.status)}>
              {event.status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDateTime(event.startDate)}
            </span>
            {(event.venueName || event.city) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {[event.venueName, event.city].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>

        <Link href={`/events/create?edit=${event.id}`}>
          <Button variant="outline" className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Event
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7]/10">
              <Users className="h-6 w-6 text-[#74ddc7]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRegistrations}</p>
              <p className="text-xs text-muted-foreground">
                Total Registrations
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <UserCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{checkedInCount}</p>
              <p className="text-xs text-muted-foreground">Checked In</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7401df]/10">
              <DollarSign className="h-6 w-6 text-[#7401df]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {event.isFree ? "Free" : `$${revenue.toFixed(2)}`}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity */}
      {event.maxAttendees && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Capacity: {totalRegistrations} / {event.maxAttendees}
              </span>
              <span className="font-medium">
                {Math.round(
                  (totalRegistrations / event.maxAttendees) * 100,
                )}
                %
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#74ddc7] transition-all"
                style={{
                  width: `${Math.min(
                    (totalRegistrations / event.maxAttendees) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Attendee / Registration List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#74ddc7]" />
            Registrations & Attendees
          </CardTitle>
          <CardDescription>
            Manage check-ins and view attendee details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No registrations yet. Share your event to start getting
                attendees!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden rounded-lg bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-12 sm:gap-4">
                <div className="col-span-4">Attendee</div>
                <div className="col-span-2">Ticket</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Registered</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
                >
                  {/* Attendee */}
                  <div className="col-span-4">
                    <p className="text-sm font-medium">
                      {reg.displayName || "Unknown"}
                    </p>
                    {reg.email && (
                      <p className="text-xs text-muted-foreground">
                        {reg.email}
                      </p>
                    )}
                  </div>

                  {/* Ticket Type */}
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">
                      {reg.ticketType ?? "General"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    {reg.checkedIn ? (
                      <Badge className="border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Checked In
                      </Badge>
                    ) : (
                      <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                        Registered
                      </Badge>
                    )}
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {new Date(reg.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>

                  {/* Action */}
                  <div className="col-span-2 text-right">
                    {!reg.checkedIn && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={checkingIn === reg.id}
                        onClick={() => handleCheckIn(reg.id)}
                      >
                        {checkingIn === reg.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        Check In
                      </Button>
                    )}
                    {reg.checkedIn && (
                      <span className="text-xs text-muted-foreground">
                        {reg.checkedInAt
                          ? new Date(reg.checkedInAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )
                          : "Done"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
