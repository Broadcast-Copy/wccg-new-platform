"use client";

/**
 * /videos — YouTube-style video wall. Published videos from the studio +
 * YouTube-linked videos appear here.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Play, Search, Video as VideoIcon } from "lucide-react";
import {
  browseVideos,
  videoThumb,
  fmtDuration,
  fmtViews,
  timeAgo,
  type VideoRecord,
} from "@/lib/videos";

const CATEGORIES = ["All", "Studio", "Community", "Music", "Sports", "Shows", "Events"];

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const load = useCallback(() => {
    setLoading(true);
    browseVideos({ q: q.trim() || undefined, category: cat === "All" ? undefined : cat })
      .then(setVideos)
      .finally(() => setLoading(false));
  }, [q, cat]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">WCCG 104.5 FM</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Studio sessions, community spotlights, and more.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search videos…"
            className="w-full rounded-full border border-border bg-card pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
        </div>
      </header>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              cat === c ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <VideoIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {q || cat !== "All" ? "No videos match." : "No videos published yet. Create one in the studio."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ v }: { v: VideoRecord }) {
  return (
    <Link href={`/videos/${v.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={videoThumb(v)}
          alt={v.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 text-white" fill="currentColor" />
          </div>
        </div>
        {v.duration_seconds ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {fmtDuration(v.duration_seconds)}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 text-xs font-black text-foreground">
          {(v.creator_name ?? "W").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-[#74ddc7]">
            {v.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.creator_name ?? "WCCG"}</p>
          <p className="text-xs text-muted-foreground">
            {fmtViews(v.views)} · {timeAgo(v.published_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
