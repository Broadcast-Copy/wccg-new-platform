/**
 * DJ drop filesystem watcher — Phase B/DJ.
 *
 * Architecture:
 *
 *   $WCCG_DROP_ROOT/
 *     ├── incoming/<dj-slug>/        ← DJs FTP into here (one chrooted account each)
 *     └── ready/                     ← Radio Spider FTP-pulls from here
 *
 * Workflow:
 *   1. Operator sets up FTP on the VPS (vsftpd / proftpd / what they already have).
 *      Each DJ gets a chrooted FTP account whose home is `incoming/<dj-slug>/`.
 *      Radio Spider gets one read-only account whose home is `ready/`.
 *   2. This worker polls `incoming/` every N seconds (default 10s) for new
 *      audio files matching `DJB_NNNNN.{mp3,wav,flac}`.
 *   3. For each new file:
 *        a) Verify the DJ owns that file_code (look up dj_slots).
 *        b) Compute SHA-256, size.
 *        c) Upsert a `dj_drops` row, status='uploaded', source='ftp'.
 *        d) Copy the validated file to `ready/<file_code>.<ext>` so Radio
 *           Spider sees the canonical name.
 *        e) Mark the file processed (touch `<filename>.processed` sentinel)
 *           — we leave the original in place so the DJ can see what was
 *           uploaded; a separate retention worker can prune it later.
 *   4. Errors are surfaced in `dj_ftp_log` with action='put' and ok=false.
 *
 * No node deps beyond `node:fs/promises`. The worker is a poll loop, not a
 * filesystem-event listener — that's robust against NFS, FTP-over-SMB, and
 * Windows shares which all have flaky/missing inotify.
 */

import { promises as fs } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FILE_CODE_RE = /^(DJB_\d{5})\.(mp3|wav|flac)$/i;
const DEFAULT_POLL_MS = 10_000;

let _db: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL + SUPABASE_SECRET_KEY required');
  _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _db;
}

function isoMondayOfNowET(): string {
  const nowEt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nowEt.getDay();
  const offset = (day + 6) % 7;
  const mon = new Date(nowEt);
  mon.setDate(nowEt.getDate() - offset);
  return mon.toISOString().slice(0, 10);
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listDjFolders(incomingRoot: string): Promise<string[]> {
  if (!(await exists(incomingRoot))) return [];
  const entries = await fs.readdir(incomingRoot, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function listAudioFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && FILE_CODE_RE.test(e.name))
    .map((e) => e.name);
}

async function ingestFile(opts: {
  djSlug: string;
  djId: string;
  fileCode: string;
  ext: string;             // '.mp3' / '.wav' / '.flac'
  srcPath: string;
  readyDir: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { djSlug, djId, fileCode, ext, srcPath, readyDir } = opts;
  let buf: Buffer;
  try {
    buf = await fs.readFile(srcPath);
  } catch (e) {
    return { ok: false, error: `read failed: ${(e as Error).message}` };
  }
  const checksum = createHash('sha256').update(buf).digest('hex');

  // 1. Find the slot that owns this file code for this DJ.
  const { data: slots } = await db().from('dj_slots').select('id, file_codes').eq('dj_id', djId);
  const slot = (slots ?? []).find((s: any) => (s.file_codes ?? []).includes(fileCode));
  if (!slot) {
    return { ok: false, error: `${fileCode} not assigned to ${djSlug}` };
  }

  const weekOf = isoMondayOfNowET();

  // 2. Skip if a drop with this exact checksum already exists for this week.
  const { data: priorDrop } = await db().from('dj_drops')
    .select('id, checksum_sha256')
    .eq('slot_id', slot.id)
    .eq('file_code', fileCode)
    .eq('week_of', weekOf)
    .maybeSingle();
  if (priorDrop && priorDrop.checksum_sha256 === checksum) {
    return { ok: true }; // already-ingested; nothing to do
  }

  // 3. Mirror the bytes into ready/<fileCode>.<ext> so Radio Spider sees it
  //    with its canonical name regardless of which DJ uploaded it.
  await ensureDir(readyDir);
  const readyPath = join(readyDir, `${fileCode}${ext}`);
  await fs.writeFile(readyPath, buf);

  // 4. Upsert the drop row.
  const stat = await fs.stat(srcPath);
  await db().from('dj_drops').upsert(
    {
      dj_id: djId,
      slot_id: slot.id,
      file_code: fileCode,
      week_of: weekOf,
      status: 'uploaded',
      source: 'ftp',
      storage_path: readyPath,
      size_bytes: buf.length,
      format: ext.slice(1),
      checksum_sha256: checksum,
      uploaded_at: new Date(stat.mtime).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slot_id,file_code,week_of' } as any,
  );

  // 5. Audit log.
  await db().from('dj_ftp_log').insert({
    username: `wccg-${djSlug}`,
    action: 'put',
    path: srcPath,
    bytes: buf.length,
    ok: true,
  });

  return { ok: true };
}

async function logFailure(djSlug: string, srcPath: string, error: string) {
  await db().from('dj_ftp_log').insert({
    username: `wccg-${djSlug}`,
    action: 'put',
    path: srcPath,
    ok: false,
    error,
  });
}

/**
 * One full pass over the incoming tree. Public for tests + manual triggers.
 */
export async function scanOnce(): Promise<{ scanned: number; ingested: number; errors: number }> {
  const root = process.env.WCCG_DROP_ROOT;
  if (!root) {
    console.warn('[dj-drops] WCCG_DROP_ROOT not set — watcher disabled');
    return { scanned: 0, ingested: 0, errors: 0 };
  }
  const incomingRoot = join(root, 'incoming');
  const readyDir = join(root, 'ready');
  await ensureDir(incomingRoot);
  await ensureDir(readyDir);

  let scanned = 0;
  let ingested = 0;
  let errors = 0;

  // Cache DJ slug→id.
  const { data: djs } = await db().from('djs').select('id, slug, is_active').eq('is_active', true);
  const djBySlug = new Map((djs ?? []).map((d: any) => [d.slug, d.id]));

  const folders = await listDjFolders(incomingRoot);
  for (const folder of folders) {
    const djId = djBySlug.get(folder);
    if (!djId) {
      // Unknown folder — log once and move on.
      await logFailure(folder, join(incomingRoot, folder), 'unknown DJ slug');
      continue;
    }
    const dir = join(incomingRoot, folder);
    const files = await listAudioFiles(dir);
    for (const filename of files) {
      scanned++;
      const m = FILE_CODE_RE.exec(filename);
      if (!m) continue;
      const fileCode = m[1].toUpperCase();
      const ext = `.${m[2].toLowerCase()}`;
      const srcPath = join(dir, filename);

      // Sentinel marker — skip if we already processed this exact file.
      const sentinel = `${srcPath}.processed`;
      if (await exists(sentinel)) continue;

      try {
        const r = await ingestFile({
          djSlug: folder,
          djId: djId as string,
          fileCode,
          ext,
          srcPath,
          readyDir,
        });
        if (r.ok) {
          await fs.writeFile(sentinel, new Date().toISOString());
          ingested++;
        } else {
          await logFailure(folder, srcPath, r.error ?? 'unknown');
          errors++;
        }
      } catch (e) {
        await logFailure(folder, srcPath, (e as Error).message);
        errors++;
      }
    }
  }
  return { scanned, ingested, errors };
}

/**
 * Long-running poll loop. Idempotent — safe to call multiple times in dev.
 */
let watcherStarted = false;
export function startDjDropsWatcher() {
  if (watcherStarted) return;
  if (process.env.DJ_DROPS_WATCHER_DISABLED === 'true') {
    console.log('[dj-drops] watcher disabled (DJ_DROPS_WATCHER_DISABLED=true)');
    return;
  }
  if (!process.env.WCCG_DROP_ROOT) {
    console.log('[dj-drops] WCCG_DROP_ROOT not set — watcher disabled');
    return;
  }
  watcherStarted = true;
  const pollMs = Number(process.env.DJ_DROPS_POLL_MS ?? DEFAULT_POLL_MS);
  console.log(
    `[dj-drops] watching ${process.env.WCCG_DROP_ROOT}/incoming every ${pollMs}ms; mirror → ${process.env.WCCG_DROP_ROOT}/ready`,
  );

  void (async function loop() {
    while (true) {
      try {
        const r = await scanOnce();
        if (r.scanned > 0) {
          console.log(`[dj-drops] scanned=${r.scanned} ingested=${r.ingested} errors=${r.errors}`);
        }
      } catch (e) {
        console.error('[dj-drops] scan failed:', (e as Error).message);
      }
      await new Promise((res) => setTimeout(res, pollMs));
    }
  })();
}
