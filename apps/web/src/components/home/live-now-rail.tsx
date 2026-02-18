"use client";

import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LiveNowIndicator } from "@/components/schedule/live-now-indicator";
import { ChannelCard } from "@/components/streams/channel-card";
import { apiClient } from "@/lib/api-client";

interface LiveStream {
  id: string;
  name: string;
  description?: string;
  stream_url: string;
  category?: string;
  metadata?: {
    is_live?: boolean;
    current_track?: string;
    current_artist?: string;
    album_art?: string;
  };
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
                  streamUrl={stream.stream_url}
                  category={stream.category}
                  isLive={stream.metadata?.is_live}
                  currentTrack={stream.metadata?.current_track}
                  currentArtist={stream.metadata?.current_artist}
                  albumArt={stream.metadata?.album_art}
                />
              </div>
            ))
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">
                No live streams at the moment. Check the{" "}
                <a href="/channels" className="underline hover:text-foreground">
                  Channel Guide
                </a>{" "}
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
