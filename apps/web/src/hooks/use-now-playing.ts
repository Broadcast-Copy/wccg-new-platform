"use client";

import { useEffect, useRef, useState } from "react";
import { nowPlayingSourceFor } from "@/lib/stations";

interface NowPlayingData {
  title: string;
  artist: string;
  albumArt: string | null;
  streamName: string;
}

const POLL_INTERVAL_MS = 15_000; // 15 seconds

// ── iTunes Cover Art Lookup Cache ───────────────────────────────────
// IceCast only exposes the song title string, so cover art is looked up.
const artCache = new Map<string, string | null>();

async function fetchITunesArt(
  artist: string,
  title: string,
): Promise<string | null> {
  if (!artist && !title) return null;
  const cacheKey = `${artist}||${title}`.toLowerCase();
  if (artCache.has(cacheKey)) return artCache.get(cacheKey) ?? null;
  try {
    const query = encodeURIComponent(`${artist} ${title}`.trim().slice(0, 100));
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=3`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const artUrl =
        (data.results[0].artworkUrl100 as string)?.replace(
          "100x100bb",
          "600x600bb",
        ) || null;
      artCache.set(cacheKey, artUrl);
      return artUrl;
    }
    artCache.set(cacheKey, null);
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse an IceCast `status-json.xsl` payload. The current song lives in
 * `icestats.source.title` as "Artist - Title"; `server_name` is the station.
 * `source` may be a single object or an array (multiple mounts).
 */
function parseIcecast(json: unknown): NowPlayingData | null {
  const stats = (json as { icestats?: { source?: unknown } })?.icestats;
  const srcRaw = stats?.source;
  if (!srcRaw) return null;
  const arr = Array.isArray(srcRaw) ? srcRaw : [srcRaw];
  const src = (arr.find((s) => (s as { title?: string })?.title) ?? arr[0]) as
    | { title?: string; server_name?: string }
    | undefined;
  if (!src) return null;

  const station = (src.server_name || "WCCG 104.5 FM").trim();
  const raw = (src.title || "").trim();
  if (!raw) return { title: "", artist: "", albumArt: null, streamName: station };

  // IceCast titles are "Artist - Song"; split on the first " - ".
  const sep = raw.indexOf(" - ");
  const artist = sep > 0 ? raw.slice(0, sep).trim() : "";
  const title = sep > 0 ? raw.slice(sep + 3).trim() : raw;
  return { title, artist, albumArt: null, streamName: station };
}

/**
 * Parse a SecureNet/Cirrus `<CALL>_history.txt` payload. The current song is the
 * first entry of `playHistory.song[]`, with title/artist already split out.
 */
function parseSecureNet(json: unknown): NowPlayingData | null {
  const songs = (json as { playHistory?: { song?: unknown } })?.playHistory?.song;
  const arr = Array.isArray(songs) ? songs : songs ? [songs] : [];
  const cur = arr[0] as { title?: string; artist?: string; cover?: string } | undefined;
  if (!cur) return null;
  return {
    title: (cur.title || "").trim(),
    artist: (cur.artist || "").trim(),
    albumArt: (cur.cover || "").trim() || null,
    streamName: "WCCG 104.5 FM",
  };
}

/**
 * Polls the currently-playing station's IceCast now-playing JSON.
 * Only polls while `enabled` and while a WCCG stream is loaded.
 *
 * NOTE: requires the IceCast server to send `Access-Control-Allow-Origin`
 * (CORS). Without it the cross-origin fetch is blocked and we keep the last
 * data (audio still plays; the player falls back to the station name).
 */
export function useNowPlaying(enabled: boolean, streamUrl?: string | null) {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastArtLookupRef = useRef<string>("");

  useEffect(() => {
    const source = nowPlayingSourceFor(streamUrl);
    if (!enabled || !source) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const feedUrl = source.url;
    const feedKind = source.kind;

    let cancelled = false;

    async function fetchNowPlaying() {
      try {
        setIsLoading(true);
        const cacheBuster = `_cb=${Date.now()}`;
        const sep = feedUrl.includes("?") ? "&" : "?";
        const response = await fetch(`${feedUrl}${sep}${cacheBuster}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const parsed = feedKind === "securenet" ? parseSecureNet(json) : parseIcecast(json);
        if (!parsed || cancelled) return;

        if (parsed.artist || parsed.title) {
          const lookupKey = `${parsed.artist}||${parsed.title}`;
          if (lookupKey !== lastArtLookupRef.current) {
            lastArtLookupRef.current = lookupKey;
            const itunesArt = await fetchITunesArt(parsed.artist, parsed.title);
            if (itunesArt && !cancelled) parsed.albumArt = itunesArt;
          } else {
            parsed.albumArt = artCache.get(lookupKey.toLowerCase()) ?? null;
          }
        }
        if (!cancelled) setData(parsed);
      } catch {
        // CORS/network — keep last known data (titles need IceCast CORS).
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchNowPlaying();
    intervalRef.current = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, streamUrl]);

  return { data, isLoading };
}
