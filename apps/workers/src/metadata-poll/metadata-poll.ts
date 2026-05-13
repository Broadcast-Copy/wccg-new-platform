/**
 * Metadata-poll worker — keeps mcr_state.now_playing_* in sync with the
 * live audio source.
 *
 * Sources supported via WCCG_METADATA_SOURCE env:
 *   - "icecast"  → polls $WCCG_METADATA_URL/status-json.xsl
 *                  Standard Icecast 2.x JSON status format.
 *   - "shoutcast" → polls $WCCG_METADATA_URL/stats?json=1
 *   - "centova"  → polls Centova Cast public API (URL needs ?xm=1)
 *   - "manual"   → no-op; operator updates via /my/admin/master-control
 *
 * Defaults to "manual" if no env is set (so the worker boots fine on
 * fresh installs without breaking).
 *
 * All sources funnel through the SAME API endpoint:
 *   PATCH $WCCG_API_URL/mcr/metadata
 *
 * Auth: needs WCCG_API_ADMIN_TOKEN (a Supabase access token for any
 * authenticated user — we don't require service-role here since the API
 * accepts any auth'd user for PATCHes today).
 */

import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_POLL_MS = 15_000;

interface Track {
  title: string | null;
  artist: string | null;
  album: string | null;
  source: string;
  listeners: number | null;
  bitrateKbps: number | null;
  signalStatus: 'on_air' | 'silent' | 'off_air' | 'unknown';
}

interface Config {
  source: 'icecast' | 'shoutcast' | 'centova' | 'manual';
  metadataUrl: string | null;   // null when source=manual
  apiUrl: string;
  adminToken: string;
  mountpoint: string | null;    // for icecast multi-mount setups
  pollMs: number;
}

function loadConfig(): Config | null {
  const source = (process.env.WCCG_METADATA_SOURCE || 'manual').toLowerCase();
  if (!['icecast', 'shoutcast', 'centova', 'manual'].includes(source)) {
    console.warn(`[metadata-poll] Unknown WCCG_METADATA_SOURCE=${source}; treating as manual.`);
    return null;
  }
  const apiUrl = process.env.WCCG_API_URL;
  const adminToken = process.env.WCCG_API_ADMIN_TOKEN;
  if (!apiUrl || !adminToken) {
    return null;
  }
  return {
    source: source as Config['source'],
    metadataUrl: process.env.WCCG_METADATA_URL || null,
    apiUrl,
    adminToken,
    mountpoint: process.env.WCCG_METADATA_MOUNT || null,
    pollMs: Number(process.env.WCCG_METADATA_POLL_MS) || DEFAULT_POLL_MS,
  };
}

function splitTitleArtist(streamTitle: string): { title: string | null; artist: string | null } {
  // Icecast/Shoutcast usually format as "Artist - Title". We try a few
  // separators and fall back to title-only.
  const seps = [' - ', ' – ', ' — ', ' | '];
  for (const s of seps) {
    const i = streamTitle.indexOf(s);
    if (i > 0) {
      return {
        artist: streamTitle.slice(0, i).trim(),
        title: streamTitle.slice(i + s.length).trim(),
      };
    }
  }
  return { artist: null, title: streamTitle.trim() || null };
}

async function pollIcecast(c: Config): Promise<Track | null> {
  if (!c.metadataUrl) return null;
  const url = c.metadataUrl.replace(/\/+$/, '') + '/status-json.xsl';
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { ...silent('icecast'), source: 'icecast' };
    const j = (await r.json()) as any;
    const stats = j?.icestats;
    if (!stats) return { ...silent('icecast'), source: 'icecast' };

    // sources can be one object or an array depending on mount count.
    const sources = Array.isArray(stats.source) ? stats.source : stats.source ? [stats.source] : [];
    const src = c.mountpoint
      ? sources.find((s: any) => String(s.listenurl || '').includes(c.mountpoint!))
      : sources[0];
    if (!src) return { ...silent('icecast'), source: 'icecast' };

    const { artist, title } = splitTitleArtist(String(src.title || src.song || ''));
    return {
      title,
      artist,
      album: null,
      source: 'icecast',
      listeners: Number(src.listeners ?? 0) || null,
      bitrateKbps: Number(src.bitrate ?? 0) || null,
      signalStatus: src.title ? 'on_air' : 'silent',
    };
  } catch (e) {
    console.warn(`[metadata-poll] icecast fetch failed: ${(e as Error).message}`);
    return null;
  }
}

async function pollShoutcast(c: Config): Promise<Track | null> {
  if (!c.metadataUrl) return null;
  const url = c.metadataUrl.replace(/\/+$/, '') + '/stats?json=1';
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { ...silent('shoutcast'), source: 'shoutcast' };
    const j = (await r.json()) as any;
    const { artist, title } = splitTitleArtist(String(j?.songtitle || ''));
    return {
      title,
      artist,
      album: null,
      source: 'shoutcast',
      listeners: Number(j?.currentlisteners ?? 0) || null,
      bitrateKbps: Number(j?.bitrate ?? 0) || null,
      signalStatus: j?.streamstatus === 1 ? 'on_air' : 'silent',
    };
  } catch (e) {
    console.warn(`[metadata-poll] shoutcast fetch failed: ${(e as Error).message}`);
    return null;
  }
}

async function pollCentova(c: Config): Promise<Track | null> {
  if (!c.metadataUrl) return null;
  // Centova's public API: /api.php?xm=server.getservicestatus&f=json&a%5Bm%5D=<mount>
  // Simplified: rely on the operator pointing WCCG_METADATA_URL at the
  // Icecast/Shoutcast backend Centova fronts. For genuine Centova-only
  // setups, the operator can set WCCG_METADATA_SOURCE=icecast and use
  // Centova's relay endpoint.
  return pollIcecast(c);
}

function silent(source: string) {
  return {
    title: null, artist: null, album: null,
    source, listeners: 0, bitrateKbps: null,
    signalStatus: 'silent' as const,
  };
}

async function pushUpdate(c: Config, t: Track): Promise<void> {
  const r = await fetch(`${c.apiUrl}/mcr/metadata`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${c.adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: t.title,
      artist: t.artist,
      album: t.album,
      source: t.source,
      listeners: t.listeners,
      bitrateKbps: t.bitrateKbps,
      signalStatus: t.signalStatus,
      startedAt: new Date().toISOString(),
    }),
  });
  if (!r.ok) {
    throw new Error(`PATCH /mcr/metadata -> ${r.status} ${r.statusText}`);
  }
}

let lastSig = '';

export async function runOnce(c: Config): Promise<void> {
  let track: Track | null = null;
  switch (c.source) {
    case 'icecast':   track = await pollIcecast(c);   break;
    case 'shoutcast': track = await pollShoutcast(c); break;
    case 'centova':   track = await pollCentova(c);   break;
    case 'manual':    return;
  }
  if (!track) return;

  // Cheap dedupe — only PATCH when something visible changed.
  const sig = `${track.title}|${track.artist}|${track.signalStatus}|${track.listeners}`;
  if (sig === lastSig) return;
  lastSig = sig;

  try {
    await pushUpdate(c, track);
  } catch (e) {
    console.warn(`[metadata-poll] push failed: ${(e as Error).message}`);
  }
}

export function startMetadataPoll(): void {
  const c = loadConfig();
  if (!c) {
    console.log(
      '[metadata-poll] disabled — need WCCG_API_URL + WCCG_API_ADMIN_TOKEN ' +
      '(and WCCG_METADATA_URL for non-manual sources).',
    );
    return;
  }
  if (c.source === 'manual') {
    console.log('[metadata-poll] source=manual — operators set now-playing via the MCR UI.');
    return;
  }
  console.log(
    `[metadata-poll] source=${c.source} url=${c.metadataUrl} poll=${c.pollMs}ms`,
  );
  void (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await runOnce(c);
      } catch (e) {
        console.error(`[metadata-poll] cycle error: ${(e as Error).message}`);
      }
      await sleep(c.pollMs);
    }
  })();
}
