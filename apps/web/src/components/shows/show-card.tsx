"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/ui/app-image";
import Link from "next/link";
import { User, Clock, Calendar, Heart } from "lucide-react";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { FollowButton } from "@/components/social/follow-button";

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
}

/** Map dayPart string → badge style */
function dayPartStyle(dayPart?: string): { bg: string; text: string } {
  if (!dayPart) return { bg: "bg-foreground/[0.06]", text: "text-muted-foreground" };
  const d = dayPart.toLowerCase();
  if (d.includes("morning")) return { bg: "bg-amber-500/15", text: "text-amber-400" };
  if (d.includes("midday")) return { bg: "bg-[#74ddc7]/15", text: "text-[#74ddc7]" };
  if (d.includes("afternoon")) return { bg: "bg-orange-500/15", text: "text-orange-400" };
  if (d.includes("evening")) return { bg: "bg-[#7401df]/15", text: "text-[#7401df]" };
  if (d.includes("overnight")) return { bg: "bg-blue-500/15", text: "text-blue-400" };
  if (d.includes("gospel")) return { bg: "bg-yellow-500/15", text: "text-yellow-400" };
  if (d.includes("mix")) return { bg: "bg-pink-500/15", text: "text-pink-400" };
  return { bg: "bg-foreground/[0.06]", text: "text-muted-foreground" };
}

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
}: ShowCardProps) {
  // Pick the primary host image, or first host with an avatar
  const primaryHost = hosts?.find((h) => h.avatarUrl) ?? hosts?.[0];
  const avatarUrl = primaryHost?.avatarUrl ?? imageUrl;

  const dpStyle = dayPartStyle(dayPart);

  return (
    <Card className="group relative h-full border-border transition-all hover:border-input hover:shadow-lg hover:shadow-white/[0.02]">
      {/* Favorite button — top-right, stops link propagation */}
      <div
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.preventDefault()}
      >
        <FavoriteButton itemType="show" itemId={showId} />
      </div>

      <Link href={`/shows/${showId}`} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Host avatar — rounded square */}
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {avatarUrl ? (
                <AppImage
                  src={avatarUrl}
                  alt={primaryHost?.name ?? title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20">
                  <User className="size-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Title + host */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight line-clamp-2">
                  {title}
                </CardTitle>
              </div>
              {hostName && (
                <p className="mt-0.5 text-sm text-muted-foreground truncate">
                  {hostName}
                </p>
              )}
            </div>
          </div>

          {description && (
            <CardDescription className="mt-2 line-clamp-2 text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Airtime info */}
          {(timeSlot || days) && (
            <div className="space-y-1.5">
              {timeSlot && (
                <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                  <Clock className="h-3 w-3 shrink-0 text-[#74ddc7]" />
                  <span className="font-medium">{timeSlot}</span>
                </div>
              )}
              {days && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0 text-[#7401df]" />
                  <span>{days}</span>
                </div>
              )}
            </div>
          )}

          {/* Daypart + genre badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
          </div>

          {/* Follow button */}
          <div
            className="pt-1"
            onClick={(e) => e.preventDefault()}
          >
            <FollowButton targetType="show" targetId={showId} size="sm" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
