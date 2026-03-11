"use client";

import { useCallback, useEffect, useState } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useMediaSession } from "@/hooks/use-media-session";
import { useListeningPoints, awardSharePoints } from "@/hooks/use-listening-points";
import { resolveNowPlaying } from "@/data/schedule";
import { Button } from "@/components/ui/button";
import { Pause, Play, Volume2, VolumeX, Radio, Music2, X, Share2 } from "lucide-react";

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

  // Don't render if no stream is loaded
  if (!currentStream) {
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

  return (
    <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-border bg-[#0e0e18]/95 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-2 sm:gap-3">
        {/* Play/Pause Button — NOW PLAYING BUTTON */}
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

        {/* Song Title — Pops out to the right of the Now Playing button */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
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
            <span className="text-muted-foreground/30 mx-0.5">|</span>
          </div>

          {/* Show name + Song title + artist */}
          <div
            className={`flex min-w-0 flex-1 flex-col transition-all duration-500 ${
              titlePop
                ? "translate-x-0 opacity-100"
                : "translate-x-0 opacity-100"
            }`}
          >
            {/* Currently airing show/program name */}
            {currentShow && (
              <span className="truncate text-[10px] font-medium text-muted-foreground/70 ml-5 leading-tight">
                {"\u{1F4FB}"} {currentShow}
              </span>
            )}
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

        {/* Close / Stop Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stop}
          aria-label="Close player"
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
