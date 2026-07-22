"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FLAGSHIP_STATION_ID } from "@/lib/site";

/**
 * Live proof strip: the flagship station's real on-air track, read straight
 * from station_now_playing (public SELECT, pushed by the AirSuite/DJB engine
 * via the station-nowplaying edge fn). This is the whole chain made visible —
 * on-prem engine -> cloud -> the public marketing page — so "live on air
 * today" is literally true, not a claim.
 */

type NowPlaying = {
  artist: string | null;
  title: string | null;
  next_artist: string | null;
  next_title: string | null;
  source: string | null;
  updated_at: string;
};

/** Illegal states unrepresentable — no data while "live", no flicker to empty. */
type State =
  | { status: "idle" }
  | { status: "live"; track: NowPlaying }
  | { status: "off" };

const POLL_MS = 20_000;
/** Beyond this the feed is stale; we stop claiming the station is on air. */
const FRESH_MS = 30 * 60 * 1000;

function isFresh(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < FRESH_MS;
}

/** DJB metadata writes "Title fArtist" for featured cuts — soften for display. */
function clean(text: string | null): string {
  return (text ?? "").replace(/\s+f([A-Z])/g, " ft. $1").trim();
}

export function LiveOnAir() {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data, error } = await supabase
        .from("station_now_playing")
        .select("artist, title, next_artist, next_title, source, updated_at")
        .eq("station_id", FLAGSHIP_STATION_ID)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data || !isFresh(data.updated_at) || !(data.artist || data.title)) {
        setState({ status: "off" });
        return;
      }
      setState({ status: "live", track: data as NowPlaying });
    };
    void run();
    const t = setInterval(() => void run(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Render nothing until (and unless) there's a live track — no empty box, no
  // layout shift on the static page.
  if (state.status !== "live") return null;

  const { track } = state;
  const nowLine = [clean(track.artist), clean(track.title)]
    .filter(Boolean)
    .join(" — ");
  const nextLine = [clean(track.next_artist), clean(track.next_title)]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      className="mx-auto mt-8 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line bg-elevated/70 px-4 py-2 text-sm"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2 font-medium text-signal-soft">
        <span className="bc-pulse h-2 w-2 rounded-full bg-signal" aria-hidden />
        ON AIR NOW
      </span>
      <span className="text-faint">·</span>
      <span className="font-medium text-fg">WCCG 104.5</span>
      <span className="text-faint">·</span>
      <span className="min-w-0 truncate text-dim">{nowLine}</span>
      {nextLine && (
        <span className="hidden text-faint sm:inline">
          &nbsp;· next: {nextLine}
        </span>
      )}
    </div>
  );
}
