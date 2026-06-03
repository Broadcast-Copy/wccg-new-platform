"use client";

/**
 * /videos/[id] — YouTube-style watch page. Plays an uploaded video file or a
 * linked YouTube video, shows title/views/description/creator, and an
 * "Up next" rail of related videos.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, Lock, ShieldAlert, ThumbsUp, Youtube } from "lucide-react";
import {
  getVideo,
  relatedVideos,
  incrementViews,
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

export default function WatchClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [related, setRelated] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const viewedRef = useRef(false);

  // Parental controls — shares the same localStorage lock as the video wall.
  // Default LOCKED; the persisted value is read once on mount.
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    // Mount-only read of the persisted lock; deferred out of the synchronous
    // effect body (react-hooks/set-state-in-effect). Stays LOCKED until resolved.
    let active = true;
    queueMicrotask(() => {
      if (active) setLocked(readParentalLock());
    });
    return () => { active = false; };
  }, []);

  const unlock = useCallback(() => {
    const ok = window.confirm("Show mature content? This unlocks R-rated videos.");
    if (!ok) return;
    setLocked(false);
    writeParentalLock(false);
  }, []);

  useEffect(() => {
    if (!id || id === "_placeholder") return;
    // setState kept out of the synchronous effect body (react-hooks/
    // set-state-in-effect); an async worker drives the fetch behind the guard.
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const v = await getVideo(id);
        if (!active) return;
        if (!v) { setNotFound(true); return; }
        setVideo(v);
        if (!viewedRef.current) {
          viewedRef.current = true;
          void incrementViews(v.id);
        }
        const rel = await relatedVideos(v.id, v.category, 12);
        if (active) setRelated(rel);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (!id || id === "_placeholder") {
    return <div className="py-12 text-sm text-muted-foreground">No video.</div>;
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (notFound || !video) {
    return (
      <div className="space-y-3 py-12">
        <p className="text-sm text-red-300">Video not found or not published.</p>
        <Link href="/videos" className="text-sm text-[#74ddc7] hover:underline">← All videos</Link>
      </div>
    );
  }

  const gated = locked && isMatureRating(video.rating);

  return (
    <div className="py-6">
      <Link href="/videos" className="mb-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All videos
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Player + meta */}
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
            {gated ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={videoThumb(video)} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
                <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7]/15 text-[#74ddc7]">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <p className="text-base font-bold text-white">
                    This video is rated {video.rating} — mature content is locked
                  </p>
                  <p className="max-w-sm text-xs text-white/70">
                    Parental controls are on. Unlock to watch R-rated and unrated videos on this device.
                  </p>
                  <button
                    onClick={unlock}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90"
                  >
                    <Lock className="h-4 w-4" /> Unlock to watch
                  </button>
                </div>
              </div>
            ) : video.youtube_id ? (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${video.youtube_id}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : video.video_url ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video className="h-full w-full" controls poster={videoThumb(video)} src={video.video_url} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No playable source</div>
            )}
          </div>

          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-black tracking-tight text-foreground md:text-2xl">
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${ratingBadgeClasses(video.rating)}`}>
                {video.rating ?? "NR"}
              </span>
              {video.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 text-sm font-black text-foreground">
                  {(video.creator_name ?? "W").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{video.creator_name ?? "WCCG 104.5 FM"}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(video.published_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {fmtViews(video.views)}</span>
                <span className="inline-flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {video.likes}</span>
                {video.youtube_url && (
                  <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-red-600/15 px-2.5 py-1 text-red-400 hover:bg-red-600/25">
                    <Youtube className="h-4 w-4" /> YouTube
                  </a>
                )}
              </div>
            </div>
            {video.description && (
              <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                {video.description}
              </div>
            )}
          </div>
        </div>

        {/* Up next */}
        <aside className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Up next</h2>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing else yet.</p>
          ) : (
            related.map((r) => (
              <Link key={r.id} href={`/videos/${r.id}`} className="group flex gap-3">
                <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={videoThumb(r)} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
                  {r.duration_seconds ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                      {fmtDuration(r.duration_seconds)}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-xs font-bold leading-snug text-foreground group-hover:text-[#74ddc7]">{r.title}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.creator_name ?? "WCCG"}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtViews(r.views)} · {timeAgo(r.published_at)}</p>
                </div>
              </Link>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
