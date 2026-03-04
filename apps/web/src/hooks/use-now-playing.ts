"use client";

import { useEffect, useRef, useState } from "react";

interface NowPlayingData {
  title: string;
  artist: string;
  albumArt: string | null;
  streamName: string;
}

// Cirrus / SecureNet now-playing XML feed — polled directly from the client.
const CIRRUS_XML_URL =
  process.env.NEXT_PUBLIC_CIRRUS_METADATA_URL ||
  "https://streamdb7web.securenetsystems.net/player_status_update/WCCG.xml";

const POLL_INTERVAL_MS = 15_000; // 15 seconds

/**
 * Parse the Cirrus XML feed and extract now-playing metadata.
 *
 * Expected shape (simplified):
 * ```xml
 * <playlist>
 *   <title>Song Title</title>
 *   <artist>Artist Name</artist>
 *   <album>Album Name</album>
 *   <cover>https://…/cover.jpg</cover>
 *   ...
 * </playlist>
 * ```
 */
function parseCirrusXml(xmlText: string): NowPlayingData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) return null;

    const getText = (tag: string): string =>
      doc.querySelector(tag)?.textContent?.trim() || "";

    const title = getText("title");
    const artist = getText("artist");
    const cover = getText("cover");

    // Only return data if we have at least a title or artist
    if (!title && !artist) return null;

    return {
      title,
      artist,
      albumArt: cover || null,
      streamName: "WCCG 104.5 FM",
    };
  } catch {
    return null;
  }
}

/**
 * Hook that polls the Cirrus XML feed for "now playing" stream metadata.
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
        // Add cache-busting param to avoid stale data
        const cacheBuster = `_cb=${Date.now()}`;
        const separator = CIRRUS_XML_URL.includes("?") ? "&" : "?";
        const response = await fetch(`${CIRRUS_XML_URL}${separator}${cacheBuster}`, {
          signal: AbortSignal.timeout(8000),
          // No credentials needed — the XML feed is public
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xmlText = await response.text();
        const parsed = parseCirrusXml(xmlText);
        if (parsed) {
          setData(parsed);
        }
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
