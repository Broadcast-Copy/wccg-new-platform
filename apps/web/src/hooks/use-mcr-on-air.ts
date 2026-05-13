"use client";

/**
 * useMcrOnAir — read the Master Control public state.
 *
 * Polls /mcr/on-air every 10s. This is the operator-authored source of
 * truth (set in /my/admin/master-control or by the metadata-poll worker).
 * Fall back upstream to the Cirrus feed inside `useNowPlaying` when this
 * returns null or stale data.
 */

import { useEffect, useState } from "react";

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

export function useMcrOnAir(enabled = true): UseMcrOnAir {
  const [data, setData] = useState<McrOnAirState | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/mcr/on-air`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!r.ok) return;
        const j = (await r.json()) as McrOnAirState;
        if (!cancelled) setData(j);
      } catch {
        /* silent — keeps fallback path working */
      }
    };
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  const fresh =
    !!data?.nowPlaying?.title &&
    !!data.lastMetadataAt &&
    Date.now() - new Date(data.lastMetadataAt).getTime() < STALE_THRESHOLD_MS;

  return {
    data,
    fresh,
    isPlaying: data?.signalStatus === "on_air",
  };
}
