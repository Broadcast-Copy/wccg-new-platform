"use client";

import { useState } from "react";
import { ChannelCard } from "./channel-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Stream {
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

interface ChannelGuideGridProps {
  streams: Stream[];
}

const CATEGORIES = [
  "All",
  "Gospel",
  "Hip Hop",
  "R&B",
  "Jazz",
  "Talk",
];

export function ChannelGuideGrid({ streams }: ChannelGuideGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredStreams =
    selectedCategory === "All"
      ? streams
      : streams.filter(
          (s) =>
            s.category?.toLowerCase() === selectedCategory.toLowerCase(),
        );

  return (
    <div className="space-y-6">
      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="w-full"
      >
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredStreams.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStreams.map((stream) => (
            <ChannelCard
              key={stream.id}
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
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {selectedCategory === "All"
              ? "No channels available at the moment."
              : `No ${selectedCategory} channels available.`}
          </p>
        </div>
      )}
    </div>
  );
}
