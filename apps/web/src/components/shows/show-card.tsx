"use client";

import { AppImage } from "@/components/ui/app-image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  Clock,
  Info,
  Megaphone,
  Play,
  Radio,
} from "lucide-react";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

// ---------------------------------------------------------------------------
// Stream channel logo & name mapping
// ---------------------------------------------------------------------------

const STREAM_INFO: Record<string, { name: string; logo: string }> = {
  stream_wccg: { name: "WCCG 104.5 FM", logo: "/images/logos/wccg-logo.png" },
  stream_soul: { name: "Soul 104.5", logo: "/images/logos/soul-1045-logo.png" },
  stream_hot: { name: "Hot 104.5", logo: "/images/logos/hot-1045-logo.png" },
  stream_vibe: { name: "The Vibe", logo: "/images/logos/the-vibe-logo.png" },
  stream_yard: {
    name: "Yard Riddim",
    logo: "/images/logos/yard-riddim-logo.png",
  },
  stream_mixsquad: {
    name: "MixxSquadd Radio",
    logo: "/images/logos/mix-squad-logo.png",
  },
};

// ---------------------------------------------------------------------------
// Day part badge styles
// ---------------------------------------------------------------------------

function dayPartStyle(dayPart?: string): { bg: string; text: string } {
  if (!dayPart)
    return { bg: "bg-foreground/[0.06]", text: "text-muted-foreground" };
  const d = dayPart.toLowerCase();
  if (d.includes("morning"))
    return { bg: "bg-amber-500/15", text: "text-amber-400" };
  if (d.includes("midday"))
    return { bg: "bg-[#74ddc7]/15", text: "text-[#74ddc7]" };
  if (d.includes("afternoon"))
    return { bg: "bg-orange-500/15", text: "text-orange-400" };
  if (d.includes("evening"))
    return { bg: "bg-[#7401df]/15", text: "text-[#7401df]" };
  if (d.includes("overnight"))
    return { bg: "bg-blue-500/15", text: "text-blue-400" };
  if (d.includes("gospel"))
    return { bg: "bg-yellow-500/15", text: "text-yellow-400" };
  if (d.includes("mix"))
    return { bg: "bg-pink-500/15", text: "text-pink-400" };
  if (d.includes("weekend"))
    return { bg: "bg-indigo-500/15", text: "text-indigo-400" };
  return { bg: "bg-foreground/[0.06]", text: "text-muted-foreground" };
}

// ---------------------------------------------------------------------------
// ON AIR detection — checks if a show is currently live based on EST time
// ---------------------------------------------------------------------------

function isShowOnAir(timeSlot?: string, days?: string): boolean {
  if (!timeSlot || !days) return false;
  if (timeSlot === "24/7") return true;
  if (timeSlot === "Hourly" || timeSlot === "On Demand") return false;

  const now = new Date();
  // Get current EST time
  const estStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const est = new Date(estStr);
  const currentDay = est.getDay(); // 0=Sun, 1=Mon, ...
  const currentHour = est.getHours();
  const currentMin = est.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;

  // Check day match
  const dayLower = days.toLowerCase();
  const dayMap: Record<number, string[]> = {
    0: ["sunday", "every day"],
    1: ["monday", "monday - friday", "every day"],
    2: ["tuesday", "monday - friday", "every day"],
    3: ["wednesday", "monday - friday", "every day"],
    4: ["thursday", "monday - friday", "every day"],
    5: ["friday", "monday - friday", "every day"],
    6: ["saturday", "every day"],
  };
  const validDays = dayMap[currentDay] || [];
  if (!validDays.some((d) => dayLower.includes(d))) return false;

  // Parse time slot
  const parseTime = (t: string): number => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return -1;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  const parts = timeSlot.split(" - ");
  if (parts.length !== 2) return false;
  const start = parseTime(parts[0]);
  let end = parseTime(parts[1]);
  if (start < 0 || end < 0) {
    // Handle "Midnight"
    if (parts[1].trim().toLowerCase() === "midnight") {
      return currentMinutes >= start;
    }
    if (parts[0].trim().toLowerCase() === "midnight") {
      return currentMinutes < end;
    }
    return false;
  }

  // Handle overnight shows (e.g. 7 PM - Midnight, Midnight - 6 AM)
  if (end <= start) {
    return currentMinutes >= start || currentMinutes < end;
  }
  return currentMinutes >= start && currentMinutes < end;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HostAvatar {
  name: string;
  avatarUrl?: string;
}

interface ShowCardProps {
  showId: string;
  title: string;
  description?: string;
  hostName?: string;
  timeSlot?: string;
  days?: string;
  dayPart?: string;
  imageUrl?: string;
  genre?: string;
  hosts?: HostAvatar[];
  category?: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
  streamId?: string;
  isSyndicated?: boolean;
  youtubeUrl?: string;
  podcastRss?: string;
}

// ---------------------------------------------------------------------------
// Wide Tile Show Card
// ---------------------------------------------------------------------------

export function ShowCard({
  showId,
  title,
  description,
  hostName,
  timeSlot,
  days,
  dayPart,
  genre,
  hosts,
  imageUrl,
  category,
  streamId,
  isSyndicated,
  youtubeUrl,
  podcastRss,
}: ShowCardProps) {
  const { open } = useStreamPlayer();
  const primaryHost = hosts?.find((h) => h.avatarUrl) ?? hosts?.[0];
  const avatarUrl = primaryHost?.avatarUrl ?? imageUrl;
  const dpStyle = dayPartStyle(dayPart);
  const stream = streamId ? STREAM_INFO[streamId] : null;
  const onAir = isShowOnAir(timeSlot, days);

  // Host avatars — show up to 3 unique hosts with images
  const hostAvatars = hosts?.filter((h) => h.avatarUrl).slice(0, 3) ?? [];

  // Format schedule line
  const scheduleLine = (() => {
    if (!timeSlot && !days) return null;
    const dayLabel =
      days === "Monday - Friday"
        ? "Weekdays"
        : days === "Every Day"
          ? "Daily"
          : (days ?? "");
    const timePart = timeSlot ? timeSlot.replace(" - ", " \u2013 ") : "";
    if (dayLabel && timePart) return `${dayLabel}: ${timePart}, EST`;
    return timePart || dayLabel;
  })();

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    open();
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:bg-card hover:border-input hover:shadow-lg hover:shadow-primary/5 shadow-sm dark:shadow-none ${onAir ? "border-primary/40 bg-card/80" : "border-border bg-card/60"}`}>
      {/* ON AIR pulse indicator */}
      {onAir && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 shadow-lg shadow-red-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">On Air</span>
        </div>
      )}

      {/* Favorite button */}
      <div
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.preventDefault()}
      >
        <FavoriteButton itemType="show" itemId={showId} />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch">
        {/* ── Left: Show Image ────────────────────────────────────── */}
        <Link
          href={`/shows/${showId}`}
          className="relative flex-shrink-0 w-full sm:w-44 md:w-52 h-48 sm:h-auto overflow-hidden bg-muted"
        >
          {avatarUrl ? (
            <AppImage
              src={avatarUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 208px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20">
              <Radio className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {/* Gradient overlay on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:hidden" />
          {/* Program Info ribbon */}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-3 py-1.5 flex items-center justify-center gap-1.5">
            <Info className="h-3 w-3 text-white/70" />
            <span className="text-[11px] font-semibold text-white/90 uppercase tracking-wider">Program Info</span>
          </div>
        </Link>

        {/* ── Center: Details ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 space-y-2.5">
          {/* Title + host avatars row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <Link href={`/shows/${showId}`}>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-wide">
                  {title}
                </h3>
              </Link>
            </div>
            {/* Host avatar stack */}
            {hostAvatars.length > 0 && (
              <div className="flex -space-x-2 flex-shrink-0">
                {hostAvatars.map((host, i) => (
                  <div
                    key={host.name}
                    className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-card ring-1 ring-border"
                    style={{ zIndex: hostAvatars.length - i }}
                    title={host.name}
                  >
                    <AppImage
                      src={host.avatarUrl!}
                      alt={host.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Host name */}
          {hostName && (
            <p className="text-sm text-primary/70 font-medium">{hostName}</p>
          )}

          {/* Schedule line */}
          {scheduleLine && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
              <span className="font-medium">{scheduleLine}</span>
            </div>
          )}

          {/* Description / tagline */}
          {description && (
            <p className="text-sm text-muted-foreground/80 line-clamp-1 leading-relaxed italic">
              {description}
            </p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {dayPart && (
              <Badge
                variant="outline"
                className={`${dpStyle.bg} ${dpStyle.text} border-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5`}
              >
                {dayPart}
              </Badge>
            )}
            {genre && (
              <Badge variant="secondary" className="text-[10px]">
                {genre}
              </Badge>
            )}
            {isSyndicated && (
              <Badge
                variant="outline"
                className="bg-purple-500/10 text-purple-400 border-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
              >
                Syndicated
              </Badge>
            )}
            {/* Stream channel badge — always visible */}
            {stream && (
              <Link href={`/shows?stream=${streamId}`} className="inline-flex">
                <Badge
                  variant="outline"
                  className="bg-foreground/[0.04] text-muted-foreground border-border/50 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 gap-1.5 hover:bg-foreground/[0.08] transition-colors"
                >
                  <div className="relative h-3.5 w-3.5 rounded overflow-hidden">
                    <AppImage
                      src={stream.logo}
                      alt={stream.name}
                      fill
                      className="object-cover"
                      sizes="14px"
                    />
                  </div>
                  {stream.name}
                </Badge>
              </Link>
            )}
          </div>

          {/* Action links row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1.5 sm:gap-4 pt-1">
            <Link
              href={`/advertise?show=${showId}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-primary transition-colors"
            >
              <Megaphone className="h-3 w-3" />
              <span className="underline underline-offset-2 uppercase tracking-wider font-semibold text-[11px]">
                Advertise on This Show
              </span>
            </Link>
          </div>
        </div>

        {/* ── Right: Square Thumbnail ─────────────────────────────── */}
        <div className="flex items-center justify-center border-t sm:border-t-0 sm:border-l border-border bg-foreground/[0.02] px-3 py-3 sm:px-4 sm:py-4">
          {youtubeUrl ? (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square w-36 sm:w-32 md:w-40 rounded-xl overflow-hidden bg-muted group/thumb"
            >
              {avatarUrl && (
                <AppImage
                  src={avatarUrl}
                  alt={`${title} latest`}
                  fill
                  className="object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity"
                  sizes="160px"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover/thumb:bg-black/20 transition-colors rounded-xl">
                <Play className="h-8 w-8 text-white drop-shadow-md" />
                <span className="mt-1 text-[10px] font-semibold text-white uppercase tracking-wider drop-shadow-md">
                  Latest Episode
                </span>
              </div>
            </a>
          ) : (
            <button
              onClick={handlePlay}
              className="relative aspect-square w-36 sm:w-32 md:w-40 rounded-xl overflow-hidden bg-muted group/thumb"
              aria-label="Listen Live"
            >
              {avatarUrl ? (
                <AppImage
                  src={avatarUrl}
                  alt={title}
                  fill
                  className="object-cover opacity-60 group-hover/thumb:opacity-80 transition-opacity"
                  sizes="160px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover/thumb:bg-black/20 transition-colors rounded-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
                <span className="mt-2 text-[10px] font-semibold text-white uppercase tracking-wider drop-shadow-md">
                  Listen Live
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
