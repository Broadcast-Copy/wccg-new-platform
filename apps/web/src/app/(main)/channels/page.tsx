import { ChannelGuideGrid } from "@/components/streams/channel-guide-grid";
import { Radio, Zap, Headphones } from "lucide-react";

export const metadata = {
  title: "Channel Guide | WCCG 104.5 FM",
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/80 to-gray-900 border border-border/30">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(139,92,246,0.3) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(20,184,166,0.2) 0%, transparent 50%),
                              radial-gradient(circle at 60% 80%, rgba(139,92,246,0.15) 0%, transparent 50%)`
          }} />
        </div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-teal-500 shadow-xl shadow-purple-500/20">
              <Radio className="h-8 w-8 text-white" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Channel Guide
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400 ring-1 ring-green-500/20">
                  <Zap className="h-3 w-3" />
                  {streams.length} Channels
                </span>
              </div>
              <p className="text-base text-gray-400 max-w-2xl">
                Your all-access pass to WCCG 104.5 FM. Browse our curated channels,
                discover new shows, and start streaming in one tap.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Live Streams</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{streams.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium text-gray-300">Genres</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {new Set(streams.map((s: { category?: string }) => s.category).filter(Boolean)).size}
              </p>
            </div>
            <div className="hidden sm:block rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-gray-300">Quality</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">HD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Guide Grid */}
      <ChannelGuideGrid streams={streams} />
    </div>
  );
}
