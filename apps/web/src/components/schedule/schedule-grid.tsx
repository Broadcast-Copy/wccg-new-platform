"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/ui/app-image";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import { Play, Pause, Clock, Mic2, Radio } from "lucide-react";
import {
  WEEKDAY_SHOWS,
  SATURDAY_SHOWS,
  SUNDAY_SHOWS,
  GOSPEL_SHOWS,
  type ShowData,
} from "@/data/shows";

// ---------------------------------------------------------------------------
// Day tabs
// ---------------------------------------------------------------------------

const DAY_TABS = [
  { key: "weekday", label: "Mon - Fri", shows: WEEKDAY_SHOWS },
  { key: "saturday", label: "Saturday", shows: SATURDAY_SHOWS },
  {
    key: "sunday",
    label: "Sunday",
    shows: [...GOSPEL_SHOWS, ...SUNDAY_SHOWS],
  },
] as const;

// Main stream URL
const MAIN_STREAM_URL = "https://ice66.securenetsystems.net/WCCG";

// ---------------------------------------------------------------------------
// Show Tile
// ---------------------------------------------------------------------------

function ShowTile({ show }: { show: ShowData }) {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const isThisPlaying = isPlaying && currentStream === MAIN_STREAM_URL;
  const heroImage = show.showImageUrl || show.imageUrl;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isThisPlaying) {
      pause();
    } else {
      play(MAIN_STREAM_URL, {
        streamName: show.name,
        artist: show.hostNames,
        albumArt: heroImage ?? undefined,
      });
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white/[0.03] transition-all duration-300 hover:bg-white/[0.05] ${
        isThisPlaying
          ? "border-[#74ddc7]/30 shadow-lg shadow-[#74ddc7]/5"
          : "border-white/[0.08] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-stretch">
        {/* Left: Show Info */}
        <div className="flex flex-1 items-center gap-4 sm:gap-5 p-4 sm:p-6">
          {/* Show Image */}
          <Link
            href={`/shows/${show.slug}`}
            className="relative flex-shrink-0 h-16 w-16 sm:h-[88px] sm:w-[88px] rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
          >
            {heroImage ? (
              <Image
                src={heroImage}
                alt={show.name}
                fill
                className="object-cover"
                sizes="88px"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${show.gradient}`}
              >
                <Mic2 className="h-7 w-7 sm:h-8 sm:w-8 text-white/60" />
              </div>
            )}
          </Link>

          {/* Show Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <Link href={`/shows/${show.slug}`}>
              <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-[#74ddc7] transition-colors">
                {show.name}
              </h3>
            </Link>

            {/* Host */}
            <p className="text-xs sm:text-sm text-[#74ddc7]/70 font-medium truncate">
              {show.hostNames}
            </p>

            {/* Time + Days */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/40">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>
                {show.timeSlot} &middot; {show.days}
              </span>
            </div>

            {/* Tagline */}
            {show.tagline && (
              <p className="text-xs text-white/30 line-clamp-1 hidden sm:block">
                {show.tagline}
              </p>
            )}

            {/* Links */}
            <div className="flex items-center gap-4 pt-0.5">
              <Link
                href={`/shows/${show.slug}`}
                className="text-[11px] sm:text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
              >
                Show Details
              </Link>
              {show.isSyndicated && (
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-purple-400/60">
                  Syndicated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Play */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 sm:px-8 py-4 border-l border-white/[0.06] bg-white/[0.02] min-w-[100px] sm:min-w-[140px]">
          <button
            onClick={handleTogglePlay}
            className="relative group/play"
            aria-label={isThisPlaying ? "Pause" : "Play"}
          >
            <div
              className={`flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-xl transition-all ${
                isThisPlaying
                  ? "bg-[#74ddc7] text-[#0a0a0f]"
                  : "bg-white/[0.06] text-white/50 hover:bg-[#74ddc7]/20 hover:text-[#74ddc7]"
              }`}
            >
              {isThisPlaying ? (
                <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
              ) : (
                <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5" />
              )}
            </div>
            {isThisPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#74ddc7]" />
              </span>
            )}
          </button>
          <span className="text-[10px] sm:text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            {isThisPlaying ? "Playing" : "Listen"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule Grid
// ---------------------------------------------------------------------------

export function ScheduleGrid() {
  const todayDay = new Date().getDay();
  const defaultTab =
    todayDay === 0 ? "sunday" : todayDay === 6 ? "saturday" : "weekday";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const currentTab = DAY_TABS.find((t) => t.key === activeTab) ?? DAY_TABS[0];

  return (
    <div className="space-y-6">
      {/* Station Header */}
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white/[0.06]">
          <Image
            src="/images/logos/wccg-logo.png"
            alt="WCCG 104.5 FM"
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-white">WCCG 104.5 FM</p>
          <p className="text-xs text-white/40">
            Fayetteville&apos;s Home for Hip Hop and R&B
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-[#74ddc7]/60" />
          <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
            Program Guide
          </span>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2">
        {DAY_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#74ddc7] text-[#0a0a0f] shadow-md shadow-[#74ddc7]/20"
                  : "bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/80"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${isActive ? "text-[#0a0a0f]/60" : "text-white/30"}`}
              >
                {tab.shows.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Show Tiles — stacked vertically */}
      <div className="flex flex-col gap-4">
        {currentTab.shows.map((show) => (
          <ShowTile key={show.id} show={show} />
        ))}
      </div>

      {currentTab.shows.length === 0 && (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
          <Mic2 className="h-8 w-8 text-white/20 mb-3" />
          <p className="text-sm font-medium text-white/40">
            No shows scheduled for this day.
          </p>
        </div>
      )}
    </div>
  );
}
