"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  CalendarDays,
  Plus,
  X,
  MapPin,
  Users,
  DollarSign,
  Ticket,
  Coins,
  Clock,
  CheckCircle2,
  ChevronDown,
  Archive,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketType = "Free" | "Paid" | "Token-Redeemable";
type EventStatus = "Upcoming" | "On Sale" | "Sold Out" | "Past";

interface VendorEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  sold: number;
  price: number;
  ticketType: TicketType;
  tokenReward: number;
  status: EventStatus;
}

// ---------------------------------------------------------------------------
// Mock data (commented fallback)
// ---------------------------------------------------------------------------

// const SEED_EVENTS: VendorEvent[] = [
//   { id: "e1", title: "Crown City Block Party", description: "Live DJs, food trucks, and local vendors celebrating Fayetteville culture.", date: "2026-04-18", time: "4:00 PM", venue: "Festival Park, Fayetteville", capacity: 500, sold: 312, price: 15, ticketType: "Paid", tokenReward: 25, status: "On Sale" },
//   { id: "e2", title: "Open Mic Night", description: "Community open mic at the WCCG lounge. Poetry, music, and comedy welcome.", date: "2026-04-05", time: "7:00 PM", venue: "WCCG Studio Lounge", capacity: 50, sold: 50, price: 0, ticketType: "Free", tokenReward: 10, status: "Sold Out" },
//   { id: "e3", title: "Vinyl Swap Meet", description: "Bring your records and trade with fellow collectors. Hosted by DJ Crown.", date: "2026-05-10", time: "11:00 AM", venue: "Cross Creek Mall Atrium", capacity: 100, sold: 28, price: 5, ticketType: "Paid", tokenReward: 15, status: "Upcoming" },
//   { id: "e4", title: "Token Holder Exclusive Listening Party", description: "First listen of the new Crown City Compilation. Token holders only.", date: "2026-05-25", time: "8:00 PM", venue: "WCCG Studio A", capacity: 30, sold: 12, price: 0, ticketType: "Token-Redeemable", tokenReward: 50, status: "Upcoming" },
// ];

// const PAST_EVENTS: VendorEvent[] = [
//   { id: "pe1", title: "Winter Jam 2025", description: "Annual winter concert featuring local hip-hop and R&B artists.", date: "2025-12-14", time: "6:00 PM", venue: "Crown Complex Arena", capacity: 2000, sold: 1847, price: 25, ticketType: "Paid", tokenReward: 30, status: "Past" },
//   { id: "pe2", title: "New Year Countdown Broadcast", description: "Live broadcast with audience participation and giveaways.", date: "2025-12-31", time: "10:00 PM", venue: "WCCG Studio", capacity: 75, sold: 75, price: 0, ticketType: "Free", tokenReward: 20, status: "Past" },
// ];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return amount === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", {
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
    year: "numeric",
  });
}

const STATUS_COLORS: Record<EventStatus, string> = {
  Upcoming: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "On Sale": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Sold Out": "bg-red-500/10 text-red-400 border-red-500/20",
  Past: "bg-foreground/[0.06] text-muted-foreground border-border",
};

const TICKET_COLORS: Record<TicketType, string> = {
  Free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Paid: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  "Token-Redeemable": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  time: "",
  venue: "",
  capacity: "",
  price: "",
  ticketType: "Paid" as TicketType,
  tokenReward: "",
};

export default function VendorEventsPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [distributeTokens, setDistributeTokens] = useState(true);

  // Fetch events from Supabase
  useEffect(() => {
    if (!user) return;
    async function fetchEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_events')
        .select('*')
        .eq('vendor_id', user!.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapRow = (row: any): VendorEvent => ({
          id: row.id,
          title: row.title ?? '',
          description: row.description ?? '',
          date: row.date ?? '',
          time: row.time ?? 'TBD',
          venue: row.venue ?? 'TBD',
          capacity: row.capacity ?? 50,
          sold: row.sold ?? 0,
          price: row.price ?? 0,
          ticketType: row.ticket_type ?? 'Paid',
          tokenReward: row.token_reward ?? 0,
          status: row.status ?? 'Upcoming',
        });
        setEvents(data.filter((r: any) => r.status !== 'Past').map(mapRow));
        setPastEvents(data.filter((r: any) => r.status === 'Past').map(mapRow));
      }
      setLoading(false);
    }
    fetchEvents();
  }, [user, supabase]);

  // Auth guard
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.date) return;

    const { data, error } = await supabase
      .from('vendor_events')
      .insert({
        vendor_id: user!.id,
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        time: form.time || "TBD",
        venue: form.venue.trim() || "TBD",
        capacity: parseInt(form.capacity) || 50,
        sold: 0,
        price: parseFloat(form.price) || 0,
        ticket_type: form.ticketType,
        token_reward: distributeTokens ? parseInt(form.tokenReward) || 0 : 0,
        status: "Upcoming",
      })
      .select();

    if (!error && data?.[0]) {
      const row = data[0];
      const newEvent: VendorEvent = {
        id: row.id,
        title: row.title ?? '',
        description: row.description ?? '',
        date: row.date ?? '',
        time: row.time ?? 'TBD',
        venue: row.venue ?? 'TBD',
        capacity: row.capacity ?? 50,
        sold: row.sold ?? 0,
        price: row.price ?? 0,
        ticketType: row.ticket_type ?? 'Paid',
        tokenReward: row.token_reward ?? 0,
        status: row.status ?? 'Upcoming',
      };
      setEvents((prev) => [newEvent, ...prev]);
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function handleDeleteEvent(id: string) {
    const { error } = await supabase
      .from('vendor_events')
      .delete()
      .eq('id', id)
      .eq('vendor_id', user!.id);
    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setPastEvents((prev) => prev.filter((e) => e.id !== id));
    }
  }

  async function handleUpdateEventStatus(id: string, status: EventStatus) {
    const { error } = await supabase
      .from('vendor_events')
      .update({ status })
      .eq('id', id)
      .eq('vendor_id', user!.id);
    if (!error) {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
    }
  }

  function capacityPercent(sold: number, capacity: number) {
    return Math.min(Math.round((sold / capacity) * 100), 100);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Creator</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your vendor events, tickets, and token rewards.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>

      {/* ── Create Event Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-[#f59e0b]/30 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">New Event</h3>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl p-1.5 transition-colors hover:bg-foreground/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Event Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Crown City Block Party"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe your event"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Time
              </label>
              <input
                type="text"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="e.g. 7:00 PM"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Venue
              </label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="e.g. Festival Park"
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
                placeholder="50"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Ticket Type
              </label>
              <div className="relative">
                <select
                  value={form.ticketType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ticketType: e.target.value as TicketType,
                      price:
                        e.target.value === "Free" || e.target.value === "Token-Redeemable"
                          ? "0"
                          : form.price,
                    })
                  }
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                >
                  <option value="Free">Free</option>
                  <option value="Paid">Paid ($)</option>
                  <option value="Token-Redeemable">Token-Redeemable</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            {form.ticketType === "Paid" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Ticket Price ($)
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
            )}

            {/* Token Distribution Toggle */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDistributeTokens(!distributeTokens)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    distributeTokens ? "bg-[#f59e0b]" : "bg-foreground/20"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      distributeTokens ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium">
                  Award tokens to attendees
                </span>
              </div>
              {distributeTokens && (
                <div className="mt-3 max-w-xs">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Token Reward Amount
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f59e0b]" />
                    <input
                      type="number"
                      min="0"
                      value={form.tokenReward}
                      onChange={(e) =>
                        setForm({ ...form, tokenReward: e.target.value })
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
            >
              Create Event
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

      {/* ── Active / Upcoming Events ──────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Your Events</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {events.map((event) => {
            const pct = capacityPercent(event.sold, event.capacity);
            return (
              <div
                key={event.id}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-[#f59e0b]/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold leading-snug">
                    {event.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                      STATUS_COLORS[event.status]
                    }`}
                  >
                    {event.status}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                  {event.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {event.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.venue}
                  </span>
                </div>

                {/* Capacity bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <Users className="mr-1 inline h-3.5 w-3.5" />
                      {event.sold} / {event.capacity} sold
                    </span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#f59e0b] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Ticket & Token info */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      TICKET_COLORS[event.ticketType]
                    }`}
                  >
                    <Ticket className="mr-1 inline h-3 w-3" />
                    {event.ticketType === "Paid"
                      ? formatCurrency(event.price)
                      : event.ticketType}
                  </span>
                  {event.tokenReward > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                      <Coins className="h-3 w-3" />
                      +{event.tokenReward} tokens
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Past Events ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Archive className="h-5 w-5 text-muted-foreground" />
          Past Events
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {pastEvents.map((event) => {
            const pct = capacityPercent(event.sold, event.capacity);
            return (
              <div
                key={event.id}
                className="rounded-2xl border border-border bg-card/50 p-5 opacity-75"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{event.title}</h3>
                  <span className="shrink-0 rounded-full border border-border bg-foreground/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Past
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.venue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {event.sold} / {event.capacity} attended
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
