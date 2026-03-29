"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { resolveNowPlaying, getUpNext } from "@/data/schedule";
import { Radio, Play, Pause, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hour

export function StillListeningModal() {
  const { isPlaying, pause, resume } = useAudioPlayer();
  const [show, setShow] = useState(false);
  const [currentShow, setCurrentShow] = useState<string | null>(null);
  const [upNext, setUpNext] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve what's on air
  useEffect(() => {
    function update() {
      const block = resolveNowPlaying();
      setCurrentShow(block?.showName ?? null);
      const next = getUpNext(1);
      setUpNext(next[0]?.showName ?? null);
    }
    update();
    const i = setInterval(update, 60_000);
    return () => clearInterval(i);
  }, []);

  // Start/reset inactivity timer
  const resetTimer = useCallback(() => {
    setShow(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isPlaying) {
      timerRef.current = setTimeout(() => setShow(true), INACTIVITY_MS);
    }
  }, [isPlaying]);

  // Reset on play state change
  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, resetTimer]);

  // Reset on any user interaction
  useEffect(() => {
    if (!isPlaying) return;
    const events = ["click", "keydown", "scroll", "touchstart"] as const;
    const handler = () => {
      if (show) return; // don't reset while modal is showing
      resetTimer();
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [isPlaying, show, resetTimer]);

  if (!show || !isPlaying) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
          {/* Header — what's on air */}
          <div className="bg-gradient-to-br from-[#0e0e18] to-[#1a1a2e] px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">Live on WCCG</span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7]/20">
                <Radio className="h-6 w-6 text-[#74ddc7]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white">
              {currentShow || "WCCG 104.5 FM"}
            </h3>
            {upNext && (
              <p className="text-xs text-white/40 mt-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Up Next: {upNext}
              </p>
            )}
          </div>

          {/* Still listening prompt */}
          <div className="px-6 py-5 text-center space-y-4">
            <p className="text-lg font-semibold text-foreground">Still listening?</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ve been streaming for a while. Want to keep going?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => { resetTimer(); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#74ddc7] text-[#0a0a0f] py-3 text-sm font-bold hover:bg-[#74ddc7]/90 transition-colors"
              >
                <Play className="h-4 w-4" /> Yes, keep playing
              </button>
              <button
                onClick={() => { pause(); setShow(false); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <Pause className="h-4 w-4" /> No, pause
              </button>
            </div>

            <Link
              href="/shows"
              onClick={() => setShow(false)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Browse other shows <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
