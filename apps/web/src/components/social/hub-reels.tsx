"use client";

/**
 * TikTok-style vertical video feed for the community hubs ("Reels" mode).
 *
 * A full-bleed, scroll-snapping column of video cards pulled from the public
 * video wall (`videos`). The reel currently in view autoplays muted (via an
 * IntersectionObserver); every other reel is paused. Tapping a reel toggles
 * play/pause and unmutes it. Respects the same parental-controls lock used on
 * the video wall — when locked, R / NR ("mature") reels are blurred behind an
 * unlock prompt instead of playing.
 *
 * Data-only dependency on Supabase via `createClient`; current user (for the
 * like button) comes from `supabase.auth.getUser()`. Plain <video>/<iframe>.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Play, Volume2, VolumeX, Lock, Film, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { readParentalLock, isMatureRating, PARENTAL_LOCK_KEY, programOf, fmtViews } from "@/lib/videos";

// The subset of video columns the reels feed needs (matches the task's select).
interface Reel {
  id: string;
  title: string;
  creator_name: string | null;
  program: string | null;
  video_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  rating: string | null;
  /** True when this reel is a community hub_posts video (not a videos-table row). */
  isPost?: boolean;
}

interface HubReelsProps {
  /** Drives the accent used for like/active states so reels match their hub. */
  accentColor: string;
}

const REELS_SELECT = "id,title,creator_name,program,video_url,youtube_id,thumbnail_url,views,likes,rating";

function thumbFor(r: Reel): string {
  if (r.thumbnail_url) return r.thumbnail_url;
  if (r.youtube_id) return `https://i.ytimg.com/vi/${r.youtube_id}/hqdefault.jpg`;
  return "/images/logos/wccg-logo.png";
}

export function HubReels({ accentColor }: HubReelsProps) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  // Parental lock: defaults to locked (true) for safety, mirroring the wall.
  // Lazy initializer reads localStorage during the (client-only) first render,
  // so no synchronous setState is needed in an effect to seed it.
  const [locked, setLocked] = useState<boolean>(() => readParentalLock());
  // Per-reel viewer state (kept out of the data list so re-fetches don't wipe it).
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeDelta, setLikeDelta] = useState<Record<string, number>>({});
  const [unmutedId, setUnmutedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Reels the viewer chose to reveal despite the lock (per session).
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // ── Load videos + current user (guarded so a late await never races teardown) ──
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load(): Promise<{ rows: Reel[]; uid: string | null }> {
      const [{ data: vids }, { data: postRows }, { data: auth }] = await Promise.all([
        supabase
          .from("videos")
          .select(REELS_SELECT)
          .eq("status", "published")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(30),
        // Community video posts (file attachments in the public post-media bucket).
        supabase
          .from("hub_posts")
          .select("id, user_id, content, media_paths, likes_count")
          .eq("media_type", "video")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase.auth.getUser(),
      ]);

      const pr = (postRows ?? []) as Array<{
        id: string; user_id: string; content: string;
        media_paths: string[] | null; likes_count: number;
      }>;
      const postUserIds = [...new Set(pr.map((p) => p.user_id))];
      const { data: profs } = postUserIds.length
        ? await supabase.from("profiles_public").select("id, display_name").in("id", postUserIds)
        : { data: [] };
      const nameById = new Map(
        (profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]),
      );
      const postReels: Reel[] = pr
        .map((p): Reel | null => {
          const vpath = (p.media_paths ?? []).find((x) => /\.(mp4|mov|webm|m4v|ogv)$/i.test(x));
          if (!vpath) return null;
          return {
            id: p.id,
            title: p.content || "Community video",
            creator_name: nameById.get(p.user_id) ?? "Community",
            program: "Community",
            video_url: supabase.storage.from("post-media").getPublicUrl(vpath).data.publicUrl,
            youtube_id: null,
            thumbnail_url: null,
            views: null,
            likes: p.likes_count ?? 0,
            rating: "G",
            isPost: true,
          };
        })
        .filter((r): r is Reel => r !== null);

      const rows = [...(((vids as Reel[] | null) ?? [])), ...postReels];
      return { rows, uid: auth.user?.id ?? null };
    }

    load().then(({ rows, uid }) => {
      if (!active) return;
      setReels(rows);
      setUserId(uid);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // ── React to lock changes made elsewhere (e.g. the wall's toggle in another
  //    tab). The event-driven setState in the listener is allowed; the initial
  //    value was already seeded by the lazy useState initializer above. ──
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === PARENTAL_LOCK_KEY) setLocked(readParentalLock());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Whether a given reel is hidden right now (mature + locked + not revealed).
  const isGated = useCallback(
    (r: Reel) => locked && isMatureRating(r.rating) && !revealed.has(r.id),
    [locked, revealed],
  );

  // ── Autoplay whichever reel is most in view; pause the rest ──
  // IntersectionObserver callbacks may call setState directly (allowed by the
  // set-state-in-effect rule — they're event-driven, not effect-body sync).
  useEffect(() => {
    if (reels.length === 0) return;
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.reelId;
          if (!id) continue;
          if (e.isIntersecting && e.intersectionRatio >= 0.6) visible.set(id, e.intersectionRatio);
          else visible.delete(id);
        }
        // Most-visible reel wins the "active" slot.
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        setActiveId(bestId);
      },
      { threshold: [0, 0.6, 0.9] },
    );
    for (const el of videoRefs.current.values()) {
      const wrap = el.closest("[data-reel-id]");
      if (wrap) obs.observe(wrap);
    }
    return () => obs.disconnect();
  }, [reels]);

  // Drive play/pause off the active reel; mute state is owned by the JSX
  // `muted` prop (React keeps it in sync on render), so we only start/stop here.
  useEffect(() => {
    for (const [id, el] of videoRefs.current) {
      if (id === activeId) {
        const p = el.play();
        if (p) p.catch(() => { /* autoplay blocked — user taps to start */ });
      } else {
        el.pause();
      }
    }
  }, [activeId, reels]);

  const registerVideo = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(id, el);
    else videoRefs.current.delete(id);
  }, []);

  // Tap a reel: 1st tap on a paused reel plays+unmutes; tap on the playing one
  // toggles pause. Keeps the gesture close to TikTok without extra chrome.
  const onTapReel = useCallback(
    (r: Reel) => {
      if (isGated(r)) return;
      const el = videoRefs.current.get(r.id);
      if (!el) {
        // YouTube reel — just mark it active; the iframe handles its own play.
        setActiveId(r.id);
        return;
      }
      if (activeId === r.id && !el.paused) {
        el.pause();
        setActiveId(null);
      } else {
        setActiveId(r.id);
        setUnmutedId(r.id);
        el.muted = false;
        const p = el.play();
        if (p) p.catch(() => { /* ignore */ });
      }
    },
    [activeId, isGated],
  );

  const toggleMute = useCallback((id: string) => {
    setUnmutedId((cur) => (cur === id ? null : id));
  }, []);

  // Like: optimistic per-session, then best-effort persist to `videos.likes`.
  const toggleLike = useCallback(
    async (r: Reel) => {
      if (!userId) return;
      const already = likedIds.has(r.id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (already) next.delete(r.id);
        else next.add(r.id);
        return next;
      });
      setLikeDelta((prev) => ({ ...prev, [r.id]: (prev[r.id] ?? 0) + (already ? -1 : 1) }));
      try {
        const supabase = createClient();
        if (r.isPost) {
          // Community-post reel: toggle via the hub-post like RPC.
          await supabase.rpc("hub_post_toggle_like", { p_post_id: r.id });
        } else {
          const base = r.likes ?? 0;
          await supabase
            .from("videos")
            .update({ likes: Math.max(0, base + (already ? -1 : 1)) })
            .eq("id", r.id);
        }
      } catch {
        /* like persistence is best-effort */
      }
    },
    [userId, likedIds],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div
          className="h-7 w-7 animate-spin rounded-full border-3 border-t-transparent"
          style={{ borderColor: accentColor, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          <Film className="h-7 w-7" />
        </div>
        <p className="font-semibold text-foreground">No reels yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Published videos from the WCCG video wall will show up here. Check back soon!
        </p>
        <Link
          href="/videos"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          Browse the video wall
        </Link>
      </div>
    );
  }

  return (
    <div
      className="h-[80vh] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl border border-border bg-black/40 scrollbar-thin"
      style={{ scrollbarWidth: "none" }}
    >
      {reels.map((r) => {
        const gated = isGated(r);
        const isActive = activeId === r.id;
        const isUnmuted = unmutedId === r.id;
        const liked = likedIds.has(r.id);
        const likeCount = Math.max(0, (r.likes ?? 0) + (likeDelta[r.id] ?? 0));
        const program = programOf({ program: r.program, creator_name: r.creator_name });

        return (
          <section
            key={r.id}
            data-reel-id={r.id}
            className="relative flex h-[80vh] w-full snap-start items-center justify-center overflow-hidden bg-black"
          >
            {/* Blurred thumbnail backdrop for letterboxed (portrait/landscape) fit */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbFor(r)}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
            />

            {/* The media */}
            {gated ? (
              <ParentalGate rating={r.rating} accentColor={accentColor} onReveal={() => setRevealed((p) => new Set(p).add(r.id))} />
            ) : r.youtube_id ? (
              <iframe
                className="relative z-[1] h-full w-full max-w-[480px]"
                src={`https://www.youtube.com/embed/${r.youtube_id}?rel=0&playsinline=1&modestbranding=1${isActive ? "&autoplay=1&mute=1" : ""}`}
                title={r.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : r.video_url ? (
              <button
                type="button"
                onClick={() => onTapReel(r)}
                className="relative z-[1] flex h-full w-full max-w-[480px] items-center justify-center"
                aria-label={isActive && isUnmuted ? "Pause" : "Play"}
              >
                <video
                  ref={(el) => registerVideo(r.id, el)}
                  src={r.video_url}
                  poster={thumbFor(r)}
                  loop
                  playsInline
                  muted={!isUnmuted}
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
                {/* Big play affordance when this reel is paused / not active */}
                {!isActive && (
                  <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                    <Play className="h-8 w-8 translate-x-0.5" fill="currentColor" />
                  </span>
                )}
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbFor(r)}
                alt={r.title}
                className="relative z-[1] h-full w-full max-w-[480px] object-contain"
              />
            )}

            {/* Bottom gradient + meta overlay */}
            {!gated && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-5">
                <div className="flex items-end justify-between gap-3">
                  <div className="pointer-events-auto min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: accentColor }}>
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {program.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate">{program}</span>
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug text-white drop-shadow">
                      {r.title}
                    </h3>
                    <Link
                      href={`/videos/${r.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Watch full · {fmtViews(r.views ?? 0)}
                    </Link>
                  </div>

                  {/* Action rail */}
                  <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleLike(r)}
                      disabled={!userId}
                      title={userId ? (liked ? "Unlike" : "Like") : "Sign in to like"}
                      className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90 disabled:opacity-50"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                        <Heart
                          className="h-6 w-6"
                          fill={liked ? accentColor : "none"}
                          stroke={liked ? accentColor : "currentColor"}
                        />
                      </span>
                      <span className="text-[11px] font-bold tabular-nums">{likeCount}</span>
                    </button>

                    {r.video_url && !r.youtube_id && (
                      <button
                        type="button"
                        onClick={() => toggleMute(r.id)}
                        title={isUnmuted ? "Mute" : "Unmute"}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-transform active:scale-90"
                      >
                        {isUnmuted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Locked-content overlay shown in place of a mature reel. Revealing only
// affects this session (the global lock stays on; manage it from the wall).
function ParentalGate({
  rating,
  accentColor,
  onReveal,
}: {
  rating: string | null;
  accentColor: string;
  onReveal: () => void;
}) {
  return (
    <div className="relative z-[1] flex h-full w-full max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accentColor}26`, color: accentColor }}
      >
        <Lock className="h-7 w-7" />
      </div>
      <p className="text-base font-bold text-white">
        Rated {rating ?? "NR"} — mature content is locked
      </p>
      <p className="max-w-xs text-xs text-white/70">
        Parental controls are on. Reveal just this reel, or manage the lock from the video wall.
      </p>
      <button
        type="button"
        onClick={onReveal}
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
        style={{ backgroundColor: accentColor }}
      >
        <Lock className="h-4 w-4" /> Reveal reel
      </button>
    </div>
  );
}
