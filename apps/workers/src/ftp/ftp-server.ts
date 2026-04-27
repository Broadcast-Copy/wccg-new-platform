/**
 * WCCG FTP server — inbound DJ uploads + outbound automation pickup.
 *
 * One server, two roles:
 *
 *   - role='dj'         (per DJ)
 *       VFS root: /incoming/
 *       Permissions: read + write + delete (only their own files this week)
 *       Workflow: drop a DJB_NNNNN.{mp3,wav,flac} file → it's validated +
 *                 ingested into the same dj_drops pipeline as the web portal.
 *
 *   - role='automation' (one shared account)
 *       VFS root: /ready/
 *       Permissions: read-only
 *       Contents: the latest validated cart per file_code, named exactly
 *                 like the on-air automation expects (DJB_NNNNN.mp3).
 *                 Your radio automation software polls /ready/ on whatever
 *                 cadence it likes and pulls the canonical files.
 *
 * Auth: scrypt-hashed passwords stored in `dj_ftp_accounts`.
 * Storage: backed by Supabase Storage bucket `dj-drops` (private). The FTP
 * server proxies LIST / RETR / STOR through to Storage — no shared volume
 * needed, deploys to any container host.
 *
 * Operator config (env):
 *   FTP_PORT              default 2121 (use 21 if you have a privileged port)
 *   FTP_PASV_URL          public hostname/IP for PASV mode (REQUIRED in prod)
 *   FTP_PASV_RANGE        passive port range, e.g. "30000-30009"
 *   FTP_TLS_CERT, FTP_TLS_KEY  paths to PEM files for FTPS (recommended)
 *   FTP_DISABLED=true     to skip starting the server
 */

import { FtpSrv, FileSystem } from 'ftp-srv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const STORAGE_BUCKET = 'dj-drops';
const READY_PREFIX = '_ready/';                 // namespace inside the same bucket
const FILE_CODE_RE = /^DJB_\d{5}$/;
const VALID_EXT = ['.mp3', '.wav', '.flac'];

// ─── Supabase client (service role) ────────────────────────────────────────
let _db: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL + SUPABASE_SECRET_KEY required for FTP server');
  _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _db;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function verifyPassword(plaintext: string, stored: string): boolean {
  if (!stored?.startsWith('scrypt$')) return false;
  const [, salt, hashHex] = stored.split('$');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(plaintext, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isoMondayOfNowET(): string {
  const nowEt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nowEt.getDay();
  const offset = (day + 6) % 7;
  const mon = new Date(nowEt);
  mon.setDate(nowEt.getDate() - offset);
  return mon.toISOString().slice(0, 10);
}

function logFtp(action: string, ctx: {
  username?: string;
  ip?: string;
  path?: string;
  bytes?: number;
  ok?: boolean;
  error?: string;
}) {
  void db().from('dj_ftp_log').insert({
    username: ctx.username ?? null,
    ip: ctx.ip ?? null,
    action,
    path: ctx.path ?? null,
    bytes: ctx.bytes ?? null,
    ok: ctx.ok ?? true,
    error: ctx.error ?? null,
  });
}

// ─── Virtual filesystem ────────────────────────────────────────────────────
//
// ftp-srv lets us subclass FileSystem to define what `LIST`, `RETR`, `STOR`,
// `DELE` actually do. We map paths to Storage operations.
//
// DJ user paths:
//    /incoming/                      → list this week's expected file codes
//    /incoming/DJB_76051.mp3         → upload (STOR) or replace
//
// Automation user paths:
//    /ready/                         → list the canonical cart pool
//    /ready/DJB_76051.mp3            → download (RETR) the latest validated drop
//
// ───────────────────────────────────────────────────────────────────────────

interface FtpUserCtx {
  username: string;
  role: 'dj' | 'automation' | 'admin';
  djId: string | null;
  djSlug: string | null;
  ip: string;
}

class WccgFs extends FileSystem {
  private user: FtpUserCtx;

  // ftp-srv passes the connection on construction; we squirrel the user info onto it.
  constructor(connection: any, opts?: any) {
    super(connection, opts);
    this.user = (connection as any).__wccg as FtpUserCtx;
  }

get(filename: string) {
    return Promise.resolve({
      name: filename,
      size: 0,
      isDirectory: () => filename === '/' || filename.endsWith('/'),
      mode: 0o755,
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
    } as any);
  }

async list(_path: string = '.') {
    const path = normalizePath(_path);
    const dir = path === '/' ? this.defaultDir() : path;

    // List operations are always rooted at the user's allowed area.
    if (this.user.role === 'dj' && dir.startsWith('/incoming')) {
      return this.listDjIncoming();
    }
    if (this.user.role === 'automation' && dir.startsWith('/ready')) {
      return this.listAutomationReady();
    }
    return [];
  }

async chdir(_path: string) {
    const path = normalizePath(_path);
    if (path === '/' || path === '') return this.defaultDir();
    if (this.user.role === 'dj' && path.startsWith('/incoming')) return '/incoming';
    if (this.user.role === 'automation' && path.startsWith('/ready')) return '/ready';
    throw new Error('Forbidden path');
  }

async write(filename: string, options?: { append?: boolean; start?: number }) {
    if (this.user.role !== 'dj') throw new Error('Read-only account');
    const base = baseName(filename);
    if (!base) throw new Error('Invalid filename');

    const { fileCode, ext } = parseDjbName(base);
    if (!fileCode) {
      logFtp('put', { username: this.user.username, ip: this.user.ip, path: filename, ok: false, error: 'bad-name' });
      throw new Error(`Invalid filename. Expected DJB_NNNNN.{mp3|wav|flac}`);
    }

    // Verify this DJ owns this file code (in any slot).
    const owned = await djOwnsFileCode(this.user.djId!, fileCode);
    if (!owned) {
      logFtp('put', { username: this.user.username, ip: this.user.ip, path: filename, ok: false, error: 'not-assigned' });
      throw new Error(`${fileCode} is not assigned to ${this.user.djSlug}`);
    }

    const { Writable } = await import('node:stream');
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    });
    // ftp-srv awaits the 'close' event then asks us for the resulting stream.
    // We hook our own 'finish' handler to do the Storage write.
    stream.on('finish', async () => {
      const buf = Buffer.concat(chunks);
      const weekOf = isoMondayOfNowET();
      const storagePath = `${this.user.djSlug}/${weekOf}/${fileCode}${ext}`;
      try {
        const { error } = await db().storage.from(STORAGE_BUCKET).upload(storagePath, buf, {
          contentType: mimeFor(ext),
          upsert: true,
        });
        if (error) throw error;

        // Find the slot id for the upsert.
        const { data: slots } = await db().from('dj_slots')
          .select('id, file_codes')
          .eq('dj_id', this.user.djId!);
        const slot = (slots ?? []).find((s: any) => (s.file_codes ?? []).includes(fileCode));

        await db().from('dj_drops').upsert(
          {
            dj_id: this.user.djId,
            slot_id: slot?.id,
            file_code: fileCode,
            week_of: weekOf,
            status: 'uploaded',
            source: 'ftp',
            storage_path: storagePath,
            size_bytes: buf.length,
            format: ext.slice(1),
            checksum_sha256: createHash('sha256').update(buf).digest('hex'),
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slot_id,file_code,week_of' } as any,
        );

        // Mirror to /ready/ with canonical name so the automation account sees it.
        await db().storage.from(STORAGE_BUCKET).upload(
          `${READY_PREFIX}${fileCode}${ext}`,
          buf,
          { contentType: mimeFor(ext), upsert: true },
        );

        logFtp('put', { username: this.user.username, ip: this.user.ip, path: filename, bytes: buf.length, ok: true });
      } catch (e) {
        logFtp('put', { username: this.user.username, ip: this.user.ip, path: filename, ok: false, error: (e as Error).message });
      }
    });
    return { stream, clientPath: filename };
  }

async read(filename: string) {
    if (this.user.role !== 'automation' && this.user.role !== 'admin') {
      throw new Error('Read forbidden for this account');
    }
    const base = baseName(filename);
    const { fileCode, ext } = parseDjbName(base);
    if (!fileCode) throw new Error('Unknown file');

    // The /ready/ pool is the canonical cart per file_code (latest validated).
    const storagePath = `${READY_PREFIX}${fileCode}${ext}`;
    const { data, error } = await db().storage.from(STORAGE_BUCKET).download(storagePath);
    if (error || !data) {
      logFtp('get', { username: this.user.username, ip: this.user.ip, path: filename, ok: false, error: error?.message });
      throw new Error('File not found');
    }
    const ab = await data.arrayBuffer();
    const buf = Buffer.from(ab);
    const { Readable } = await import('node:stream');
    logFtp('get', { username: this.user.username, ip: this.user.ip, path: filename, bytes: buf.length, ok: true });
    return { stream: Readable.from(buf), clientPath: filename };
  }

async delete(filename: string) {
    if (this.user.role !== 'dj') throw new Error('Forbidden');
    const base = baseName(filename);
    const { fileCode, ext } = parseDjbName(base);
    if (!fileCode) throw new Error('Bad filename');
    const owned = await djOwnsFileCode(this.user.djId!, fileCode);
    if (!owned) throw new Error('Not your file');
    const weekOf = isoMondayOfNowET();
    const storagePath = `${this.user.djSlug}/${weekOf}/${fileCode}${ext}`;
    await db().storage.from(STORAGE_BUCKET).remove([storagePath]);
    await db().from('dj_drops')
      .update({ status: 'pending', storage_path: null, updated_at: new Date().toISOString() })
      .eq('dj_id', this.user.djId)
      .eq('file_code', fileCode)
      .eq('week_of', weekOf);
    logFtp('delete', { username: this.user.username, ip: this.user.ip, path: filename, ok: true });
    return { clientPath: filename };
  }

  async mkdir(_path: string): Promise<unknown> { throw new Error('Forbidden'); }
  async rename(_from: string, _to: string): Promise<unknown> { throw new Error('Forbidden'); }
  async chmod(_path: string, _mode: number): Promise<unknown> { throw new Error('Forbidden'); }

  // ─── List helpers ───────────────────────────────────────────────────────

  private defaultDir(): string {
    if (this.user.role === 'automation') return '/ready';
    return '/incoming';
  }

  private async listDjIncoming() {
    const { data: slots } = await db().from('dj_slots')
      .select('file_codes')
      .eq('dj_id', this.user.djId!);
    const codes = new Set<string>();
    for (const s of slots ?? []) for (const c of s.file_codes ?? []) codes.add(c);

    const weekOf = isoMondayOfNowET();
    const { data: drops } = await db().from('dj_drops')
      .select('file_code, format, size_bytes, uploaded_at')
      .eq('dj_id', this.user.djId!)
      .eq('week_of', weekOf);
    const byCode = new Map((drops ?? []).map((d: any) => [d.file_code as string, d]));

    return Array.from(codes).map((code) => {
      const d: any = byCode.get(code);
      const ext = d?.format ? `.${d.format}` : '.mp3';
      return fileEntry(`${code}${ext}`, d?.size_bytes ?? 0, d?.uploaded_at ?? new Date());
    });
  }

  private async listAutomationReady() {
    // List everything in the /_ready/ namespace.
    const { data, error } = await db().storage.from(STORAGE_BUCKET).list(READY_PREFIX.slice(0, -1), {
      limit: 1000,
    });
    if (error || !data) return [];
    return data
      .filter((o) => o.name && /\.(mp3|wav|flac)$/i.test(o.name))
      .map((o) => fileEntry(o.name, (o.metadata as any)?.size ?? 0, (o as any).updated_at ?? new Date()));
  }
}

function fileEntry(name: string, size: number, mtime: Date | string): any {
  return {
    name,
    size,
    isDirectory: () => false,
    mode: 0o644,
    mtime: new Date(mtime),
    atime: new Date(mtime),
    ctime: new Date(mtime),
  };
}

function baseName(p: string): string {
  return (p.split('/').pop() ?? '').trim();
}

function parseDjbName(name: string): { fileCode: string | null; ext: string } {
  const m = name.match(/^(DJB_\d{5})\.(mp3|wav|flac)$/i);
  if (!m) return { fileCode: null, ext: '' };
  return { fileCode: m[1].toUpperCase(), ext: `.${m[2].toLowerCase()}` };
}

function mimeFor(ext: string) {
  switch (ext) {
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.flac': return 'audio/flac';
    default: return 'application/octet-stream';
  }
}

function normalizePath(p: string): string {
  if (!p) return '/';
  return ('/' + p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')).replace('//', '/');
}

async function djOwnsFileCode(djId: string, fileCode: string): Promise<boolean> {
  const { data } = await db().from('dj_slots').select('file_codes').eq('dj_id', djId);
  for (const s of data ?? []) if ((s.file_codes ?? []).includes(fileCode)) return true;
  return false;
}

// ─── Public start function ─────────────────────────────────────────────────

export function startFtpServer() {
  if (process.env.FTP_DISABLED === 'true') {
    console.log('[ftp] disabled (FTP_DISABLED=true)');
    return;
  }

  const port = Number(process.env.FTP_PORT ?? 2121);
  const pasvUrl = process.env.FTP_PASV_URL ?? '127.0.0.1';
  const pasvRange = process.env.FTP_PASV_RANGE ?? '30000-30009';

  const tlsCert = process.env.FTP_TLS_CERT;
  const tlsKey = process.env.FTP_TLS_KEY;
  const useTls = tlsCert && tlsKey;

  const url = `ftp://0.0.0.0:${port}`;

  const opts: any = {
    url,
    pasv_url: pasvUrl,
    pasv_min: Number(pasvRange.split('-')[0]),
    pasv_max: Number(pasvRange.split('-')[1]),
    anonymous: false,
    greeting: ['Welcome to WCCG 104.5 FM', 'Drop your mixes in /incoming/'],
    file_format: 'ep_lf',
    log: { level: 'warn' } as any,
  };
  if (useTls) {
    opts.tls = {
      key: readFileSync(tlsKey!),
      cert: readFileSync(tlsCert!),
    };
  }

  const ftp = new FtpSrv(opts);

  ftp.on('login', async ({ connection, username, password }, resolve, reject) => {
    const ip = (connection as any).ip ?? 'unknown';
    try {
      const { data: row } = await db().from('dj_ftp_accounts')
        .select('*, djs:dj_id(slug)')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();
      if (!row || !verifyPassword(password, row.password_hash)) {
        logFtp('login_fail', { username, ip, ok: false, error: 'bad-creds' });
        return reject(new Error('Bad credentials'));
      }
      await db().from('dj_ftp_accounts')
        .update({ last_login_at: new Date().toISOString(), last_ip: ip })
        .eq('id', row.id);

      // Inject the user context onto the connection so WccgFs can pick it up.
      (connection as any).__wccg = {
        username,
        role: row.role,
        djId: row.dj_id,
        djSlug: (row as any).djs?.slug ?? null,
        ip,
      } satisfies FtpUserCtx;

      logFtp('login', { username, ip, ok: true });
      const root = row.role === 'automation' ? '/ready' : '/incoming';
      resolve({ fs: new WccgFs(connection, { root, cwd: root }) as any });
    } catch (e) {
      logFtp('login_fail', { username, ip, ok: false, error: (e as Error).message });
      reject(new Error('Login failed'));
    }
  });

  ftp.on('disconnect', ({ connection, id }) => {
    const ip = (connection as any).ip ?? 'unknown';
    const username = (connection as any).__wccg?.username;
    logFtp('disconnect', { username, ip, ok: true });
  });

  ftp.listen()
    .then(() => {
      console.log(`[ftp] listening on ${url} (PASV ${pasvUrl}:${pasvRange})${useTls ? ' [TLS]' : ''}`);
    })
    .catch((e) => {
      console.error('[ftp] failed to start:', e);
    });
}
