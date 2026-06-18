/**
 * WCCG self-hosted stations — single source of truth for the live streams.
 *
 * These replaced the old third-party SecureNet stream. Each station is a
 * Centova/IceCast mount on music.wccg1045fm.com; the HTTPS listener is the
 * HTTP port + 1 (8000→8001, 8002→8003, …) so the streams load on the HTTPS
 * site without mixed-content blocking.
 *
 * Now-playing titles come from each IceCast server's /status-json.xsl — which
 * requires the IceCast server to send `Access-Control-Allow-Origin` (CORS) or
 * the browser blocks the cross-origin fetch. Audio playback itself does NOT
 * need CORS (the player uses a media element without crossOrigin).
 */

export interface Station {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  /** HTTPS stream URL (port+1 IceCast SSL listener). */
  streamUrl: string;
  /** Brand logo — used as the cover-art fallback before now-playing art loads. */
  logo: string;
  status: "ACTIVE" | "COMING_SOON";
  sortOrder: number;
}

export const STATIONS: Station[] = [
  {
    id: "stream_hot",
    name: "HOT 104.5 FM",
    slug: "hot",
    description: "Today's Hottest Hits",
    category: "HIP_HOP",
    streamUrl: "https://music.wccg1045fm.com:8001/stream",
    logo: "/images/logos/hot-1045-logo.png",
    status: "ACTIVE",
    sortOrder: 1,
  },
  {
    id: "stream_vibe",
    name: "104.5 THE VIBE",
    slug: "vibe",
    description: "Non-stop Vibes & Chill",
    category: "RNB",
    streamUrl: "https://music.wccg1045fm.com:8003/stream",
    logo: "/images/logos/the-vibe-logo.png",
    status: "ACTIVE",
    sortOrder: 2,
  },
  {
    id: "stream_soul",
    name: "SOUL 104.5 FM",
    slug: "soul",
    description: "Hot R&B and Urban AC",
    category: "RNB",
    streamUrl: "https://music.wccg1045fm.com:8005/stream",
    logo: "/images/logos/soul-1045-logo.png",
    status: "ACTIVE",
    sortOrder: 3,
  },
  {
    id: "stream_yard",
    name: "Yard & Riddim Radio",
    slug: "yard",
    description: "Caribbean & Reggae",
    category: "COMMUNITY",
    streamUrl: "https://music.wccg1045fm.com:8007/stream",
    logo: "/images/logos/yard-riddim-logo.png",
    status: "ACTIVE",
    sortOrder: 4,
  },
  {
    id: "stream_mixsquad",
    name: "MixxSquadd Radio",
    slug: "mixsquad",
    description: "Live Sets, Exclusive Remixes, and High-Energy Mixes",
    // HTTPS will be :8009 once the station is provisioned + has media.
    streamUrl: "https://music.wccg1045fm.com:8009/stream",
    logo: "/images/logos/mix-squad-logo.png",
    category: "HIP_HOP",
    status: "COMING_SOON",
    sortOrder: 5,
  },
];

/** The flagship stream the main "Listen Live" button plays. */
export const DEFAULT_STATION = STATIONS[0]; // HOT 104.5 FM

/** Find a station by the stream URL currently loaded in the player. */
export function stationByStreamUrl(url: string | null | undefined): Station | undefined {
  if (!url) return undefined;
  return STATIONS.find((s) => url.startsWith(s.streamUrl));
}

/** Find a station by its URL slug (e.g. "hot", "vibe"). */
export function stationBySlug(slug: string | null | undefined): Station | undefined {
  if (!slug) return undefined;
  return STATIONS.find((s) => s.slug === slug);
}

/**
 * Find a station by its id (e.g. "stream_hot"). Note: "stream_wccg" (the main
 * flagship label used in the show schedule) has no dedicated station entry —
 * it maps to the DEFAULT_STATION / the main Listen experience.
 */
export function stationById(id: string | null | undefined): Station | undefined {
  if (!id) return undefined;
  return STATIONS.find((s) => s.id === id);
}

/**
 * IceCast JSON now-playing endpoint for one of our streams (root-level, not
 * under the mount). Returns null for non-WCCG URLs.
 */
export function nowPlayingUrlFor(streamUrl: string | null | undefined): string | null {
  if (!streamUrl) return null;
  try {
    const u = new URL(streamUrl);
    if (!u.hostname.endsWith("wccg1045fm.com")) return null;
    return `${u.protocol}//${u.host}/status-json.xsl`;
  } catch {
    return null;
  }
}
