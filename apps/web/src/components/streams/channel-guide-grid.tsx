"use client";

import { ChannelCard } from "./channel-card";

// TODO: Replace with real data fetching from NestJS API
const PLACEHOLDER_CHANNELS = [
  {
    streamId: "main",
    name: "WCCG Main",
    description: "The main WCCG 104.5 FM broadcast",
    streamUrl: "",
    category: "Main",
    isLive: true,
  },
];

export function ChannelGuideGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PLACEHOLDER_CHANNELS.length > 0 ? (
        PLACEHOLDER_CHANNELS.map((channel) => (
          <ChannelCard key={channel.streamId} {...channel} />
        ))
      ) : (
        <p className="col-span-full text-center text-muted-foreground">
          No channels available at the moment.
        </p>
      )}
    </div>
  );
}
