import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface StreamRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: string | null;
  sort_order: number;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

interface StreamWithSource extends StreamRow {
  source_id: string | null;
  primary_url: string | null;
  fallback_url: string | null;
  mount_point: string | null;
  format: string | null;
  bitrate: number | null;
}

interface StreamFull extends StreamWithSource {
  current_title: string | null;
  current_artist: string | null;
  current_track: string | null;
  album_art: string | null;
  listener_count: number | null;
  is_live: boolean | null;
  last_updated: Date | null;
}

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all streams (public), optionally filtered by category.
   */
  async findAll(category?: string) {
    this.logger.debug(`Finding all streams, category=${category ?? 'all'}`);

    if (category) {
      const streams = await this.prisma.$queryRaw<StreamRow[]>`
        SELECT s.*
        FROM streams s
        WHERE s.category = ${category}
        ORDER BY s.sort_order ASC, s.name ASC
      `;
      return streams.map((s) => this.formatStream(s));
    }

    const streams = await this.prisma.$queryRaw<StreamRow[]>`
      SELECT s.*
      FROM streams s
      ORDER BY s.sort_order ASC, s.name ASC
    `;
    return streams.map((s) => this.formatStream(s));
  }

  /**
   * Get a single stream by ID with its source configuration and current metadata.
   */
  async findById(id: string) {
    this.logger.debug(`Finding stream ${id}`);

    const rows = await this.prisma.$queryRaw<StreamFull[]>`
      SELECT
        s.*,
        ss.id as source_id, ss.primary_url, ss.fallback_url,
        ss.mount_point, ss.format, ss.bitrate,
        sm.current_title, sm.current_artist, sm.current_track,
        sm.album_art, sm.listener_count, sm.is_live, sm.last_updated
      FROM streams s
      LEFT JOIN stream_sources ss ON ss.stream_id = s.id
      LEFT JOIN stream_metadata sm ON sm.stream_id = s.id
      WHERE s.id = ${id}
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    return this.formatStreamFull(rows[0]);
  }

  /**
   * Create a new stream (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating stream');
    const id = (dto.id as string) ?? randomUUID();
    const name = dto.name as string;
    const slug = (dto.slug as string) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const description = (dto.description as string) ?? null;
    const category = (dto.category as string) ?? null;
    const status = (dto.status as string) ?? 'offline';
    const sortOrder = (dto.sortOrder as number) ?? 0;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const now = new Date();

    try {
      await this.prisma.$executeRaw`
        INSERT INTO streams (id, name, slug, description, category, status, sort_order, image_url, created_at, updated_at)
        VALUES (${id}, ${name}, ${slug}, ${description}, ${category}, ${status}, ${sortOrder}, ${imageUrl}, ${now}, ${now})
      `;
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('unique')) {
        throw new ConflictException(`Stream with slug "${slug}" already exists`);
      }
      throw err;
    }

    // If source configuration is provided, create it
    if (dto.primaryUrl) {
      const sourceId = randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO stream_sources (id, stream_id, primary_url, fallback_url, mount_point, format, bitrate, created_at, updated_at)
        VALUES (
          ${sourceId}, ${id},
          ${(dto.primaryUrl as string) ?? null},
          ${(dto.fallbackUrl as string) ?? null},
          ${(dto.mountPoint as string) ?? null},
          ${(dto.format as string) ?? null},
          ${(dto.bitrate as number) ?? null},
          ${now}, ${now}
        )
      `;
    }

    // Initialize metadata row
    const metaId = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO stream_metadata (id, stream_id, listener_count, is_live, last_updated)
      VALUES (${metaId}, ${id}, 0, false, ${now})
      ON CONFLICT (stream_id) DO NOTHING
    `;

    return this.findById(id);
  }

  /**
   * Update a stream (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating stream ${id}`);

    // Verify exists
    await this.findById(id);

    const now = new Date();
    const name = (dto.name as string) ?? null;
    const slug = (dto.slug as string) ?? null;
    const description = (dto.description as string) ?? null;
    const category = (dto.category as string) ?? null;
    const status = (dto.status as string) ?? null;
    const sortOrder = (dto.sortOrder as number) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;

    await this.prisma.$executeRaw`
      UPDATE streams SET
        name = COALESCE(${name}, name),
        slug = COALESCE(${slug}, slug),
        description = COALESCE(${description}, description),
        category = COALESCE(${category}, category),
        status = COALESCE(${status}, status),
        sort_order = COALESCE(${sortOrder}, sort_order),
        image_url = COALESCE(${imageUrl}, image_url),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    // Update source if provided
    if (dto.primaryUrl !== undefined || dto.fallbackUrl !== undefined || dto.mountPoint !== undefined) {
      await this.prisma.$executeRaw`
        INSERT INTO stream_sources (id, stream_id, primary_url, fallback_url, mount_point, format, bitrate, created_at, updated_at)
        VALUES (${randomUUID()}, ${id},
          ${(dto.primaryUrl as string) ?? null},
          ${(dto.fallbackUrl as string) ?? null},
          ${(dto.mountPoint as string) ?? null},
          ${(dto.format as string) ?? null},
          ${(dto.bitrate as number) ?? null},
          ${now}, ${now}
        )
        ON CONFLICT (stream_id) DO UPDATE SET
          primary_url = COALESCE(EXCLUDED.primary_url, stream_sources.primary_url),
          fallback_url = COALESCE(EXCLUDED.fallback_url, stream_sources.fallback_url),
          mount_point = COALESCE(EXCLUDED.mount_point, stream_sources.mount_point),
          format = COALESCE(EXCLUDED.format, stream_sources.format),
          bitrate = COALESCE(EXCLUDED.bitrate, stream_sources.bitrate),
          updated_at = ${now}
      `;
    }

    return this.findById(id);
  }

  /**
   * Delete a stream and its related source/metadata (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting stream ${id}`);

    // Verify exists
    await this.findById(id);

    // Delete in dependency order
    await this.prisma.$executeRaw`DELETE FROM stream_metadata WHERE stream_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM stream_sources WHERE stream_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM schedule_blocks WHERE stream_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM favorites WHERE stream_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM listening_history WHERE stream_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM streams WHERE id = ${id}`;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatStream(row: StreamRow) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      status: row.status,
      sortOrder: row.sort_order,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatStreamFull(row: StreamFull) {
    return {
      ...this.formatStream(row),
      source: row.source_id
        ? {
            id: row.source_id,
            primaryUrl: row.primary_url,
            fallbackUrl: row.fallback_url,
            mountPoint: row.mount_point,
            format: row.format,
            bitrate: row.bitrate,
          }
        : null,
      metadata: {
        currentTitle: row.current_title,
        currentArtist: row.current_artist,
        currentTrack: row.current_track,
        albumArt: row.album_art,
        listenerCount: row.listener_count ?? 0,
        isLive: row.is_live ?? false,
        lastUpdated: row.last_updated,
      },
    };
  }
}
