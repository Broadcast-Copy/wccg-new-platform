/**
 * Music Metadata — fetches album art, streaming links, and artist info
 * via the iTunes Search API (free, no auth required).
 *
 * Provides:
 * - Album artwork (high-res)
 * - Apple Music link
 * - Constructed Spotify / YouTube Music / Amazon Music search URLs
 * - Artist name normalization
 *
 * Results are cached in-memory + sessionStorage for performance.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MusicMetadata {
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null; // 300x300 album art
  artworkUrlLarge: string | null; // 600x600 album art
  previewUrl: string | null; // 30-sec audio preview
  appleMusicUrl: string | null;
  spotifySearchUrl: string;
  youtubeMusicSearchUrl: string;
  amazonMusicSearchUrl: string;
  durationMs: number | null;
  releaseDate: string | null;
  genre: string | null;
}

interface ITunesResult {
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackViewUrl: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  primaryGenreName?: string;
}

interface ITunesResponse {
  resultCount: number;
  results: ITunesResult[];
}

// ---------------------------------------------------------------------------
// Cache (in-memory + sessionStorage)
// ---------------------------------------------------------------------------

const CACHE_PREFIX = "wccg_music_meta_";
const memoryCache = new Map<string, MusicMetadata | null>();

function cacheKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}|${artist.toLowerCase().trim()}`;
}

function getFromCache(key: string): MusicMetadata | null | undefined {
  // Memory cache first
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  // SessionStorage fallback
  try {
    const stored = sessionStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      const parsed = JSON.parse(stored) as MusicMetadata | null;
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // ignore
  }
  return undefined; // not found
}

function setCache(key: string, data: MusicMetadata | null): void {
  memoryCache.set(key, data);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    // storage full — ignore
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clean up song title for better search results.
 * Removes common suffixes like "(Clean)", "(Remix)", "(feat. X)" etc.
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\((?:Clean|Dirty|Explicit|Radio Edit|Album Version)\)/gi, "")
    .replace(/\s*\[(?:Clean|Dirty|Explicit|Radio Edit|Album Version)\]/gi, "")
    .trim();
}

/**
 * Clean artist name — extract primary artist from "X ft. Y" patterns.
 */
function cleanArtist(artist: string): string {
  return artist
    .replace(/\s*(?:ft\.?|feat\.?|featuring|x|&|,)\s*.+$/i, "")
    .trim();
}

/**
 * Build streaming service search URLs.
 */
function buildStreamingUrls(title: string, artist: string) {
  const q = encodeURIComponent(`${title} ${artist}`);
  return {
    spotifySearchUrl: `https://open.spotify.com/search/${q}`,
    youtubeMusicSearchUrl: `https://music.youtube.com/search?q=${q}`,
    amazonMusicSearchUrl: `https://music.amazon.com/search/${q}`,
  };
}

/**
 * Upgrade iTunes artwork URL to higher resolution.
 */
function upgradeArtwork(url: string, size: number): string {
  return url.replace(/\/\d+x\d+bb/, `/${size}x${size}bb`);
}

// ---------------------------------------------------------------------------
// iTunes Search API
// ---------------------------------------------------------------------------

const ITUNES_BASE = "https://itunes.apple.com/search";

/**
 * Search iTunes for a song and return metadata.
 * Uses a 5-second timeout and returns null on failure.
 */
async function searchItunes(
  title: string,
  artist: string,
): Promise<ITunesResult | null> {
  try {
    const cleanedTitle = cleanTitle(title);
    const cleanedArtist = cleanArtist(artist);
    const term = `${cleanedTitle} ${cleanedArtist}`;
    const url = `${ITUNES_BASE}?term=${encodeURIComponent(term)}&media=music&entity=song&limit=3`;

    const resp = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return null;

    const data: ITunesResponse = await resp.json();
    if (data.resultCount === 0 || data.results.length === 0) return null;

    // Try to find exact-ish match
    const lowerTitle = cleanedTitle.toLowerCase();
    const lowerArtist = cleanedArtist.toLowerCase();

    const match = data.results.find((r) => {
      const rTitle = r.trackName.toLowerCase();
      const rArtist = r.artistName.toLowerCase();
      return (
        (rTitle.includes(lowerTitle) || lowerTitle.includes(rTitle)) &&
        (rArtist.includes(lowerArtist) || lowerArtist.includes(rArtist))
      );
    });

    // If no exact match, return the first result (usually close enough)
    return match || data.results[0];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch music metadata for a song.
 * Uses iTunes Search API with in-memory + sessionStorage caching.
 * Returns null if no match found.
 */
export async function fetchMusicMetadata(
  title: string,
  artist: string,
): Promise<MusicMetadata | null> {
  const key = cacheKey(title, artist);

  // Check cache
  const cached = getFromCache(key);
  if (cached !== undefined) return cached;

  // Search iTunes
  const result = await searchItunes(title, artist);

  if (!result) {
    // Cache the miss so we don't re-search
    const fallback: MusicMetadata = {
      title,
      artist,
      album: null,
      artworkUrl: null,
      artworkUrlLarge: null,
      previewUrl: null,
      appleMusicUrl: null,
      durationMs: null,
      releaseDate: null,
      genre: null,
      ...buildStreamingUrls(title, artist),
    };
    setCache(key, fallback);
    return fallback;
  }

  const metadata: MusicMetadata = {
    title: result.trackName,
    artist: result.artistName,
    album: result.collectionName || null,
    artworkUrl: upgradeArtwork(result.artworkUrl100, 300),
    artworkUrlLarge: upgradeArtwork(result.artworkUrl100, 600),
    previewUrl: result.previewUrl || null,
    appleMusicUrl: result.trackViewUrl || null,
    durationMs: result.trackTimeMillis || null,
    releaseDate: result.releaseDate
      ? result.releaseDate.slice(0, 10)
      : null,
    genre: result.primaryGenreName || null,
    ...buildStreamingUrls(title, artist),
  };

  setCache(key, metadata);
  return metadata;
}

/**
 * Get streaming links for a song without calling the API.
 * Used for quick access when full metadata isn't needed.
 */
export function getStreamingLinks(title: string, artist: string) {
  return {
    ...buildStreamingUrls(title, artist),
    appleMusicUrl: null as string | null,
  };
}

/**
 * Batch fetch metadata for multiple songs.
 * Processes in parallel with concurrency limit.
 */
export async function fetchBatchMetadata(
  songs: { title: string; artist: string }[],
  concurrency = 3,
): Promise<Map<string, MusicMetadata | null>> {
  const results = new Map<string, MusicMetadata | null>();

  // Process in batches
  for (let i = 0; i < songs.length; i += concurrency) {
    const batch = songs.slice(i, i + concurrency);
    const promises = batch.map(async (song) => {
      const key = cacheKey(song.title, song.artist);
      const metadata = await fetchMusicMetadata(song.title, song.artist);
      results.set(key, metadata);
    });
    await Promise.all(promises);
  }

  return results;
}
