"use client";

import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  displayName: string;
  message: string;
  timestamp: string;
  isFeatured: boolean;
  isOwn?: boolean;
}

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return "1d+ ago";
}

export function ChatMessage({
  displayName,
  message,
  timestamp,
  isFeatured,
  isOwn,
}: ChatMessageProps) {
  return (
    <div
      className={`rounded-lg px-4 py-3 transition-colors ${
        isOwn
          ? "border-l-2 border-l-[#7401df] bg-[#7401df]/10"
          : isFeatured
            ? "bg-amber-500/10 border border-amber-500/20"
            : "bg-white/5 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white">{displayName}</span>
        {isFeatured && (
          <Badge
            variant="secondary"
            className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0"
          >
            Featured
          </Badge>
        )}
        {isOwn && (
          <Badge
            variant="secondary"
            className="bg-[#7401df]/30 text-[#74ddc7] text-[10px] px-1.5 py-0"
          >
            You
          </Badge>
        )}
        <span className="ml-auto text-[10px] text-white/40">{timeAgo(timestamp)}</span>
      </div>
      <p className="mt-1 text-sm text-white/80">{message}</p>
    </div>
  );
}
