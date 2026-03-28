"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  CalendarCheck,
  Plus,
  X,
  Clock,
  Users,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingType = "Appointment" | "Class" | "Rental" | "Custom";
type BookingStatus = "Confirmed" | "Pending" | "Cancelled";
type TabFilter = "All" | "Appointments" | "Classes" | "Rentals";

interface BookingSlot {
  id: string;
  serviceName: string;
  type: BookingType;
  duration: string;
  price: number;
  capacity: number;
  available: boolean;
  description: string;
}

interface UpcomingBooking {
  id: string;
  slotId: string;
  customerName: string;
  date: string;
  time: string;
  status: BookingStatus;
  serviceName: string;
  type: BookingType;
}

// ---------------------------------------------------------------------------
// Mock data (commented fallback)
// ---------------------------------------------------------------------------

// const SEED_SLOTS: BookingSlot[] = [
//   { id: "s1", serviceName: "Studio Recording Session", type: "Appointment", duration: "1 hour", price: 75, capacity: 1, available: true, description: "One-on-one studio session with professional audio setup." },
//   { id: "s2", serviceName: "DJ Masterclass", type: "Class", duration: "2 hours", price: 45, capacity: 12, available: true, description: "Group class covering DJ techniques, mixing, and live performance." },
//   { id: "s3", serviceName: "Event PA System", type: "Rental", duration: "Full day", price: 150, capacity: 1, available: false, description: "Professional PA system rental for outdoor and indoor events." },
//   { id: "s4", serviceName: "Podcast Coaching", type: "Appointment", duration: "45 min", price: 60, capacity: 1, available: true, description: "One-on-one coaching for aspiring podcasters." },
//   { id: "s5", serviceName: "Music Production Workshop", type: "Class", duration: "3 hours", price: 55, capacity: 8, available: true, description: "Hands-on beat-making and production techniques." },
// ];

// const SEED_BOOKINGS: UpcomingBooking[] = [
//   { id: "b1", slotId: "s1", customerName: "Marcus Johnson", date: "2026-03-30", time: "10:00 AM", status: "Confirmed", serviceName: "Studio Recording Session", type: "Appointment" },
//   { id: "b2", slotId: "s2", customerName: "Aisha Williams", date: "2026-04-02", time: "2:00 PM", status: "Pending", serviceName: "DJ Masterclass", type: "Class" },
//   { id: "b3", slotId: "s4", customerName: "Derek Thomas", date: "2026-04-05", time: "11:00 AM", status: "Confirmed", serviceName: "Podcast Coaching", type: "Appointment" },
//   { id: "b4", slotId: "s3", customerName: "Faith Community Church", date: "2026-04-12", time: "8:00 AM", status: "Cancelled", serviceName: "Event PA System", type: "Rental" },
//   { id: "b5", slotId: "s5", customerName: "Tyler Brooks", date: "2026-04-08", time: "6:00 PM", status: "Pending", serviceName: "Music Production Workshop", type: "Class" },
// ];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const TYPE_COLORS: Record<string, string> = {
  Appointment: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Class: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Rental: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Custom: "bg-foreground/[0.06] text-muted-foreground border-border",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<BookingStatus, typeof CheckCircle2> = {
  Confirmed: CheckCircle2,
  Pending: AlertCircle,
  Cancelled: XCircle,
};

const TAB_MAP: Record<TabFilter, BookingType | null> = {
  All: null,
  Appointments: "Appointment",
  Classes: "Class",
  Rentals: "Rental",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  serviceName: "",
  type: "Appointment" as BookingType,
  duration: "",
  capacity: "",
  price: "",
  description: "",
};

export default function BookingsPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Fetch booking slots and bookings from Supabase
  useEffect(() => {
    if (!user) return;
    async function fetchBookings() {
      setLoading(true);
      const [slotsRes, bookingsRes] = await Promise.all([
        supabase
          .from('vendor_bookings')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('vendor_bookings')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!slotsRes.error && slotsRes.data) {
        // Map rows that represent slots (have service_name)
        setSlots(slotsRes.data.map((row: any) => ({
          id: row.id,
          serviceName: row.service_name ?? '',
          type: row.type ?? 'Appointment',
          duration: row.duration_minutes ? `${row.duration_minutes} min` : '60 min',
          price: row.price ?? 0,
          capacity: row.capacity ?? 1,
          available: row.status === 'active',
          description: row.description ?? '',
        })));

        // Bookings come from booking_reservations table - fetch separately if needed
        setBookings([]);
      }
      setLoading(false);
    }
    fetchBookings();
  }, [user, supabase]);

  // Auth guard
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  const TABS: TabFilter[] = ["All", "Appointments", "Classes", "Rentals"];

  const filteredSlots = slots.filter((s) => {
    const mapped = TAB_MAP[activeTab];
    return mapped ? s.type === mapped : true;
  });

  async function handleCreateSlot() {
    if (!form.serviceName.trim()) return;

    const { data, error } = await supabase
      .from('vendor_bookings')
      .insert({
        vendor_id: user!.id,
        service_name: form.serviceName.trim(),
        type: form.type,
        duration_minutes: parseInt(form.duration) || 60,
        price: parseFloat(form.price) || 0,
        capacity: parseInt(form.capacity) || 1,
        description: form.description.trim(),
        status: 'active',
      })
      .select();

    if (!error && data?.[0]) {
      const row = data[0];
      const newSlot: BookingSlot = {
        id: row.id,
        serviceName: row.service_name ?? '',
        type: row.type ?? 'Appointment',
        duration: row.duration_minutes ? `${row.duration_minutes} min` : '60 min',
        price: row.price ?? 0,
        capacity: row.capacity ?? 1,
        available: row.status === 'active',
        description: row.description ?? '',
      };
      setSlots((prev) => [newSlot, ...prev]);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function handleDeleteSlot(id: string) {
    const { error } = await supabase
      .from('vendor_bookings')
      .delete()
      .eq('id', id)
      .eq('vendor_id', user!.id);
    if (!error) {
      setSlots((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function handleUpdateBookingStatus(id: string, status: BookingStatus) {
    const { error } = await supabase
      .from('vendor_bookings')
      .update({ status })
      .eq('id', id)
      .eq('vendor_id', user!.id);
    if (!error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Booking Manager</h1>
          <p className="text-sm text-muted-foreground">
            Manage appointment slots, classes, and rental availability.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
        >
          <Plus className="h-4 w-4" />
          Create Booking Slot
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-border bg-foreground/[0.03] p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[#f59e0b] text-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Create Booking Slot Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-[#f59e0b]/30 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">New Booking Slot</h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl p-1.5 transition-colors hover:bg-foreground/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Service Name
              </label>
              <input
                type="text"
                value={form.serviceName}
                onChange={(e) =>
                  setForm({ ...form, serviceName: e.target.value })
                }
                placeholder="e.g. Studio Recording Session"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Type
              </label>
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as BookingType })
                  }
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                >
                  <option value="Appointment">Appointment</option>
                  <option value="Class">Class</option>
                  <option value="Rental">Rental</option>
                  <option value="Custom">Custom</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Duration
              </label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: e.target.value })
                }
                placeholder="e.g. 1 hour, 30 min"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Capacity
              </label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: e.target.value })
                }
                placeholder="1"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateSlot}
              className="rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
            >
              Create Slot
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Booking Slots Grid ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">
          Available Slots
          <span className="ml-2 text-base font-normal text-muted-foreground">
            ({filteredSlots.length})
          </span>
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSlots.map((slot) => (
            <div
              key={slot.id}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[#f59e0b]/30"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{slot.serviceName}</h3>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    TYPE_COLORS[slot.type]
                  }`}
                >
                  {slot.type}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                {slot.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {slot.duration}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(slot.price)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {slot.capacity} {slot.capacity === 1 ? "person" : "spots"}
                </span>
              </div>

              <div className="mt-3">
                {slot.available ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                    <XCircle className="h-3 w-3" />
                    Unavailable
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upcoming Bookings ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Upcoming Bookings</h2>
        <div className="mt-4 space-y-3">
          {bookings.map((booking) => {
            const StatusIcon = STATUS_ICONS[booking.status];
            return (
              <div
                key={booking.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                    <CalendarDays className="h-5 w-5 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{booking.serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.customerName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      TYPE_COLORS[booking.type]
                    }`}
                  >
                    {booking.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(booking.date)} at {booking.time}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                      STATUS_COLORS[booking.status]
                    }`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {booking.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
