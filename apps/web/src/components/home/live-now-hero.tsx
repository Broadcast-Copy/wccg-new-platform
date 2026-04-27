"use client";

/**
 * LiveNowHero — Audio-first home hero.
 *
 * Phase A1. Replaces the old text-led hero. Optimized for one metric: the
 * percentage of home-page visitors who actually press play.
 *
 * Design rules:
 *  - The track playing right now is visible BEFORE the user presses play.
 *    That's the single biggest psychological pull to start listening.
 *  - The play button is enormous and unambiguous.
 *  - The reward loop ("+1 WP / 90s") is visible the moment audio starts —
 *    no hidden gamification.
 *  - Listener count is a real social-proof signal when we have it; falls
 *    back to a soft "Live worldwide" until restream metrics ship in Phase D.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, Sparkles } from "lucide-react";
import { AppImage as Image } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";
import { useNowPlaying } from "@/hooks/use-now-playing";
import {
  getListeningPoints,
  getListeningProgress,
  usePointsSync,
} from "@/hooks/use-listening-points";
import { resolveNowPlaying, getUpNext } from "@/data/schedule";
import { track } from "@/lib/analytics";

const POINTS_INTERVAL_SECONDS = 90;

export function LiveNowHero() {
  const { isPlaying, isBuffering, currentStream } = useAudioPlayer();
  const { toggle } = useStreamPlayer();

  // Always poll now-playing — even before the user presses play. This is the
  // critical change vs. the old hero: the track on air is the first thing
  // the visitor sees, not a marketing tagline.
  const { data: nowPlaying } = useNowPlaying(true);

  // Live points + progress, refreshed by a 1s tick and by cross-tab sync.
  const [points, setPoints] = useState(0);
  const [progress, setProgress] = useState(0);
  const [secondsToNextPoint, setSecondsToNextPoint] = useState(POINTS_INTERVAL_SECONDS);

  usePointsSync(() => setPoints(getListeningPoints()));

  useEffect(() => {
    setPoints(getListeningPoints());
    setProgress(getListeningProgress());

    const tick = () => {
      const next = getListeningPoints();
      setPoints(next);
      const p = getListeningProgress();
      setProgress(p);
      // 90s × (1 - p/100) → seconds remaining to next award
      setSecondsToNextPoint(Math.max(0, Math.ceil(POINTS_INTERVAL_SECONDS * (1 - p / 100))));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // On-air show context for the secondary line under the title.
  const onAir = useMemo(() => resolveNowPlaying(), []);
  const upNext = useMemo(() => getUpNext(1)[0], []);

  // Track + artist + art come from the live SecureNet/Cirrus feed; if we have
  // nothing yet, fall back to the show-level metadata so the hero is never empty.
  const trackTitle = nowPlaying?.title || onAir?.showName || "WCCG 104.5 FM";
  const trackArtist = nowPlaying?.artist || onAir?.hostNames || "Fayetteville's Hip Hop Station";
  const albumArt = nowPlaying?.albumArt || "/images/logos/wccg-logo.png";

  // The CTA's three states: idle (cold), buffering (just clicked), playing (engaged).
  const ctaLabel = isPlaying
    ? "Pause"
    : isBuffering
      ? "Connecting…"
      : currentStream
        ? "Resume"
        : "Tap to listen";

  const CtaIcon = isPlaying ? Pause : Play;

  // Analytics: measure visit→play conversion + first-byte latency for the
  // listenership funnel (Phase A9). Attribute taps to the 'hero' source.
  const playClickedAtRef = useRef<number | null>(null);
  const reportedFirstByteRef = useRef(false);
  const reportedMinuteRef = useRef(0);

  const handleToggleWithTracking = () => {
    if (!isPlaying) {
      playClickedAtRef.current = performance.now();
      void track("play_clicked", { source: "hero" });
    }
    toggle();
  };

  useEffect(() => {
    if (isPlaying && !reportedFirstByteRef.current && playClickedAtRef.current) {
      const latency_ms = Math.round(performance.now() - playClickedAtRef.current);
      reportedFirstByteRef.current = true;
      void track("audio_first_byte", { latency_ms });
    }
    if (!isPlaying) {
      reportedFirstByteRef.current = false;
      reportedMinuteRef.current = 0;
    }
  }, [isPlaying]);

  // Beat once per minute for the listenership KPI.
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      reportedMinuteRef.current += 1;
      void track("audio_listen_minute", { minute_in_session: reportedMinuteRef.current });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  return (
    <section
      aria-label="Live now on WCCG 104.5 FM"
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#0b0b0f] via-[#13111a] to-[#1a0e1f] text-white shadow-2xl shadow-black/40"
    >
      {/* Ambient glow that pulses when audio is live */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#dc2626]/30 blur-[120px] transition-opacity duration-700 ${
          isPlaying ? "opacity-100 animate-pulse" : "opacity-50"
        }`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 h-[360px] w-[360px] rounded-full bg-[#7401df]/30 blur-[100px]"
      />

      <div className="relative z-10 grid gap-8 p-6 md:grid-cols-[auto_1fr] md:gap-10 md:p-10 lg:p-12">
        {/* ── ART ─────────────────────────────────────────────────── */}
        <div className="flex justify-center md:block">
          <div
            className={`relative aspect-square w-[260px] overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-transform duration-700 md:w-[300px] lg:w-[340px] ${
              isPlaying ? "scale-100" : "scale-[0.98]"
            }`}
          >
            <Image
              src={albumArt}
              alt={trackTitle}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 260px, (max-width: 1024px) 300px, 340px"
              priority
            />
            {/* Subtle vinyl spin overlay when playing */}
            <div
              aria-hidden
              className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent transition-opacity duration-700 ${
                isPlaying ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center gap-5">
          {/* Live + listener-count badge row */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#dc2626] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-red-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              On Air
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
              {/* TODO(Phase D): replace with real concurrent listener count from restream metrics */}
              Live worldwide · 104.5 FM
            </span>
          </div>

          {/* Track + artist */}
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">
              Now Playing
            </p>
            <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-white drop-shadow md:text-4xl lg:text-5xl">
              {trackTitle}
            </h1>
            <p className="text-base text-white/70 md:text-lg">{trackArtist}</p>
          </div>

          {/* Primary CTA + reward chip */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="lg"
              onClick={handleToggleWithTracking}
              disabled={isBuffering}
              className="group relative h-14 overflow-hidden rounded-full bg-white px-7 text-base font-black text-black shadow-2xl shadow-black/30 transition-all hover:bg-white/90 hover:shadow-red-500/30 disabled:opacity-80"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <CtaIcon className="mr-2 h-5 w-5" fill="currentColor" />
              {ctaLabel}
            </Button>

            {/* Earning chip — clickable, links to /earn explainer */}
            <Link
              href="/earn"
              aria-label="How earning works"
              className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <ProgressRing percent={progress} active={isPlaying} />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white/70">
                  {isPlaying
                    ? `Next point in ${secondsToNextPoint}s`
                    : "+1 WP every 90s"}
                </span>
                <span className="font-bold tabular-nums text-white">
                  {points.toLocaleString()} WP today
                </span>
              </span>
              <Sparkles className="h-4 w-4 text-[#74ddc7]" />
            </Link>
          </div>

          {/* On-air strip — show + host with link */}
          {onAir && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-white/10 pt-4 text-sm">
              <Link
                href={`/shows/${onAir.showId}`}
                className="font-semibold text-white/90 transition-colors hover:text-[#74ddc7]"
              >
                {onAir.showName}
              </Link>
              <span className="text-white/40">with {onAir.hostNames}</span>
              {upNext && (
                <span className="text-xs text-white/40">
                  · Up next: <span className="text-white/60">{upNext.showName}</span> @ {upNext.startTime}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────
function ProgressRing({ percent, active }: { percent: number; active: boolean }) {
  const size = 28;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (percent / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={active ? "#74ddc7" : "rgba(255,255,255,0.4)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 700ms linear" }}
      />
    </svg>
  );
}
