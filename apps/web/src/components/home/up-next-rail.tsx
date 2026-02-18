"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function UpNextRail() {
  // TODO: Fetch upcoming shows from API
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Up Next</h2>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {/* TODO: Map over upcoming shows and render ShowCards */}
          <div className="flex h-32 w-64 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Upcoming shows will appear here
            </p>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
