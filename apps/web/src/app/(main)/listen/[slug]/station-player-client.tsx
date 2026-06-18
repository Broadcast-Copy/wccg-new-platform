"use client";

/**
 * /listen/[slug] — a dedicated, shareable player page for a single station.
 *
 * Every station (HOT, The Vibe, Soul, Yard, …) gets one. Pressing play here
 * routes through the SAME global AudioProvider the mini/global player uses, so:
 *   - playback shows up in the persistent mini player (survives navigation), and
 *   - listening points accrue exactly like the main WCCG stream
 *     (useListeningPoints is driven by the global isPlaying, not stream identity).
 *
 * The page also polls this station's own IceCast now-playing so the cover art +
 * title/artist reflect what's on THIS station — even before you press play.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Pause,
  Play,
  Radio,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AppImage as Image } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useNowPlaying } from "@/hooks/use-now-playing";
import {
  awardSharePoints,
  getListeningPoints,
  getListeningProgress,
  usePointsSync,
} from "@/hooks/use-listening-points";
import { STATIONS, stationBySlug } from "@/lib/stations";
import { SITE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";

const POINTS_INTERVAL_SECONDS = 90;

export default function StationPlayerClient() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const station = stationBySlug(slug);

  const {
    play,
    pause,
    resume,
    isPlaying,
    isBuffering,
    currentStream,
    volume,
    setVolume,
  } = useAudioPlayer();

  const isLive = station?.status === "ACTIVE";
  const isThisStation = !!station && currentStream === station.streamUrl;
  const isThisPlaying = isPlaying && isThisStation;

  // This station's own now-playing (polls regardless of what the global player
  // is doing, so the page shows what's on THIS station). Needs IceCast CORS to
  // populate titles; degrades to the station name/logo until then.
  const { data: nowPlaying } = useNowPlaying(!!isLive, station?.streamUrl);

  // Live points + progress (same source as the home hero), refreshed each second.
  const [points, setPoints] = useState(0);
  const [progress, setProgress] = useState(0);
  usePointsSync(() => setPoints(getListeningPoints()));
  useEffect(() => {
    const tick = () => {
      setPoints(getListeningPoints());
      setProgress(getListeningProgress());
    };
    queueMicrotask(tick);
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsToNextPoint = Math.max(
    0,
    Math.ceil(POINTS_INTERVAL_SECONDS * (1 - progress / 100)),
  );

  // Analytics — measure play conversions per station page.
  const playClickedAtRef = useRef<number | null>(null);
  const reportedFirstByteRef = useRef(false);
  useEffect(() => {
    if (isThisPlaying && !reportedFirstByteRef.current && playClickedAtRef.current) {
      reportedFirstByteRef.current = true;
      void track("audio_first_byte", {
        latency_ms: Math.round(performance.now() - playClickedAtRef.current),
        source: "station_page",
      });
    }
    if (!isThisPlaying) reportedFirstByteRef.current = false;
  }, [isThisPlaying]);

  const handleToggle = () => {
    if (!station || !isLive) return;
    if (isThisPlaying) {
      pause();
      return;
    }
    if (isThisStation) {
      resume();
      return;
    }
    playClickedAtRef.current = performance.now();
    void track("play_clicked", { source: "station_page", station: station.slug });
    play(station.streamUrl, {
      streamName: station.name,
      albumArt: station.logo,
    });
  };

  const handleShare = async () => {
    if (!station) return;
    const shareData = {
      title: `Listening to ${station.name}`,
      text: `Tune in to ${station.name} on WCCG 104.5 FM!`,
      url: `${SITE_URL}/listen/${station.slug}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success("Link copied to clipboard");
      }
      if (awardSharePoints()) {
        toast.success("Thanks for sharing! +2 WP", { icon: "📣" });
      }
    } catch {
      // user cancelled — ignore
    }
  };

  const otherStations = useMemo(
    () => STATIONS.filter((s) => s.slug !== station?.slug),
    [station?.slug],
  );

  // ── Station not found (defensive — slugs are build-time enumerated) ──────
  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Radio className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-bold">Station not found</h1>
        <p className="text-sm text-muted-foreground">
          That station isn&apos;t one of ours.
        </p>
        <Link
          href="/channels"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#74ddc7] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All stations
        </Link>
      </div>
    );
  }

  const trackTitle = nowPlaying?.title || station.name;
  const trackArtist = nowPlaying?.artist || station.description;
  const albumArt = nowPlaying?.albumArt || station.logo;

  const ctaLabel = isThisPlaying
    ? "Pause"
    : isBuffering && isThisStation
      ? "Connecting…"
      : isThisStation
        ? "Resume"
        : "Tap to listen";
  const CtaIcon = isThisPlaying ? Pause : Play;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Link href="/channels" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          All stations
        </Link>
      </div>

      {/* ── Station hero / player ──────────────────────────────────────── */}
      <section
        aria-label={`Player for ${station.name}`}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#0b0b0f] via-[#13111a] to-[#1a0e1f] text-white shadow-2xl shadow-black/40"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#dc2626]/30 blur-[120px] transition-opacity duration-700 ${
            isThisPlaying ? "opacity-100 animate-pulse" : "opacity-50"
          }`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 h-[360px] w-[360px] rounded-full bg-[#7401df]/30 blur-[100px]"
        />

        <div className="relative z-10 grid gap-8 p-6 md:grid-cols-[auto_1fr] md:gap-10 md:p-10 lg:p-12">
          {/* Art */}
          <div className="flex justify-center md:block">
            <div
              className={`relative aspect-square w-[260px] overflow-hidden rounded-2xl bg-black/40 shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-transform duration-700 md:w-[300px] lg:w-[340px] ${
                isThisPlaying ? "scale-100" : "scale-[0.98]"
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
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center gap-5">
            {/* Status badge + station name */}
            <div className="flex flex-wrap items-center gap-3">
              {isLive ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dc2626] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-red-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  On Air
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
                  Coming Soon
                </span>
              )}
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                {station.name}
              </span>
            </div>

            {/* Now playing */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">
                {isLive ? "Now Playing" : "Launching soon"}
              </p>
              <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-white drop-shadow md:text-4xl lg:text-5xl">
                {trackTitle}
              </h1>
              <p className="text-base text-white/70 md:text-lg">{trackArtist}</p>
            </div>

            {/* CTA + earning chip */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={handleToggle}
                disabled={!isLive || (isBuffering && isThisStation)}
                className="group relative h-14 overflow-hidden rounded-full bg-white px-7 text-base font-black text-black shadow-2xl shadow-black/30 transition-all hover:bg-white/90 hover:shadow-red-500/30 disabled:opacity-60"
              >
                {isBuffering && isThisStation ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CtaIcon className="mr-2 h-5 w-5" fill="currentColor" />
                )}
                {isLive ? ctaLabel : "Coming Soon"}
              </Button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-14 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>

              {/* Earning chip — links to rewards */}
              <Link
                href="/rewards"
                aria-label="How earning works"
                className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <ProgressRing percent={progress} active={isThisPlaying} />
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white/70">
                    {isThisPlaying ? `Next point in ${secondsToNextPoint}s` : "+1 WP every 90s"}
                  </span>
                  <span className="font-bold tabular-nums text-white">
                    {points.toLocaleString()} WP today
                  </span>
                </span>
                <Sparkles className="h-4 w-4 text-[#74ddc7]" />
              </Link>
            </div>

            {/* Volume — controls the same global audio element as the mini player */}
            {isLive && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                  aria-label={volume > 0 ? "Mute" : "Unmute"}
                  className="text-white/60 transition-colors hover:text-white"
                >
                  {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="h-1.5 w-40 max-w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#74ddc7]"
                />
              </div>
            )}

            <p className="text-xs text-white/40">
              Plays in your mini player and earns Watt Points — just like the main stream.
            </p>
          </div>
        </div>
      </section>

      {/* ── More stations ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          More stations
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {otherStations.map((s) => (
            <Link
              key={s.id}
              href={`/listen/${s.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:border-[#74ddc7]/50 hover:shadow-md"
            >
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-foreground/[0.03] ring-1 ring-border">
                <Image src={s.logo} alt={s.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground group-hover:text-[#74ddc7]">
                  {s.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.status === "ACTIVE" ? s.description : "Coming Soon"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Progress ring (mirrors LiveNowHero) ───────────────────────────────────
function ProgressRing({ percent, active }: { percent: number; active: boolean }) {
  const size = 28;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (percent / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
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
