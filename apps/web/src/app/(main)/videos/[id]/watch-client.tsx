"use client";

/**
 * /videos/[id] — watch page. Plays an uploaded file or a linked YouTube video,
 * shows title/views/description/creator, and an "Up next" rail.
 *
 * Netflix-style additions:
 *   • Resume + save progress (signed in). On load we read this user's
 *     `video_progress` row and seek the native <video> to `position_seconds`
 *     (YouTube embeds deep-link with &start=). While the native player runs we
 *     upsert progress every ~10s (completed = position ≥ 95% of duration).
 *   • Program nav. A "← More from {program}" header links to the program's
 *     focused wall view, and a "More from {program}" row lists that program's
 *     other videos — so finishing one leads you back into the program.
 *
 * Parental controls (preserved): shares the localStorage lock; R/NR is gated
 * behind an unlock prompt before the player is reachable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, Lock, Play, ShieldAlert, ThumbsUp, Youtube } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getVideo,
  relatedVideos,
  browseVideos,
  incrementViews,
  getVideoProgress,
  saveVideoProgress,
  programOf,
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
  // Resolve the video id from the REAL URL. Under `output: export`, /videos/<id>
  // can be served by the _placeholder shim, so useParams() returns "_placeholder"
  // — but usePathname() reflects the actual browser path, so derive the id from
  // it (and it updates on client-side video→video navigation).
  const pathname = usePathname();
  const id = useMemo(() => {
    const segs = (pathname ?? "").split("/").filter(Boolean);
    const i = segs.indexOf("videos");
    const seg = i >= 0 ? segs[i + 1] : undefined;
    if (!seg || seg === "_placeholder") return "";
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  }, [pathname]);
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [related, setRelated] = useState<VideoRecord[]>([]);
  const [programVideos, setProgramVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const viewedRef = useRef(false);

  // Resume support.
  const [userId, setUserId] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0); // seconds; applied to the player on load
  const videoElRef = useRef<HTMLVideoElement>(null);
  const seekedRef = useRef(false); // ensure we only seek the native player once

  // Parental controls — shares the same localStorage lock as the video wall.
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setLocked(readParentalLock());
    });
    return () => {
      active = false;
    };
  }, []);

  const unlock = useCallback(() => {
    const ok = window.confirm("Show mature content? This unlocks R-rated videos.");
    if (!ok) return;
    setLocked(false);
    writeParentalLock(false);
  }, []);

  // Load the video + related + this program's other videos + the viewer's resume point.
  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const v = await getVideo(id);
        if (!active) return;
        if (!v) {
          setNotFound(true);
          return;
        }
        setVideo(v);
        setUserId(user?.id ?? null);

        if (!viewedRef.current) {
          viewedRef.current = true;
          void incrementViews(v.id);
        }

        // Resume point (signed in only).
        if (user) {
          const prog = await getVideoProgress(user.id, v.id);
          if (active && prog && !prog.completed && prog.position_seconds > 5) {
            setResumeAt(prog.position_seconds);
          }
        }

        const program = programOf(v);
        const [rel, prog] = await Promise.all([
          relatedVideos(v.id, v.category, 12),
          browseVideos({ program, limit: 60 }),
        ]);
        if (!active) return;
        setRelated(rel);
        setProgramVideos(prog.filter((p) => p.id !== v.id));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const gated = video ? locked && isMatureRating(video.rating) : false;

  // Explicit-language warning: even when parental controls are unlocked,
  // mature (R/NR) videos pop a one-time warning before anything plays.
  // Acknowledgment lasts for the browser session.
  const [ackExplicit, setAckExplicit] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("wccg_explicit_ok") === "1";
    } catch {
      return false;
    }
  });
  const acknowledgeExplicit = () => {
    try {
      sessionStorage.setItem("wccg_explicit_ok", "1");
    } catch {
      /* private mode — in-memory ack still applies */
    }
    setAckExplicit(true);
  };
  const needsExplicitWarning = !!video && !gated && isMatureRating(video.rating) && !ackExplicit;

  // Native-player progress: seek to the resume point once, then upsert every ~10s.
  useEffect(() => {
    const el = videoElRef.current;
    // Only wire up for the native player path (no YouTube, not gated, signed in).
    if (!el || !video || gated || !userId || video.youtube_id) return;

    let active = true;
    let lastSaved = 0;

    const onLoaded = () => {
      if (!seekedRef.current && resumeAt > 0 && Number.isFinite(el.duration)) {
        seekedRef.current = true;
        try {
          el.currentTime = Math.min(resumeAt, Math.max(0, el.duration - 1));
        } catch {
          /* seeking can throw if not seekable yet; ignore */
        }
      }
    };

    const flush = () => {
      if (!active) return;
      const pos = el.currentTime;
      const dur = Number.isFinite(el.duration) ? el.duration : video.duration_seconds;
      void saveVideoProgress({ userId, videoId: video.id, positionSeconds: pos, durationSeconds: dur ?? null });
    };

    const onTime = () => {
      const now = el.currentTime;
      if (now - lastSaved >= 10) {
        lastSaved = now;
        flush();
      }
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", flush);
    el.addEventListener("ended", flush);
    // If metadata is already available (fast cache), seek now.
    if (el.readyState >= 1) onLoaded();

    return () => {
      active = false;
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", flush);
      el.removeEventListener("ended", flush);
      flush(); // save on unmount/navigation
    };
  }, [video, gated, userId, resumeAt]);

  // While the id resolves from the URL (static-export hydration) or the video
  // loads, show the spinner — never a premature "not found".
  if (loading || !id) {
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
        <Link href="/videos" className="text-sm text-[#74ddc7] hover:underline">
          ← All videos
        </Link>
      </div>
    );
  }

  const program = programOf(video);
  // YouTube embeds resume by deep-linking the start position (we can't read live
  // position back from a bare iframe, so YouTube progress is resume-only).
  const ytStart = video.youtube_id && resumeAt > 5 ? `?start=${Math.floor(resumeAt)}&` : "?";

  return (
    <div className="py-6">
      {/* Program nav — back into the program, not just "all videos". */}
      <Link
        href={`/videos?program=${encodeURIComponent(program)}`}
        className="mb-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-[#74ddc7]"
      >
        <ArrowLeft className="h-3 w-3" /> More from {program}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Player + meta. The player is capped by viewport height (not just
            column width) so big monitors don't get a wall-to-wall video. */}
        <div className="space-y-4">
          <div
            className={`mx-auto w-full overflow-hidden rounded-2xl border border-border bg-black ${
              video.is_portrait
                ? "aspect-[9/16] max-w-[calc(78vh*9/16)]"
                : "aspect-video max-w-[calc(78vh*16/9)]"
            }`}
          >
            {gated ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={videoThumb(video)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
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
            ) : needsExplicitWarning ? (
              <div className="relative h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={videoThumb(video)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
                <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <p className="text-base font-bold text-white">Explicit content warning</p>
                  <p className="max-w-sm text-xs text-white/70">
                    This video contains explicit language and is intended for mature audiences.
                    Viewer discretion is advised.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Link
                      href="/videos"
                      className="rounded-full border border-white/25 bg-black/40 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                    >
                      Go back
                    </Link>
                    <button
                      onClick={acknowledgeExplicit}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90"
                    >
                      I understand — play
                    </button>
                  </div>
                </div>
              </div>
            ) : video.youtube_id ? (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${video.youtube_id}${ytStart}rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : video.video_url ? (
              <video ref={videoElRef} className="h-full w-full" controls poster={videoThumb(video)} src={video.video_url} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No playable source
              </div>
            )}
          </div>

          {resumeAt > 5 && !gated && (
            <p className="text-xs text-muted-foreground">
              {video.youtube_id ? "Resuming" : "Resumed"} from {fmtDuration(Math.floor(resumeAt))}.
            </p>
          )}

          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-black tracking-tight text-foreground md:text-2xl">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${ratingBadgeClasses(video.rating)}`}
              >
                {video.rating ?? "NR"}
              </span>
              {video.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/videos?program=${encodeURIComponent(program)}`}
                className="group flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 text-sm font-black text-foreground">
                  {program.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-[#74ddc7]">{program}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(video.published_at)}</p>
                </div>
              </Link>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-4 w-4" /> {fmtViews(video.views)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" /> {video.likes}
                </span>
                {video.youtube_url && (
                  <a
                    href={video.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-red-600/15 px-2.5 py-1 text-red-400 hover:bg-red-600/25"
                  >
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

          {/* More from {program} — leads the viewer deeper into the program. */}
          {programVideos.length > 0 && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">More from {program}</h2>
                <Link
                  href={`/videos?program=${encodeURIComponent(program)}`}
                  className="text-xs font-bold text-[#74ddc7] hover:underline"
                >
                  See all
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {programVideos.map((p) => (
                  <ProgramMini key={p.id} v={p} locked={locked} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Up next */}
        <aside className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Up next</h2>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing else yet.</p>
          ) : (
            related.map((r) => {
              const rGated = locked && isMatureRating(r.rating);
              const card = (
                <>
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={videoThumb(r)}
                      alt={rGated ? `${r.title} (locked)` : r.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {rGated ? (
                      <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                        <Lock className="h-3 w-3 text-[#74ddc7]" /> {r.rating ?? "NR"}
                      </span>
                    ) : r.duration_seconds ? (
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
                        {fmtDuration(r.duration_seconds)}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-xs font-bold leading-snug text-foreground group-hover:text-[#74ddc7]">
                      {r.title}
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{programOf(r)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtViews(r.views)} · {timeAgo(r.published_at)}
                    </p>
                  </div>
                </>
              );
              if (rGated) {
                return (
                  <div key={r.id} className="group flex gap-3 opacity-80">
                    {card}
                  </div>
                );
              }
              return (
                <Link key={r.id} href={`/videos/${r.id}`} className="group flex gap-3">
                  {card}
                </Link>
              );
            })
          )}
        </aside>
      </div>
    </div>
  );
}

/** Small horizontal poster used in the "More from {program}" rail. */
function ProgramMini({ v, locked }: { v: VideoRecord; locked: boolean }) {
  const gated = locked && isMatureRating(v.rating);
  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={videoThumb(v)}
          alt={gated ? `${v.title} (locked)` : v.title}
          className={`h-full w-full object-cover ${gated ? "" : "transition-transform group-hover:scale-105"}`}
          loading="lazy"
        />
        {gated ? (
          <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
            <Lock className="h-3 w-3 text-[#74ddc7]" /> {v.rating ?? "NR"}
          </span>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-6 w-6 text-white" fill="currentColor" />
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-foreground group-hover:text-[#74ddc7]">
        {v.title}
      </p>
    </>
  );
  const cls = "group block w-44 shrink-0";
  if (gated) return <div className={cls}>{body}</div>;
  return (
    <Link href={`/videos/${v.id}`} className={cls}>
      {body}
    </Link>
  );
}
