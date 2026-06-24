import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { STATION_ID } from '../../common/supabase/station.js';

const STORAGE_BUCKET = 'record-pool';
const VALID_EXTS = ['.mp3', '.wav', '.flac', '.aiff', '.aif', '.m4a'] as const;
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const VERSION_VALUES = new Set([
  'Clean', 'Dirty', 'Instrumental', 'Acapella', 'Radio Edit',
  'Extended', 'Intro', 'Outro', 'Quick Hit', 'Short Edit',
  'Original', 'Remix', 'Other',
]);

interface UploadDto {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  // User-supplied overrides (any field optional; ID3 fills the rest).
  title?: string;
  artist?: string;
  remixArtist?: string;
  labelName?: string;
  album?: string;
  genre?: string;
  subgenre?: string;
  bpm?: number;
  musicalKey?: string;
  releaseYear?: number;
  releaseDate?: string;        // YYYY-MM-DD
  version?: string;
  labelId?: string;            // record_pool_labels.id (verified label)
  djSlug?: string;             // if uploader is a DJ
}

interface BrowseQuery {
  q?: string;
  genre?: string;
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  version?: string;
  labelId?: string;
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'popular' | 'title' | 'artist';
}

@Injectable()
export class RecordPoolService {
  private readonly logger = new Logger(RecordPoolService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── Browse / details ──────────────────────────────────────────────────

  async browse(q: BrowseQuery) {
    const limit = Math.min(Math.max(q.limit ?? 30, 1), 100);
    const offset = Math.max(q.offset ?? 0, 0);
    let query = this.db.from('record_pool_tracks')
      .select(
        'id, title, artist, remix_artist, album, genre, subgenre, bpm, musical_key, ' +
        'release_year, release_date, version, duration_seconds, artwork_url, ' +
        'download_count, play_count, created_at, uploader_type, label_name, label_id, dj_id',
        { count: 'exact' } as any,
      )
      .eq('status', 'approved');

    if (q.q) {
      const escaped = q.q.replace(/[,()]/g, ' ');
      query = query.or(
        `title.ilike.%${escaped}%,artist.ilike.%${escaped}%,remix_artist.ilike.%${escaped}%,label_name.ilike.%${escaped}%,album.ilike.%${escaped}%`,
      );
    }
    if (q.genre) query = query.eq('genre', q.genre);
    if (q.bpmMin != null) query = query.gte('bpm', q.bpmMin);
    if (q.bpmMax != null) query = query.lte('bpm', q.bpmMax);
    if (q.key) query = query.eq('musical_key', q.key);
    if (q.version) query = query.eq('version', q.version);
    if (q.labelId) query = query.eq('label_id', q.labelId);

    switch (q.sort ?? 'newest') {
      case 'popular':
        query = query.order('download_count', { ascending: false });
        break;
      case 'title':
        query = query.order('title', { ascending: true });
        break;
      case 'artist':
        query = query.order('artist', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw new BadRequestException(error.message);
    return { items: data ?? [], total: count ?? 0, limit, offset };
  }

  async track(id: string) {
    const { data } = await this.db.from('record_pool_tracks')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle();
    if (!data) throw new NotFoundException();
    return data;
  }

  /** Issues a short-lived signed URL and logs the download. */
  async downloadUrl(userId: string, trackId: string, ctx: { ip?: string; ua?: string }) {
    const { data: track } = await this.db.from('record_pool_tracks')
      .select('id, storage_path, status, dj_id')
      .eq('id', trackId)
      .maybeSingle();
    if (!track) throw new NotFoundException();
    if (track.status !== 'approved') throw new ForbiddenException('Track is not approved');

    const { data: signed, error } = await this.db.client.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(track.storage_path, 60 * 15); // 15 min
    if (error || !signed?.signedUrl) {
      throw new BadRequestException(`Sign failed: ${error?.message ?? 'unknown'}`);
    }

    // Log + bump counter (best-effort).
    const { data: djForUser } = await this.db.from('djs')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    await this.db.from('record_pool_downloads').insert({
      station_id: STATION_ID,
      track_id: trackId,
      user_id: userId,
      dj_id: djForUser?.id ?? null,
      ip: ctx.ip ?? null,
      user_agent: ctx.ua ?? null,
    });
    // Bump download counter
    const { data: cur } = await this.db.from('record_pool_tracks')
      .select('download_count')
      .eq('id', trackId)
      .maybeSingle();
    await this.db.from('record_pool_tracks')
      .update({ download_count: (cur?.download_count ?? 0) + 1 })
      .eq('id', trackId);

    return { url: signed.signedUrl, expiresIn: 900 };
  }

  // ─── Upload ────────────────────────────────────────────────────────────

  async upload(userId: string, dto: UploadDto) {
    if (!dto.filename) throw new BadRequestException('filename required');
    if (dto.size <= 0) throw new BadRequestException('empty file');
    if (dto.size > MAX_BYTES) throw new BadRequestException('file exceeds 500 MB limit');

    const ext = guessExt(dto.filename);
    if (!VALID_EXTS.includes(ext as any)) {
      throw new BadRequestException(`Unsupported extension ${ext}. Use mp3/wav/flac/aiff/m4a.`);
    }
    if (dto.version && !VERSION_VALUES.has(dto.version)) {
      throw new BadRequestException(`Invalid version "${dto.version}"`);
    }

    // Determine uploader_type and dj_id / label_id linkage.
    let uploaderType: 'dj' | 'label' | 'admin' = 'dj';
    let djId: string | null = null;
    let labelId: string | null = null;

    if (dto.labelId) {
      const { data: label } = await this.db.from('record_pool_labels')
        .select('id, owner_user_id, auto_approve')
        .eq('id', dto.labelId)
        .maybeSingle();
      if (!label) throw new NotFoundException('Label not found');
      if (label.owner_user_id !== userId) {
        throw new ForbiddenException('Not the owner of this label');
      }
      uploaderType = 'label';
      labelId = label.id;
    } else {
      // Default to DJ if there's a DJ row for this user; otherwise treat as admin.
      const { data: dj } = await this.db.from('djs')
        .select('id, slug')
        .eq('user_id', userId)
        .maybeSingle();
      if (dj) {
        djId = dj.id;
        uploaderType = 'dj';
      } else {
        uploaderType = 'admin';
      }
    }

    // Extract ID3 / container metadata. Lazy-imported to keep startup fast.
    let id3: ExtractedMeta = {};
    try {
      const mm = await import('music-metadata');
      const parsed = await mm.parseBuffer(dto.buffer, { mimeType: dto.mimetype || undefined, size: dto.size });
      id3 = {
        title:         parsed.common.title,
        artist:        parsed.common.artist,
        album:         parsed.common.album,
        genre:         parsed.common.genre?.[0],
        releaseYear:   parsed.common.year,
        durationSec:   parsed.format.duration ? Math.round(parsed.format.duration) : undefined,
        sampleRate:    parsed.format.sampleRate,
        bitrateKbps:   parsed.format.bitrate ? Math.round(parsed.format.bitrate / 1000) : undefined,
        format:        parsed.format.container?.toLowerCase(),
        isrc:          (parsed.common as any).isrc?.[0],
        bpm:           parseFloat((parsed.common as any).bpm) || undefined,
      };
    } catch (e) {
      this.logger.warn(`ID3 parse failed for ${dto.filename}: ${(e as Error).message}`);
    }

    // Merge: DTO wins; ID3 fills gaps; final guarantees (title/artist required).
    const title  = dto.title  ?? id3.title  ?? stripExt(dto.filename);
    const artist = dto.artist ?? id3.artist ?? 'Unknown Artist';
    if (!title || !artist) throw new BadRequestException('title and artist required');

    const trackId = randomUUID();
    const storagePath = `${userId}/${trackId}${ext}`;
    const checksum = createHash('sha256').update(dto.buffer).digest('hex');

    // Upload to Storage first; row insert happens after a successful upload.
    const { error: upErr } = await this.db.client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, dto.buffer, {
        contentType: dto.mimetype || `audio/${ext.slice(1)}`,
        upsert: false,
      });
    if (upErr) throw new BadRequestException(`Storage upload failed: ${upErr.message}`);

    // Decide auto-approval. Verified label uploads with auto_approve flag skip queue.
    let autoApprove = false;
    if (labelId) {
      const { data: label } = await this.db.from('record_pool_labels')
        .select('verified, auto_approve')
        .eq('id', labelId)
        .maybeSingle();
      if (label?.verified && label.auto_approve) autoApprove = true;
    }

    const row = {
      id: trackId,
      station_id: STATION_ID,
      uploaded_by: userId,
      uploader_type: uploaderType,
      dj_id: djId,
      label_id: labelId,
      title,
      artist,
      remix_artist:   dto.remixArtist ?? null,
      label_name:     dto.labelName ?? null,
      album:          dto.album ?? id3.album ?? null,
      genre:          dto.genre ?? id3.genre ?? null,
      subgenre:       dto.subgenre ?? null,
      bpm:            dto.bpm ?? id3.bpm ?? null,
      musical_key:    dto.musicalKey ?? null,
      release_year:   dto.releaseYear ?? id3.releaseYear ?? null,
      release_date:   dto.releaseDate ?? null,
      version:        dto.version ?? null,
      duration_seconds: id3.durationSec ?? null,
      isrc:           id3.isrc ?? null,
      storage_path:   storagePath,
      size_bytes:     dto.size,
      format:         ext.slice(1),
      bitrate_kbps:   id3.bitrateKbps ?? null,
      sample_rate:    id3.sampleRate ?? null,
      checksum_sha256: checksum,
      identify_source: id3.title ? 'id3' : null,
      status:         autoApprove ? 'approved' : 'pending',
      approved_at:    autoApprove ? new Date().toISOString() : null,
    };

    const { data: inserted, error: insErr } = await this.db.from('record_pool_tracks')
      .insert(row)
      .select()
      .single();
    if (insErr) {
      // Best-effort rollback of storage
      await this.db.client.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => null);
      throw new BadRequestException(insErr.message);
    }

    return { ok: true, track: inserted, autoApproved: autoApprove };
  }

  async myUploads(userId: string, limit = 30) {
    const { data } = await this.db.from('record_pool_tracks')
      .select('id, title, artist, status, rejection_reason, created_at, download_count, play_count, version, genre, bpm, format, size_bytes')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));
    return data ?? [];
  }

  // ─── Admin moderation ──────────────────────────────────────────────────

  async pendingQueue(limit = 50) {
    const { data } = await this.db.from('record_pool_tracks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 200));
    return data ?? [];
  }

  async approve(adminId: string, trackId: string) {
    const { error } = await this.db.from('record_pool_tracks')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', trackId);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  async reject(adminId: string, trackId: string, reason: string) {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('Rejection reason required (min 3 chars)');
    }
    const { error } = await this.db.from('record_pool_tracks')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq('id', trackId);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ─── Labels (lightweight v1) ───────────────────────────────────────────

  async listLabels() {
    const { data } = await this.db.from('record_pool_labels')
      .select('id, slug, name, verified, logo_url')
      .order('name', { ascending: true });
    return data ?? [];
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────────

interface ExtractedMeta {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  releaseYear?: number;
  durationSec?: number;
  sampleRate?: number;
  bitrateKbps?: number;
  format?: string;
  isrc?: string;
  bpm?: number;
}

function guessExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.(mp3|wav|flac|aiff|aif|m4a)$/);
  return m ? `.${m[1]}` : '';
}

function stripExt(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}
