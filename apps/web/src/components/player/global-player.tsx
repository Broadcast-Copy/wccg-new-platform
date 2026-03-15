"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useMediaSession } from "@/hooks/use-media-session";
import {
  useListeningPoints,
  awardSharePoints,
  getListeningProgress,
  type BonusEvent,
} from "@/hooks/use-listening-points";
import { getListeningStats } from "@/lib/listening-history";
import { checkMilestones } from "@/lib/milestones";
import { resolveNowPlaying } from "@/data/schedule";
import { DUKE_BASKETBALL } from "@/data/sports";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Radio,
  X,
  Share2,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import { ListenerCountBadge } from "@/components/player/listener-count-badge";
import { WeatherStrip } from "@/components/player/weather-strip";
import { MultiplierBanner } from "@/components/player/multiplier-banner";
import { GameRibbon } from "@/components/player/game-ribbon";

/** localStorage key for the continuous play preference. */
const CONTINUOUS_PLAY_KEY = "wccg_continuous_play";

/** SVG circle math for the point countdown ring */
const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type PlayerMode = "mini" | "minimized" | "maximized" | "hidden";

export function GlobalPlayer() {
  const {
    isPlaying,
    pause,
    resume,
    stop,
    volume,
    setVolume,
    metadata,
    currentStream,
    updateMetadata,
    isBuffering,
    connectionError,
  } = useAudioPlayer();

  // Poll for now-playing metadata while stream is active
  const { data: nowPlaying } = useNowPlaying(isPlaying);

  // Track listening time for points rewards — with bonus toast callback
  const handleBonus = useCallback((bonus: BonusEvent) => {
    const icons: Record<string, string> = {
      DAILY_BOUNTY: "\uD83C\uDF81",
      STREAK_1H: "\uD83D\uDD25",
      STREAK_2H: "\u26A1",
    };
    toast.success(bonus.message, {
      duration: 4000,
      icon: icons[bonus.type] || "\u2B50",
    });
  }, []);
  useListeningPoints(isPlaying, handleBonus);

  // Media Session API — shows "Now Playing" on lock screen, notification shade,
  // Bluetooth displays, and OS media controls for engagement even when phone is locked
  useMediaSession({
    metadata,
    isPlaying,
    onPlay: resume,
    onPause: pause,
    onStop: stop,
  });

  // Current show/program name from schedule
  const [currentShow, setCurrentShow] = useState<string | null>(null);

  // Track title change animation
  const [titlePop, setTitlePop] = useState(false);
  const [prevTitle, setPrevTitle] = useState("");

  // Share state feedback
  const [shareToast, setShareToast] = useState(false);

  // Player mode state
  const [playerMode, setPlayerMode] = useState<PlayerMode>("mini");

  // Continuous play toggle
  const [continuousPlay, setContinuousPlay] = useState(false);

  // Point countdown ring
  const [pointProgress, setPointProgress] = useState(0);
  const [showPointPop, setShowPointPop] = useState(false);

  // Load continuous play preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTINUOUS_PLAY_KEY);
      if (stored === "true") {
        setContinuousPlay(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist continuous play preference
  const toggleContinuousPlay = useCallback(() => {
    setContinuousPlay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CONTINUOUS_PLAY_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Resolve currently airing show and refresh every 60s
  useEffect(() => {
    function updateShow() {
      const block = resolveNowPlaying();
      setCurrentShow(block?.showName ?? null);
    }
    updateShow();
    const timer = setInterval(updateShow, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Share handler
  const handleShare = useCallback(async () => {
    const shareData = {
      title: `Listening to WCCG 104.5 FM`,
      text: currentShow
        ? `Tune in to ${currentShow} on WCCG 104.5 FM!`
        : `Tune in to WCCG 104.5 FM!`,
      url: "https://wccg1045fm.com",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text} ${shareData.url}`
        );
      }
      // Award share points
      const awarded = awardSharePoints();
      if (awarded) {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3000);
      }
    } catch {
      // User cancelled share dialog — ignore
    }
  }, [currentShow]);

  // Update metadata when now-playing data changes
  useEffect(() => {
    if (nowPlaying && (nowPlaying.title || nowPlaying.artist)) {
      updateMetadata({
        title: nowPlaying.title || undefined,
        artist: nowPlaying.artist || undefined,
        albumArt: nowPlaying.albumArt || undefined,
      });
    }
  }, [nowPlaying, updateMetadata]);

  // Trigger pop animation when title changes
  useEffect(() => {
    const currentTitle = metadata.title || "";
    if (currentTitle && currentTitle !== prevTitle) {
      setPrevTitle(currentTitle);
      setTitlePop(true);
      const timer = setTimeout(() => setTitlePop(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [metadata.title, prevTitle]);

  // Close handler — stop playback and hide player
  const handleClose = useCallback(() => {
    stop();
    setPlayerMode("hidden");
  }, [stop]);

  // When a stream loads, make sure the player is visible again
  useEffect(() => {
    if (currentStream && playerMode === "hidden") {
      setPlayerMode("mini");
    }
  }, [currentStream, playerMode]);

  // -------------------------------------------------------------------------
  // Point countdown ring — poll progress every 5s while playing
  // Also check milestones every 30s
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) {
      setPointProgress(0);
      return;
    }
    let milestoneCounter = 0;
    const tick = () => {
      const progress = getListeningProgress();
      setPointProgress((prev) => {
        // Detect when progress wraps from high back to low = point was awarded
        if (prev >= 90 && progress < 20) {
          setShowPointPop(true);
          setTimeout(() => setShowPointPop(false), 2000);
        }
        return progress;
      });

      // Check milestones every ~30s (6 ticks)
      milestoneCounter++;
      if (milestoneCounter % 6 === 0) {
        try {
          const stats = getListeningStats();
          const totalMinutes =
            stats.totalHours * 60 + stats.remainingMinutes;
          const newMilestones = checkMilestones({
            totalMinutes,
            totalSessions: stats.totalSessions,
          });
          for (const m of newMilestones) {
            toast.success(`${m.icon} ${m.name} unlocked!`, {
              description: m.description,
              duration: 5000,
            });
          }
        } catch {
          // ignore
        }
      }
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts — Space to play/pause, M to mute
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!currentStream) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (isPlaying) pause();
        else resume();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        if (volume > 0) setVolume(0);
        else setVolume(0.8);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStream, isPlaying, pause, resume, volume, setVolume]);

  // Don't render if no stream is loaded or player is hidden
  if (!currentStream || playerMode === "hidden") {
    return null;
  }

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(0.8);
    }
  };

  // ── Duke game override: replace song info with show name during coverage ──
  const dukeOverride = (() => {
    const game = DUKE_BASKETBALL.nextGame;
    if (!game) return null;
    const now = new Date();
    const tipoff = new Date(game.date);
    const tailgateStart = new Date(tipoff.getTime() - 2 * 60 * 60 * 1000); // 2h before
    const preGameStart = new Date(tipoff.getTime() - 60 * 60 * 1000); // 1h before
    const gameEnd = new Date(tipoff.getTime() + 2.5 * 60 * 60 * 1000);
    const opponent = game.opponent.split(" ").slice(0, -1).join(" ") || game.opponent;

    if (now >= tailgateStart && now < preGameStart) {
      return {
        title: "Duke Tailgate Show",
        artist: "WCCG 104.5 FM — Countdown to Crazy",
        albumArt: DUKE_BASKETBALL.logoUrl,
      };
    }
    if (now >= preGameStart && now < tipoff) {
      return {
        title: "Duke Pregame Tipoff Show",
        artist: "WCCG 104.5 FM — Countdown to Crazy",
        albumArt: DUKE_BASKETBALL.logoUrl,
      };
    }
    if (now >= tipoff && now < gameEnd) {
      return {
        title: `Duke vs ${opponent} LIVE`,
        artist: "WCCG 104.5 FM — Game Coverage",
        albumArt: DUKE_BASKETBALL.logoUrl,
      };
    }
    return null;
  })();

  const songTitle = dukeOverride?.title || metadata.title || metadata.streamName || "Unknown Track";
  const songArtist = dukeOverride?.artist || metadata.artist || "WCCG 104.5 FM";

  // Helper: render the play/pause icon with buffering spinner
  const PlayPauseIcon = ({ size }: { size: "sm" | "md" }) => {
    const cls = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    if (isBuffering) return <Loader2 className={`${cls} animate-spin`} />;
    if (isPlaying) return <Pause className={cls} />;
    return <Play className={`${cls} ${size === "sm" ? "ml-0.5" : "ml-0.5"}`} />;
  };

  // ---------------------------------------------------------------------------
  // Maximized mode — full-screen SecureNet streaming widget
  // ---------------------------------------------------------------------------
  if (playerMode === "maximized") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0f]">
        {/* Multiplier banner */}
        <MultiplierBanner />
        {/* Top bar */}
        <div className="flex h-12 items-center justify-between border-b border-border bg-[#0e0e18] px-4">
          <div className="flex items-center gap-2">
            {isPlaying && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#74ddc7]" />
              </span>
            )}
            <span className="text-sm font-semibold text-[#74ddc7]">
              WCCG 104.5 FM
            </span>
            <ListenerCountBadge isPlaying={isPlaying} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPlayerMode("mini")}
              aria-label="Minimize to mini player"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              aria-label="Close player"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Weather strip — visible during drive times */}
        <WeatherStrip />
        {/* SecureNet streaming widget */}
        <iframe
          src="https://streamdb7web.securenetsystems.net/cirruscontent/WCCG&"
          className="w-full flex-1"
          title="WCCG Streaming Player"
          allow="autoplay"
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Minimized mode — slim bar with play/pause + basic info only
  // ---------------------------------------------------------------------------
  if (playerMode === "minimized") {
    return (
      <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-border bg-[#0e0e18]/95 backdrop-blur-xl">
        <GameRibbon />
        {/* Connection error banner */}
        {connectionError && (
          <div className="flex items-center justify-center bg-red-600/90 px-3 py-0.5">
            <span className="text-[10px] font-medium text-white">{connectionError}</span>
          </div>
        )}
        <div className="container flex h-10 items-center gap-2">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="h-8 w-8 shrink-0 rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 hover:text-[#0a0a0f]"
          >
            <PlayPauseIcon size="sm" />
          </Button>

          {/* Live dot + title */}
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {isPlaying && (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              </span>
            )}
            <span className="truncate text-xs font-medium text-foreground">
              {songTitle}
            </span>
          </div>

          {/* Restore / Maximize / Close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPlayerMode("mini")}
              aria-label="Restore mini player"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              aria-label="Close player"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Mini mode (default) — full controls with vertical divider layout
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-border bg-[#0e0e18]/95 backdrop-blur-xl">
      <GameRibbon />
      {/* Connection error banner */}
      {connectionError && (
        <div className="flex items-center justify-center bg-red-600/90 px-3 py-0.5">
          <span className="text-[10px] font-medium text-white">{connectionError}</span>
        </div>
      )}
      <div className="container flex h-16 items-center gap-2 sm:gap-3">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="h-10 w-10 shrink-0 rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 hover:text-[#0a0a0f]"
        >
          <PlayPauseIcon size="md" />
        </Button>

        {/* Now Playing | Song Info | Program */}
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          {/* Now Playing label */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPlaying && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#74ddc7]" />
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7] whitespace-nowrap">
              Now Playing
            </span>
          </div>

          {/* Vertical divider */}
          <div className="mx-2 sm:mx-2.5 h-8 w-px shrink-0 bg-border" />

          {/* Song title + artist */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Album Art */}
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#74ddc7]/20 to-[#7401df]/20 border border-border overflow-hidden">
              {(dukeOverride?.albumArt || metadata.albumArt) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={dukeOverride?.albumArt || metadata.albumArt}
                  alt="Album art"
                  className="h-9 w-9 rounded-md object-cover"
                />
              ) : (
                <Radio className="h-4 w-4 text-[#74ddc7]" />
              )}
            </div>
            <div
              className={`flex min-w-0 flex-1 flex-col transition-all duration-500`}
            >
              <span
                className={`truncate font-semibold transition-all duration-500 ${
                  titlePop
                    ? "text-[#74ddc7] text-base"
                    : "text-foreground text-sm"
                }`}
              >
                {songTitle}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {songArtist}
              </span>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="mx-2 sm:mx-2.5 h-8 w-px shrink-0 bg-border" />

          {/* Program / show name */}
          <div className="hidden sm:flex items-center shrink-0 min-w-0 max-w-[120px] sm:max-w-[160px] lg:max-w-[220px]">
            <span className="truncate text-xs font-medium text-muted-foreground">
              {dukeOverride ? "Countdown to Crazy" : (currentShow || "WCCG 104.5 FM")}
            </span>
          </div>
        </div>

        {/* Point Countdown Ring — only visible while playing */}
        {isPlaying && (
          <div className="relative flex h-8 w-8 items-center justify-center shrink-0">
            <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
              <circle
                cx="14"
                cy="14"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              <circle
                cx="14"
                cy="14"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#74ddc7] transition-all duration-1000"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={
                  RING_CIRCUMFERENCE * (1 - pointProgress / 100)
                }
                strokeLinecap="round"
              />
            </svg>
            {showPointPop ? (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#74ddc7] animate-in fade-in zoom-in">
                +1
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-muted-foreground">
                {pointProgress < 100 ? `${pointProgress}` : ""}
              </span>
            )}
          </div>
        )}

        {/* Share Button */}
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label="Share"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          {shareToast && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#74ddc7] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0f] animate-in fade-in slide-in-from-bottom-1">
              +2 pts!
            </span>
          )}
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.06]"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          {/* Volume Slider */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="hidden w-20 accent-[#74ddc7] sm:block"
            aria-label="Volume"
          />
        </div>

        {/* Maximize / Close Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPlayerMode("maximized")}
            aria-label="Maximize player"
            title="Maximize"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close player"
            title="Close"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
