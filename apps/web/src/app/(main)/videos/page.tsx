"use client";

/**
 * /videos — YouTube-style video wall. Published videos from the studio +
 * YouTube-linked videos appear here.
 *
 * Parental controls: a header toggle locks/unlocks mature content. The locked
 * state persists in localStorage (`wccg_parental_lock`) and defaults to LOCKED
 * for safety. While locked, R/NR videos are shown blurred behind a "Mature —
 * locked" overlay (not navigable); every card carries a small rating badge.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, Play, Search, ShieldAlert, ShieldCheck, Video as VideoIcon } from "lucide-react";
import {
  browseVideos,
  videoThumb,
  fmtDuration,
  fmtViews,
  timeAgo,
  isMatureRating,
  ratingBadgeClasses,
  readParentalLock,
  writeParentalLock,
  type VideoRecord,
} from "@/lib/videos";

const CATEGORIES = ["All", "Studio", "Community", "Music", "Sports", "Shows", "Events"];

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  // Parental controls. Default LOCKED; the real value is read from localStorage
  // once on mount (see effect below) to keep server/client markup consistent.
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    // Mount-only: read persisted lock state a single time. Deferred out of the
    // synchronous effect body to satisfy react-hooks/set-state-in-effect; the
    // initial render stays LOCKED until this resolves, which is the safe state.
    let active = true;
    queueMicrotask(() => {
      if (active) setLocked(readParentalLock());
    });
    return () => { active = false; };
  }, []);

  const toggleLock = useCallback(() => {
    if (locked) {
      // Unlocking exposes mature content — confirm first.
      const ok = window.confirm("Show mature content? This unlocks R-rated videos.");
      if (!ok) return;
      setLocked(false);
      writeParentalLock(false);
    } else {
      // Re-locking is always safe — no confirmation needed.
      setLocked(true);
      writeParentalLock(true);
    }
  }, [locked]);

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

  const lockedMatureCount = locked ? videos.filter((v) => isMatureRating(v.rating)).length : 0;

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">WCCG 104.5 FM</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Studio sessions, community spotlights, and more.</p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <button
            type="button"
            onClick={toggleLock}
            aria-pressed={locked}
            title={locked ? "Parental controls on — mature content locked" : "Parental controls off — mature content visible"}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
              locked
                ? "border-[#74ddc7]/40 bg-[#74ddc7]/15 text-[#74ddc7] hover:bg-[#74ddc7]/25"
                : "border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
            }`}
          >
            {locked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            <span className="hidden sm:inline">{locked ? "Parental controls on" : "Parental controls off"}</span>
            <span className="sm:hidden">{locked ? "Locked" : "Off"}</span>
          </button>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search videos…"
              className="w-full rounded-full border border-border bg-card pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            />
          </div>
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

      {locked && lockedMatureCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-[#74ddc7]" />
          {lockedMatureCount} mature {lockedMatureCount === 1 ? "video is" : "videos are"} hidden by parental controls.
          <button onClick={toggleLock} className="font-bold text-[#74ddc7] hover:underline">Unlock</button>
        </div>
      )}

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
            <VideoCard key={v.id} v={v} locked={locked} onUnlock={toggleLock} />
          ))}
        </div>
      )}
    </div>
  );
}

function RatingBadge({ rating }: { rating: VideoRecord["rating"] }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${ratingBadgeClasses(rating)}`}>
      {rating ?? "NR"}
    </span>
  );
}

function VideoCard({ v, locked, onUnlock }: { v: VideoRecord; locked: boolean; onUnlock: () => void }) {
  const gated = locked && isMatureRating(v.rating);

  const thumb = (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={videoThumb(v)}
        alt={gated ? "Mature content (locked)" : v.title}
        className={`h-full w-full object-cover transition-transform duration-300 ${gated ? "scale-110 blur-xl" : "group-hover:scale-[1.03]"}`}
        loading="lazy"
      />
      {/* Rating badge */}
      <span className="absolute left-1.5 top-1.5 z-10">
        <RatingBadge rating={v.rating} />
      </span>
      {gated ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 px-3 text-center">
          <Lock className="h-5 w-5 text-white" />
          <span className="text-[11px] font-bold text-white">Mature — locked</span>
          <span className="text-[10px] text-white/70">Rated {v.rating}</span>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );

  const meta = (
    <div className="mt-2.5 flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 text-xs font-black text-foreground">
        {(v.creator_name ?? "W").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0">
        <h3 className={`line-clamp-2 text-sm font-bold leading-snug text-foreground ${gated ? "" : "group-hover:text-[#74ddc7]"}`}>
          {gated ? "Mature content" : v.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{gated ? "Locked by parental controls" : (v.creator_name ?? "WCCG")}</p>
        {gated ? (
          <button onClick={onUnlock} className="mt-0.5 text-xs font-bold text-[#74ddc7] hover:underline">
            Unlock to watch
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {fmtViews(v.views)} · {timeAgo(v.published_at)}
          </p>
        )}
      </div>
    </div>
  );

  // While gated, the card is a non-navigable block so the player can't be reached.
  if (gated) {
    return (
      <div className="group block">
        {thumb}
        {meta}
      </div>
    );
  }

  return (
    <Link href={`/videos/${v.id}`} className="group block">
      {thumb}
      {meta}
    </Link>
  );
}
