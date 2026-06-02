"use client";

/**
 * Video wall data access — talks to Supabase directly (no API server).
 */

import { createClient } from "@/lib/supabase/client";

export interface VideoRecord {
  id: string;
  user_id: string;
  creator_name: string | null;
  title: string;
  description: string | null;
  storage_path: string | null;
  video_url: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  category: string | null;
  tags: string[] | null;
  visibility: "public" | "unlisted" | "private";
  status: "draft" | "processing" | "published" | "removed";
  views: number;
  likes: number;
  published_at: string | null;
  created_at: string;
}

const SELECT_COLS =
  "id,user_id,creator_name,title,description,storage_path,video_url,youtube_id,youtube_url,thumbnail_url,duration_seconds,category,tags,visibility,status,views,likes,published_at,created_at";

export async function browseVideos(opts: { q?: string; category?: string; limit?: number } = {}): Promise<VideoRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("videos")
    .select(SELECT_COLS)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 48, 1), 100));
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.q) {
    const v = opts.q.replace(/[,()]/g, " ");
    query = query.or(`title.ilike.%${v}%,creator_name.ilike.%${v}%,description.ilike.%${v}%`);
  }
  const { data } = await query;
  return (data ?? []) as VideoRecord[];
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
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return (data ?? []) as VideoRecord[];
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

/** Extract a YouTube id from a URL or bare id. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
