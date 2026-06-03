"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UsersRound,
  Plus,
  Check,
  X,
  Lock,
  Globe,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MessageButton } from "@/components/messaging/message-button";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export type HubType = "listener" | "creator" | "vendor";

interface RailProps {
  hubType: HubType;
  accentColor: string;
  supabase: SupabaseClient;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Friendly singular label for a hub's members, used in copy. */
function memberNoun(hubType: HubType): string {
  return hubType === "listener" ? "Listener" : hubType === "creator" ? "Creator" : "Vendor";
}

/** Local-day key (y-m-d) so the calendar groups events by calendar day. */
function ymdKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isContest(category: string | null): boolean {
  return !!category && category.toLowerCase().includes("contest");
}

// ---------------------------------------------------------------------------
// Members card — reads hub_memberships for this hub, joined to profiles_public.
// ---------------------------------------------------------------------------
export function HubMembersCard({ hubType, accentColor, supabase }: RailProps) {
  const [count, setCount] = useState(0);
  const [members, setMembers] = useState<
    { id: string; name: string; avatar: string | null }[]
  >([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, count: c } = await supabase
        .from("hub_memberships")
        .select("user_id", { count: "exact" })
        .eq("hub_type", hubType)
        .limit(48);
      const ids = (data ?? []).map((r) => (r as { user_id: string }).user_id);
      let profs: { id: string; display_name: string | null; avatar_url: string | null }[] = [];
      if (ids.length) {
        const { data: pd } = await supabase
          .from("profiles_public")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        profs = (pd as typeof profs) ?? [];
      }
      if (!active) return;
      setCount(c ?? ids.length);
      setMembers(
        profs
          .slice(0, 9)
          .map((p) => ({ id: p.id, name: p.display_name || memberNoun(hubType), avatar: p.avatar_url })),
      );
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, hubType]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Users className="h-4 w-4" style={{ color: accentColor }} /> Members
        </h3>
        <span className="text-xs font-semibold" style={{ color: accentColor }}>
          {count.toLocaleString()}
        </span>
      </div>
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground">Be the first to join the hub.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <div key={m.id} className="group relative h-9 w-9">
              <div
                title={m.name}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border text-[11px] font-semibold"
                style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
              >
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  m.name.slice(0, 2).toUpperCase()
                )}
              </div>
              {/* DM this member — revealed on hover/focus so the avatar grid
                  stays clean. Hidden by MessageButton itself if m is me. */}
              <div className="absolute -bottom-1 -right-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <MessageButton
                  recipientId={m.id}
                  recipientName={m.name}
                  variant="icon"
                  accentColor={accentColor}
                  className="h-5 w-5 shadow-sm"
                />
              </div>
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

// ---------------------------------------------------------------------------
// Groups card — lists this hub's groups (name + member count + Join/Joined),
// plus a "+ New group" dialog that inserts a hub_groups row (hub_type = hub,
// created_by = user) and auto-joins the creator.
// ---------------------------------------------------------------------------
interface HubGroup {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_by: string | null;
}

export function GroupsCard({ hubType, accentColor, supabase }: RailProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<HubGroup[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // Bumped to force a refetch (after creating a group or joining/leaving).
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const userId = user?.id ?? null;

  // Load groups + member tallies + which the current user has joined.
  // The effect body keeps setState out of the synchronous path: a pure async
  // fetch returns the data, and an `active` guard drops stale results.
  useEffect(() => {
    let active = true;

    async function fetchGroups(): Promise<{
      list: HubGroup[];
      countMap: Record<string, number>;
      mine: Set<string>;
    }> {
      const { data: gd } = await supabase
        .from("hub_groups")
        .select("id, name, description, is_public, created_by")
        .eq("hub_type", hubType)
        .order("created_at", { ascending: false });
      const list = (gd as HubGroup[] | null) ?? [];
      const ids = list.map((g) => g.id);

      // One round-trip for all memberships of these groups; tally client-side.
      const countMap: Record<string, number> = {};
      const mine = new Set<string>();
      if (ids.length) {
        const { data: md } = await supabase
          .from("hub_group_members")
          .select("group_id, user_id")
          .in("group_id", ids);
        for (const row of (md as { group_id: string; user_id: string }[] | null) ?? []) {
          countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
          if (userId && row.user_id === userId) mine.add(row.group_id);
        }
      }
      return { list, countMap, mine };
    }

    fetchGroups().then(({ list, countMap, mine }) => {
      if (!active) return;
      setGroups(list);
      setCounts(countMap);
      setJoined(mine);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [supabase, hubType, userId, reloadKey]);

  // ---- Join / leave (insert/delete your own membership row) ----
  async function toggleJoin(group: HubGroup) {
    if (!user || busyId) return;
    setBusyId(group.id);
    const isJoined = joined.has(group.id);

    // Optimistic update.
    setJoined((prev) => {
      const next = new Set(prev);
      if (isJoined) next.delete(group.id);
      else next.add(group.id);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [group.id]: Math.max(0, (prev[group.id] ?? 0) + (isJoined ? -1 : 1)),
    }));

    if (isJoined) {
      await supabase
        .from("hub_group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("hub_group_members")
        .insert({ group_id: group.id, user_id: user.id, role: "member" });
    }
    setBusyId(null);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <UsersRound className="h-4 w-4" style={{ color: accentColor }} /> Groups
        </h3>
        {user && (
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="h-3 w-3" /> New group
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: accentColor }} />
        </div>
      ) : groups.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          No groups yet — start the first one for {memberNoun(hubType).toLowerCase()}s.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {groups.map((g) => {
            const isJoined = joined.has(g.id);
            const isOpen = openId === g.id;
            return (
              <li key={g.id} className="rounded-lg border border-transparent hover:border-border">
                <div className="flex items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setOpenId((cur) => (cur === g.id ? null : g.id))}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {g.name}
                      </span>
                      {!g.is_public && (
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {(counts[g.id] ?? 0).toLocaleString()}{" "}
                      {(counts[g.id] ?? 0) === 1 ? "member" : "members"}
                    </span>
                  </button>
                  {user && (
                    <button
                      type="button"
                      onClick={() => toggleJoin(g)}
                      disabled={busyId === g.id}
                      className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50"
                      style={
                        isJoined
                          ? { backgroundColor: `${accentColor}1a`, color: accentColor }
                          : { backgroundColor: accentColor, color: "#fff" }
                      }
                    >
                      {isJoined ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3 w-3" /> Joined
                        </span>
                      ) : (
                        "Join"
                      )}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-border px-2 pb-2 pt-2">
                    {g.description ? (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {g.description}
                      </p>
                    ) : (
                      <p className="text-[11px] italic text-muted-foreground/70">
                        No description yet.
                      </p>
                    )}
                    <GroupMembersStrip groupId={g.id} accentColor={accentColor} supabase={supabase} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showDialog && (
        <NewGroupDialog
          hubType={hubType}
          accentColor={accentColor}
          supabase={supabase}
          onClose={() => setShowDialog(false)}
          onCreated={() => {
            setShowDialog(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ---- Expanded group → show its members (avatars + names) ----
function GroupMembersStrip({
  groupId,
  accentColor,
  supabase,
}: {
  groupId: string;
  accentColor: string;
  supabase: SupabaseClient;
}) {
  const [members, setMembers] = useState<
    { id: string; name: string; avatar: string | null }[] | null
  >(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: md } = await supabase
        .from("hub_group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .limit(24);
      const ids = (md ?? []).map((r) => (r as { user_id: string }).user_id);
      let profs: { id: string; display_name: string | null; avatar_url: string | null }[] = [];
      if (ids.length) {
        const { data: pd } = await supabase
          .from("profiles_public")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        profs = (pd as typeof profs) ?? [];
      }
      if (!active) return;
      setMembers(
        profs.map((p) => ({ id: p.id, name: p.display_name || "Member", avatar: p.avatar_url })),
      );
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, groupId]);

  if (members === null) {
    return (
      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading members…
      </div>
    );
  }
  if (members.length === 0) {
    return <p className="mt-2 text-[11px] text-muted-foreground">No members yet.</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {members.map((m) => (
        <div
          key={m.id}
          title={m.name}
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border text-[10px] font-semibold"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          {m.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
          ) : (
            m.name.slice(0, 2).toUpperCase()
          )}
        </div>
      ))}
    </div>
  );
}

// ---- New-group dialog (name, description, public toggle) ----
function NewGroupDialog({
  hubType,
  accentColor,
  supabase,
  onClose,
  onCreated,
}: {
  hubType: HubType;
  accentColor: string;
  supabase: SupabaseClient;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!user || !name.trim() || saving) return;
    setSaving(true);
    setError(null);

    // Insert the group as created_by = the current user.
    const { data, error: insErr } = await supabase
      .from("hub_groups")
      .insert({
        hub_type: hubType,
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insErr || !data) {
      setError(insErr?.message ?? "Could not create the group.");
      setSaving(false);
      return;
    }

    // Auto-join the creator as a group admin. (role is constrained to
    // 'member' | 'admin' in the DB; the group owner is tracked separately via
    // hub_groups.created_by.)
    await supabase
      .from("hub_group_members")
      .insert({ group_id: (data as { id: string }).id, user_id: user.id, role: "admin" });

    setSaving(false);
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <UsersRound className="h-4 w-4" style={{ color: accentColor }} /> New group
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Weekend Warriors"
              className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1"
              style={{ ["--tw-ring-color" as string]: accentColor }}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Description <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="What's this group about?"
              className="w-full resize-none rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
            />
          </div>

          {/* Public / private toggle */}
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              {isPublic ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              {isPublic ? "Public group" : "Private group"}
            </span>
            <span
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ backgroundColor: isPublic ? accentColor : "rgba(120,120,120,0.4)" }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{ transform: isPublic ? "translateX(18px)" : "translateX(2px)" }}
              />
            </span>
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {saving ? "Creating…" : "Create group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events calendar rail — the station events calendar (same for all hubs),
// tinted with the hub's accent color.
// ---------------------------------------------------------------------------
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

export function EventsCalendarRail({ accentColor, supabase }: Omit<RailProps, "hubType">) {
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
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}1a` }}
          >
            <CalendarDays className="h-4 w-4" style={{ color: accentColor }} />
          </div>
          <h3 className="truncate text-sm font-semibold text-foreground">{monthLabel}</h3>
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
          className="mt-1 text-[11px] font-medium hover:underline"
          style={{ color: accentColor }}
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
                    ? "font-semibold text-white"
                    : isToday
                      ? "font-semibold"
                      : "text-foreground/80 hover:bg-foreground/[0.06]"
                }`}
                style={
                  isSelected
                    ? { backgroundColor: accentColor }
                    : isToday
                      ? { backgroundColor: `${accentColor}1a`, color: accentColor }
                      : undefined
                }
              >
                <span>{day.getDate()}</span>
                {hasEvents && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full"
                    style={{ backgroundColor: isSelected ? "#fff" : accentColor }}
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
              className="text-[11px] font-medium hover:underline"
              style={{ color: accentColor }}
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: accentColor }} />
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
                    <div
                      className="flex w-9 shrink-0 flex-col items-center justify-center rounded-md py-1"
                      style={{ backgroundColor: `${accentColor}1a` }}
                    >
                      <span className="text-sm font-bold leading-none" style={{ color: accentColor }}>
                        {start.getDate()}
                      </span>
                      <span
                        className="mt-0.5 text-[9px] font-medium uppercase"
                        style={{ color: `${accentColor}b3` }}
                      >
                        {start.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                    </div>
                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="shrink-0 rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: contest ? `${accentColor}33` : `${accentColor}1a`,
                            color: accentColor,
                          }}
                        >
                          {contest ? "Contest" : "Event"}
                        </span>
                      </div>
                      <p
                        className="mt-1 truncate text-xs font-semibold text-foreground transition-colors group-hover:text-[color:var(--rail-accent)]"
                        style={{ ["--rail-accent" as string]: accentColor }}
                      >
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

// ---------------------------------------------------------------------------
// HubRail — stacks Members + Groups + Calendar for a hub. Drop into the right
// column of a hub member view.
// ---------------------------------------------------------------------------
export function HubRail({ hubType, accentColor, supabase }: RailProps) {
  return (
    <aside className="hidden lg:block w-full lg:w-80 shrink-0 space-y-4">
      <HubMembersCard hubType={hubType} accentColor={accentColor} supabase={supabase} />
      <GroupsCard hubType={hubType} accentColor={accentColor} supabase={supabase} />
      <EventsCalendarRail accentColor={accentColor} supabase={supabase} />
    </aside>
  );
}
