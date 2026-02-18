"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LiveNowIndicator } from "@/components/schedule/live-now-indicator";

export function LiveNowRail() {
  // TODO: Fetch live streams from API / SSE
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Live Now</h2>
        <LiveNowIndicator />
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {/* TODO: Map over live streams and render ChannelCards */}
          <div className="flex h-32 w-64 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Live streams will appear here
            </p>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
