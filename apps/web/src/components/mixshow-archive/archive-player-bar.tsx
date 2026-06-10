"use client";

/**
 * Sticky bottom player bar for the public Mixshow Archive (/mixshows).
 *
 * Self-contained: owns one <audio> element and plays the queue handed to it by
 * the archive page (queue = the visible list at the moment play was pressed).
 * Tracks carry directly-playable PUBLIC storage URLs (the `dj-drops` bucket is
 * public), so there is no signed-URL resolve step. Modeled on the studio
 * AudioPlayerBar in components/studio/production-mixshows.tsx, but completely
 * separate from the global stream audio-provider.
 *
 * `onTrackStart` fires once per track the moment playback actually begins —
 * the archive uses it to record a row in `content_plays` (fire-and-forget).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Disc3,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

export interface ArchiveTrack {
  /** dj_drops.id — used for play tracking and now-playing highlighting. */
  dropId: string;
  /** Public storage URL, directly playable. */
  url: string;
  /** Primary label, e.g. "DJ Chuck T — Mon Jan 19". */
  title: string;
  /** Small mono subtitle, e.g. "DJB_76057.mp3". */
  fileLabel: string;
  djName: string;
  /** Slug for the /djs/<slug> profile link, when the DJ is known. */
  djSlug: string | null;
  durationSeconds: number | null;
}

function fmtClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ArchivePlayerBar({
  queue,
  index,
  onIndexChange,
  onClose,
  onTrackStart,
}: {
  queue: ArchiveTrack[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Called once per track when playback actually starts (play-count wiring). */
  onTrackStart: (track: ArchiveTrack) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [srcError, setSrcError] = useState<string | null>(null);
  // Guards against a slow play() promise landing after the user skipped on.
  const loadToken = useRef(0);

  const track = queue[index] as ArchiveTrack | undefined;

  // Load + autoplay the active track whenever it changes. All setState happens
  // inside the queued microtask / promise callbacks, never synchronously in the
  // effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!track) return;
    const token = ++loadToken.current;
    queueMicrotask(() => {
      if (token !== loadToken.current) return;
      const el = audioRef.current;
      if (!el) return;
      setSrcError(null);
      setCurrent(0);
      setDuration(0);
      el.src = track.url;
      el.play()
        .then(() => {
          if (token !== loadToken.current) return;
          setPlaying(true);
          onTrackStart(track);
        })
        .catch(() => {
          if (token === loadToken.current) setPlaying(false);
        });
    });
  }, [track, onTrackStart]);

  const hasPrev = index > 0;
  const hasNext = index < queue.length - 1;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(value)) return;
    el.currentTime = value;
    setCurrent(value);
  };

  if (!track) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          if (hasNext) onIndexChange(index + 1);
          else setPlaying(false);
        }}
        onError={() => {
          setSrcError("Could not load this mix.");
          setPlaying(false);
        }}
      />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4">
        {/* Now playing */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10">
            <Disc3 className={`h-5 w-5 text-[#74ddc7] ${playing ? "animate-[spin_3s_linear_infinite]" : ""}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{track.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {srcError ? (
                <span className="text-red-400">{srcError}</span>
              ) : (
                <>
                  <span className="font-mono">{track.fileLabel}</span>
                  {queue.length > 1 && <> · {index + 1} of {queue.length}</>}
                  {track.djSlug && (
                    <>
                      {" · "}
                      <Link href={`/djs/${track.djSlug}`} className="font-bold text-[#74ddc7] hover:underline">
                        {track.djName}
                      </Link>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Transport */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => hasPrev && onIndexChange(index - 1)}
            disabled={!hasPrev}
            aria-label="Previous mix"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            disabled={!!srcError}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] transition-colors hover:bg-[#74ddc7]/90 disabled:opacity-50"
          >
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <button
            onClick={() => hasNext && onIndexChange(index + 1)}
            disabled={!hasNext}
            aria-label="Next mix"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Seek */}
        <div className="hidden flex-1 items-center gap-2 sm:flex">
          <span className="w-12 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{fmtClock(current)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(current, duration || 0)}
            step={0.1}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-foreground/[0.12] accent-[#74ddc7]"
          />
          <span className="w-12 font-mono text-[11px] tabular-nums text-muted-foreground">{fmtClock(duration)}</span>
        </div>

        {/* Mute + close */}
        <button
          onClick={() => {
            const el = audioRef.current;
            if (el) {
              el.muted = !muted;
              setMuted(!muted);
            }
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground sm:flex"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onClose}
          aria-label="Close player"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
