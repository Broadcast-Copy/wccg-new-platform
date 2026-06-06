"use client";

import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LiveNowIndicator } from "@/components/schedule/live-now-indicator";
import { ChannelCard } from "@/components/streams/channel-card";
import { createClient } from "@/lib/supabase/client";
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

// Shape of a stream_metadata row with its embedded streams parent.
// The FK (stream_metadata.stream_id → streams.id) is many-to-one, so the
// embed resolves to a single object; we still tolerate an array shape since
// PostgREST result typings can surface either depending on the relationship.
interface EmbeddedStream {
  id: string;
  name: string | null;
  slug: string | null;
  image_url: string | null;
  category: string | null;
}

interface StreamMetadataRow {
  stream_id: string;
  current_title: string | null;
  current_artist: string | null;
  album_art: string | null;
  listener_count: number | null;
  is_live: boolean | null;
  streams: EmbeddedStream | EmbeddedStream[] | null;
}

/** Normalize the embedded relationship to a single parent row (or null). */
function firstStream(
  embed: EmbeddedStream | EmbeddedStream[] | null,
): EmbeddedStream | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

export function LiveNowRail() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live streams directly from Supabase (browser → Supabase, no API
  // server). The effect body keeps setState out of the synchronous path: a
  // pure async fetch returns mapped rows, and an `active` guard drops stale
  // results before any setState runs.
  useEffect(() => {
    let active = true;

    async function fetchLiveStreams(): Promise<LiveStream[]> {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stream_metadata")
        .select(
          "stream_id,current_title,current_artist,album_art,listener_count,is_live, streams(id,name,slug,image_url,category)",
        )
        .eq("is_live", true);

      if (error) return [];

      return ((data as StreamMetadataRow[] | null) ?? []).map((row) => {
        const parent = firstStream(row.streams);
        return {
          id: parent?.id ?? row.stream_id,
          name: parent?.name ?? "WCCG Stream",
          slug: parent?.slug ?? row.stream_id,
          category: parent?.category ?? undefined,
          imageUrl: parent?.image_url ?? undefined,
          nowPlaying: {
            currentTitle: row.current_title ?? undefined,
            currentArtist: row.current_artist ?? undefined,
            currentTrack: row.current_title ?? undefined,
            albumArt: row.album_art ?? undefined,
            listenerCount: row.listener_count ?? undefined,
            isLive: row.is_live ?? undefined,
          },
        };
      });
    }

    fetchLiveStreams()
      .then((rows) => {
        if (!active) return;
        setStreams(rows);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        // Degrade gracefully — render the empty state instead of crashing.
        setStreams([]);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
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
