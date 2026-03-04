"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  Disc3,
  Headphones,
  Clock,
} from "lucide-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { cn } from "@/lib/utils";
import type { HostMix } from "@/data/mixes";

// ─── Helpers ─────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPlayCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

// ─── Animated equalizer bars ────────────────────────────────────

function EqualizerBars({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end gap-[2px]", className)}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="inline-block w-[3px] rounded-sm bg-[#74ddc7]"
          style={{
            animation: `eq-bounce 0.${4 + i}s ease-in-out infinite alternate`,
            height: `${8 + i * 3}px`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes eq-bounce {
          0% {
            height: 4px;
          }
          100% {
            height: 14px;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Genre badge colors ─────────────────────────────────────────

const GENRE_COLORS: Record<string, string> = {
  "Hip Hop": "border-[#7401df]/50 bg-[#7401df]/15 text-[#c490ff]",
  "R&B": "border-pink-500/50 bg-pink-500/15 text-pink-300",
  Club: "border-yellow-500/50 bg-yellow-500/15 text-yellow-300",
  "Old School": "border-orange-500/50 bg-orange-500/15 text-orange-300",
  Gospel: "border-amber-400/50 bg-amber-400/15 text-amber-200",
  Afrobeats: "border-green-500/50 bg-green-500/15 text-green-300",
  Reggae: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  Soca: "border-red-500/50 bg-red-500/15 text-red-300",
};

function genreBadgeClass(genre: string): string {
  return GENRE_COLORS[genre] ?? "border-white/20 bg-white/10 text-white/70";
}

// ─── Props ──────────────────────────────────────────────────────

interface DJMixPlayerProps {
  mixes: HostMix[];
  djName: string;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function DJMixPlayer({ mixes, djName, className }: DJMixPlayerProps) {
  const { play, pause, resume, currentStream, isPlaying, volume, setVolume } =
    useAudioPlayer();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const selectedMix = mixes[selectedIndex] ?? null;

  // Determine if the currently playing track is from THIS player
  const isPlayingFromHere =
    isPlaying && selectedMix?.audioUrl && currentStream === selectedMix.audioUrl;

  // Check if any track from this player is currently playing
  const playingMixIndex = mixes.findIndex(
    (m) => m.audioUrl && currentStream === m.audioUrl,
  );

  const handlePlayPause = useCallback(() => {
    if (!selectedMix) return;

    if (!selectedMix.audioUrl) return;

    if (currentStream === selectedMix.audioUrl) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      play(selectedMix.audioUrl, { streamName: djName, title: selectedMix.title });
    }
  }, [selectedMix, currentStream, isPlaying, pause, resume, play, djName]);

  const handleTrackSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      const mix = mixes[index];
      if (mix?.audioUrl) {
        play(mix.audioUrl, { streamName: djName, title: mix.title });
      }
    },
    [mixes, play, djName],
  );

  const handlePrev = useCallback(() => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : mixes.length - 1;
    setSelectedIndex(newIndex);
    const mix = mixes[newIndex];
    if (mix?.audioUrl && isPlayingFromHere) {
      play(mix.audioUrl, { streamName: djName, title: mix.title });
    }
  }, [selectedIndex, mixes, isPlayingFromHere, play, djName]);

  const handleNext = useCallback(() => {
    const newIndex = selectedIndex < mixes.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    const mix = mixes[newIndex];
    if (mix?.audioUrl && isPlayingFromHere) {
      play(mix.audioUrl, { streamName: djName, title: mix.title });
    }
  }, [selectedIndex, mixes, isPlayingFromHere, play, djName]);

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume || 0.8);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, prevVolume, volume, setVolume]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = parseFloat(e.target.value);
      setVolume(newVol);
      setIsMuted(newVol === 0);
    },
    [setVolume],
  );

  // Sync mute state if volume changes externally
  useEffect(() => {
    if (volume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [volume, isMuted]);

  if (mixes.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center",
          className,
        )}
      >
        <Disc3 className="mb-4 h-12 w-12 text-white/20" />
        <p className="text-sm text-white/40">No mixes available yet</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]",
        className,
      )}
    >
      {/* ── Now Playing Area ─────────────────────────────────── */}
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
          {/* Cover art */}
          <div className="relative aspect-square w-full max-w-[200px] flex-shrink-0 overflow-hidden rounded-xl sm:w-[180px]">
            {selectedMix?.coverImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedMix.coverImageUrl}
                alt={selectedMix.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/40 to-[#74ddc7]/20">
                <Music className="h-16 w-16 text-white/30" />
              </div>
            )}
            {isPlayingFromHere && (
              <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <EqualizerBars />
              </div>
            )}
          </div>

          {/* Track info + controls */}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
            {/* Title & artist */}
            <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-[#74ddc7]/70">
              Now Playing
            </p>
            <h3 className="mb-1 line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">
              {selectedMix?.title ?? "No track selected"}
            </h3>
            <p className="mb-1 text-sm font-medium text-white/60">{djName}</p>
            {selectedMix?.genre && (
              <span
                className={cn(
                  "mb-3 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  genreBadgeClass(selectedMix.genre),
                )}
              >
                {selectedMix.genre}
              </span>
            )}

            {/* Mock progress bar */}
            <div className="mb-3 w-full max-w-sm">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] transition-all duration-1000",
                    isPlayingFromHere ? "w-[15%]" : "w-0",
                  )}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-white/40">
                <span>{isPlayingFromHere ? "0:00" : "--:--"}</span>
                <span>
                  {selectedMix ? formatDuration(selectedMix.duration) : "--:--"}
                </span>
              </div>
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Previous track"
              >
                <SkipBack className="h-4 w-4" fill="currentColor" />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={!selectedMix?.audioUrl}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                  selectedMix?.audioUrl
                    ? "bg-[#74ddc7] text-[#0a0a0f] shadow-lg shadow-[#74ddc7]/20 hover:brightness-110 active:scale-95"
                    : "cursor-not-allowed bg-white/10 text-white/30",
                )}
                aria-label={isPlayingFromHere ? "Pause" : "Play"}
              >
                {isPlayingFromHere ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Next track"
              >
                <SkipForward className="h-4 w-4" fill="currentColor" />
              </button>
            </div>

            {/* Volume control */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className="flex h-7 w-7 items-center justify-center rounded text-white/50 transition-colors hover:text-white"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#74ddc7] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#74ddc7]"
                aria-label="Volume"
              />
            </div>

            {/* Preview unavailable notice */}
            {selectedMix && !selectedMix.audioUrl && (
              <p className="mt-2 text-xs text-yellow-400/70">
                Preview unavailable for this mix
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Track List ───────────────────────────────────────── */}
      <div className="p-2 sm:p-3">
        <div className="mb-2 flex items-center gap-2 px-3 py-1">
          <Headphones className="h-3.5 w-3.5 text-white/40" />
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            {mixes.length} {mixes.length === 1 ? "Mix" : "Mixes"}
          </span>
        </div>

        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {mixes.map((mix, index) => {
            const isSelected = index === selectedIndex;
            const isTrackPlaying =
              isPlaying && mix.audioUrl && currentStream === mix.audioUrl;

            return (
              <button
                key={mix.id}
                onClick={() => handleTrackSelect(index)}
                className={cn(
                  "group/track flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                  isSelected
                    ? "bg-[#74ddc7]/10 ring-1 ring-inset ring-[#74ddc7]/20"
                    : "hover:bg-white/[0.04]",
                )}
              >
                {/* Track number / play icon / equalizer */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                  {isTrackPlaying ? (
                    <EqualizerBars />
                  ) : (
                    <>
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums group-hover/track:hidden",
                          isSelected ? "text-[#74ddc7]" : "text-white/30",
                        )}
                      >
                        {index + 1}
                      </span>
                      <Play
                        className={cn(
                          "hidden h-4 w-4 group-hover/track:block",
                          isSelected ? "text-[#74ddc7]" : "text-white/50",
                        )}
                        fill="currentColor"
                      />
                    </>
                  )}
                </div>

                {/* Title + description */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-semibold",
                      isSelected ? "text-[#74ddc7]" : "text-white/90",
                    )}
                  >
                    {mix.title}
                  </p>
                  {mix.description && (
                    <p className="truncate text-[11px] leading-tight text-white/35">
                      {mix.description}
                    </p>
                  )}
                </div>

                {/* Genre badge */}
                <span
                  className={cn(
                    "hidden flex-shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline-block",
                    genreBadgeClass(mix.genre),
                  )}
                >
                  {mix.genre}
                </span>

                {/* Play count */}
                <div className="hidden flex-shrink-0 items-center gap-1 text-[11px] text-white/30 md:flex">
                  <Headphones className="h-3 w-3" />
                  <span>{formatPlayCount(mix.playCount)}</span>
                </div>

                {/* Duration */}
                <div className="flex flex-shrink-0 items-center gap-1 text-[11px] text-white/30">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">
                    {formatDuration(mix.duration)}
                  </span>
                </div>

                {/* No audio indicator */}
                {!mix.audioUrl && (
                  <span className="flex-shrink-0 text-[9px] font-medium uppercase text-yellow-500/50">
                    N/A
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
