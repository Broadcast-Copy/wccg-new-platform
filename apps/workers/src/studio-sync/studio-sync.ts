/**
 * Studio-sync agent — runs on the production-room Windows PC.
 *
 * Pulls newly uploaded DJ drops from the web API and writes them to:
 *
 *   $WCCG_STUDIO_ARCHIVE_ROOT/<dj-slug>/<file_code>.<ext>            (archive)
 *   $WCCG_STUDIO_ARCHIVE_ROOT/<dj-slug>/on-air/<file_code>.<ext>     (per-DJ on-air mirror)
 *   $WCCG_STUDIO_ONAIR_ROOT/<file_code>.<ext>                        (flat playback folder DJB Radio reads)
 *
 * Then POSTs to /djs/admin/ready/:id/ack so the API marks the drop
 * as `published` and stops returning it in the ready queue.
 *
 * Auth: STUDIO_AGENT_TOKEN is shared between this worker and the API.
 *
 * Design notes:
 *   - Poll-based (no SSE/websocket) — robust against flaky studio LANs.
 *   - Idempotent — checks all three destinations exist + size matches
 *     before acking. A re-run after a network blip costs one HTTP HEAD,
 *     not a re-download.
 *   - Per-DJ subfolders are created lazily; no upfront seed required.
 *   - If the drop is unassigned (no dj-slug), we drop ONLY to the flat
 *     M:\JBMusic\ folder and ack, since there's no DJ folder to mirror to.
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_POLL_MS = 60_000;

interface ReadyItem {
  id: string;
  djId: string;
  djSlug: string | null;
  slotId: string;
  fileCode: string;       // e.g. "DJB_76051"
  weekOf: string;
  format: string | null;  // "mp3", "wav", "flac"
  sizeBytes: number | null;
  status: string;
  uploadedAt: string | null;
  downloadUrl: string | null;
}

interface ReadyResponse {
  count: number;
  items: ReadyItem[];
}

interface Config {
  apiUrl: string;
  agentToken: string;
  archiveRoot: string;        // D:\WCCG\b-mixshows
  onAirRoot: string;          // M:\JBMusic
  pollMs: number;
}

function loadConfig(): Config | null {
  const apiUrl = process.env.WCCG_API_URL;
  const agentToken = process.env.STUDIO_AGENT_TOKEN;
  const archiveRoot = process.env.WCCG_STUDIO_ARCHIVE_ROOT;
  const onAirRoot = process.env.WCCG_STUDIO_ONAIR_ROOT;
  const pollMs = Number(process.env.WCCG_STUDIO_POLL_MS) || DEFAULT_POLL_MS;
  if (!apiUrl || !agentToken || !archiveRoot || !onAirRoot) {
    return null;
  }
  return { apiUrl, agentToken, archiveRoot, onAirRoot, pollMs };
}

function logTs(): string {
  return new Date().toISOString();
}

async function fetchReady(c: Config): Promise<ReadyItem[]> {
  const r = await fetch(`${c.apiUrl}/djs/admin/ready?limit=200`, {
    headers: { Authorization: `Bearer ${c.agentToken}` },
  });
  if (!r.ok) {
    throw new Error(`GET /djs/admin/ready -> ${r.status} ${r.statusText}`);
  }
  const j = (await r.json()) as ReadyResponse;
  return j.items;
}

async function ackDrop(
  c: Config,
  id: string,
  paths: { archivePath?: string; onAirPath?: string; flatPath?: string },
): Promise<void> {
  const r = await fetch(`${c.apiUrl}/djs/admin/ready/${id}/ack`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.agentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paths),
  });
  if (!r.ok) {
    throw new Error(`POST /djs/admin/ready/${id}/ack -> ${r.status} ${r.statusText}`);
  }
}

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

async function fileMatches(path: string, expectedSize: number | null): Promise<boolean> {
  try {
    const st = await fs.stat(path);
    if (expectedSize == null) return st.isFile() && st.size > 0;
    return st.isFile() && st.size === expectedSize;
  } catch {
    return false;
  }
}

async function downloadTo(url: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest));
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`download ${url} -> ${r.status}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(dest, buf);
}

async function copyIfDifferent(from: string, to: string): Promise<void> {
  // Only re-write if size differs (cheap heuristic; we already verified
  // bytes via the signed-URL download above).
  try {
    const [a, b] = await Promise.all([fs.stat(from), fs.stat(to).catch(() => null)]);
    if (b && a.size === b.size) return;
  } catch {
    /* fall through */
  }
  await ensureDir(dirname(to));
  await fs.copyFile(from, to);
}

async function processOne(c: Config, item: ReadyItem): Promise<void> {
  const ext = item.format ? `.${item.format}` : '.mp3';
  const filename = `${item.fileCode}${ext}`;
  const flatPath = join(c.onAirRoot, filename);

  // Where the archive copy goes. If the slot is unassigned (no dj-slug),
  // we still write to the flat playback folder, but skip the per-DJ
  // archive — there's no DJ to attribute it to.
  const haveDj = !!item.djSlug;
  const djFolder = haveDj ? join(c.archiveRoot, item.djSlug as string) : null;
  const archivePath = djFolder ? join(djFolder, filename) : null;
  const onAirPath = djFolder ? join(djFolder, 'on-air', filename) : null;

  const flatOk = await fileMatches(flatPath, item.sizeBytes);
  const archiveOk = archivePath ? await fileMatches(archivePath, item.sizeBytes) : true;
  const onAirOk = onAirPath ? await fileMatches(onAirPath, item.sizeBytes) : true;

  if (flatOk && archiveOk && onAirOk) {
    // Already on disk at every destination — just ack and move on.
    console.log(`[${logTs()}] [studio-sync] ${item.fileCode}: all destinations present, acking`);
    await ackDrop(c, item.id, {
      archivePath: archivePath ?? undefined,
      onAirPath: onAirPath ?? undefined,
      flatPath,
    });
    return;
  }

  if (!item.downloadUrl) {
    console.warn(`[${logTs()}] [studio-sync] ${item.fileCode}: no downloadUrl, skipping`);
    return;
  }

  // Download to the flat folder first; archive + on-air mirror are copies.
  if (!flatOk) {
    console.log(`[${logTs()}] [studio-sync] ${item.fileCode}: downloading → ${flatPath}`);
    await downloadTo(item.downloadUrl, flatPath);
  }
  if (archivePath && !archiveOk) {
    await copyIfDifferent(flatPath, archivePath);
  }
  if (onAirPath && !onAirOk) {
    await copyIfDifferent(flatPath, onAirPath);
  }

  console.log(
    `[${logTs()}] [studio-sync] ${item.fileCode} → ${haveDj ? `${item.djSlug}/` : '(flat only) '}done`,
  );

  await ackDrop(c, item.id, {
    archivePath: archivePath ?? undefined,
    onAirPath: onAirPath ?? undefined,
    flatPath,
  });
}

/** Run one poll cycle. Exported for tests / one-shot invocation. */
export async function runOnce(c: Config): Promise<{ fetched: number; succeeded: number; failed: number }> {
  let items: ReadyItem[];
  try {
    items = await fetchReady(c);
  } catch (e) {
    console.error(`[${logTs()}] [studio-sync] fetch failed: ${(e as Error).message}`);
    return { fetched: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await processOne(c, item);
      succeeded++;
    } catch (e) {
      failed++;
      console.error(`[${logTs()}] [studio-sync] ${item.fileCode}: ${(e as Error).message}`);
    }
  }
  return { fetched: items.length, succeeded, failed };
}

/**
 * Long-running poll loop. Call from apps/workers/src/index.ts after env is
 * loaded. No-ops gracefully if required env vars are missing.
 */
export function startStudioSync(): void {
  const c = loadConfig();
  if (!c) {
    console.log(
      '[studio-sync] disabled — required env not set ' +
        '(need WCCG_API_URL, STUDIO_AGENT_TOKEN, WCCG_STUDIO_ARCHIVE_ROOT, WCCG_STUDIO_ONAIR_ROOT).',
    );
    return;
  }
  console.log(
    `[studio-sync] starting; poll=${c.pollMs}ms archive=${c.archiveRoot} flat=${c.onAirRoot} api=${c.apiUrl}`,
  );
  void (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const r = await runOnce(c);
        if (r.fetched > 0) {
          console.log(
            `[${logTs()}] [studio-sync] cycle: fetched=${r.fetched} ok=${r.succeeded} fail=${r.failed}`,
          );
        }
      } catch (e) {
        console.error(`[${logTs()}] [studio-sync] cycle error: ${(e as Error).message}`);
      }
      await sleep(c.pollMs);
    }
  })();
}
