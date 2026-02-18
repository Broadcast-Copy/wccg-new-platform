"use client";

import { Badge } from "@/components/ui/badge";

interface LiveNowIndicatorProps {
  label?: string;
}

export function LiveNowIndicator({ label = "LIVE" }: LiveNowIndicatorProps) {
  return (
    <Badge
      variant="destructive"
      className="inline-flex items-center gap-1.5 animate-pulse"
    >
      <span className="h-2 w-2 rounded-full bg-white" />
      {label}
    </Badge>
  );
}
