"use client";

import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Pause, Play } from "lucide-react";

interface ChannelCardProps {
  streamId: string;
  name: string;
  description?: string;
  streamUrl?: string;
  category?: string;
  isLive?: boolean;
  albumArt?: string;
  currentTrack?: string;
  currentArtist?: string;
}

export function ChannelCard({
  streamId,
  name,
  description,
  streamUrl,
  category,
  isLive = false,
  albumArt,
  currentTrack,
  currentArtist,
}: ChannelCardProps) {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();

  const isThisStreamPlaying = isPlaying && currentStream === streamUrl;

  const handleTogglePlay = () => {
    if (isThisStreamPlaying) {
      pause();
    } else if (streamUrl) {
      play(streamUrl, {
        title: currentTrack,
        artist: currentArtist,
        streamName: name,
        albumArt,
      });
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton itemType="stream" itemId={streamId} />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between pr-8">
          <div className="space-y-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            {description && (
              <CardDescription className="line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
          {isLive && (
            <Badge variant="destructive" className="animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        {category && (
          <Badge variant="secondary" className="w-fit">
            {category}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant={isThisStreamPlaying ? "default" : "outline"}
            onClick={handleTogglePlay}
            aria-label={isThisStreamPlaying ? "Pause" : "Play"}
          >
            {isThisStreamPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          {currentTrack ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{currentTrack}</p>
              {currentArtist && (
                <p className="truncate text-xs text-muted-foreground">
                  {currentArtist}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isThisStreamPlaying ? "Now playing" : "Tap to play"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
