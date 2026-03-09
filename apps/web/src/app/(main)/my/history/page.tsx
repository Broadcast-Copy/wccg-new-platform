"use client";

import { ListeningHistory } from "@/components/history/listening-history";

export default function ListeningHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Listening History</h1>
        <p className="text-muted-foreground">
          Your listening activity across all WCCG channels
        </p>
      </div>
      <ListeningHistory />
    </div>
  );
}
