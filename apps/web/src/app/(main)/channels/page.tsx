import { ChannelGuideGrid } from "@/components/streams/channel-guide-grid";
import { Radio } from "lucide-react";

export const metadata = {
  title: "Channel Guide | WCCG 104.5 FM",
};

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

async function getStreams(): Promise<Stream[]> {
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
      <div>
        <div className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Channel Guide</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Browse all available streams and channels. Tap play to start listening.
        </p>
      </div>
      <ChannelGuideGrid streams={streams} />
    </div>
  );
}
