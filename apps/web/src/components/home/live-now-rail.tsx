"use client";

import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LiveNowIndicator } from "@/components/schedule/live-now-indicator";
import { ChannelCard } from "@/components/streams/channel-card";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface NowPlaying {
  currentTitle?: string;
  currentArtist?: string;
  currentTrack?: string;
  albumArt?: string;
  listenerCount?: number;
  isLive?: boolean;
}

interface LiveStream {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  status?: string;
  streamUrl?: string;
  imageUrl?: string;
  nowPlaying?: NowPlaying;
}

export function LiveNowRail() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLiveStreams() {
      try {
        const data = await apiClient<LiveStream[]>("/streams?live=true");
        setStreams(data);
      } catch {
        // API not available yet, show placeholder
        setStreams([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLiveStreams();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Live Now</h2>
        <LiveNowIndicator />
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 w-72 shrink-0 animate-pulse rounded-lg border bg-muted/50"
              />
            ))
          ) : streams.length > 0 ? (
            streams.map((stream) => (
              <div key={stream.id} className="w-72 shrink-0">
                <ChannelCard
                  streamId={stream.id}
                  name={stream.name}
                  description={stream.description}
                  streamUrl={stream.streamUrl}
                  category={stream.category}
                  isLive={stream.nowPlaying?.isLive}
                  currentTrack={stream.nowPlaying?.currentTrack}
                  currentArtist={stream.nowPlaying?.currentArtist}
                  albumArt={stream.nowPlaying?.albumArt}
                />
              </div>
            ))
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">
                No live streams at the moment. Check the{" "}
                <Link href="/channels" className="underline hover:text-foreground">
                  Channel Guide
                </Link>{" "}
                for all available streams.
              </p>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
