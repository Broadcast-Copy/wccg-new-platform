import { ChannelGuideGrid } from "@/components/streams/channel-guide-grid";
import { Radio } from "lucide-react";

export const metadata = {
  title: "Streaming | WCCG 104.5 FM",
  description:
    "Browse all WCCG 104.5 FM streaming channels. Hip Hop, Gospel, R&B, Jazz, Talk, and more — tap play to start listening.",
};

async function getStreams() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/streams`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ChannelsPage() {
  const streams = await getStreams();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Radio className="h-6 w-6 text-[#74ddc7]" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Streaming
          </h1>
        </div>
        <p className="text-sm text-white/40">
          Browse our channels, discover live shows, and start streaming.
        </p>
      </div>

      {/* Channel Tiles */}
      <ChannelGuideGrid streams={streams} />
    </div>
  );
}
