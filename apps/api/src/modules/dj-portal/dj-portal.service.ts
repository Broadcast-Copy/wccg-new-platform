import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

/**
 * DJ Portal service. Owns the scheduled-drop upload pipeline:
 *
 *   1. Validate that the file_code is one of the DJ's assigned codes.
 *   2. Sanity-check size + MIME + filename.
 *   3. Upload to Supabase Storage at `dj-drops/<dj_slug>/<week_of>/<file_code>.<ext>`.
 *   4. Upsert a `dj_drops` row with status='uploaded'.
 *   5. (Async) Audio probe runs in the workers app to flip status→'validated'.
 *
 * Web uploads come in via this service. FTP uploads share the same code path
 * (the FTP server in workers calls `ingestUpload(...)`) so both surfaces enforce
 * identical naming + assignment rules.
 */

interface UploadDto {
  fileCode: string;
  weekOf?: string;
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  source: 'web' | 'ftp';
}

const STORAGE_BUCKET = 'dj-drops';
const VALID_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'audio/x-flac',
  'application/octet-stream', // FTP often arrives as octet-stream; we sniff the extension instead
]);
const VALID_EXT = ['.mp3', '.wav', '.flac'];
const FILE_CODE_RE = /^DJB_\d{5}$/;
const FTP_USERNAME_PREFIX = 'wccg-';

@Injectable()
export class DjPortalService {
  private readonly logger = new Logger(DjPortalService.name);

  constructor(
    private readonly db: SupabaseDbService,
    private readonly config: ConfigService,
  ) {}

  // ─── DJ self ───────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const dj = await this.requireDjForUser(userId);
    const slots = await this.slotsForDj(dj.id);
    const weekOf = currentWeekOfET();
    const dropsByCode = await this.dropsByFileCodeForWeek(dj.id, weekOf);

    return {
      dj: {
        id: dj.id,
        slug: dj.slug,
        displayName: dj.display_name,
        email: dj.email,
        isActive: dj.is_active,
      },
      weekOf,
      slots: slots.map((s: any) => ({
        slotId: s.id,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
        notes: s.notes,
        files: (s.file_codes as string[]).map((code: string) => ({
          fileCode: code,
          drop: dropsByCode.get(code) ?? null,
        })),
      })),
    };
  }

  async myDrops(userId: string, weeks: number) {
    const dj = await this.requireDjForUser(userId);
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const { data } = await this.db.from('dj_drops')
      .select('*')
      .eq('dj_id', dj.id)
      .gte('week_of', since.toISOString().slice(0, 10))
      .order('week_of', { ascending: false })
      .order('file_code', { ascending: true });
    return data ?? [];
  }

  // ─── Web upload ────────────────────────────────────────────────────────

  async uploadDrop(userId: string, dto: UploadDto) {
    const dj = await this.requireDjForUser(userId);
    return this.ingestUpload(dj.id, dj.slug, dto);
  }

  /**
   * Shared ingestion for both web and FTP. The FTP server calls this path
   * after authenticating against `dj_ftp_accounts`.
   */
  async ingestUpload(djId: string, djSlug: string, dto: UploadDto) {
    if (!FILE_CODE_RE.test(dto.fileCode)) {
      throw new BadRequestException(
        `Invalid file code "${dto.fileCode}". Must be DJB_NNNNN.`,
      );
    }
    const ext = guessExt(dto.filename, dto.mimetype);
    if (!VALID_EXT.includes(ext)) {
      throw new BadRequestException(`Unsupported audio extension "${ext}". Use .mp3, .wav, or .flac.`);
    }
    if (dto.mimetype && !VALID_MIME.has(dto.mimetype)) {
      this.logger.warn(`Unusual mimetype "${dto.mimetype}" — accepting on extension match.`);
    }

    // Find the slot that owns this file code for this DJ.
    const { data: slots } = await this.db.from('dj_slots')
      .select('*')
      .eq('dj_id', djId);
    const slot = (slots ?? []).find((s: any) => (s.file_codes ?? []).includes(dto.fileCode));
    if (!slot) {
      throw new ForbiddenException(
        `${dto.fileCode} is not assigned to ${djSlug}. Check your slot list.`,
      );
    }

    const weekOf = dto.weekOf ?? currentWeekOfET();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
      throw new BadRequestException('weekOf must be YYYY-MM-DD');
    }

    const checksum = createHash('sha256').update(dto.buffer).digest('hex');
    const storagePath = `${djSlug}/${weekOf}/${dto.fileCode}${ext}`;

    // Upload to Supabase Storage as the canonical archive. Use upsert so
    // re-uploads replace cleanly.
    const { error: upErr } = await this.db.client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, dto.buffer, {
        contentType: dto.mimetype || `audio/${ext.slice(1)}`,
        upsert: true,
      });
    if (upErr) {
      throw new BadRequestException(`Storage upload failed: ${upErr.message}`);
    }

    // ALSO write to the local filesystem if WCCG_DROP_ROOT is set. This is
    // what Radio Spider polls — by mirroring web uploads to /ready/ here, we
    // keep the FTP-and-web upload paths producing identical end-state.
    const dropRoot = this.config.get<string>('WCCG_DROP_ROOT');
    let readyPath: string | null = null;
    if (dropRoot) {
      try {
        const readyDir = join(dropRoot, 'ready');
        await fs.mkdir(readyDir, { recursive: true });
        readyPath = join(readyDir, `${dto.fileCode}${ext}`);
        await fs.writeFile(readyPath, dto.buffer);
      } catch (e) {
        this.logger.warn(`Local /ready mirror failed: ${(e as Error).message}`);
        readyPath = null;
      }
    }

    // Upsert the drop row.
    const { data: drop, error: dropErr } = await this.db.from('dj_drops')
      .upsert(
        {
          dj_id: djId,
          slot_id: slot.id,
          file_code: dto.fileCode,
          week_of: weekOf,
          status: 'uploaded',
          source: dto.source,
          storage_path: storagePath,
          size_bytes: dto.size,
          format: ext.slice(1),
          checksum_sha256: checksum,
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slot_id,file_code,week_of' } as any,
      )
      .select()
      .single();
    if (dropErr) throw dropErr;

    return {
      ok: true,
      drop,
      storagePath,
      readyPath, // null if WCCG_DROP_ROOT not set
      // Probing happens in the workers app; UI shows "validating…" until then.
    };
  }

  // ─── FTP credentials ───────────────────────────────────────────────────

  async getOrIssueFtp(userId: string, rotate: boolean) {
    const dj = await this.requireDjForUser(userId);
    const username = `${FTP_USERNAME_PREFIX}${dj.slug}`;

    const { data: existing } = await this.db.from('dj_ftp_accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    let plaintext: string | null = null;
    if (!existing || rotate) {
      plaintext = randomBytes(15).toString('base64url'); // 20-char URL-safe password
      const { hash, salt } = hashPassword(plaintext);
      const stored = `scrypt$${salt}$${hash}`;
      if (existing) {
        await this.db.from('dj_ftp_accounts')
          .update({
            password_hash: stored,
            rotated_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('id', existing.id);
      } else {
        await this.db.from('dj_ftp_accounts')
          .insert({
            username,
            password_hash: stored,
            role: 'dj',
            dj_id: dj.id,
          });
      }
    }

    const ftpHost = this.config.get<string>('FTP_PUBLIC_HOST') ?? 'ftp.wccg1045fm.com';
    const ftpPort = Number(this.config.get<string>('FTP_PORT') ?? 2121);

    return {
      username,
      // Password only included when freshly issued or rotated.
      password: plaintext,
      passwordIssued: plaintext !== null,
      host: ftpHost,
      port: ftpPort,
      protocol: 'ftp',
      passive: true,
      uploadPath: `/incoming/`,
      hint: 'Upload files named exactly as your assigned codes (e.g. DJB_76051.mp3). They land in your slot for the current week automatically.',
    };
  }

  // ─── FTP server callbacks (used by the workers app via internal HTTP) ──

  /**
   * Verify FTP login. Used by the FTP server in workers.
   * Returns null on failure, or a small profile object on success.
   */
  async verifyFtpLogin(username: string, password: string) {
    const { data: row } = await this.db.from('dj_ftp_accounts')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();
    if (!row) return null;

    if (!verifyPassword(password, row.password_hash)) return null;

    await this.db.from('dj_ftp_accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', row.id);

    return {
      username,
      role: row.role,
      djId: row.dj_id,
    };
  }

  // ─── Admin ─────────────────────────────────────────────────────────────

  async missingThisWeek(weekOf?: string) {
    const week = weekOf && /^\d{4}-\d{2}-\d{2}$/.test(weekOf) ? weekOf : currentWeekOfET();
    const { data } = await this.db.from('dj_drops_this_week')
      .select('*');
    // Filter to that week + not-uploaded.
    return (data ?? [])
      .filter((r: any) => r.week_of === week && r.drop_status === 'pending')
      .sort((a: any, b: any) =>
        a.day_of_week - b.day_of_week ||
        a.start_time.localeCompare(b.start_time) ||
        a.file_code.localeCompare(b.file_code),
      );
  }

  async adminAll() {
    const { data: djs } = await this.db.from('djs')
      .select('id, slug, display_name, is_active, email, phone')
      .order('display_name', { ascending: true });
    const { data: slots } = await this.db.from('dj_slots')
      .select('id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    const slotsByDj = new Map<string, any[]>();
    for (const s of slots ?? []) {
      const arr = slotsByDj.get(s.dj_id) ?? [];
      arr.push(s);
      slotsByDj.set(s.dj_id, arr);
    }
    return (djs ?? []).map((d: any) => ({
      ...d,
      slots: slotsByDj.get(d.id) ?? [],
    }));
  }

  async adminClaim(djSlug: string, userId: string, email?: string) {
    if (!djSlug || !userId) throw new BadRequestException('djSlug + userId required');
    const { data: dj } = await this.db.from('djs')
      .select('id')
      .eq('slug', djSlug)
      .maybeSingle();
    if (!dj) throw new NotFoundException(`DJ ${djSlug} not found`);
    await this.db.from('djs')
      .update({ user_id: userId, email: email ?? null, updated_at: new Date().toISOString() })
      .eq('id', dj.id);
    return { ok: true };
  }

  async publicProfile(slug: string) {
    const { data: dj } = await this.db.from('djs')
      .select('id, slug, display_name')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (!dj) throw new NotFoundException();
    const { data: slots } = await this.db.from('dj_slots')
      .select('day_of_week, start_time, end_time, status')
      .eq('dj_id', dj.id)
      .eq('status', 'active')
      .order('day_of_week');
    return { dj, slots: slots ?? [] };
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private async requireDjForUser(userId: string) {
    const { data } = await this.db.from('djs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      throw new ForbiddenException(
        'No DJ profile linked to this account. Ask an admin to claim your DJ slug.',
      );
    }
    return data;
  }

  private async slotsForDj(djId: string) {
    const { data } = await this.db.from('dj_slots')
      .select('*')
      .eq('dj_id', djId)
      .order('day_of_week')
      .order('start_time');
    return data ?? [];
  }

  private async dropsByFileCodeForWeek(djId: string, weekOf: string) {
    const { data } = await this.db.from('dj_drops')
      .select('*')
      .eq('dj_id', djId)
      .eq('week_of', weekOf);
    const map = new Map<string, any>();
    for (const d of data ?? []) map.set(d.file_code, d);
    return map;
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────────

/** ISO Monday of the current week in America/New_York. */
function currentWeekOfET(): string {
  // Get the date "now in ET" then walk back to Monday.
  const nowEt = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
  );
  const day = nowEt.getDay(); // 0=Sun..6=Sat
  const offsetToMon = (day + 6) % 7;
  const monday = new Date(nowEt);
  monday.setDate(nowEt.getDate() - offsetToMon);
  return monday.toISOString().slice(0, 10);
}

function guessExt(filename: string, mime: string): string {
  const m = filename.toLowerCase().match(/\.(mp3|wav|flac)$/);
  if (m) return `.${m[1]}`;
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return '.mp3';
  if (mime === 'audio/wav' || mime === 'audio/x-wav' || mime === 'audio/wave') return '.wav';
  if (mime === 'audio/flac' || mime === 'audio/x-flac') return '.flac';
  return '';
}

/**
 * scrypt password hashing. Format: `scrypt$<salt-hex>$<hash-hex>`.
 * Self-contained — no bcrypt dependency required.
 */
function hashPassword(plaintext: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plaintext, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(plaintext: string, stored: string): boolean {
  if (!stored?.startsWith('scrypt$')) return false;
  const [, salt, hashHex] = stored.split('$');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(plaintext, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
