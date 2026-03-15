"use client";

import { useEffect, useState } from "react";
import { Radio, Clock } from "lucide-react";
import { resolveNowPlaying, getUpNext, type ScheduleBlock } from "@/data/schedule";

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function useCountdown(targetTime: string) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const [th, tm] = targetTime.split(":").map(Number);
      const target = new Date(et);
      target.setHours(th, tm, 0, 0);
      // If target already passed today, it's tomorrow
      if (target <= et) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - et.getTime();
      if (diff <= 0) return "Starting now";
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (hrs > 0) return `${hrs}h ${mins}m`;
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    }
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return remaining;
}

function LiveNowCard({ block }: { block: ScheduleBlock | null }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-border">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Now</span>
      </div>
      <div className="px-4 py-3">
        {block ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
                <Radio className="h-5 w-5 text-red-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {block.showName}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {block.hostNames}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {formatTime(block.startTime)} – {formatTime(block.endTime)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No program info available</p>
        )}
      </div>
    </div>
  );
}

function UpNextCard({ block }: { block: ScheduleBlock | null }) {
  const countdown = useCountdown(block?.startTime ?? "00:00");

  return (
    <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#74ddc7]/10 border-b border-border">
        <Clock className="h-3 w-3 text-[#74ddc7]" />
        <span className="text-xs font-bold text-[#74ddc7] uppercase tracking-wider">Up Next</span>
      </div>
      <div className="px-4 py-3">
        {block ? (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#74ddc7]/20">
              <Clock className="h-5 w-5 text-[#74ddc7]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-foreground truncate">
                {block.showName}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {block.hostNames}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-muted-foreground/60">
                  {formatTime(block.startTime)}
                </p>
                <span className="text-[10px] font-bold text-[#74ddc7] bg-[#74ddc7]/10 px-1.5 py-0.5 rounded">
                  in {countdown}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming shows</p>
        )}
      </div>
    </div>
  );
}

export function LiveUpNextCards() {
  const [liveNow, setLiveNow] = useState<ScheduleBlock | null>(null);
  const [upNext, setUpNext] = useState<ScheduleBlock | null>(null);

  useEffect(() => {
    function update() {
      setLiveNow(resolveNowPlaying());
      const next = getUpNext(1);
      setUpNext(next[0] ?? null);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3">
      <LiveNowCard block={liveNow} />
      <UpNextCard block={upNext} />
    </div>
  );
}
