import { ChannelGuideGrid } from "@/components/streams/channel-guide-grid";
import { STATIONS } from "@/lib/stations";
import { getShowsFromDb, getHostsFromDb } from "@/lib/content-db";
import { Radio } from "lucide-react";

export const metadata = {
  title: "Streaming | WCCG 104.5 FM",
  description:
    "Browse all WCCG 104.5 FM streaming channels. Hip Hop, Gospel, R&B, Jazz, Talk, and more — tap play to start listening.",
};

export default async function ChannelsPage() {
  // Shows + hosts come from the DB at build time (content-db falls back to the
  // hardcoded TS data on error/empty). The grid uses them to resolve the
  // on-air show + host avatars for each stream.
  const [shows, hosts] = await Promise.all([getShowsFromDb(), getHostsFromDb()]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Radio className="h-6 w-6 text-[#74ddc7]" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Streaming
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse our channels, discover live shows, and start streaming.
        </p>
      </div>

      {/* Channel Tiles — self-hosted WCCG stations (lib/stations.ts) */}
      <ChannelGuideGrid streams={STATIONS} shows={shows} hosts={hosts} />
    </div>
  );
}
