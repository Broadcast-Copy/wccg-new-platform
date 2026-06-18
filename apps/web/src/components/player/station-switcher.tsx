"use client";

/**
 * StationSwitcher — switch the live stream from inside the global player.
 *
 * Both variants route through the same global AudioProvider (play()), so
 * switching keeps the persistent mini player and keeps listening points
 * accruing for whichever station is selected.
 *
 *  - variant="mini": a compact icon button that opens an upward popover
 *    (used in the slim mini player bar).
 *  - variant="full": a row of station chips (used in the maximized player).
 */

import { useEffect, useRef, useState } from "react";
import { AppImage as Image } from "@/components/ui/app-image";
import { Radio, ChevronUp } from "lucide-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { STATIONS, type Station } from "@/lib/stations";

export function StationSwitcher({ variant = "mini" }: { variant?: "mini" | "full" }) {
  const { play, currentStream } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const switchTo = (s: Station) => {
    if (s.status !== "ACTIVE") return;
    if (currentStream === s.streamUrl) return; // already on it
    play(s.streamUrl, { streamName: s.name, albumArt: s.logo });
  };

  // ── Full variant: horizontal chips (maximized player) ──────────────────
  if (variant === "full") {
    return (
      <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
        {STATIONS.map((s) => {
          const active = currentStream === s.streamUrl;
          const live = s.status === "ACTIVE";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => switchTo(s)}
              disabled={!live}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? "border-[#74ddc7] bg-[#74ddc7]/15 text-[#74ddc7]"
                  : live
                    ? "border-white/15 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10"
                    : "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30"
              }`}
            >
              <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded ring-1 ring-white/10">
                <Image src={s.logo} alt={s.name} fill className="object-cover" sizes="20px" />
              </span>
              {s.name}
              {!live && <span className="text-[9px] uppercase tracking-wide opacity-80">Soon</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Mini variant: popover button (slim bar) ────────────────────────────
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch station"
        title="Switch station"
        className="flex h-8 items-center gap-0.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Radio className="h-4 w-4" />
        <ChevronUp className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <p className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Switch station
          </p>
          {STATIONS.map((s) => {
            const active = currentStream === s.streamUrl;
            const live = s.status === "ACTIVE";
            return (
              <button
                key={s.id}
                type="button"
                disabled={!live}
                onClick={() => {
                  switchTo(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[#74ddc7]/10 font-semibold text-[#74ddc7]"
                    : live
                      ? "text-foreground hover:bg-foreground/[0.04]"
                      : "cursor-not-allowed text-muted-foreground/50"
                }`}
              >
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md ring-1 ring-border">
                  <Image src={s.logo} alt={s.name} fill className="object-cover" sizes="28px" />
                </span>
                <span className="flex-1 truncate text-left">{s.name}</span>
                {active ? (
                  <span className="text-[9px] uppercase tracking-wide">Playing</span>
                ) : !live ? (
                  <span className="text-[9px] uppercase tracking-wide">Soon</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
