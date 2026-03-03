"use client";

import { useEffect } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { Button } from "@/components/ui/button";
import { Pause, Play, Volume2, VolumeX, Radio } from "lucide-react";

export function GlobalPlayer() {
  const { isPlaying, pause, resume, volume, setVolume, metadata, currentStream, updateMetadata } =
    useAudioPlayer();

  // Poll for now-playing metadata while stream is active
  const { data: nowPlaying } = useNowPlaying(isPlaying);

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

  return (
    <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-border bg-[#0e0e18]/95 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-3">
        {/* Album Art / Station Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#74ddc7]/20 to-[#7401df]/20 border border-border">
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

        {/* Track Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">
            {metadata.title || metadata.streamName || "Unknown Track"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {metadata.artist || "WCCG 104.5 FM"}
          </span>
        </div>

        {/* Live Badge */}
        {isPlaying && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-2.5 py-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">
              Live
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="h-10 w-10 rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 hover:text-[#0a0a0f]"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

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
      </div>
    </div>
  );
}
