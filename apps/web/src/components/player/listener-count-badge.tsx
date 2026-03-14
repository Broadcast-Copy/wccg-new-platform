"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

/**
 * ListenerCountBadge — shows a simulated live listener count.
 *
 * Displays "🎧 N listening" with animated number transitions.
 * Only visible when the stream is actively playing.
 * Polls every 60s with small random variations for realism.
 */
export function ListenerCountBadge({ isPlaying }: { isPlaying: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setCount(null);
      return;
    }

    // Generate an initial count
    const initial = Math.floor(Math.random() * (2500 - 800) + 800);
    setCount(initial);

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev === null) return Math.floor(Math.random() * (2500 - 800) + 800);
        // Small variation: +/- up to 50, clamped to 800-2500
        const delta = Math.floor(Math.random() * 101) - 50;
        return Math.max(800, Math.min(2500, prev + delta));
      });
      setAnimate(true);
      setTimeout(() => setAnimate(false), 600);
    }, 60_000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isPlaying || count === null) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Users className="h-3 w-3 text-[#74ddc7]" />
      <span
        className={`text-[10px] font-medium text-muted-foreground transition-all duration-500 ${
          animate ? "text-[#74ddc7] scale-110" : ""
        }`}
      >
        {count.toLocaleString()} listening
      </span>
    </div>
  );
}
