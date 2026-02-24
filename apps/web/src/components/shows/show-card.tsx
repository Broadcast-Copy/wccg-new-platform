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
import { User } from "lucide-react";

interface HostAvatar {
  name: string;
  avatarUrl?: string;
}

interface ShowCardProps {
  showId: string;
  title: string;
  description?: string;
  hostName?: string;
  schedule?: string;
  imageUrl?: string;
  genre?: string;
  hosts?: HostAvatar[];
}

export function ShowCard({
  showId,
  title,
  description,
  hostName,
  schedule,
  genre,
  hosts,
}: ShowCardProps) {
  // Pick the primary host image, or first host with an avatar
  const primaryHost = hosts?.find((h) => h.avatarUrl) ?? hosts?.[0];
  const avatarUrl = primaryHost?.avatarUrl;

  return (
    <Link href={`/shows/${showId}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
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

            {/* Title + host + genre */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg leading-tight">{title}</CardTitle>
                {genre && <Badge variant="secondary" className="shrink-0">{genre}</Badge>}
              </div>
              {hostName && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {hostName}
                </p>
              )}
            </div>
          </div>
          {description && (
            <CardDescription className="mt-2 line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {schedule && (
          <CardContent>
            <p className="text-xs text-muted-foreground">{schedule}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
