"use client";

import { AppImage } from "@/components/ui/app-image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  Clock,
  Calendar,
  Info,
  Lock,
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
  /** e.g. "6:00 AM - 10:00 AM" */
  timeSlot?: string;
  /** e.g. "Monday - Friday" */
  days?: string;
  /** e.g. "Morning Drive", "Midday", "Gospel" */
  dayPart?: string;
  imageUrl?: string;
  genre?: string;
  hosts?: HostAvatar[];
  /** Show category for daypart badge color */
  category?: "weekday" | "saturday" | "sunday" | "gospel" | "mixsquad";
  /** Stream ID this show airs on */
  streamId?: string;
  /** Whether show is syndicated */
  isSyndicated?: boolean;
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
}: ShowCardProps) {
  const { open } = useStreamPlayer();
  const primaryHost = hosts?.find((h) => h.avatarUrl) ?? hosts?.[0];
  const avatarUrl = primaryHost?.avatarUrl ?? imageUrl;
  const dpStyle = dayPartStyle(dayPart);
  const stream = streamId ? STREAM_INFO[streamId] : null;

  // Format schedule line, e.g. "Weekdays: 6:00 AM – 10:00 AM, EST"
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
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 transition-all duration-300 hover:bg-card hover:border-input hover:shadow-lg hover:shadow-primary/5">
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
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20`}
            >
              <User className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {/* Gradient overlay on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:hidden" />
        </Link>

        {/* ── Center: Details ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 space-y-2.5">
          {/* Title */}
          <Link href={`/shows/${showId}`}>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-wide">
              {title}
            </h3>
          </Link>

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

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
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
          </div>

          {/* Action links row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 pt-1">
            <Link
              href={`/shows/${showId}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-3 w-3" />
              <span className="underline underline-offset-2">Program Info</span>
            </Link>

            <Link
              href={`/rewards`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Lock className="h-3 w-3" />
              <span className="underline underline-offset-2 uppercase tracking-wider font-semibold text-[11px]">
                Unlock Exclusive Content
              </span>
            </Link>

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

        {/* ── Right: Stream Channel + Play ────────────────────────── */}
        <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t sm:border-t-0 sm:border-l border-border bg-foreground/[0.02] sm:min-w-[140px] md:min-w-[160px]">
          {/* Channel badge */}
          {stream && (
            <Link
              href={`/channels/${streamId}`}
              className="flex items-center gap-2 group/channel"
            >
              <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-foreground/[0.06] border border-border">
                <AppImage
                  src={stream.logo}
                  alt={stream.name}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <div className="hidden md:block">
                <p className="text-[11px] font-bold text-foreground/80 group-hover/channel:text-primary transition-colors leading-tight">
                  {stream.name}
                </p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  Stream
                </p>
              </div>
            </Link>
          )}

          {/* Play button */}
          <button
            onClick={handlePlay}
            className="relative group/play"
            aria-label="Listen Live"
          >
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl transition-all bg-foreground/[0.06] text-muted-foreground hover:bg-primary/20 hover:text-primary">
              <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
            </div>
          </button>
          <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Listen
          </span>
        </div>
      </div>
    </div>
  );
}
