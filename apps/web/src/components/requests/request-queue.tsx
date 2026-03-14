"use client";

import { REQUEST_QUEUE, type RequestStatus } from "@/data/request-queue";
import { Badge } from "@/components/ui/badge";
import { Star, Music2 } from "lucide-react";

const statusConfig: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  playing: {
    label: "Now Playing",
    className: "bg-[#22c55e] text-white border-0",
  },
  approved: {
    label: "Up Next",
    className: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
  },
  pending: {
    label: "Pending",
    className: "bg-white/5 text-muted-foreground border-border",
  },
  played: {
    label: "Played",
    className: "bg-white/5 text-muted-foreground/50 border-border/50",
  },
};

export function RequestQueue() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-[#7401df]" />
          <h3 className="text-lg font-bold text-foreground">Request Queue</h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-[#74ddc7]/20 text-[#74ddc7]">
          {REQUEST_QUEUE.filter((r) => r.status !== "played").length} in queue
        </Badge>
      </div>

      <div className="space-y-2">
        {REQUEST_QUEUE.map((request) => {
          const status = statusConfig[request.status];
          const isPlaying = request.status === "playing";
          const isPlayed = request.status === "played";

          return (
            <div
              key={request.id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                isPlaying
                  ? "border-[#22c55e]/30 bg-[#22c55e]/5"
                  : isPlayed
                  ? "border-border/50 bg-card/50 opacity-60"
                  : "border-border bg-card hover:border-input"
              }`}
            >
              {/* Position */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isPlaying
                    ? "bg-[#22c55e] text-white"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {isPlaying ? (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                  </span>
                ) : (
                  request.position
                )}
              </div>

              {/* Song info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {request.title}
                  </p>
                  {request.isPriority && (
                    <Star className="h-3 w-3 shrink-0 text-[#f59e0b] fill-[#f59e0b]" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70 truncate">
                  {request.artist}
                </p>
              </div>

              {/* Requester */}
              <div className="hidden sm:block text-right shrink-0">
                <p className="text-xs text-muted-foreground truncate">
                  {request.requesterName}
                </p>
              </div>

              {/* Status */}
              <Badge variant="outline" className={`shrink-0 text-[10px] ${status.className}`}>
                {status.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
