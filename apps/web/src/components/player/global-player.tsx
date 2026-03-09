"use client";

import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useListeningPoints } from "@/hooks/use-listening-points";
import { Button } from "@/components/ui/button";
import { Pause, Play, Volume2, VolumeX, Radio, Music2, X } from "lucide-react";

export function GlobalPlayer() {
  const { isPlaying, pause, resume, stop, volume, setVolume, metadata, currentStream, updateMetadata } =
    useAudioPlayer();

  // Poll for now-playing metadata while stream is active
  const { data: nowPlaying } = useNowPlaying(isPlaying);

  // Track listening time for points rewards
  useListeningPoints(isPlaying);

  // Track title change animation
  const [titlePop, setTitlePop] = useState(false);
  const [prevTitle, setPrevTitle] = useState("");

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

          {/* Song title + artist — scrolling / pop-out */}
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
