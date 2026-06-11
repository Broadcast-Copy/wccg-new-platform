"use client";

/**
 * /mixshows — the public, listener-facing Mixshow Archive for WCCG 104.5 FM.
 *
 * Everything is read directly from Supabase as the (possibly anonymous)
 * browser user — there is no API server:
 *   • `dj_drops`  — published drops are public-readable (RLS, migration 025)
 *   • `djs`       — active roster, public-readable
 *   • `dj_slots`  — the weekly broadcast schedule, public-readable
 *   • `entity_follows` — when signed in, the user's follow rows for ALL the
 *                   page's DJs in ONE `.in("target_id", …)` query; each
 *                   DjFollowButton gets its row id as `followId` and keeps its
 *                   own toggle mutation, reporting back via onFollowChange so
 *                   sibling pills and later remounts stay in sync.
 *   • storage     — the `dj-drops` bucket is PUBLIC, so getPublicUrl() gives a
 *                   directly-playable URL (no signing).
 *
 * Layout: hero (stats) → "This Week On Air" rail → Browse-by-DJ grid (filters
 * the archive client-side, synced to ?dj=<slug>) → the archive grouped by
 * broadcast week (newest first) → sticky bottom player bar (queue = the
 * visible list when play was pressed).
 *
 * Play starts insert a fire-and-forget row into `content_plays` (anon insert
 * is allowed; user_id is the signed-in uid or null).
 *
 * Conventions: setState only in async callbacks behind `let active = true`
 * guards / event handlers (react-hooks/set-state-in-effect); supabase-js never
 * throws, so every query checks `{ error }` and the page renders an honest
 * error state.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Headphones,
  Loader2,
  Play,
  Radio,
  Users2,
  Volume2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArchivePlayerBar, type ArchiveTrack } from "./archive-player-bar";
import { DjFollowButton } from "./dj-follow-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DjRow {
  id: string;
  slug: string;
  display_name: string;
  user_id: string | null;
}

interface SlotRow {
  id: string;
  dj_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface DropRow {
  id: string;
  dj_id: string | null;
  slot_id: string | null;
  file_code: string;
  week_of: string;
  storage_path: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  format: string | null;
}

/** The signed-in user's follow row for one DJ (target_id = djs.user_id). */
interface FollowRow {
  id: string;
  target_id: string;
}

/** A playable archive entry: a published drop joined to its DJ + slot. */
interface Mix {
  drop: DropRow;
  dj: DjRow | null;
  slot: SlotRow | null;
  url: string;
  /** Calendar air date (week Monday + slot day), or the week Monday itself. */
  airDate: Date;
}

// ---------------------------------------------------------------------------
// Date / formatting helpers (idioms copied from studio production-mixshows)
// ---------------------------------------------------------------------------

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** ISO Monday (YYYY-MM-DD) of the current broadcast week, in ET. */
function isoMondayOfNow(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const offset = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - offset);
  return mon.toISOString().slice(0, 10);
}

/** Calendar date for a given day-of-week within the week starting at weekOf (a Monday). */
function dateForDay(weekOf: string, day: number): Date {
  const monday = new Date(weekOf + "T00:00:00");
  const offsetFromMonday = day === 0 ? 6 : day - 1; // Sun=+6, Mon=+0, …, Sat=+5
  const d = new Date(monday);
  d.setDate(monday.getDate() + offsetFromMonday);
  return d;
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display} ${ampm}` : `${display}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "Mon Jan 19" — the human air-date used in mix labels. */
function fmtAirDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Long air-date label, e.g. "Thursday, Jun 11, 2026" — mixes are labeled by the
 * EXACT day they air (the station convention), never by the week's Monday. */
function fmtAirLong(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}
function fmtAirShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Up-to-two-letter initials for the avatar tiles ("DJ Chuck T" → "CT"). */
function initials(name: string): string {
  const words = name
    .replace(/^dj\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.slice(0, 2).map((w) => (w[0] ?? "").toUpperCase()).join("");
  return letters || "DJ";
}

function mixTitle(m: Mix): string {
  return `${m.dj?.display_name ?? "WCCG DJ"} — ${fmtAirDate(m.airDate)}`;
}

// ---------------------------------------------------------------------------
// Root export — Suspense wrapper (useSearchParams requires it on static export)
// ---------------------------------------------------------------------------

export function MixshowArchive() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      }
    >
      <ArchiveInner />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// The archive
// ---------------------------------------------------------------------------

function ArchiveInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("dj");

  const [supabase] = useState(() => createClient());
  const { user } = useAuth();
  const [djs, setDjs] = useState<DjRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [drops, setDrops] = useState<DropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // entity_follows row id per DJ user_id; null = batch lookup not resolved yet.
  const [followMap, setFollowMap] = useState<Map<string, string> | null>(null);

  // Player: queue snapshot + active index. null index = bar closed.
  const [queue, setQueue] = useState<ArchiveTrack[]>([]);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);

  // Current broadcast week, fixed for the life of the page.
  const [currentMonday] = useState(() => isoMondayOfNow());

  // ── Load everything (anon-readable; RLS limits drops to published) ────────
  useEffect(() => {
    let active = true;
    void (async () => {
      const [djRes, slotRes, dropRes] = await Promise.all([
        supabase.from("djs").select("id, slug, display_name, user_id").eq("is_active", true),
        supabase.from("dj_slots").select("id, dj_id, day_of_week, start_time, end_time"),
        supabase
          .from("dj_drops")
          .select("id, dj_id, slot_id, file_code, week_of, storage_path, duration_seconds, size_bytes, format")
          .eq("status", "published")
          .order("week_of", { ascending: false }),
      ]);
      if (!active) return;
      const firstError = djRes.error ?? slotRes.error ?? dropRes.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }
      setDjs((djRes.data ?? []) as DjRow[]);
      setSlots((slotRes.data ?? []) as SlotRow[]);
      setDrops((dropRes.data ?? []) as DropRow[]);
      setError(null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, reloadTick]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadTick((t) => t + 1);
  };

  // ── Follow states: ONE batched entity_follows query for the whole page ────
  // (Previously each DjFollowButton fetched its own row — ~12 queries/load.)
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId || djs.length === 0) return;
    const targetIds = djs.flatMap((d) => (d.user_id ? [d.user_id] : []));
    if (targetIds.length === 0) return;
    let active = true;
    void (async () => {
      const { data, error: followError } = await supabase
        .from("entity_follows")
        .select("id, target_id")
        .eq("follower_id", userId)
        .eq("target_type", "user")
        .in("target_id", targetIds);
      if (!active) return;
      if (followError) {
        // Non-critical: degrade to "not following" so the pills stay usable.
        console.warn("entity_follows lookup failed:", followError.message);
        setFollowMap(new Map());
        return;
      }
      setFollowMap(new Map(((data ?? []) as FollowRow[]).map((r) => [r.target_id, r.id])));
    })();
    return () => {
      active = false;
    };
  }, [supabase, djs, userId]);

  // Toggle results flow back up so sibling pills (grid card + filtered-DJ
  // header) and later remounts all see the same state.
  const handleFollowChange = useCallback((djUserId: string, followId: string | null) => {
    setFollowMap((prev) => {
      const next = new Map(prev ?? []);
      if (followId) next.set(djUserId, followId);
      else next.delete(djUserId);
      return next;
    });
  }, []);

  /** undefined = lookup in flight → a signed-in pill renders its loader. */
  const followIdFor = (djUserId: string | null): string | null | undefined => {
    if (!djUserId) return null;
    if (followMap === null) return undefined;
    return followMap.get(djUserId) ?? null;
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const mixes = useMemo<Mix[]>(() => {
    const djById = new Map(djs.map((d) => [d.id, d]));
    const slotById = new Map(slots.map((s) => [s.id, s]));
    return drops.flatMap<Mix>((drop) => {
      if (!drop.storage_path) return [];
      // The admin/test slot never belongs in the public archive.
      if (drop.dj_id === "dj_admin" || drop.slot_id === "slot_admin_test") return [];
      const dj = drop.dj_id ? djById.get(drop.dj_id) ?? null : null;
      if (dj?.slug === "dj-admin") return [];
      const slot = drop.slot_id ? slotById.get(drop.slot_id) ?? null : null;
      const airDate = slot ? dateForDay(drop.week_of, slot.day_of_week) : new Date(drop.week_of + "T00:00:00");
      const url = supabase.storage.from("dj-drops").getPublicUrl(drop.storage_path).data.publicUrl;
      return [{ drop, dj, slot, url, airDate }];
    });
  }, [drops, djs, slots, supabase]);

  // DJs that actually have ≥1 published mix, busiest first.
  const djCards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of mixes) if (m.dj) counts.set(m.dj.id, (counts.get(m.dj.id) ?? 0) + 1);
    return djs
      .filter((d) => counts.has(d.id))
      .map((d) => ({ dj: d, count: counts.get(d.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.dj.display_name.localeCompare(b.dj.display_name));
  }, [mixes, djs]);

  const selectedDj = useMemo(
    () => (selectedSlug ? djCards.find((c) => c.dj.slug === selectedSlug) ?? null : null),
    [djCards, selectedSlug],
  );

  // "This Week On Air": the current broadcast week's drops; if the week has no
  // uploads yet, fall back to the most recent week that does (honest label).
  const railWeek = useMemo<string | null>(() => {
    const weeks = Array.from(new Set(mixes.map((m) => m.drop.week_of))).sort().reverse();
    if (weeks.length === 0) return null;
    if (weeks.includes(currentMonday)) return currentMonday;
    return weeks.find((w) => w < currentMonday) ?? weeks[weeks.length - 1];
  }, [mixes, currentMonday]);

  const railMixes = useMemo(() => {
    if (!railWeek) return [];
    return mixes
      .filter((m) => m.drop.week_of === railWeek)
      .sort(
        (a, b) =>
          a.airDate.getTime() - b.airDate.getTime() ||
          (a.slot?.start_time ?? "").localeCompare(b.slot?.start_time ?? "") ||
          a.drop.file_code.localeCompare(b.drop.file_code),
      );
  }, [mixes, railWeek]);

  // One rail card per SHOW (slot): both files of a two-part mix live on the
  // same card instead of two near-identical cards. Parts keep code order.
  const railShows = useMemo(() => {
    const map = new Map<string, Mix[]>();
    const order: string[] = [];
    for (const m of railMixes) {
      const key = m.slot?.id ?? `${m.dj?.id ?? "dj"}|${m.drop.week_of}`;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(m);
    }
    return order.map((key) => ({ key, parts: map.get(key)! }));
  }, [railMixes]);

  // The main archive list (optionally filtered to one DJ), newest AIR DATE
  // first — mixes are organized by the exact day they air, not the week.
  const visibleMixes = useMemo(() => {
    const list = selectedSlug ? mixes.filter((m) => m.dj?.slug === selectedSlug) : mixes;
    return [...list].sort(
      (a, b) =>
        b.airDate.getTime() - a.airDate.getTime() ||
        (a.slot?.start_time ?? "").localeCompare(b.slot?.start_time ?? "") ||
        a.drop.file_code.localeCompare(b.drop.file_code),
    );
  }, [mixes, selectedSlug]);

  // One group per exact air date (newest first), e.g. "Thursday, Jun 11, 2026".
  const airDateGroups = useMemo(() => {
    const groups: { key: string; date: Date; mixes: Mix[] }[] = [];
    const byDay = new Map<string, Mix[]>();
    for (const m of visibleMixes) {
      const key = m.airDate.toDateString();
      let arr = byDay.get(key);
      if (!arr) {
        arr = [];
        byDay.set(key, arr);
        groups.push({ key, date: m.airDate, mixes: arr });
      }
      arr.push(m);
    }
    return groups;
  }, [visibleMixes]);

  // Newest air date in the archive (for the header chip).
  const latestAirDate = useMemo(
    () => (mixes.length ? mixes.reduce((max, m) => (m.airDate > max ? m.airDate : max), mixes[0].airDate) : null),
    [mixes],
  );

  // Air-date range of the on-air rail, e.g. "Jun 8 – Jun 14" (or one date).
  const railRangeLabel = useMemo(() => {
    if (railMixes.length === 0) return "";
    const lo = railMixes[0].airDate;
    const hi = railMixes[railMixes.length - 1].airDate;
    return lo.toDateString() === hi.toDateString()
      ? `Airs ${fmtAirLong(lo)}`
      : `Airing ${fmtAirShort(lo)} – ${fmtAirShort(hi)}`;
  }, [railMixes]);

  // ── Playback ──────────────────────────────────────────────────────────────

  const toTrack = useCallback(
    (m: Mix): ArchiveTrack => ({
      dropId: m.drop.id,
      url: m.url,
      title: mixTitle(m),
      fileLabel: `${m.drop.file_code}.${m.drop.format ?? "mp3"}`,
      djName: m.dj?.display_name ?? "WCCG DJ",
      djSlug: m.dj?.slug ?? null,
      durationSeconds: m.drop.duration_seconds,
    }),
    [],
  );

  const nowPlayingId = playerIndex !== null ? queue[playerIndex]?.dropId ?? null : null;

  /** Load `mix` into the bar with `list` (the visible list it came from) as queue. */
  const playFromList = useCallback(
    (list: Mix[], mix: Mix) => {
      if (nowPlayingId === mix.drop.id) return; // already loaded — bar has pause
      const tracks = list.map(toTrack);
      const start = Math.max(0, tracks.findIndex((t) => t.dropId === mix.drop.id));
      setQueue(tracks);
      setPlayerIndex(start);
    },
    [nowPlayingId, toTrack],
  );

  // Fire-and-forget play tracking. Anon insert is allowed by RLS (user_id null
  // or the signed-in uid); failures only warn — playback is never blocked.
  const recordPlay = useCallback(
    (track: ArchiveTrack) => {
      void (async () => {
        const { data: userData } = await supabase.auth.getUser();
        const { error: playError } = await supabase.from("content_plays").insert({
          user_id: userData.user?.id ?? null,
          content_type: "dj_drop",
          content_id: track.dropId,
          total_duration: track.durationSeconds,
        });
        if (playError) console.warn("content_plays insert failed:", playError.message);
      })();
    },
    [supabase],
  );

  const toggleDjFilter = useCallback(
    (slug: string) => {
      const next = selectedSlug === slug ? null : slug;
      router.replace(next ? `/mixshows?dj=${encodeURIComponent(next)}` : "/mixshows", { scroll: false });
    },
    [router, selectedSlug],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-10 py-8 ${playerIndex !== null ? "pb-36" : ""}`}>
      {/* ── Hero ── */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#7401df]/25 via-card to-[#74ddc7]/10 px-6 py-10 sm:px-10 sm:py-14">
        <Disc3 className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-[#74ddc7]/[0.07]" />
        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#74ddc7]">
          <Radio className="h-3.5 w-3.5" /> WCCG 104.5 FM
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground md:text-5xl">Mixshow Archive</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every mix our DJs have dropped on air — replay the weekend, catch what you missed, and follow the
          turntablists keeping the Carolinas moving.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {loading ? (
            <>
              <span className="h-8 w-28 animate-pulse rounded-full bg-foreground/[0.08]" />
              <span className="h-8 w-24 animate-pulse rounded-full bg-foreground/[0.08]" />
              <span className="h-8 w-40 animate-pulse rounded-full bg-foreground/[0.08]" />
            </>
          ) : (
            <>
              <StatChip icon={<Headphones className="h-3.5 w-3.5" />} label={`${mixes.length} ${mixes.length === 1 ? "mix" : "mixes"}`} />
              <StatChip icon={<Users2 className="h-3.5 w-3.5" />} label={`${djCards.length} DJs`} />
              {latestAirDate && (
                <StatChip icon={<CalendarDays className="h-3.5 w-3.5" />} label={`Latest air date: ${fmtAirShort(latestAirDate)}`} />
              )}
            </>
          )}
        </div>
      </header>

      {/* ── Error state ── */}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Couldn&apos;t load the archive: {error}</span>
          <button
            onClick={retry}
            className="rounded-full border border-red-400/40 px-4 py-1.5 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/20"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !error && <ArchiveSkeleton />}

      {/* ── Empty (no published drops at all) ── */}
      {!loading && !error && mixes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Headphones className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No published mixshows yet. Check back soon.</p>
        </div>
      )}

      {!loading && !error && mixes.length > 0 && (
        <>
          {/* ── This Week On Air rail ── */}
          {railWeek && railMixes.length > 0 && (
            <Rail
              title={railWeek === currentMonday ? "This Week On Air" : "Latest On Air"}
              subtitle={railRangeLabel}
            >
              {railShows.map(({ key, parts }) => (
                <ShowRailCard
                  key={key}
                  parts={parts}
                  nowPlayingId={nowPlayingId}
                  onPlayPart={(m) => playFromList(railMixes, m)}
                />
              ))}
            </Rail>
          )}

          {/* ── Browse by DJ ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-base font-black tracking-tight text-foreground">
                <Users2 className="h-5 w-5 text-[#74ddc7]" /> Browse by DJ
              </h2>
              {selectedSlug && (
                <button
                  onClick={() => router.replace("/mixshows", { scroll: false })}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-[#74ddc7]"
                >
                  Show all DJs
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {djCards.map(({ dj, count }) => {
                const active = selectedSlug === dj.slug;
                return (
                  <div
                    key={dj.id}
                    className={`rounded-2xl border p-4 text-center transition-colors ${
                      active
                        ? "border-[#74ddc7]/60 bg-[#74ddc7]/[0.06]"
                        : "border-border bg-card hover:border-[#74ddc7]/40"
                    }`}
                  >
                    <button onClick={() => toggleDjFilter(dj.slug)} className="block w-full" aria-pressed={active}>
                      <span
                        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df]/40 to-[#74ddc7]/25 text-base font-black ${
                          active ? "text-[#74ddc7] ring-2 ring-[#74ddc7]/60" : "text-foreground"
                        }`}
                      >
                        {initials(dj.display_name)}
                      </span>
                      <p className={`mt-2 truncate text-sm font-bold ${active ? "text-[#74ddc7]" : "text-foreground"}`}>
                        {dj.display_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {count} {count === 1 ? "mix" : "mixes"}
                      </p>
                    </button>
                    <div className="mt-2 flex justify-center">
                      <DjFollowButton
                        djUserId={dj.user_id}
                        djName={dj.display_name}
                        followId={followIdFor(dj.user_id)}
                        onFollowChange={handleFollowChange}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── The archive, grouped by week ── */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-base font-black tracking-tight text-foreground">
                <Disc3 className="h-5 w-5 text-[#74ddc7]" /> {selectedDj ? `${selectedDj.dj.display_name} in the archive` : "The full archive"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {visibleMixes.length} {visibleMixes.length === 1 ? "mix" : "mixes"}
              </p>
            </div>

            {/* Filtered-DJ header card */}
            {selectedDj && (
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#74ddc7]/30 bg-[#74ddc7]/[0.05] px-5 py-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df]/40 to-[#74ddc7]/25 text-sm font-black text-[#74ddc7]">
                  {initials(selectedDj.dj.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-foreground">{selectedDj.dj.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDj.count} {selectedDj.count === 1 ? "mix" : "mixes"} in the archive
                  </p>
                </div>
                <DjFollowButton
                  djUserId={selectedDj.dj.user_id}
                  djName={selectedDj.dj.display_name}
                  followId={followIdFor(selectedDj.dj.user_id)}
                  onFollowChange={handleFollowChange}
                />
                <Link
                  href={`/djs/${selectedDj.dj.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-[#74ddc7]/50 hover:text-[#74ddc7]"
                >
                  View profile
                </Link>
              </div>
            )}

            {visibleMixes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
                <Headphones className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">No mixes match this filter.</p>
                <button
                  onClick={() => router.replace("/mixshows", { scroll: false })}
                  className="mt-3 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold text-[#74ddc7] transition-colors hover:border-[#74ddc7]/50"
                >
                  Show all mixes
                </button>
              </div>
            ) : (
              airDateGroups.map(({ key, date, mixes: dayMixes }) => (
                <div key={key} className="space-y-2">
                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-[#74ddc7]" /> {fmtAirLong(date)}
                    {date.toDateString() === new Date().toDateString() && (
                      <span className="rounded-full bg-[#74ddc7]/15 px-2 py-0.5 text-[10px] font-bold text-[#74ddc7]">Today</span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {dayMixes.map((m) => (
                      <MixRow
                        key={m.drop.id}
                        mix={m}
                        playing={nowPlayingId === m.drop.id}
                        onPlay={() => playFromList(visibleMixes, m)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* ── Sticky player ── */}
      {playerIndex !== null && queue.length > 0 && (
        <ArchivePlayerBar
          queue={queue}
          index={playerIndex}
          onIndexChange={setPlayerIndex}
          onClose={() => setPlayerIndex(null)}
          onTrackStart={recordPlay}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-bold text-foreground">
      <span className="text-[#74ddc7]">{icon}</span>
      {label}
    </span>
  );
}

/** Horizontally-scrolling rail with hover chevrons (videos-page idiom). */
function Rail({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 280), behavior: "smooth" });
  }, []);

  return (
    <section className="group/rail space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-black tracking-tight text-foreground">
            <Radio className="h-5 w-5 text-[#74ddc7]" /> {title}
          </h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/rail:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/rail:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}

/** A card in the "This Week On Air" rail: DJ + air day/time + play. */
/** One card per SHOW: header plays the whole set (part 2 queues after part 1);
 * each part also gets its own chip so listeners can jump straight to hour 2. */
function ShowRailCard({
  parts,
  nowPlayingId,
  onPlayPart,
}: {
  parts: Mix[];
  nowPlayingId: string | null;
  onPlayPart: (m: Mix) => void;
}) {
  const first = parts[0];
  const anyPlaying = parts.some((p) => nowPlayingId === p.drop.id);
  const airLabel = first.slot
    ? `${DAY_SHORT[first.slot.day_of_week] ?? ""} · ${fmt12h(first.slot.start_time)}–${fmt12h(first.slot.end_time)}`
    : fmtAirDate(first.airDate);
  return (
    <div
      className={`w-64 shrink-0 snap-start rounded-2xl border p-4 transition-colors ${
        anyPlaying ? "border-[#74ddc7]/60 bg-[#74ddc7]/[0.06]" : "border-border bg-card hover:border-[#74ddc7]/40"
      }`}
    >
      <button onClick={() => onPlayPart(first)} className="group flex w-full items-center gap-3 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df]/40 to-[#74ddc7]/25 text-sm font-black text-foreground">
          {initials(first.dj?.display_name ?? "WCCG DJ")}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${anyPlaying ? "text-[#74ddc7]" : "text-foreground"}`}>
            {first.dj?.display_name ?? "WCCG DJ"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{airLabel}</p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            anyPlaying ? "bg-[#74ddc7] text-[#0a0a0f]" : "bg-foreground/10 text-foreground group-hover:bg-[#74ddc7]/25"
          }`}
        >
          {anyPlaying ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </span>
      </button>
      {parts.length > 1 ? (
        <div className="mt-3 flex gap-1.5">
          {parts.map((p, i) => {
            const playing = nowPlayingId === p.drop.id;
            return (
              <button
                key={p.drop.id}
                onClick={() => onPlayPart(p)}
                className={`flex-1 rounded-full border px-2 py-1 text-[10px] font-bold transition-colors ${
                  playing
                    ? "border-[#74ddc7]/60 bg-[#74ddc7]/15 text-[#74ddc7]"
                    : "border-border text-muted-foreground hover:border-[#74ddc7]/40 hover:text-foreground"
                }`}
                title={`${p.drop.file_code}.${p.drop.format ?? "mp3"}`}
              >
                {playing ? "▶ " : ""}Part {i + 1}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground/70">
          {first.drop.file_code}.{first.drop.format ?? "mp3"}
        </p>
      )}
    </div>
  );
}

/** One archive row: play, "DJ Name — Mon Jan 19", mono code, duration/size. */
function MixRow({ mix, playing, onPlay }: { mix: Mix; playing: boolean; onPlay: () => void }) {
  const meta: string[] = [];
  if (mix.slot) meta.push(`${DAY_SHORT[mix.slot.day_of_week] ?? ""} ${fmt12h(mix.slot.start_time)}`);
  if (mix.drop.duration_seconds) meta.push(fmtDuration(mix.drop.duration_seconds));
  else if (mix.drop.size_bytes) meta.push(fmtBytes(mix.drop.size_bytes));

  return (
    <article
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors sm:gap-4 ${
        playing ? "border-[#74ddc7]/60 bg-[#74ddc7]/[0.05]" : "border-border bg-card hover:border-[#74ddc7]/30"
      }`}
    >
      <button
        onClick={onPlay}
        aria-label={playing ? `Now playing: ${mixTitle(mix)}` : `Play ${mixTitle(mix)}`}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          playing ? "bg-[#74ddc7] text-[#0a0a0f]" : "bg-foreground/10 text-foreground hover:bg-[#74ddc7]/25"
        }`}
      >
        {playing ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className={`truncate ${playing ? "text-[#74ddc7]" : ""}`}>{mixTitle(mix)}</span>
          {playing && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#74ddc7]/15 px-2 py-0.5 text-[10px] font-bold text-[#74ddc7]">
              <Volume2 className="h-3 w-3" /> Playing
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          <span className="font-mono">{mix.drop.file_code}.{mix.drop.format ?? "mp3"}</span>
          {meta.length > 0 && <> · {meta.join(" · ")}</>}
        </p>
      </div>

      {mix.dj && (
        <Link
          href={`/djs/${mix.dj.slug}`}
          className="hidden shrink-0 text-xs font-bold text-muted-foreground transition-colors hover:text-[#74ddc7] sm:block"
        >
          {mix.dj.display_name}
        </Link>
      )}
    </article>
  );
}

/** Shimmer placeholders for rail + DJ grid + list while loading. */
function ArchiveSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      <div className="space-y-2.5">
        <div className="h-5 w-44 animate-pulse rounded bg-foreground/[0.08]" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[5.5rem] w-60 shrink-0 animate-pulse rounded-2xl bg-foreground/[0.06]" />
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="h-5 w-36 animate-pulse rounded bg-foreground/[0.08]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-foreground/[0.06]" />
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="h-5 w-52 animate-pulse rounded bg-foreground/[0.08]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-foreground/[0.06]" />
        ))}
      </div>
    </div>
  );
}
