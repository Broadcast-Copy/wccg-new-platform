"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Eye, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";

interface EventRegistration {
  id: string;
  userId: string;
  user?: { email: string; displayName?: string };
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  status: string;
  creatorId?: string;
  creator?: { email: string; displayName?: string };
  registrations?: EventRegistration[];
  _count?: { registrations: number };
  createdAt?: string;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-500 hover:bg-gray-500";
    case "PUBLISHED":
      return "bg-green-600 hover:bg-green-600";
    case "CANCELLED":
      return "bg-red-600 hover:bg-red-600";
    case "COMPLETED":
      return "bg-blue-600 hover:bg-blue-600";
    default:
      return "";
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await apiClient<Event[]>("/events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load events");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleStatusChange(event: Event, newStatus: string) {
    setSubmitting(true);
    try {
      await apiClient(`/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Event ${newStatus.toLowerCase()} successfully`);
      fetchEvents();
    } catch (err) {
      toast.error("Failed to update event status");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function viewRegistrations(event: Event) {
    setSelectedEvent(event);
    setRegistrationsDialogOpen(true);
    setLoadingRegistrations(true);
    try {
      const data = await apiClient<EventRegistration[]>(
        `/events/${event.id}/registrations`
      );
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      // If endpoint doesn't exist, use inline registrations
      setRegistrations(event.registrations ?? []);
      console.error(err);
    } finally {
      setLoadingRegistrations(false);
    }
  }

  function getRegistrationCount(event: Event): number {
    if (event._count?.registrations !== undefined) {
      return event._count.registrations;
    }
    if (event.registrations) {
      return event.registrations.length;
    }
    return 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            No events found.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.creator?.displayName ||
                      event.creator?.email ||
                      "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(event.startDate)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(event.status)}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{getRegistrationCount(event)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => viewRegistrations(event)}
                        >
                          <Eye className="size-4" />
                          View Registrations
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {event.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(event, "PUBLISHED")
                            }
                            disabled={submitting}
                          >
                            <CheckCircle className="size-4" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {(event.status === "DRAFT" ||
                          event.status === "PUBLISHED") && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              handleStatusChange(event, "CANCELLED")
                            }
                            disabled={submitting}
                          >
                            <XCircle className="size-4" />
                            Cancel Event
                          </DropdownMenuItem>
                        )}
                        {event.status === "PUBLISHED" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(event, "COMPLETED")
                            }
                            disabled={submitting}
                          >
                            <CheckCircle className="size-4" />
                            Mark Completed
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Registrations Dialog */}
      <Dialog
        open={registrationsDialogOpen}
        onOpenChange={setRegistrationsDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrations</DialogTitle>
            <DialogDescription>
              Registrations for &ldquo;{selectedEvent?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>
          {loadingRegistrations ? (
            <p className="text-center text-muted-foreground py-4">
              Loading...
            </p>
          ) : registrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No registrations yet.
            </p>
          ) : (
            <div className="rounded-lg border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        {reg.user?.displayName || reg.user?.email || reg.userId}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(reg.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
