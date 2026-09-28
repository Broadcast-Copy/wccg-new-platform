"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { productMediaUrl, type ProductVideoInfo, type ProductVideoName } from "@/lib/product-videos";

/**
 * A product animation: muted, looping, inline — and lazy. Nothing but the
 * poster loads until the video is near the viewport; it plays only while it
 * is on screen. With prefers-reduced-motion it never starts on its own: the
 * poster shows with a play button, and pressing it plays with controls.
 * A pause button is always there (WCAG 2.2.2), captions ride along as a
 * WebVTT track, and the accessible name says what happens in the video.
 * The files come from the storage bucket, another origin: crossOrigin is what
 * lets the browser use that origin's captions track.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const getReduced = () => window.matchMedia(REDUCED).matches;
const getReducedOnServer = () => false;

function pickSource(v: HTMLVideoElement, name: ProductVideoName) {
  const webm = v.canPlayType('video/webm; codecs="vp9"');
  return productMediaUrl(name, webm === "probably" || webm === "maybe" ? "webm" : "mp4");
}

export function ProductVideo({
  video,
  className = "",
  startNow = false,
  rounded = "rounded-xl",
}: {
  video: ProductVideoInfo;
  className?: string;
  /** the viewer asked for it (the tour dialog): load and play at once, motion setting or not */
  startNow?: boolean;
  rounded?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedOnServer);
  const [src, setSrc] = useState<string | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [userPlay, setUserPlay] = useState(startNow);
  const [paused, setPaused] = useState(false);

  // lazy: choose and attach the source only when the video comes near the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setOnScreen(entry.isIntersecting);
        if (entry.isIntersecting) setSrc((s) => s ?? pickSource(el, video.name));
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [video.name]);

  // play while on screen - unless motion is reduced and nobody pressed play, or it was paused
  const wantsPlay = src !== null && !paused && (userPlay || (!reduced && onScreen));
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (wantsPlay) v.play().catch(() => undefined);
    else v.pause();
  }, [wantsPlay, src]);

  const waitingForPress = reduced && !userPlay;

  return (
    <div
      className={`group relative overflow-hidden border border-line bg-surface ${rounded} ${className}`}
      style={{ aspectRatio: `${video.width} / ${video.height}` }}
    >
      <video
        ref={ref}
        src={src ?? undefined}
        poster={productMediaUrl(video.name, "jpg")}
        width={video.width}
        height={video.height}
        muted
        loop
        playsInline
        preload="none"
        crossOrigin="anonymous"
        controls={reduced && userPlay}
        aria-label={video.label}
        className="block h-full w-full object-cover"
      >
        <track kind="captions" src={productMediaUrl(video.name, "vtt")} srcLang="en" label="English" />
      </video>

      {waitingForPress ? (
        <button
          type="button"
          onClick={() => {
            const v = ref.current;
            if (v) setSrc((s) => s ?? pickSource(v, video.name));
            setPaused(false);
            setUserPlay(true);
          }}
          className="absolute inset-0 flex items-center justify-center bg-fg/10 transition hover:bg-fg/20 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-signal-ink"
          aria-label={`Play: ${video.title}`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-signal text-fg shadow-lg">
            <Play className="ml-0.5 h-6 w-6" aria-hidden />
          </span>
        </button>
      ) : reduced ? null : (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="absolute right-1 bottom-1 flex h-11 w-11 items-center justify-center rounded-full opacity-80 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-signal-ink"
          aria-label={paused ? `Play: ${video.title}` : `Pause: ${video.title}`}
        >
          {/* a 44 px tap target around the 32 px visible button */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-elevated/90 text-fg shadow-sm">
            {paused ? <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
          </span>
        </button>
      )}
    </div>
  );
}
