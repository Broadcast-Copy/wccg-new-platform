"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { HubFeed } from "@/components/social/hub-feed";
import { HubSidebar } from "@/components/social/hub-sidebar";
import {
  Headphones,
  Users,
  Star,
  Music,
  Radio,
  ListMusic,
  Gift,
  Trophy,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Features grid data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: Star,
    title: "Listener Points",
    description: "Earn points for listening, sharing, and engaging with WCCG content.",
    href: "/my/points",
  },
  {
    icon: Music,
    title: "Song Requests",
    description: "Request your favorite songs and hear them on air.",
    href: "/discover",
  },
  {
    icon: ListMusic,
    title: "Playlists",
    description: "Browse curated playlists and discover new music across all channels.",
    href: "/channels",
  },
  {
    icon: Gift,
    title: "Birthday Club",
    description: "Join the birthday club for special shoutouts and rewards on your day.",
    href: "/rewards",
  },
  {
    icon: Trophy,
    title: "Contests",
    description: "Enter contests and giveaways for prizes, tickets, and exclusive access.",
    href: "/rewards",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ListenersPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [memberLoading, setMemberLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [stats, setStats] = useState({
    listeners: 0,
    points: 0,
    requests: 0,
  });

  useEffect(() => {
    if (!user) { setMemberLoading(false); return; }
    supabase.from('hub_memberships').select('id').eq('user_id', user.id).eq('hub_type', 'listener').single()
      .then(({ data }) => { setIsMember(!!data); setMemberLoading(false); });
  }, [user, supabase]);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    await supabase.from('hub_memberships').insert({ user_id: user.id, hub_type: 'listener' });
    setIsMember(true);
    setJoining(false);
  }

  async function handleLeave() {
    if (!user || !confirm("Leave the Listener Hub?")) return;
    await supabase.from('hub_memberships').delete().eq('user_id', user.id).eq('hub_type', 'listener');
    setIsMember(false);
  }

  useEffect(() => {
    async function loadStats() {
      const [listenersRes, pointsRes, requestsRes] = await Promise.all([
        supabase.from("profiles_public").select("id", { count: "exact", head: true }),
        supabase.rpc("community_points_total"),
        supabase
          .from("song_requests")
          .select("id", { count: "exact", head: true }),
      ]);

      setStats({
        listeners: listenersRes.count ?? 0,
        points: Number(pointsRes.data ?? 0),
        requests: requestsRes.count ?? 0,
      });
    }

    loadStats();
  }, [supabase]);

  if (memberLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#14b8a6] border-t-transparent" /></div>;
  }

  if (isMember) {
    return (
      <HubSidebar hubType="listener" color="#14b8a6">
        <div className="space-y-8">
          {/* Member header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6]/10">
                <Headphones className="h-5 w-5 text-[#14b8a6]" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Listener Hub</h1>
                <span className="text-xs text-[#14b8a6] font-medium">Member</span>
              </div>
            </div>
            <button onClick={handleLeave} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
              Leave Hub
            </button>
          </div>

          {/* Feed + right calendar rail */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Community Feed (takes remaining width) */}
            <div className="flex-1 min-w-0">
              <HubFeed
                hubType="listener"
                accentColor="#14b8a6"
                placeholder="Share what you're listening to, a review, or shoutout..."
                postTypes={[
                  { value: "now-playing", label: "Now Playing" },
                  { value: "review", label: "Review" },
                  { value: "shoutout", label: "Shoutout" },
                  { value: "milestone", label: "Milestone" },
                ]}
              />
            </div>

            {/* Right rail: members + mini calendar widget */}
            <aside className="hidden lg:block w-full lg:w-80 shrink-0 space-y-4">
              <HubMembersCard supabase={supabase} />
              <EventsCalendarRail supabase={supabase} />
            </aside>
          </div>
        </div>
      </HubSidebar>
    );
  }

  return (
    <div className="space-y-8">
      {(
        <>
          {/* ---- Hero ---- */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#14b8a6]">
            <div className="relative px-6 py-10 sm:px-10 sm:py-14">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/10 backdrop-blur-sm shadow-xl">
                  <Headphones className="h-7 w-7 text-gray-900" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Listener Hub</h1>
                  <p className="text-gray-900/60 mt-1">
                    A network for listeners — connect, discover, and earn rewards
                  </p>
                </div>
              </div>
              {user && (
                <button onClick={handleJoin} disabled={joining} className="mt-4 rounded-full bg-gray-900 text-white px-6 py-2 text-sm font-bold hover:bg-gray-900/90 transition-colors disabled:opacity-50">
                  {joining ? "Joining..." : "Join the Hub"}
                </button>
              )}
            </div>
          </div>

          {/* ---- Stats bar ---- */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Listeners", value: stats.listeners, icon: Users },
              { label: "Points Earned", value: stats.points, icon: Star },
              { label: "Songs Requested", value: stats.requests, icon: Radio },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14b8a6]/10">
                  <s.icon className="h-5 w-5 text-[#14b8a6]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Features grid ---- */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Listener Perks
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14b8a6]/10 mb-3">
                    <f.icon className="h-5 w-5 text-[#14b8a6]" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-foreground/20 group-hover:text-[#14b8a6] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---- Social Feed (non-member landing) ---- */}
      <HubFeed
        hubType="listener"
        accentColor="#14b8a6"
        placeholder="Share what you're listening to, a review, or shoutout..."
        postTypes={[
          { value: "now-playing", label: "Now Playing" },
          { value: "review", label: "Review" },
          { value: "shoutout", label: "Shoutout" },
          { value: "milestone", label: "Milestone" },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events calendar rail (member-view right column)
// ---------------------------------------------------------------------------
const ACCENT = "#14b8a6";
const TEAL = "#74ddc7";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  category: string | null;
  status: string | null;
  image_url: string | null;
  slug: string | null;
}

/** Local midnight for a given y/m/d — used so the grid groups by calendar day. */
function ymdKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isContest(category: string | null): boolean {
  return !!category && category.toLowerCase().includes("contest");
}

function HubMembersCard({ supabase }: { supabase: SupabaseClient }) {
  const [count, setCount] = useState(0);
  const [members, setMembers] = useState<{ id: string; name: string; avatar: string | null }[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, count: c } = await supabase
        .from("hub_memberships")
        .select("user_id", { count: "exact" })
        .eq("hub_type", "listener")
        .limit(48);
      if (!active) return;
      const ids = (data ?? []).map((r) => (r as { user_id: string }).user_id);
      let profs: { id: string; display_name: string | null; avatar_url: string | null }[] = [];
      if (ids.length) {
        const { data: pd } = await supabase
          .from("profiles_public")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        profs = (pd as typeof profs) ?? [];
      }
      setCount(c ?? ids.length);
      setMembers(profs.slice(0, 9).map((p) => ({ id: p.id, name: p.display_name || "Listener", avatar: p.avatar_url })));
    }
    load();
    return () => { active = false; };
  }, [supabase]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Users className="h-4 w-4 text-[#14b8a6]" /> Members
        </h3>
        <span className="text-xs font-semibold text-[#14b8a6]">{count.toLocaleString()}</span>
      </div>
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground">Be the first to join the hub.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              title={m.name}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-[#14b8a6]/10 text-[11px] font-semibold text-[#14b8a6]"
            >
              {m.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                m.name.slice(0, 2).toUpperCase()
              )}
            </div>
          ))}
          {count > members.length && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground">
              +{count - members.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventsCalendarRail({ supabase }: { supabase: SupabaseClient }) {
  // First-of-month anchor for the visible month.
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // Selected day filter (local-midnight Date) or null for "whole month".
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  // Re-fetch published events for the visible month whenever it changes.
  // The effect body stays free of synchronous setState: a pure async fetch
  // returns the rows, and an `active` guard drops results from a stale month.
  useEffect(() => {
    let active = true;

    // Pure async fetch: returns rows, never calls setState itself.
    async function fetchMonthEvents(): Promise<CalendarEvent[]> {
      const monthStartISO = new Date(year, month, 1).toISOString();
      const nextMonthStartISO = new Date(year, month + 1, 1).toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("id,title,start_date,end_date,venue,category,status,image_url,slug")
        .eq("status", "PUBLISHED")
        .gte("start_date", monthStartISO)
        .lt("start_date", nextMonthStartISO)
        .order("start_date");
      if (error) return [];
      return (data as CalendarEvent[] | null) ?? [];
    }

    fetchMonthEvents().then((rows) => {
      if (!active) return;
      setEvents(rows);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [supabase, year, month]);

  const today = new Date();
  const todayKey = ymdKey(today);
  const isViewingCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  // Map of local-day-key -> events on that day (for dots + filtering).
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ymdKey(new Date(ev.start_date));
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  // Build the weeks grid: leading blanks for the 1st's weekday, then each day.
  const weeks = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Events shown in the list: whole month, or just the selected day.
  const listEvents = useMemo(() => {
    if (!selectedDay) return events;
    const key = ymdKey(selectedDay);
    return eventsByDay.get(key) ?? [];
  }, [events, eventsByDay, selectedDay]);

  // Month nav also clears any day filter (the selected day leaves the view).
  function toPrevMonth() {
    setSelectedDay(null);
    setViewMonth(new Date(year, month - 1, 1));
  }
  function toNextMonth() {
    setSelectedDay(null);
    setViewMonth(new Date(year, month + 1, 1));
  }
  function toToday() {
    setSelectedDay(null);
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  function toggleDay(day: Date) {
    setSelectedDay((cur) => (cur && ymdKey(cur) === ymdKey(day) ? null : day));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header: month nav + Today reset */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#14b8a6]/10">
            <CalendarDays className="h-4 w-4 text-[#14b8a6]" />
          </div>
          <h3 className="truncate text-sm font-semibold text-foreground">
            {monthLabel}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toPrevMonth}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toNextMonth}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isViewingCurrentMonth && (
        <button
          type="button"
          onClick={toToday}
          className="mt-1 text-[11px] font-medium text-[#14b8a6] hover:underline"
        >
          Today
        </button>
      )}

      {/* Weekday header row */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60"
          >
            {w.charAt(0)}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) return <div key={`${wi}-${di}`} className="aspect-square" />;
            const key = ymdKey(day);
            const isToday = key === todayKey;
            const isSelected = selectedDay != null && ymdKey(selectedDay) === key;
            const hasEvents = eventsByDay.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={isSelected}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-md text-xs transition-colors ${
                  isSelected
                    ? "font-semibold text-gray-900"
                    : isToday
                      ? "font-semibold text-[#14b8a6]"
                      : "text-foreground/80 hover:bg-foreground/[0.06]"
                }`}
                style={
                  isSelected
                    ? { backgroundColor: TEAL }
                    : isToday
                      ? { backgroundColor: `${ACCENT}1a` }
                      : undefined
                }
              >
                <span>{day.getDate()}</span>
                {hasEvents && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full"
                    style={{
                      backgroundColor: isSelected ? "#111827" : ACCENT,
                    }}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>

      {/* List: contests & events for the visible month (or selected day) */}
      <div className="mt-4 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contests &amp; Events
          </h4>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[11px] font-medium text-[#14b8a6] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#14b8a6] border-t-transparent" />
          </div>
        ) : listEvents.length === 0 ? (
          <p className="py-4 text-xs text-muted-foreground">
            Nothing on the calendar this month.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {listEvents.map((ev) => {
              const start = new Date(ev.start_date);
              const contest = isContest(ev.category);
              return (
                <li key={ev.id}>
                  <Link
                    href={`/events/${ev.id}`}
                    className="group flex gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-foreground/[0.03]"
                  >
                    {/* Date chip */}
                    <div className="flex w-9 shrink-0 flex-col items-center justify-center rounded-md bg-[#14b8a6]/10 py-1">
                      <span className="text-sm font-bold leading-none text-[#14b8a6]">
                        {start.getDate()}
                      </span>
                      <span className="mt-0.5 text-[9px] font-medium uppercase text-[#14b8a6]/70">
                        {start.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                    </div>
                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="shrink-0 rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: contest ? `${TEAL}26` : `${ACCENT}1a`,
                            color: contest ? TEAL : ACCENT,
                          }}
                        >
                          {contest ? "Contest" : "Event"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-foreground group-hover:text-[#14b8a6]">
                        {ev.title}
                      </p>
                      {ev.venue && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{ev.venue}</span>
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
