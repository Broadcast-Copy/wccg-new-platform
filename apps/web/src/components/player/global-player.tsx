"use client";

import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

export function GlobalPlayer() {
  const { isPlaying, pause, resume, volume, setVolume, metadata, currentStream } =
    useAudioPlayer();

  // Don't render if no stream has been loaded yet
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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center gap-4">
        {/* Album Art */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          {metadata.albumArt ? (
            <img
              src={metadata.albumArt}
              alt="Album art"
              className="h-10 w-10 rounded-md object-cover"
            />
          ) : (
            <Volume2 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {metadata.title || metadata.streamName || "Unknown Track"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {metadata.artist || "WCCG 104.5 FM"}
          </span>
        </div>

        {/* Live Badge */}
        {isPlaying && (
          <Badge variant="destructive" className="shrink-0 animate-pulse">
            LIVE
          </Badge>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
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
            className="hidden w-24 accent-primary sm:block"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
