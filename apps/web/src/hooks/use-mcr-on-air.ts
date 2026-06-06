"use client";

/**
 * useMcrOnAir — read the Master Control public state.
 *
 * Polls /mcr/on-air every 10s. This is the operator-authored source of
 * truth (set in /my/admin/master-control or by the metadata-poll worker).
 * Fall back upstream to the Cirrus feed inside `useNowPlaying` when this
 * returns null or stale data.
 */

import { useEffect, useRef, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const POLL_INTERVAL_MS = 10_000;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface McrOnAirState {
  nowPlaying: {
    title: string | null;
    artist: string | null;
    album: string | null;
    artUrl: string | null;
    source: string | null;
    startedAt: string | null;
  } | null;
  currentShow: { title: string | null; djSlug: string | null } | null;
  signalStatus: "on_air" | "silent" | "off_air" | "unknown";
  listeners: number | null;
  lastMetadataAt: string | null;
  updatedAt: string | null;
}

export interface UseMcrOnAir {
  data: McrOnAirState | null;
  /** True when data is present AND last_metadata_at is recent. */
  fresh: boolean;
  isPlaying: boolean;
}

/** Pure-at-call-site staleness check (reads the clock, so never call in render). */
function computeFresh(d: McrOnAirState | null): boolean {
  return (
    !!d?.nowPlaying?.title &&
    !!d.lastMetadataAt &&
    Date.now() - new Date(d.lastMetadataAt).getTime() < STALE_THRESHOLD_MS
  );
}

export function useMcrOnAir(enabled = true): UseMcrOnAir {
  const [data, setData] = useState<McrOnAirState | null>(null);
  // `fresh` is derived from the clock, so it is recomputed on every poll tick
  // (inside the effect) rather than during render, where Date.now() is impure.
  const [fresh, setFresh] = useState(false);
  // Mirror of the latest data so the poll callback can recompute staleness
  // against current data even on fetch failures (no re-render needed).
  const dataRef = useRef<McrOnAirState | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/mcr/on-air`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!r.ok) {
          // No new data — re-evaluate staleness of the existing data.
          if (!cancelled) setFresh(computeFresh(dataRef.current));
          return;
        }
        const j = (await r.json()) as McrOnAirState;
        if (!cancelled) {
          dataRef.current = j;
          setData(j);
          setFresh(computeFresh(j));
        }
      } catch {
        /* silent — keeps fallback path working */
        if (!cancelled) setFresh(computeFresh(dataRef.current));
      }
    };
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return {
    data,
    fresh,
    isPlaying: data?.signalStatus === "on_air",
  };
}
