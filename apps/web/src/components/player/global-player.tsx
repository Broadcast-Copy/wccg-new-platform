"use client";

import { useCallback, useEffect, useState } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useMediaSession } from "@/hooks/use-media-session";
import { useListeningPoints, awardSharePoints } from "@/hooks/use-listening-points";
import { resolveNowPlaying } from "@/data/schedule";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
  Radio,
  Music2,
  X,
  Share2,
  Maximize2,
  Minimize2,
  Infinity,
} from "lucide-react";

/** localStorage key for the continuous play preference. */
const CONTINUOUS_PLAY_KEY = "wccg_continuous_play";

type PlayerMode = "mini" | "minimized" | "maximized" | "hidden";

export function GlobalPlayer() {
  const { isPlaying, pause, resume, stop, volume, setVolume, metadata, currentStream, updateMetadata } =
    useAudioPlayer();

  // Poll for now-playing metadata while stream is active
  const { data: nowPlaying } = useNowPlaying(isPlaying);

  // Track listening time for points rewards
  useListeningPoints(isPlaying);

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

  const songTitle = metadata.title || metadata.streamName || "Unknown Track";
  const songArtist = metadata.artist || "WCCG 104.5 FM";

  // ---------------------------------------------------------------------------
  // Maximized mode — full-screen overlay with iframe
  // ---------------------------------------------------------------------------
  if (playerMode === "maximized") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0f]">
        {/* Top bar */}
        <div className="flex h-12 items-center justify-between border-b border-border bg-[#0e0e18] px-4">
          <span className="text-sm font-semibold text-[#74ddc7]">
            WCCG 104.5 FM
          </span>
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
        {/* Iframe content */}
        <iframe
          src="https://securenetsystems.net/v5/WCCG"
          className="w-full flex-1"
          title="WCCG Player"
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
        <div className="container flex h-10 items-center gap-2">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="h-8 w-8 shrink-0 rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 hover:text-[#0a0a0f]"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
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
      <div className="container flex h-16 items-center gap-2 sm:gap-3">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="h-10 w-10 shrink-0 rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 hover:text-[#0a0a0f]"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Program Info (left) | Vertical Divider | Song Info (right) */}
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          {/* Now Playing label + live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
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

          {/* Current show / program on the left side */}
          <div className="hidden sm:flex items-center shrink-0 ml-2 min-w-0 max-w-[160px] lg:max-w-[220px]">
            <Radio className="h-3 w-3 shrink-0 text-muted-foreground/60 mr-1.5" />
            <span className="truncate text-xs font-medium text-muted-foreground">
              {currentShow || "WCCG 104.5 FM"}
            </span>
          </div>

          {/* Vertical divider */}
          <div className="hidden sm:block mx-2.5 h-8 w-px shrink-0 bg-border" />

          {/* Song title + artist on the right side */}
          <div
            className={`flex min-w-0 flex-1 flex-col transition-all duration-500 ${
              titlePop
                ? "translate-x-0 opacity-100"
                : "translate-x-0 opacity-100"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Music2 className={`h-3.5 w-3.5 shrink-0 ${titlePop ? "text-[#74ddc7]" : "text-muted-foreground/50"} transition-colors duration-500`} />
              <span
                className={`truncate font-semibold transition-all duration-500 ${
                  titlePop
                    ? "text-[#74ddc7] text-base"
                    : "text-foreground text-sm"
                }`}
              >
                {songTitle}
              </span>
            </div>
            <span className="truncate text-xs text-muted-foreground ml-5">
              {songArtist}
            </span>
          </div>
        </div>

        {/* Album Art */}
        <div className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#74ddc7]/20 to-[#7401df]/20 border border-border overflow-hidden">
          {metadata.albumArt ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={metadata.albumArt}
              alt="Album art"
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <Radio className="h-5 w-5 text-[#74ddc7]" />
          )}
        </div>

        {/* Live Badge */}
        {isPlaying && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-2.5 py-0.5 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">
              Live
            </span>
          </div>
        )}

        {/* Continuous Play Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleContinuousPlay}
          aria-label={continuousPlay ? "Disable continuous play" : "Enable continuous play"}
          title={continuousPlay ? "Continuous play ON" : "Continuous play OFF"}
          className={`h-8 w-8 shrink-0 rounded-full transition-colors ${
            continuousPlay
              ? "text-[#74ddc7] bg-[#74ddc7]/10 hover:bg-[#74ddc7]/20 hover:text-[#74ddc7]"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
          }`}
        >
          <Infinity className="h-4 w-4" />
        </Button>

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
