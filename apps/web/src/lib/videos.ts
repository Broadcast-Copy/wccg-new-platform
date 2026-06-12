"use client";

/**
 * Video wall data access — talks to Supabase directly (no API server).
 */

import { createClient } from "@/lib/supabase/client";

/** Content rating used by the parental-controls feature on the video wall. */
export type VideoRating = "G" | "PG" | "PG-13" | "R" | "NR";

/** Ratings hidden/gated when parental controls are locked. */
export const MATURE_RATINGS: ReadonlySet<VideoRating> = new Set<VideoRating>(["R", "NR"]);

/** Is this rating gated behind parental controls when locked? */
export function isMatureRating(rating: string | null | undefined): boolean {
  return MATURE_RATINGS.has((rating ?? "") as VideoRating);
}

export interface VideoRecord {
  id: string;
  user_id: string;
  creator_name: string | null;
  /** Optional grouping key for the wall (e.g. "Angela Yee", "ABC News"). Falls back to creator_name. */
  program: string | null;
  title: string;
  description: string | null;
  storage_path: string | null;
  video_url: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  category: string | null;
  rating: VideoRating;
  tags: string[] | null;
  visibility: "public" | "unlisted" | "private";
  status: "draft" | "processing" | "published" | "removed";
  views: number;
  likes: number;
  published_at: string | null;
  created_at: string;
  /** Portrait/Shorts-style video (hidden from the wall). null = not probed yet. */
  is_portrait: boolean | null;
}

export const SELECT_COLS =
  "id,user_id,creator_name,program,title,description,storage_path,video_url,youtube_id,youtube_url,thumbnail_url,duration_seconds,category,rating,tags,visibility,status,views,likes,published_at,created_at,is_portrait";

/** The program a video belongs to on the wall: explicit `program`, else creator, else station. */
export function programOf(v: Pick<VideoRecord, "program" | "creator_name">): string {
  return (v.program?.trim() || v.creator_name?.trim() || "WCCG 104.5 FM");
}

export async function browseVideos(
  opts: { q?: string; category?: string; program?: string; limit?: number } = {},
): Promise<VideoRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("videos")
    .select(SELECT_COLS)
    .eq("status", "published")
    .eq("visibility", "public")
    // Phone/Shorts-style portrait videos pillarbox badly in 16:9 cards — keep
    // them off the wall. `not is true` keeps null (not-yet-probed) rows.
    .not("is_portrait", "is", true)
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 200, 1), 500));
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.q) {
    const v = opts.q.replace(/[,()]/g, " ");
    query = query.or(`title.ilike.%${v}%,creator_name.ilike.%${v}%,program.ilike.%${v}%,description.ilike.%${v}%`);
  }
  const { data } = await query;
  let rows = (data ?? []) as VideoRecord[];
  // `program` may be null (older rows) — match on the effective program client-side
  // so "WCCG 104.5 FM" (the creator fallback) still filters correctly.
  if (opts.program) {
    const target = opts.program.toLowerCase();
    rows = rows.filter((v) => programOf(v).toLowerCase() === target);
  }
  return rows;
}

export async function getVideo(id: string): Promise<VideoRecord | null> {
  const supabase = createClient();
  const { data } = await supabase.from("videos").select(SELECT_COLS).eq("id", id).maybeSingle();
  return (data as VideoRecord) ?? null;
}

/** Fire-and-forget view increment (RLS-safe RPC). */
export async function incrementViews(id: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.rpc("increment_video_views", { p_video_id: id });
  } catch {
    /* ignore */
  }
}

export async function relatedVideos(excludeId: string, category: string | null, limit = 12): Promise<VideoRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("videos")
    .select(SELECT_COLS)
    .eq("status", "published")
    .eq("visibility", "public")
    .not("is_portrait", "is", true)
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return (data ?? []) as VideoRecord[];
}

// ─── Netflix-style browse helpers ───────────────────────────────────────────

/** A user's saved playback position for one video. */
export interface VideoProgress {
  video_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  updated_at: string;
}

/** A "continue watching" entry: the video plus the viewer's position in it. */
export interface ContinueItem {
  video: VideoRecord;
  position_seconds: number;
  duration_seconds: number | null;
}

/**
 * Most-watched published videos, by `views` desc.
 * Falls back to recency for ties via a secondary order.
 */
export async function topVideos(limit = 10): Promise<VideoRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("videos")
    .select(SELECT_COLS)
    .eq("status", "published")
    .eq("visibility", "public")
    .not("is_portrait", "is", true)
    .order("views", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  return (data ?? []) as VideoRecord[];
}

/**
 * The current user's in-progress videos for the Continue Watching row:
 * `video_progress` rows that aren't completed and are past the 5s threshold,
 * newest first, joined to their (still-published, public) video.
 * Returns [] when signed out. `program` lets us scope to one program's view.
 */
export async function continueWatching(
  userId: string,
  opts: { limit?: number; program?: string } = {},
): Promise<ContinueItem[]> {
  const supabase = createClient();
  const { data: prog } = await supabase
    .from("video_progress")
    .select("video_id,position_seconds,duration_seconds,completed,updated_at")
    .eq("user_id", userId)
    .eq("completed", false)
    .gt("position_seconds", 5)
    .order("updated_at", { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 20, 1), 50));
  const rows = (prog ?? []) as VideoProgress[];
  if (rows.length === 0) return [];

  // Fetch the referenced videos in one round-trip, then re-order to match progress.
  const ids = rows.map((r) => r.video_id);
  const { data: vids } = await supabase
    .from("videos")
    .select(SELECT_COLS)
    .in("id", ids)
    .eq("status", "published")
    .eq("visibility", "public");
  const byId = new Map<string, VideoRecord>(
    ((vids ?? []) as VideoRecord[]).map((v) => [v.id, v] as const),
  );

  const items: ContinueItem[] = [];
  for (const r of rows) {
    const video = byId.get(r.video_id);
    if (!video) continue; // unpublished/removed since last watched
    if (opts.program && programOf(video).toLowerCase() !== opts.program.toLowerCase()) continue;
    items.push({ video, position_seconds: r.position_seconds, duration_seconds: r.duration_seconds });
  }
  return items;
}

/** One program row on the wall: its effective name + its published videos. */
export interface ProgramRow {
  program: string;
  videos: VideoRecord[];
}

/** Round-robin a program's videos across distinct sources (creator_name) so a
 *  single prolific source (e.g. a burst of shorts) doesn't dominate the front of
 *  the row. Each source keeps its own newest-first order; single-source rows are
 *  returned unchanged. */
function interleaveBySource(videos: VideoRecord[]): VideoRecord[] {
  const bySource = new Map<string, VideoRecord[]>();
  const order: string[] = [];
  for (const v of videos) {
    const key = (v.creator_name ?? "").trim() || programOf(v);
    let bucket = bySource.get(key);
    if (!bucket) {
      bucket = [];
      bySource.set(key, bucket);
      order.push(key);
    }
    bucket.push(v);
  }
  if (order.length <= 1) return videos;
  const out: VideoRecord[] = [];
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (const key of order) {
      const bucket = bySource.get(key);
      if (bucket && round < bucket.length) {
        out.push(bucket[round]);
        added = true;
      }
    }
    round++;
  }
  return out;
}

/**
 * Group published videos into one row per program (`programOf`), newest-active
 * first. Within a row, videos are interleaved across their sources so one
 * source can't flood the front of the row. Empty programs never appear.
 */
export function groupByProgram(videos: VideoRecord[]): ProgramRow[] {
  const map = new Map<string, VideoRecord[]>();
  for (const v of videos) {
    const key = programOf(v);
    const bucket = map.get(key);
    if (bucket) bucket.push(v);
    else map.set(key, [v]);
  }
  // Insertion order follows the input order (videos arrive newest-first), so the
  // most recently-published program leads. Within a row, interleave by source.
  return Array.from(map.entries()).map(([program, vids]) => ({
    program,
    videos: interleaveBySource(vids),
  }));
}

/** Fetch + group in one call when the caller doesn't already have the list. */
export async function programsWithVideos(): Promise<ProgramRow[]> {
  const videos = await browseVideos({ limit: 500 });
  return groupByProgram(videos);
}

/** Read the current user's saved progress for one video (null if none / signed out). */
export async function getVideoProgress(userId: string, videoId: string): Promise<VideoProgress | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("video_progress")
    .select("video_id,position_seconds,duration_seconds,completed,updated_at")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle();
  return (data as VideoProgress) ?? null;
}

/**
 * Upsert the current user's playback position for a video. `completed` is derived
 * (≥95% of duration). Keyed on (user_id, video_id) so it edits one row per video.
 */
export async function saveVideoProgress(args: {
  userId: string;
  videoId: string;
  positionSeconds: number;
  durationSeconds: number | null;
}): Promise<void> {
  const { userId, videoId, positionSeconds, durationSeconds } = args;
  const pos = Math.max(0, Math.round(positionSeconds));
  const dur = durationSeconds && durationSeconds > 0 ? Math.round(durationSeconds) : null;
  const completed = dur != null && pos >= dur * 0.95;
  try {
    const supabase = createClient();
    await supabase.from("video_progress").upsert(
      {
        user_id: userId,
        video_id: videoId,
        position_seconds: pos,
        duration_seconds: dur,
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" },
    );
  } catch {
    /* progress saving is best-effort */
  }
}

// ─── Display helpers ───────────────────────────────────────────────────────

export function videoThumb(v: VideoRecord): string {
  if (v.thumbnail_url) return v.thumbnail_url;
  if (v.youtube_id) return `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`;
  return "/images/logos/wccg-logo.png";
}

export function fmtDuration(s: number | null): string {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} view${n === 1 ? "" : "s"}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.round(mo / 12)} year${Math.round(mo / 12) === 1 ? "" : "s"} ago`;
}

/** All selectable content ratings, in order of increasing maturity. */
export const VIDEO_RATINGS: readonly VideoRating[] = ["G", "PG", "PG-13", "R", "NR"];

// ─── Parental controls (client-side localStorage lock) ──────────────────────

/** localStorage key holding the parental-lock state. */
export const PARENTAL_LOCK_KEY = "wccg_parental_lock";

/**
 * Read the parental lock from localStorage. Defaults to LOCKED (true) for
 * safety — mature content is hidden until the visitor explicitly unlocks it.
 * Returns `true` during SSR / when storage is unavailable.
 */
export function readParentalLock(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PARENTAL_LOCK_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Persist the parental lock state to localStorage. */
export function writeParentalLock(locked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PARENTAL_LOCK_KEY, locked ? "on" : "off");
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Tailwind classes for a small rating badge, colour-coded by maturity. */
export function ratingBadgeClasses(rating: string | null | undefined): string {
  switch (rating) {
    case "G":
      return "border border-[#74ddc7]/40 bg-[#74ddc7]/15 text-[#74ddc7]";
    case "PG":
      return "border border-sky-400/40 bg-sky-400/15 text-sky-300";
    case "PG-13":
      return "border border-amber-400/40 bg-amber-400/15 text-amber-300";
    case "R":
      return "border border-red-500/50 bg-red-500/20 text-red-300";
    case "NR":
    default:
      return "border border-border bg-foreground/[0.08] text-muted-foreground";
  }
}

/** Extract a YouTube id from a URL or bare id. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
