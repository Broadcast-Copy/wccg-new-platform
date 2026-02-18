import { ChannelGuideGrid } from "@/components/streams/channel-guide-grid";

export const metadata = {
  title: "Channel Guide | WCCG 104.5 FM",
};

export default function ChannelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Channel Guide</h1>
        <p className="text-muted-foreground">
          Browse all available streams and channels
        </p>
      </div>
      <ChannelGuideGrid />
    </div>
  );
}
