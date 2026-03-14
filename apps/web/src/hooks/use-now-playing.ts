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

// ── iTunes Cover Art Lookup Cache ───────────────────────────────────
const artCache = new Map<string, string | null>();

/**
 * Search iTunes for album artwork given artist + title.
 * Returns a 600x600 artwork URL or null.
 */
async function fetchITunesArt(
  artist: string,
  title: string
): Promise<string | null> {
  if (!artist && !title) return null;

  const cacheKey = `${artist}||${title}`.toLowerCase();
  if (artCache.has(cacheKey)) return artCache.get(cacheKey) ?? null;

  try {
    const query = encodeURIComponent(
      `${artist} ${title}`.trim().slice(0, 100)
    );
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=3`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      // Get the highest resolution artwork (replace 100x100 with 600x600)
      const artUrl = (data.results[0].artworkUrl100 as string)
        ?.replace("100x100bb", "600x600bb")
        || null;
      artCache.set(cacheKey, artUrl);
      return artUrl;
    }

    artCache.set(cacheKey, null);
    return null;
  } catch {
    // Don't cache errors — allow retry
    return null;
  }
}

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
 * Falls back to iTunes API for cover art when the stream doesn't provide one.
 */
export function useNowPlaying(enabled: boolean) {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastArtLookupRef = useRef<string>("");

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
          // If no cover art from stream, try iTunes lookup
          if (!parsed.albumArt && (parsed.artist || parsed.title)) {
            const lookupKey = `${parsed.artist}||${parsed.title}`;
            // Only lookup once per unique song
            if (lookupKey !== lastArtLookupRef.current) {
              lastArtLookupRef.current = lookupKey;
              const itunesArt = await fetchITunesArt(
                parsed.artist,
                parsed.title
              );
              if (itunesArt) {
                parsed.albumArt = itunesArt;
              }
            } else {
              // Reuse cached result
              const cached = artCache.get(lookupKey.toLowerCase());
              if (cached) {
                parsed.albumArt = cached;
              }
            }
          }
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
