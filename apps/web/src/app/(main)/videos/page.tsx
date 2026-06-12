"use client";

/**
 * /videos — Netflix-style browse experience for the WCCG video wall.
 *
 * Rows (each horizontally scrollable, empty rows omitted):
 *   • Continue Watching  — signed-in only, from `video_progress` (incomplete, >5s)
 *   • Most Watched / Top 10 — published videos by `views` desc, big rank numerals
 *   • Program rows       — grouped by coalesce(program, creator_name); header links
 *                          to that program's focused view (?program=<name>)
 *
 * Program view: with a `?program=<name>` search param the page shows just that
 * program — a header, its Continue Watching, and its grid. Same route, filtered.
 *
 * Parental controls (preserved): a header toggle locks/unlocks mature content.
 * Locked state persists in localStorage (`wccg_parental_lock`) and defaults to
 * LOCKED. While locked, R/NR cards are blurred behind a "Mature — locked" gate
 * and aren't navigable; every card carries a small rating badge.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Video as VideoIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  browseVideos,
  continueWatching,
  groupByProgram,
  topVideos,
  programOf,
  videoThumb,
  fmtDuration,
  fmtViews,
  isMatureRating,
  ratingBadgeClasses,
  readParentalLock,
  writeParentalLock,
  type ContinueItem,
  type ProgramRow,
  type VideoRecord,
} from "@/lib/videos";

export default function VideosPage() {
  // useSearchParams requires a Suspense boundary under static export.
  return (
    <Suspense fallback={<WallLoading />}>
      <VideosWall />
    </Suspense>
  );
}

function WallLoading() {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

/**
 * Display label for a program row. "Gospel" reads as "Latest Gospel" — one row
 * of the newest videos across every gospel broadcast (The Encouraging Moment,
 * Lewis Chapel, Mt. Pisgah, Family Fellowship, Grace Plus Nothing, etc.). The
 * underlying program value stays "Gospel" for filtering/links.
 */
function displayProgram(program: string): string {
  return program === "Gospel" ? "Latest Gospel" : program;
}

/** Shows featured in the auto-rotating hero at the top of the wall, in order. */
const HERO_PROGRAMS = [
  "Way Up with Angela Yee",
  "The Bootleg Kev Show",
  "Posted on The Corner",
  "Pick'em Pros",
];

/** Program rows pinned to the top of the wall, in order. */
const HERO_TOP_ROWS = ["WCCG 104.5 FM Original Content", "Sports", "From The Radio"];

function VideosWall() {
  const searchParams = useSearchParams();
  const program = searchParams.get("program")?.trim() || null;

  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [top, setTop] = useState<VideoRecord[]>([]);
  const [cont, setCont] = useState<ContinueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Parental controls. Default LOCKED; the real value is read from localStorage
  // once on mount to keep server/client markup consistent.
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    // Mount-only read of persisted lock; deferred out of the synchronous effect
    // body (react-hooks/set-state-in-effect). Initial render stays LOCKED.
    let active = true;
    queueMicrotask(() => {
      if (active) setLocked(readParentalLock());
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleLock = useCallback(() => {
    if (locked) {
      const ok = window.confirm("Show mature content? This unlocks R-rated videos.");
      if (!ok) return;
      setLocked(false);
      writeParentalLock(false);
    } else {
      setLocked(true);
      writeParentalLock(true);
    }
  }, [locked]);

  // Load everything the wall needs in one pass. Re-runs when the program filter
  // changes (focused view fetches a narrower continue-watching list).
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const [all, mostWatched, watching] = await Promise.all([
          browseVideos({ limit: 500, program: program ?? undefined }),
          // Over-fetch then drop news: national headlines rack up huge view
          // counts and would crowd local shows out of the Top 10.
          program
            ? Promise.resolve<VideoRecord[]>([])
            : topVideos(30).then((list) => list.filter((v) => v.category !== "News").slice(0, 10)),
          user ? continueWatching(user.id, { program: program ?? undefined }) : Promise.resolve<ContinueItem[]>([]),
        ]);

        if (!active) return;
        setVideos(all);
        setTop(mostWatched);
        setCont(watching);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [program]);

  const programRows: ProgramRow[] = useMemo(() => {
    if (program) return [];
    const rows = groupByProgram(videos);
    // Pin Sports + Angela Yee to the top; the rest keep their natural order.
    const rank = (p: string) => {
      const i = HERO_TOP_ROWS.indexOf(p);
      return i === -1 ? HERO_TOP_ROWS.length + 1 : i;
    };
    return [...rows].sort((a, b) => rank(a.program) - rank(b.program));
  }, [program, videos]);

  // Candidate videos per featured show (latest first), skipping mature. The hero
  // resolves the first WIDE/landscape one per show (no phone/Shorts in the hero).
  const heroCandidates = useMemo<VideoRecord[][]>(() => {
    if (program) return [];
    return HERO_PROGRAMS.map((name) =>
      videos
        .filter((x) => (programOf(x) === name || x.creator_name === name) && !isMatureRating(x.rating))
        .slice(0, 8),
    ).filter((list) => list.length > 0);
  }, [program, videos]);

  const lockedMatureCount = useMemo(
    () => (locked ? videos.filter((v) => isMatureRating(v.rating)).length : 0),
    [locked, videos],
  );

  // ── Focused program view ──────────────────────────────────────────────────
  if (program) {
    return (
      <div className="space-y-8 py-6">
        <ParentalHeader
          locked={locked}
          onToggle={toggleLock}
          eyebrow="Program"
          title={displayProgram(program)}
          subtitle={
            program === "Gospel"
              ? "The latest gospel videos from across all of our gospel programming."
              : program.startsWith("From ")
                ? // "From The Radio" → "…video from The Radio." (avoid "from From")
                  `Every published video from ${program.slice(5)}.`
                : `Every published video from ${program}.`
          }
          back={{ href: "/videos", label: "All videos" }}
        />

        {locked && lockedMatureCount > 0 && (
          <MatureNotice count={lockedMatureCount} onUnlock={toggleLock} />
        )}

        {loading ? (
          <WallLoading />
        ) : cont.length === 0 && videos.length === 0 ? (
          <EmptyState message={`No videos from ${program} yet.`} />
        ) : (
          <>
            {cont.length > 0 && (
              <Row title="Continue Watching" icon={<Play className="h-6 w-6" />}>
                {cont.map((c) => (
                  <ContinueCard key={c.video.id} item={c} locked={locked} onUnlock={toggleLock} />
                ))}
              </Row>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                {videos.length} {videos.length === 1 ? "video" : "videos"}
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {videos.map((v) => (
                  <PosterCard key={v.id} v={v} locked={locked} onUnlock={toggleLock} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  // ── Main browse view ───────────────────────────────────────────────────────
  const hasAnything = videos.length > 0 || cont.length > 0;

  return (
    <div className="space-y-8 py-6">
      {!loading && heroCandidates.length > 0 && <VideoHero candidates={heroCandidates} />}
      {/* The big "Watch" header is intentionally omitted now that the hero leads
          the page — keep only a compact parental toggle. */}
      <div className="flex justify-end">
        <ParentalToggle locked={locked} onToggle={toggleLock} />
      </div>

      {locked && lockedMatureCount > 0 && <MatureNotice count={lockedMatureCount} onUnlock={toggleLock} />}

      {loading ? (
        <WallLoading />
      ) : !hasAnything ? (
        <EmptyState message="No videos published yet. Create one in the studio." />
      ) : (
        <div className="space-y-9">
          {cont.length > 0 && (
            <Row title="Continue Watching" icon={<Play className="h-6 w-6" />}>
              {cont.map((c) => (
                <ContinueCard key={c.video.id} item={c} locked={locked} onUnlock={toggleLock} />
              ))}
            </Row>
          )}

          {top.length > 0 && (
            <Row title="Most Watched" icon={<TrendingUp className="h-6 w-6" />}>
              {top.map((v, i) => (
                <RankCard key={v.id} v={v} rank={i + 1} locked={locked} onUnlock={toggleLock} />
              ))}
            </Row>
          )}

          {programRows.map((pr) => (
            <Row
              key={pr.program}
              title={displayProgram(pr.program)}
              icon={<Flame className="h-6 w-6" />}
              href={`/videos?program=${encodeURIComponent(pr.program)}`}
            >
              {pr.videos.map((v) => (
                <PosterCard
                  key={v.id}
                  v={v}
                  locked={locked}
                  onUnlock={toggleLock}
                  big={pr.program === "Gospel"}
                />
              ))}
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rotating video hero (Netflix/Prime-style) ───────────────────────────────

/** True only for clearly WIDE (16:9-ish) videos. The maxres thumbnail FILE is
 * always 1280×720, so file dimensions alone can't tell a real widescreen video
 * from a vertical/square clip that YouTube padded with solid side bars
 * ("pillarbox") to fill the 16:9 frame — those read as terrible in a cinematic
 * banner. So we load the poster and inspect its pixels: measure any uniform side
 * bars, and exclude the video if the actual content is narrower than ~16:9
 * (content aspect < 1.58), has symmetric bars on both sides, or one dominant
 * bar. ytimg serves `Access-Control-Allow-Origin: *`, so the canvas isn't
 * tainted; if pixels ever can't be read we fall back to the plain file aspect. */
function isWideVideo(v: VideoRecord): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const src = v.youtube_id ? `https://i.ytimg.com/vi/${v.youtube_id}/maxresdefault.jpg` : v.thumbnail_url;
    if (!src) {
      resolve(false);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      // Reject the 120×90 "no maxres" placeholder and any non-landscape file.
      if (nw < 600 || nw < nh * 1.35) {
        resolve(false);
        return;
      }
      try {
        const scale = nw > 640 ? 640 / nw : 1;
        const W = Math.round(nw * scale);
        const H = Math.round(nh * scale);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(true);
          return;
        }
        ctx.drawImage(img, 0, 0, W, H);
        const { data } = ctx.getImageData(0, 0, W, H);
        const at = (x: number, y: number): [number, number, number] => {
          const i = (y * W + x) * 4;
          return [data[i], data[i + 1], data[i + 2]];
        };
        const dist = (a: [number, number, number], b: [number, number, number]) =>
          Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        // Average colour of the outermost ~1.5% strip on a side = the bar colour.
        const refColor = (side: "L" | "R"): [number, number, number] => {
          const edge = Math.max(1, Math.floor(W * 0.015));
          const x0 = side === "L" ? 0 : W - edge;
          const x1 = side === "L" ? edge : W;
          let r = 0, g = 0, b = 0, n = 0;
          for (let x = x0; x < x1; x++) for (let y = 0; y < H; y += 2) { const p = at(x, y); r += p[0]; g += p[1]; b += p[2]; n++; }
          return [r / n, g / n, b / n];
        };
        // Walk inward from a side while each column stays ~uniform bar colour.
        const barWidth = (side: "L" | "R"): number => {
          const ref = refColor(side);
          const lim = Math.floor(W * 0.3);
          let w = 0;
          for (let k = 0; k < lim; k++) {
            const x = side === "L" ? k : W - 1 - k;
            let m = 0, t = 0;
            for (let y = 0; y < H; y += 2) { if (dist(at(x, y), ref) < 30) m++; t++; }
            if (m / t >= 0.85) w++; else break;
          }
          return w;
        };
        const bL = barWidth("L");
        const bR = barWidth("R");
        const contentAspect = (W - bL - bR) / H;
        const pillarbox =
          contentAspect < 1.58 || (bL >= W * 0.03 && bR >= W * 0.03) || Math.max(bL, bR) >= W * 0.12;
        resolve(!pillarbox);
      } catch {
        // Pixels unreadable (canvas tainted / decode issue) — fall back to file aspect.
        resolve(nw >= nh * 1.35);
      }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/** Compact parental on/off control, used where the full header is omitted. */
function ParentalToggle({ locked, onToggle }: { locked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={locked}
      title={locked ? "Parental controls on — mature content locked" : "Parental controls off — mature content visible"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        locked
          ? "border-[#74ddc7]/40 bg-[#74ddc7]/15 text-[#74ddc7] hover:bg-[#74ddc7]/25"
          : "border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
      }`}
    >
      {locked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
      <span className="hidden sm:inline">{locked ? "Parental controls on" : "Parental controls off"}</span>
      <span className="sm:hidden">{locked ? "Locked" : "Off"}</span>
    </button>
  );
}

/**
 * Full-bleed auto-rotating hero. Features the most-recent WIDE (landscape) video
 * from each HERO_PROGRAMS show — phone/Shorts/pillarboxed clips are excluded via
 * isWideVideo. Each slide PLAYS its video (muted autoplay loop) sized to COVER
 * the cinematic frame, with the maxres poster as the base/loading layer behind
 * it. Rotates every 12s, pauses on hover. setSlides/setIdx only fire in async
 * callbacks, satisfying react-hooks/set-state-in-effect.
 */
function VideoHero({ candidates }: { candidates: VideoRecord[][] }) {
  const [slides, setSlides] = useState<VideoRecord[]>([]);
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);

  // Resolve the first wide video per show (skips phone/Shorts).
  useEffect(() => {
    let active = true;
    void (async () => {
      const out: VideoRecord[] = [];
      for (const list of candidates) {
        for (const v of list) {
          if (await isWideVideo(v)) {
            out.push(v);
            break;
          }
        }
      }
      if (active) setSlides(out);
    })();
    return () => {
      active = false;
    };
  }, [candidates]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      if (!paused.current) setIdx((i) => (i + 1) % slides.length);
    }, 12000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const safeIdx = idx % slides.length;
  const v = slides[safeIdx];
  const yt = v.youtube_id;

  return (
    <section
      className="relative -mx-4 -mt-8 mb-3 overflow-hidden bg-black sm:-mx-6 lg:-mx-8 2xl:-mx-12"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      aria-roledescription="carousel"
      aria-label="Featured shows"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[2/1] lg:aspect-[21/9]" style={{ maxHeight: "80vh" }}>
        {/* Media layer — a size container so the playing video can COVER the
            cinematic frame via container-query units (works 16:10 → 21:9). */}
        <div className="absolute inset-0 overflow-hidden" style={{ containerType: "size" }}>
          {/* High-res poster — base layer + graceful fallback if the video is slow
              or can't embed. Slow Ken Burns zoom; the video fades in over it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`t-${v.id}`}
            src={yt ? `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg` : videoThumb(v)}
            onError={(e) => {
              const t = e.currentTarget;
              if (!t.dataset.fb) {
                t.dataset.fb = "1";
                t.src = videoThumb(v);
              }
            }}
            alt={v.title}
            className="hero-kenburns absolute inset-0 h-full w-full object-cover"
          />
          {/* Auto-playing muted video for the active slide (loops), sized to cover. */}
          {yt && (
            <iframe
              key={`v-${v.id}`}
              src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&controls=0&loop=1&playlist=${yt}&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1`}
              title={v.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              className="hero-video-in pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
              style={{ width: "max(100cqw, 177.78cqh)", height: "max(100cqh, 56.25cqw)" }}
            />
          )}
        </div>
        {/* Cinematic gradients for legibility. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/95 via-background/35 to-transparent" />

        {/* Copy + CTAs. */}
        <div className="absolute inset-0 z-10 flex flex-col justify-end px-5 pb-8 sm:px-8 sm:pb-10 lg:px-12 lg:pb-14">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#74ddc7]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#dc2626]" /> Featured on WCCG
            </p>
            <h2 className="text-2xl font-black leading-[1.05] tracking-tight text-foreground drop-shadow-xl sm:text-4xl lg:text-5xl">
              {programOf(v)}
            </h2>
            <p className="line-clamp-2 max-w-xl text-sm text-foreground/85 drop-shadow sm:text-base">
              {v.title}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
              <Link
                href={`/videos/${v.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#74ddc7] px-6 py-2.5 text-sm font-black text-[#0a0a0f] shadow-lg transition hover:opacity-90"
              >
                <Play className="h-4 w-4" fill="currentColor" /> Watch now
              </Link>
              <Link
                href={`/videos?program=${encodeURIComponent(programOf(v))}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
              >
                More episodes
              </Link>
            </div>
          </div>
        </div>

        {/* Slide dots. */}
        <div className="absolute bottom-4 right-5 z-10 flex items-center gap-2 sm:bottom-6 sm:right-8">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${programOf(s)}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIdx ? "w-7 bg-[#74ddc7]" : "w-3 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function ParentalHeader({
  locked,
  onToggle,
  eyebrow,
  title,
  subtitle,
  back,
}: {
  locked: boolean;
  onToggle: () => void;
  eyebrow: string;
  title: string;
  subtitle: string;
  back?: { href: string; label: string };
}) {
  return (
    <header className="space-y-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#74ddc7]">{eyebrow}</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={locked}
          title={
            locked
              ? "Parental controls on — mature content locked"
              : "Parental controls off — mature content visible"
          }
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
      </div>
    </header>
  );
}

function MatureNotice({ count, onUnlock }: { count: number; onUnlock: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5 text-[#74ddc7]" />
      {count} mature {count === 1 ? "video is" : "videos are"} locked by parental controls — thumbnails show, playback stays locked.
      <button onClick={onUnlock} className="font-bold text-[#74ddc7] hover:underline">
        Unlock
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <VideoIcon className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Horizontal row (Netflix rail) ───────────────────────────────────────────

function Row({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 280), behavior: "smooth" });
  }, []);

  return (
    <section className="group/row space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        {href ? (
          <Link
            href={href}
            className="group/title inline-flex items-center gap-2 text-base font-black tracking-tight text-foreground hover:text-[#74ddc7]"
          >
            {icon ? <span className="text-[#74ddc7]">{icon}</span> : null}
            {title}
            <ChevronRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover/title:translate-x-0 group-hover/title:opacity-100" />
          </Link>
        ) : (
          <h2 className="inline-flex items-center gap-2 text-base font-black tracking-tight text-foreground">
            {icon ? <span className="text-[#74ddc7]">{icon}</span> : null}
            {title}
          </h2>
        )}
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="rounded-full border border-border bg-card p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
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

// ─── Cards ───────────────────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: VideoRecord["rating"] }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${ratingBadgeClasses(rating)}`}
    >
      {rating ?? "NR"}
    </span>
  );
}

/** Shared 16:9 thumbnail with rating badge + parental gate overlay. */
function Thumb({ v, gated, children }: { v: VideoRecord; gated: boolean; children?: React.ReactNode }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={videoThumb(v)}
        alt={gated ? `${v.title} (locked)` : v.title}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        loading="lazy"
      />
      <span className="absolute left-1.5 top-1.5 z-10">
        <RatingBadge rating={v.rating} />
      </span>
      {gated ? (
        /* Locked = real thumbnail stays visible; only playback is gated. */
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-2">
          <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <Lock className="h-3 w-3 text-[#74ddc7]" /> Rated {v.rating ?? "NR"} — locked
          </span>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-5 w-5 text-white" fill="currentColor" />
            </div>
          </div>
          {v.duration_seconds ? (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {fmtDuration(v.duration_seconds)}
            </span>
          ) : null}
          {children}
        </>
      )}
    </div>
  );
}

/** A standard poster card used in program rows and grids. Fixed width in rails. */
function PosterCard({
  v,
  locked,
  onUnlock,
  big = false,
}: {
  v: VideoRecord;
  locked: boolean;
  onUnlock: () => void;
  big?: boolean;
}) {
  const gated = locked && isMatureRating(v.rating);
  const body = (
    <>
      <Thumb v={v} gated={gated} />
      <div className="mt-2 min-w-0">
        <h3
          className={`line-clamp-2 text-sm font-bold leading-snug text-foreground ${
            gated ? "" : "group-hover:text-[#74ddc7]"
          }`}
        >
          {v.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {v.creator_name?.trim() || programOf(v)}
        </p>
        {gated ? (
          <button onClick={onUnlock} className="mt-0.5 text-xs font-bold text-[#74ddc7] hover:underline">
            Unlock to watch
          </button>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{fmtViews(v.views)}</p>
        )}
      </div>
    </>
  );

  const cls = `group block shrink-0 snap-start ${
    big ? "w-[21rem] sm:w-[23rem]" : "w-[18rem] sm:w-[20rem]"
  }`;
  if (gated) return <div className={cls}>{body}</div>;
  return (
    <Link href={`/videos/${v.id}`} className={cls}>
      {body}
    </Link>
  );
}

/** Top-10 card with a large rank numeral behind the poster. */
function RankCard({
  v,
  rank,
  locked,
  onUnlock,
}: {
  v: VideoRecord;
  rank: number;
  locked: boolean;
  onUnlock: () => void;
}) {
  const gated = locked && isMatureRating(v.rating);
  const inner = (
    <>
      {/* Giant rank numeral, Netflix-style, tucked behind the poster's left edge. */}
      <span
        aria-hidden
        className="pointer-events-none select-none font-black leading-none text-transparent"
        style={{
          WebkitTextStroke: "2px rgba(116,221,199,0.55)",
          fontSize: "5.5rem",
          marginRight: "-1.25rem",
        }}
      >
        {rank}
      </span>
      <div className="w-[12.5rem] shrink-0 sm:w-[13.5rem]">
        <Thumb v={v} gated={gated} />
        <div className="mt-2 min-w-0">
          <h3
            className={`line-clamp-1 text-sm font-bold leading-snug text-foreground ${
              gated ? "" : "group-hover:text-[#74ddc7]"
            }`}
          >
            {v.title}
          </h3>
          {gated ? (
            <button onClick={onUnlock} className="text-xs font-bold text-[#74ddc7] hover:underline">
              Unlock to watch
            </button>
          ) : (
            <p className="truncate text-xs text-muted-foreground">{fmtViews(v.views)}</p>
          )}
        </div>
      </div>
    </>
  );

  const cls = "group flex shrink-0 snap-start items-end";
  if (gated) return <div className={cls}>{inner}</div>;
  return (
    <Link href={`/videos/${v.id}`} className={cls}>
      {inner}
    </Link>
  );
}

/** Continue-watching card: poster + a progress bar from position/duration. */
function ContinueCard({ item, locked, onUnlock }: { item: ContinueItem; locked: boolean; onUnlock: () => void }) {
  const { video: v, position_seconds, duration_seconds } = item;
  const gated = locked && isMatureRating(v.rating);
  const dur = duration_seconds ?? v.duration_seconds ?? 0;
  const pct = dur > 0 ? Math.min(100, Math.max(2, Math.round((position_seconds / dur) * 100))) : 0;
  const remaining = dur > 0 ? Math.max(0, dur - position_seconds) : 0;

  const progressBar = (
    <div className="absolute inset-x-0 bottom-0 z-10 h-1.5 bg-black/50">
      <div className="h-full bg-[#74ddc7]" style={{ width: `${pct}%` }} />
    </div>
  );

  const body = (
    <>
      <Thumb v={v} gated={gated}>
        {progressBar}
      </Thumb>
      <div className="mt-2 min-w-0">
        <h3
          className={`line-clamp-1 text-sm font-bold leading-snug text-foreground ${
            gated ? "" : "group-hover:text-[#74ddc7]"
          }`}
        >
          {v.title}
        </h3>
        {gated ? (
          <button onClick={onUnlock} className="text-xs font-bold text-[#74ddc7] hover:underline">
            Unlock to watch
          </button>
        ) : (
          <p className="truncate text-xs text-muted-foreground">
            {programOf(v)}
            {dur > 0 ? ` · ${fmtDuration(remaining)} left` : ""}
          </p>
        )}
      </div>
    </>
  );

  // While gated, Thumb hides its children, so the progress bar stays behind the
  // lock overlay (you can't see how far you got into a video you can't watch).
  const cls = "group block w-[17rem] shrink-0 snap-start sm:w-[19rem]";
  if (gated) return <div className={cls}>{body}</div>;
  return (
    <Link href={`/videos/${v.id}`} className={cls}>
      {body}
    </Link>
  );
}
