"use client";

/**
 * useGlobalSearch — debounced, race-guarded typeahead across every public
 * surface of the platform. Fans out to all sources in parallel; each source
 * is isolated so one failure never kills the rest. Supabase queries go
 * browser→Supabase directly (anon key + RLS, no API server).
 *
 * react-hooks/set-state-in-effect: all setState calls happen inside the
 * debounce timeout / async continuation (never synchronously in an effect
 * body), and every async write is guarded by a sequence counter so stale
 * responses can never overwrite newer ones.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALL_SHOWS } from "@/data/shows";

export type SearchResultType =
  | "dj"
  | "show"
  | "video"
  | "mixshow"
  | "event"
  | "place"
  | "wiki"
  | "member";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchGroup {
  type: SearchResultType;
  /** Up to MAX_PER_GROUP rows. */
  results: SearchResult[];
  /** Total matches for this type (may exceed results.length). */
  count: number;
}

export const MIN_QUERY_LENGTH = 2;
export const MAX_PER_GROUP = 5;
const DEBOUNCE_MS = 250;

type Supabase = ReturnType<typeof createClient>;

/**
 * Strip characters that have special meaning in PostgREST `or()` filter
 * strings (commas/parens) and in ILIKE patterns (% _ \) so user input can't
 * break the filter or inject wildcards.
 */
function sanitize(q: string): string {
  return q.replace(/[,()%_\\]/g, " ").replace(/\s+/g, " ").trim();
}

function emptyGroup(type: SearchResultType): SearchGroup {
  return { type, results: [], count: 0 };
}

// ─── Sources ─────────────────────────────────────────────────────────────────

/** Shows — local static data from @/data/shows, filtered client-side. */
function searchShows(q: string): SearchGroup {
  const needle = q.toLowerCase();
  const matches = ALL_SHOWS.filter(
    (s) =>
      s.isActive &&
      (s.name.toLowerCase().includes(needle) ||
        s.hostNames.toLowerCase().includes(needle) ||
        s.tagline.toLowerCase().includes(needle)),
  );
  return {
    type: "show",
    count: matches.length,
    results: matches.slice(0, MAX_PER_GROUP).map((s) => ({
      type: "show",
      id: s.id,
      title: s.name,
      subtitle: `${s.hostNames} · ${s.days}`,
      href: `/shows/${s.slug}`,
    })),
  };
}

interface DjRow {
  id: string;
  slug: string;
  display_name: string;
}

/** DJs — active rows from the `djs` table (Mix Squad roster). */
async function searchDjs(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("djs")
    .select("id, slug, display_name", { count: "exact" })
    .eq("is_active", true)
    .ilike("display_name", `%${q}%`)
    .order("display_name", { ascending: true })
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("dj");
  const rows = (data ?? []) as DjRow[];
  return {
    type: "dj",
    count: count ?? rows.length,
    results: rows.map((d) => ({
      type: "dj",
      id: d.id,
      title: d.display_name,
      subtitle: "Mix Squad DJ",
      href: `/djs/${d.slug}`,
    })),
  };
}

interface VideoRow {
  id: string;
  title: string;
  program: string | null;
  creator_name: string | null;
}

/** Videos — published + public rows only (same filter as the video wall). */
async function searchVideos(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("videos")
    .select("id, title, program, creator_name", { count: "exact" })
    .eq("status", "published")
    .eq("visibility", "public")
    .ilike("title", `%${q}%`)
    .order("published_at", { ascending: false })
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("video");
  const rows = (data ?? []) as VideoRow[];
  return {
    type: "video",
    count: count ?? rows.length,
    results: rows.map((v) => ({
      type: "video",
      id: v.id,
      title: v.title,
      subtitle: v.program?.trim() || v.creator_name?.trim() || "WCCG 104.5 FM",
      href: `/videos/${v.id}`,
    })),
  };
}

interface MixRow {
  id: string;
  dj_id: string;
  title: string;
  genre: string | null;
}

/** Mixshows — published mixes from `dj_mixes`; routes to the DJ's mixshows view. */
async function searchMixshows(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("dj_mixes")
    .select("id, dj_id, title, genre", { count: "exact" })
    .eq("is_published", true)
    .ilike("title", `%${q}%`)
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("mixshow");
  const rows = (data ?? []) as MixRow[];
  return {
    type: "mixshow",
    count: count ?? rows.length,
    results: rows.map((m) => ({
      type: "mixshow",
      id: m.id,
      title: m.title,
      subtitle: m.genre?.trim() || "Mixshow",
      href: `/mixshows?dj=${encodeURIComponent(m.dj_id)}`,
    })),
  };
}

interface EventRow {
  id: string;
  title: string;
  venue: string | null;
  start_date: string | null;
}

/** Events — published rows (table may be empty; that's fine). */
async function searchEvents(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("events")
    .select("id, title, venue, start_date", { count: "exact" })
    .eq("status", "PUBLISHED")
    .ilike("title", `%${q}%`)
    .order("start_date", { ascending: true })
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("event");
  const rows = (data ?? []) as EventRow[];
  return {
    type: "event",
    count: count ?? rows.length,
    results: rows.map((e) => {
      const when = e.start_date
        ? new Date(e.start_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      return {
        type: "event" as const,
        id: e.id,
        title: e.title,
        subtitle: [when, e.venue].filter(Boolean).join(" · ") || null,
        href: `/events/${e.id}`,
      };
    }),
  };
}

interface PlaceRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  city: string | null;
}

/** Places — ACTIVE community directory listings. */
async function searchPlaces(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("directory_listings")
    .select("id, slug, name, category, city", { count: "exact" })
    .eq("status", "ACTIVE")
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("place");
  const rows = (data ?? []) as PlaceRow[];
  return {
    type: "place",
    count: count ?? rows.length,
    results: rows.map((p) => ({
      type: "place",
      id: p.id,
      title: p.name,
      subtitle: [p.category, p.city].filter(Boolean).join(" · ") || null,
      href: `/places/${p.slug}`,
    })),
  };
}

interface WikiRow {
  id: string;
  slug: string;
  name: string;
  entity_type: string | null;
}

/** Wiki — published entities, matching name or slug. */
async function searchWiki(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("wiki_entities")
    .select("id, slug, name, entity_type", { count: "exact" })
    .eq("status", "published")
    .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
    .order("name", { ascending: true })
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("wiki");
  const rows = (data ?? []) as WikiRow[];
  return {
    type: "wiki",
    count: count ?? rows.length,
    results: rows.map((w) => ({
      type: "wiki",
      id: w.id,
      title: w.name,
      subtitle: w.entity_type ? `Wiki · ${w.entity_type}` : "Wiki",
      href: `/wiki/${w.slug}`,
    })),
  };
}

interface MemberRow {
  id: string;
  username: string | null;
  display_name: string | null;
}

/** Members — public profiles with a username (required for /u/<username>). */
async function searchMembers(supabase: Supabase, q: string): Promise<SearchGroup> {
  const { data, count, error } = await supabase
    .from("profiles_public")
    .select("id, username, display_name", { count: "exact" })
    .not("username", "is", null)
    .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
    .order("display_name", { ascending: true })
    .limit(MAX_PER_GROUP);
  if (error) return emptyGroup("member");
  const rows = ((data ?? []) as MemberRow[]).filter(
    (m): m is MemberRow & { username: string } => !!m.username,
  );
  return {
    type: "member",
    count: count ?? rows.length,
    results: rows.map((m) => ({
      type: "member",
      id: m.id,
      title: m.display_name?.trim() || `@${m.username}`,
      subtitle: `@${m.username}`,
      href: `/u/${m.username}`,
    })),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface GlobalSearchState {
  query: string;
  /** Set the raw input value; results clear immediately below the min length. */
  setQuery: (value: string) => void;
  /** Non-empty groups in display order (DJs, Shows, Videos, Mixshows, Events, Places, Wiki, Members). */
  groups: SearchGroup[];
  /** All visible results flattened across groups, for keyboard navigation. */
  flat: SearchResult[];
  loading: boolean;
  /** True once a search for the current query has completed (drives the honest empty state). */
  searched: boolean;
  /** Clear everything (used when the dialog closes). */
  reset: () => void;
}

export function useGlobalSearch(): GlobalSearchState {
  const [query, setQueryState] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // Sequence counter: every keystroke bumps it; async writers compare against
  // their captured value so a stale response never overwrites a newer one.
  const seqRef = useRef(0);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      seqRef.current += 1; // invalidate any in-flight search
      setGroups([]);
      setLoading(false);
      setSearched(false);
    }
  }, []);

  const reset = useCallback(() => {
    seqRef.current += 1;
    setQueryState("");
    setGroups([]);
    setLoading(false);
    setSearched(false);
  }, []);

  useEffect(() => {
    const raw = query.trim();
    if (raw.length < MIN_QUERY_LENGTH) return;
    const seq = ++seqRef.current;

    const timer = window.setTimeout(() => {
      if (seqRef.current !== seq) return;
      setLoading(true);
      void (async () => {
        const q = sanitize(raw);
        let next: SearchGroup[] = [];
        if (q.length > 0) {
          const supabase = createClient();
          // Fan out in parallel; each source isolated so one failure (network
          // hiccup, RLS surprise, missing table) doesn't kill the rest.
          // supabase-js doesn't throw, but the .catch guards belt-and-braces.
          const settled = await Promise.all([
            Promise.resolve(searchDjs(supabase, q)).catch(() => emptyGroup("dj")),
            Promise.resolve()
              .then(() => searchShows(q))
              .catch(() => emptyGroup("show")),
            Promise.resolve(searchVideos(supabase, q)).catch(() => emptyGroup("video")),
            Promise.resolve(searchMixshows(supabase, q)).catch(() => emptyGroup("mixshow")),
            Promise.resolve(searchEvents(supabase, q)).catch(() => emptyGroup("event")),
            Promise.resolve(searchPlaces(supabase, q)).catch(() => emptyGroup("place")),
            Promise.resolve(searchWiki(supabase, q)).catch(() => emptyGroup("wiki")),
            Promise.resolve(searchMembers(supabase, q)).catch(() => emptyGroup("member")),
          ]);
          next = settled.filter((g) => g.results.length > 0);
        }
        if (seqRef.current !== seq) return; // stale — a newer search owns the state
        setGroups(next);
        setLoading(false);
        setSearched(true);
      })();
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups]);

  return { query, setQuery, groups, flat, loading, searched, reset };
}
