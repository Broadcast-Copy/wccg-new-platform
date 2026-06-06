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
          program ? Promise.resolve<VideoRecord[]>([]) : topVideos(10),
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

  const programRows: ProgramRow[] = useMemo(() => (program ? [] : groupByProgram(videos)), [program, videos]);

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
      <ParentalHeader
        locked={locked}
        onToggle={toggleLock}
        eyebrow="WCCG 104.5 FM"
        title="Watch"
        subtitle="Studio sessions, shows, community spotlights, and more."
      />

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
                <PosterCard key={v.id} v={v} locked={locked} onUnlock={toggleLock} />
              ))}
            </Row>
          ))}
        </div>
      )}
    </div>
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
      {count} mature {count === 1 ? "video is" : "videos are"} hidden by parental controls.
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
        alt={gated ? "Mature content (locked)" : v.title}
        className={`h-full w-full object-cover transition-transform duration-300 ${
          gated ? "scale-110 blur-xl" : "group-hover:scale-[1.04]"
        }`}
        loading="lazy"
      />
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
function PosterCard({ v, locked, onUnlock }: { v: VideoRecord; locked: boolean; onUnlock: () => void }) {
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
          {gated ? "Mature content" : v.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {gated ? "Locked by parental controls" : programOf(v)}
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

  const cls = "group block w-[15rem] shrink-0 snap-start sm:w-[16rem]";
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
            {gated ? "Mature content" : v.title}
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
          {gated ? "Mature content" : v.title}
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
  const cls = "group block w-[15rem] shrink-0 snap-start sm:w-[16rem]";
  if (gated) return <div className={cls}>{body}</div>;
  return (
    <Link href={`/videos/${v.id}`} className={cls}>
      {body}
    </Link>
  );
}
