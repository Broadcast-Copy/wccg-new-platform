import { ChannelGuideGrid } from "@/components/streams/channel-guide-grid";
import { Radio } from "lucide-react";

export const metadata = {
  title: "Streaming | WCCG 104.5 FM",
  description:
    "Browse all WCCG 104.5 FM streaming channels. Hip Hop, Gospel, R&B, Jazz, Talk, and more — tap play to start listening.",
};

// ---------------------------------------------------------------------------
// Static fallback data — used when API is unavailable (static export)
// ---------------------------------------------------------------------------
const STATIC_STREAMS = [
  {
    id: "stream_wccg",
    name: "WCCG 104.5 FM",
    slug: "stream_wccg",
    description: "Fayetteville's #1 Hip Hop Station",
    category: "MAIN",
    status: "ACTIVE",
    sortOrder: 1,
    streamUrl: "https://ice66.securenetsystems.net/WCCG",
  },
  {
    id: "stream_soul",
    name: "SOUL 104.5 FM",
    slug: "stream_soul",
    description: "Hot R&B and Urban AC",
    category: "RNB",
    status: "COMING_SOON",
    sortOrder: 2,
  },
  {
    id: "stream_hot",
    name: "HOT 104.5 FM",
    slug: "stream_hot",
    description: "Today's Hottest Hits",
    category: "HIP_HOP",
    status: "COMING_SOON",
    sortOrder: 3,
  },
  {
    id: "stream_vibe",
    name: "104.5 THE VIBE",
    slug: "stream_vibe",
    description: "Non-stop Vibes & Chill",
    category: "RNB",
    status: "COMING_SOON",
    sortOrder: 4,
  },
  {
    id: "stream_mixsquad",
    name: "MixxSquadd Radio",
    slug: "stream_mixsquad",
    description: "Live Sets, Exclusive Remixes, and High-Energy Mixes",
    category: "HIP_HOP",
    status: "COMING_SOON",
    sortOrder: 5,
  },
  {
    id: "stream_yard",
    name: "Yard & Riddim Radio",
    slug: "stream_yard",
    description: "Caribbean & Reggae",
    category: "COMMUNITY",
    status: "COMING_SOON",
    sortOrder: 6,
  },
];

async function getStreams() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/streams`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return STATIC_STREAMS;
    const data = await res.json();
    return data.length > 0 ? data : STATIC_STREAMS;
  } catch {
    return STATIC_STREAMS;
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Streaming
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse our channels, discover live shows, and start streaming.
        </p>
      </div>

      {/* Channel Tiles */}
      <ChannelGuideGrid streams={streams} />
    </div>
  );
}
