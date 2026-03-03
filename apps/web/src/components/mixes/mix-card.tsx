"use client";

import { Headphones, Music, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayer } from "@/hooks/use-audio-player";

interface MixCardProps {
  id: string;
  title: string;
  hostName: string;
  genre?: string;
  duration?: number;
  playCount?: number;
  coverImageUrl?: string;
  audioUrl?: string;
  status?: "PUBLISHED" | "PROCESSING" | "HIDDEN";
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function MixCard({
  title,
  hostName,
  genre,
  duration,
  playCount,
  coverImageUrl,
  audioUrl,
  status = "PUBLISHED",
}: MixCardProps) {
  const { play, pause, currentStream, isPlaying } = useAudioPlayer();

  const isCurrentlyPlaying = isPlaying && currentStream === audioUrl;

  function handlePlayClick() {
    if (!audioUrl) return;

    if (isCurrentlyPlaying) {
      pause();
    } else {
      play(audioUrl, { streamName: hostName, title });
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] transition-all hover:border-[#74ddc7]/30 hover:shadow-lg hover:shadow-[#74ddc7]/5">
      {/* Cover image area */}
      <div className="relative aspect-square overflow-hidden">
        {coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverImageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/20">
            <Music className="h-16 w-16 text-muted-foreground/70" />
          </div>
        )}

        {/* Play button overlay */}
        {audioUrl && (
          <button
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7] shadow-xl transition-all ${
                isCurrentlyPlaying
                  ? "scale-100 opacity-100"
                  : "scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
              }`}
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-6 w-6 text-[#0a0a0f]" fill="#0a0a0f" />
              ) : (
                <Play className="h-6 w-6 translate-x-0.5 text-[#0a0a0f]" fill="#0a0a0f" />
              )}
            </div>
          </button>
        )}

        {/* Status badge (only if not published) */}
        {status !== "PUBLISHED" && (
          <div className="absolute left-3 top-3">
            <Badge
              className={
                status === "PROCESSING"
                  ? "bg-yellow-500/90 text-black hover:bg-yellow-500"
                  : "bg-gray-500/90 text-foreground hover:bg-gray-500"
              }
            >
              {status === "PROCESSING" ? "Processing" : "Hidden"}
            </Badge>
          </div>
        )}

        {/* Duration badge */}
        {duration !== undefined && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="space-y-2 p-4">
        <h3 className="truncate text-base font-bold text-foreground">{title}</h3>

        <p className="truncate text-sm font-medium text-[#74ddc7]">
          {hostName}
        </p>

        <div className="flex items-center justify-between">
          {genre && (
            <Badge
              variant="outline"
              className="border-[#7401df]/40 bg-[#7401df]/10 text-[#7401df] text-xs"
            >
              {genre}
            </Badge>
          )}

          {playCount !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Headphones className="h-3.5 w-3.5" />
              <span>{playCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
