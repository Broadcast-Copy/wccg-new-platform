"use client";

import { useEffect, useRef, useState } from "react";

interface NowPlayingData {
  title: string;
  artist: string;
  albumArt: string | null;
  streamName: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const POLL_INTERVAL_MS = 20_000; // 20 seconds

/**
 * Hook that polls the API for "now playing" stream metadata.
 * Only polls while `enabled` is true (i.e., stream is playing).
 */
export function useNowPlaying(enabled: boolean) {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    async function fetchNowPlaying() {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/stream/now-playing`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch {
        // Silently fail — keep last known data
      } finally {
        setIsLoading(false);
      }
    }

    // Fetch immediately, then poll
    fetchNowPlaying();
    intervalRef.current = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return { data, isLoading };
}
