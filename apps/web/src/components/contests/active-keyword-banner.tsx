"use client";

import { useState, useEffect } from "react";
import { KEYWORDS } from "@/data/keywords";
import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";

export function ActiveKeywordBanner() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeKeywords = KEYWORDS.filter((kw) => kw.isActive);

  if (activeKeywords.length === 0) return null;

  // Pick the first active keyword with a time limit for countdown
  const timeLimited = activeKeywords.find(
    (kw) => new Date(kw.endTime).getTime() > now,
  );

  const remainingMs = timeLimited
    ? Math.max(0, new Date(timeLimited.endTime).getTime() - now)
    : 0;

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#7401df] via-[#ec4899] to-[#7401df] p-[1px]">
      <div className="relative overflow-hidden rounded-[11px] bg-[#0a0a0f]/90 px-5 py-4 sm:px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#7401df]/5 to-[#ec4899]/5" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          {/* Left: pulsing dot + text */}
          <div className="flex items-center gap-3">
            {/* Pulsing red dot */}
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc2626] opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#dc2626]" />
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <Radio className="h-4 w-4 text-[#74ddc7] shrink-0" />
              <span className="text-sm font-bold text-foreground">
                Listen for the keyword!
              </span>
              {timeLimited?.hint && (
                <span className="text-xs text-muted-foreground/70">
                  Hint: &ldquo;{timeLimited.hint}&rdquo;
                </span>
              )}
            </div>
          </div>

          {/* Right: prize + countdown */}
          <div className="flex items-center gap-3 flex-wrap">
            {activeKeywords.length > 0 && (
              <Badge className="bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20 text-[10px] font-bold">
                Up to {Math.max(...activeKeywords.map((k) => k.pointsValue))} pts
              </Badge>
            )}

            {timeLimited && remainingMs > 0 && (
              <Badge
                variant="outline"
                className="border-white/10 text-foreground text-xs font-mono tabular-nums"
              >
                {hours > 0 && `${hours}h `}
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
