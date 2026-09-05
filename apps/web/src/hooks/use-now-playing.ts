"use client";

import { useEffect, useRef, useState } from "react";
import { nowPlayingSourceFor } from "@/lib/stations";

interface NowPlayingData {
  title: string;
  artist: string;
  albumArt: string | null;
  streamName: string;
  /** True while the station is in a break — Cirrus `programType` ADV/PRL. */
  isAd?: boolean;
  /** Length of the current item in seconds, when the feed reports one. */
  durationSec?: number;
  /** Client clock (ms) at the changeover — see the note in the poll loop. */
  startedAt?: number;
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
 * Parse a SecureNet/Cirrus `<CALL>.xml` payload — the single item on air right
 * now. Richer than the older `_history.txt` feed: it carries `programType`, so
 * a commercial break is distinguishable from a song instead of leaving the last
 * song on screen for the length of the break. It also carries `duration`, which
 * gives consumers enough for a progress bar.
 */
function parseSecureNetXml(xml: string): NowPlayingData | null {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml.trim(), "text/xml");
  } catch {
    return null;
  }
  if (doc.getElementsByTagName("parsererror").length > 0) return null;

  const tag = (name: string) =>
    (doc.getElementsByTagName(name)[0]?.textContent ?? "").trim();

  const programType = tag("programType").toUpperCase();
  const title = tag("title");
  if (!programType && !title) return null;

  const streamName = "WCCG 104.5 FM";
  const duration = Number(tag("duration"));
  const durationSec =
    Number.isFinite(duration) && duration > 0 ? duration : undefined;

  // ADV = ad break, PRL = pre-roll. Neither is a song, so blank the title and
  // let consumers fall back to the station name the way they already do.
  if (programType === "ADV" || programType === "PRL") {
    return {
      title: "",
      artist: "",
      albumArt: null,
      streamName,
      isAd: true,
      durationSec,
    };
  }

  return {
    title,
    artist: tag("artist"),
    albumArt: tag("cover") || null,
    streamName,
    isAd: false,
    durationSec,
  };
}

/**
 * Polls the currently-playing station's now-playing feed.
 * Only polls while `enabled` and while a WCCG stream is loaded.
 *
 * NOTE: requires the feed to send `Access-Control-Allow-Origin` (CORS). The
 * Cirrus feed does; our own IceCast servers must be configured to. Without it
 * the cross-origin fetch is blocked and we keep the last data (audio still
 * plays; the player falls back to the station name).
 */
export function useNowPlaying(enabled: boolean, streamUrl?: string | null) {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastArtLookupRef = useRef<string>("");
  const lastItemKeyRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);

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
    lastItemKeyRef.current = "";

    async function fetchNowPlaying() {
      try {
        setIsLoading(true);
        const cacheBuster = `_cb=${Date.now()}`;
        const sep = feedUrl.includes("?") ? "&" : "?";
        const response = await fetch(`${feedUrl}${sep}${cacheBuster}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed =
          feedKind === "securenet"
            ? parseSecureNetXml(await response.text())
            : parseIcecast(await response.json());
        if (!parsed || cancelled) return;

        // Cirrus reports `programStartTS` as a bare local-time string with no
        // zone, so it can't be trusted for elapsed time. Stamp the changeover
        // off the client clock instead — the error is bounded by the poll
        // interval, which is close enough for a progress bar.
        const itemKey = parsed.isAd
          ? "__break__"
          : `${parsed.artist}||${parsed.title}`;
        if (itemKey !== lastItemKeyRef.current) {
          lastItemKeyRef.current = itemKey;
          startedAtRef.current = Date.now();
        }
        parsed.startedAt = startedAtRef.current;

        // Only look art up when the feed didn't supply a cover, and never
        // during a break.
        if (!parsed.isAd && !parsed.albumArt && (parsed.artist || parsed.title)) {
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
