/**
 * Build-time content data-access layer.
 *
 * Loads shows / hosts / schedule / check-in data from Supabase at BUILD TIME
 * (this app is `output: 'export'`, so these run during `next build`, not at
 * request time). Each function returns the SAME shape as the hardcoded TS data
 * modules in `@/data/*`, so server components can map 1:1.
 *
 * The hardcoded TS modules are kept as a FALLBACK: if the query errors or comes
 * back empty (e.g. building offline, RLS hiccup, schema drift), the function
 * returns the corresponding `ALL_SHOWS` / `ALL_HOSTS` / `WEEKLY_SCHEDULE` /
 * `CHECK_IN_LOCATIONS` so the build never produces an empty site.
 *
 * Uses a plain `@supabase/supabase-js` client with the publishable anon key —
 * no cookies, no SSR session. Reads go through RLS like any anon client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ALL_SHOWS,
  type ShowData,
} from "@/data/shows";
import { ALL_HOSTS, type HostData } from "@/data/hosts";
import {
  WEEKLY_SCHEDULE,
  type DaySchedule,
  type ScheduleBlock,
} from "@/data/schedule";
import {
  CHECK_IN_LOCATIONS,
  type CheckInLocation,
} from "@/data/check-in-locations";

/**
 * Single-tenant for now. Hostname → station resolution is a later phase;
 * keeping the station id in one named constant makes that swap a one-liner.
 */
export const STATION_ID = "station_wccg";

// Public-by-design fallbacks — same values as `lib/supabase/client.ts`. The
// project URL ships in every client bundle and the publishable key is RLS-
// protected, so it's safe to embed. Reusing them means the build works without
// NEXT_PUBLIC_SUPABASE_* wired into the build environment.
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

/** Lazily-constructed module-level client (one per build process). */
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// ─── Row shapes (loose — we only read columns we map) ──────────────────────

interface ShowRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  show_image_url: string | null;
  host_image_url: string | null;
  hero_image_class: string | null;
  is_active: boolean | null;
  tagline: string | null;
  host_names: string | null;
  time_slot: string | null;
  days: string | null;
  segments: unknown;
  podcast_rss: string | null;
  youtube: unknown;
  gradient: string | null;
  is_syndicated: boolean | null;
  category: string | null;
  stream_id: string | null;
  sort_order: number | null;
}

interface ShowHostRow {
  show_id: string;
  host_id: string;
  is_primary: boolean | null;
}

interface HostRow {
  id: string;
  name: string;
  slug: string | null;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: unknown;
  youtube_channel: string | null;
  youtube_channel_id: string | null;
  is_syndicated: boolean | null;
  is_active: boolean | null;
  category: string | null;
}

interface ScheduleRow {
  show_id: string;
  title: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean | null;
  stream_id: string | null;
}

interface CheckInRow {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  points: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
}

// ─── Small mapping helpers ─────────────────────────────────────────────────

/** jsonb → string[]; tolerates null / non-array / stringified JSON. */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      /* not JSON — ignore */
    }
  }
  return [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Normalize a time string to "HH:mm" (the ScheduleBlock contract). DB rows are
 * inconsistent — some store "19:00", others "19:00:00" — so trim any seconds.
 */
function toHhMm(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function mapYoutube(value: unknown): ShowData["youtube"] {
  const o = asObject(value);
  if (!o) return undefined;
  const channelName = str(o.channelName);
  const channelUrl = str(o.channelUrl);
  const searchQuery = str(o.searchQuery);
  // channelName + channelUrl + searchQuery are required by the interface.
  if (!channelName || !channelUrl || !searchQuery) return undefined;
  return {
    channelName,
    channelUrl,
    searchQuery,
    channelId: str(o.channelId),
    extraChannelIds: toStringArray(o.extraChannelIds).length
      ? toStringArray(o.extraChannelIds)
      : undefined,
  };
}

function mapSocialLinks(value: unknown): HostData["socialLinks"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const o = asObject(item);
      if (!o) return null;
      const platform = str(o.platform);
      const url = str(o.url);
      const label = str(o.label);
      if (!platform || !url || !label) return null;
      return { platform, url, label };
    })
    .filter((v): v is { platform: string; url: string; label: string } => v !== null);
}

const SHOW_CATEGORIES = new Set<ShowData["category"]>([
  "weekday",
  "saturday",
  "sunday",
  "gospel",
  "mixsquad",
]);
function showCategory(value: unknown): ShowData["category"] {
  return SHOW_CATEGORIES.has(value as ShowData["category"])
    ? (value as ShowData["category"])
    : "weekday";
}

const HOST_CATEGORIES = new Set<HostData["category"]>([
  "main",
  "gospel",
  "mixsquad",
  "weekend",
  "sunday",
]);
function hostCategory(value: unknown): HostData["category"] {
  return HOST_CATEGORIES.has(value as HostData["category"])
    ? (value as HostData["category"])
    : "main";
}

const HOST_ROLES = new Set<HostData["role"]>([
  "Host",
  "Co-Host",
  "DJ",
  "Fill-In",
  "Pastor",
  "Bishop",
]);
function hostRole(value: unknown): HostData["role"] {
  return HOST_ROLES.has(value as HostData["role"])
    ? (value as HostData["role"])
    : "Host";
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Weekday day-part themes (mirrors WEEKDAY_THEMES in schedule.ts). Kept here so
 * the DB schedule (which has no theme columns) can be enriched the same way the
 * hardcoded WEEKLY_SCHEDULE is.
 */
const WEEKDAY_THEMES: Record<number, { name: string; description: string }> = {
  1: { name: "More Music Mondays", description: "Music added from the weekend introduced to the work week." },
  2: { name: "Two for Tuesdays", description: "Two songs by your favorite artist or producer." },
  3: { name: "Women Crush Wednesdays", description: "Female positive and specific programming." },
  4: { name: "Throwback Thursdays", description: "Flashbacks, approximately 10 years back." },
  5: { name: "Free-Fall Fridays", description: "Introduction of new music. Open mix show playlists after 7pm." },
};

// ─── Public data-access functions ──────────────────────────────────────────

/**
 * All shows for the station, mapped to `ShowData`. hostIds are gathered from
 * `show_hosts` (primary host first, then the rest). Falls back to `ALL_SHOWS`
 * on error or empty result.
 */
export async function getShowsFromDb(): Promise<ShowData[]> {
  try {
    const supabase = getClient();
    const [showsRes, linksRes] = await Promise.all([
      supabase
        .from("shows")
        .select(
          "id,name,slug,description,image_url,show_image_url,host_image_url,hero_image_class,is_active,tagline,host_names,time_slot,days,segments,podcast_rss,youtube,gradient,is_syndicated,category,stream_id,sort_order",
        )
        .eq("station_id", STATION_ID),
      supabase.from("show_hosts").select("show_id,host_id,is_primary"),
    ]);

    if (showsRes.error) throw showsRes.error;
    const rows = (showsRes.data ?? []) as ShowRow[];
    if (rows.length === 0) return ALL_SHOWS;

    // Build show_id → ordered hostIds (primary first). Tolerate link errors.
    const links = (linksRes.error ? [] : (linksRes.data ?? [])) as ShowHostRow[];
    const hostIdsByShow = new Map<string, string[]>();
    for (const link of links) {
      if (!hostIdsByShow.has(link.show_id)) hostIdsByShow.set(link.show_id, []);
      const arr = hostIdsByShow.get(link.show_id)!;
      if (link.is_primary) arr.unshift(link.host_id);
      else arr.push(link.host_id);
    }

    // Preserve DB sort_order when present, else stable by name.
    rows.sort((a, b) => {
      const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

    return rows.map((r): ShowData => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      hostNames: r.host_names ?? "",
      hostIds: hostIdsByShow.get(r.id) ?? [],
      timeSlot: r.time_slot ?? "",
      days: r.days ?? "",
      streamId: r.stream_id ?? "",
      description: r.description ?? "",
      tagline: r.tagline ?? "",
      gradient: r.gradient ?? "",
      imageUrl: r.image_url,
      showImageUrl: r.show_image_url,
      hostImageUrl: r.host_image_url,
      heroImageClass: r.hero_image_class ?? undefined,
      youtube: mapYoutube(r.youtube),
      podcastRss: r.podcast_rss ?? undefined,
      segments: toStringArray(r.segments),
      isSyndicated: r.is_syndicated ?? false,
      isActive: r.is_active ?? true,
      category: showCategory(r.category),
    }));
  } catch {
    return ALL_SHOWS;
  }
}

/**
 * All hosts for the station, mapped to `HostData`. showIds are gathered from
 * `show_hosts`. Falls back to `ALL_HOSTS` on error or empty result.
 */
export async function getHostsFromDb(): Promise<HostData[]> {
  try {
    const supabase = getClient();
    const [hostsRes, linksRes] = await Promise.all([
      supabase
        .from("hosts")
        .select(
          "id,name,slug,role,bio,avatar_url,social_links,youtube_channel,youtube_channel_id,is_syndicated,is_active,category",
        )
        .eq("station_id", STATION_ID),
      supabase.from("show_hosts").select("show_id,host_id,is_primary"),
    ]);

    if (hostsRes.error) throw hostsRes.error;
    const rows = (hostsRes.data ?? []) as HostRow[];
    if (rows.length === 0) return ALL_HOSTS;

    const links = (linksRes.error ? [] : (linksRes.data ?? [])) as ShowHostRow[];
    const showIdsByHost = new Map<string, string[]>();
    for (const link of links) {
      if (!showIdsByHost.has(link.host_id)) showIdsByHost.set(link.host_id, []);
      showIdsByHost.get(link.host_id)!.push(link.show_id);
    }

    return rows.map((r): HostData => ({
      id: r.id,
      name: r.name,
      role: hostRole(r.role),
      showIds: showIdsByHost.get(r.id) ?? [],
      bio: r.bio ?? "",
      imageUrl: r.avatar_url,
      socialLinks: mapSocialLinks(r.social_links),
      youtubeChannel: r.youtube_channel ?? undefined,
      youtubeChannelId: r.youtube_channel_id ?? undefined,
      isSyndicated: r.is_syndicated ?? undefined,
      isActive: r.is_active ?? true,
      category: hostCategory(r.category),
    }));
  } catch {
    return ALL_HOSTS;
  }
}

/**
 * Weekly schedule grouped by day-of-week, mapped to `DaySchedule[]`. Days are
 * always returned 0..6 (Sun..Sat) even if a day has no blocks. crossesMidnight
 * is derived (end_time <= start_time). Weekday days get a dayPartTheme.
 * Falls back to `WEEKLY_SCHEDULE` on error or empty result.
 */
export async function getScheduleFromDb(): Promise<DaySchedule[]> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("show_id,title,day_of_week,start_time,end_time,is_active,stream_id")
      .eq("station_id", STATION_ID)
      .eq("is_active", true);

    if (error) throw error;
    const rows = (data ?? []) as ScheduleRow[];
    if (rows.length === 0) return WEEKLY_SCHEDULE;

    // Resolve show metadata for hostNames/showName (best effort).
    const shows = await getShowsFromDb();
    const showById = new Map(shows.map((s) => [s.id, s]));

    const byDay = new Map<number, ScheduleBlock[]>();
    for (const r of rows) {
      const di = r.day_of_week;
      if (di < 0 || di > 6) continue;
      if (!byDay.has(di)) byDay.set(di, []);
      const show = showById.get(r.show_id);
      const startTime = toHhMm(r.start_time);
      const endTime = toHhMm(r.end_time);
      byDay.get(di)!.push({
        showId: r.show_id,
        showName: r.title ?? show?.name ?? "",
        hostNames: show?.hostNames ?? "",
        startTime,
        endTime,
        crossesMidnight: endTime <= startTime,
      });
    }

    return DAY_NAMES.map((day, dayIndex): DaySchedule => {
      const blocks = (byDay.get(dayIndex) ?? []).sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      const base: DaySchedule = {
        day,
        dayShort: DAY_SHORT[dayIndex],
        dayIndex,
        blocks,
      };
      const theme = WEEKDAY_THEMES[dayIndex];
      if (theme) {
        base.dayPartTheme = { ...theme, mixShowTimes: "12pm / 5pm / 10pm" };
      }
      return base;
    });
  } catch {
    return WEEKLY_SCHEDULE;
  }
}

/**
 * Active check-in locations, mapped to `CheckInLocation[]`.
 * Falls back to `CHECK_IN_LOCATIONS` on error or empty result.
 */
export async function getCheckInLocationsFromDb(): Promise<CheckInLocation[]> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("check_in_locations")
      .select(
        "id,name,description,address,lat,lng,points,start_date,end_date,is_active",
      );

    if (error) throw error;
    const rows = (data ?? []) as CheckInRow[];
    if (rows.length === 0) return CHECK_IN_LOCATIONS;

    return rows.map((r): CheckInLocation => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      lat: r.lat,
      lng: r.lng,
      points: r.points ?? 0,
      startDate: r.start_date ?? "",
      endDate: r.end_date ?? "",
      isActive: r.is_active ?? true,
      address: r.address ?? "",
    }));
  } catch {
    return CHECK_IN_LOCATIONS;
  }
}

// ─── Data-driven equivalents of the TS helper functions ─────────────────────
// Pure functions over already-fetched data (logic copied from schedule.ts /
// hosts.ts but parameterized so build-time consumers don't re-query).

/** Hosts for a given show, from an already-fetched host list. */
export function getHostsByShowIdFrom(hosts: HostData[], showId: string): HostData[] {
  return hosts.filter((h) => h.showIds.includes(showId));
}

/**
 * What's on now for the main stream, from an already-fetched schedule.
 * Uses America/New_York. Mirrors `resolveNowPlaying` in schedule.ts.
 */
export function resolveNowPlayingFrom(schedule: DaySchedule[]): ScheduleBlock | null {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = et.getDay();
  const currentMinutes = et.getHours() * 60 + et.getMinutes();

  const daySchedule = schedule.find((d) => d.dayIndex === dayIndex);
  if (!daySchedule) return null;

  for (const block of daySchedule.blocks) {
    const [sh, sm] = block.startTime.split(":").map(Number);
    const [eh, em] = block.endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (block.crossesMidnight) {
      if (currentMinutes >= startMin || currentMinutes < endMin) return block;
    } else {
      if (currentMinutes >= startMin && currentMinutes < endMin) return block;
    }
  }
  return null;
}

/**
 * Next N upcoming blocks, from an already-fetched schedule.
 * Mirrors `getUpNext` in schedule.ts.
 */
export function getUpNextFrom(schedule: DaySchedule[], limit = 3): ScheduleBlock[] {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = et.getDay();
  const currentMinutes = et.getHours() * 60 + et.getMinutes();

  const results: ScheduleBlock[] = [];
  let searchDay = dayIndex;
  let searchMinutes = currentMinutes;
  let daysSearched = 0;

  while (results.length < limit && daysSearched < 7) {
    const daySchedule = schedule.find((d) => d.dayIndex === searchDay);
    if (daySchedule) {
      for (const block of daySchedule.blocks) {
        if (results.length >= limit) break;
        const [sh, sm] = block.startTime.split(":").map(Number);
        const startMin = sh * 60 + sm;
        if (startMin > searchMinutes || daysSearched > 0) results.push(block);
      }
    }
    searchDay = (searchDay + 1) % 7;
    searchMinutes = 0;
    daysSearched++;
  }
  return results;
}

/**
 * Today's day-part theme (weekdays only), from an already-fetched schedule.
 * Mirrors `getTodayTheme` in schedule.ts.
 */
export function getTodayThemeFrom(
  schedule: DaySchedule[],
): { name: string; description: string; mixShowTimes: string } | null {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayIndex = et.getDay();
  const daySchedule = schedule.find((d) => d.dayIndex === dayIndex);
  return daySchedule?.dayPartTheme ?? null;
}
