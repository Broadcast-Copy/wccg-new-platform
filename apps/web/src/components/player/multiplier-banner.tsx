"use client";

import { useEffect, useState } from "react";
import { getCurrentMultiplier, type ActiveMultiplier } from "@/lib/multipliers";
import { Zap } from "lucide-react";

function formatCountdown(endsAt: Date): string {
  const now = new Date();
  const diff = endsAt.getTime() - now.getTime();
  if (diff <= 0) return "0:00";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

export function MultiplierBanner() {
  const [active, setActive] = useState<ActiveMultiplier | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    function check() {
      const current = getCurrentMultiplier();
      setActive(current);
      if (current) {
        setCountdown(formatCountdown(current.endsAt));
      }
    }
    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!active) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10">
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(245,158,11,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(249,115,22,0.3) 0%, transparent 50%)",
          }}
        />
      </div>
      <div className="relative flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="animate-pulse text-lg font-bold text-amber-400">
                {active.multiplier}x
              </span>
              <span className="text-sm font-semibold text-foreground">
                Points Active!
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {active.label}
              {active.sponsorName && (
                <span className="ml-1 text-foreground/50">
                  &middot; Sponsored by {active.sponsorName}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Ends in
          </p>
          <p className="text-sm font-bold tabular-nums text-amber-400">
            {countdown}
          </p>
        </div>
      </div>
    </div>
  );
}
