import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface ShowRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ShowWithHosts extends ShowRow {
  hosts_json: string | null;
}

export interface HostInfo {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  is_primary: boolean;
}

interface EpisodeRow {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  air_date: Date | null;
  duration: number | null;
  audio_url: string | null;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all shows with their hosts. Optional filters by hostId.
   */
  async findAll(filters?: { genre?: string; hostId?: string; streamId?: string }) {
    this.logger.debug('Finding all shows', filters);

    // Base query with hosts aggregated as JSON
    if (filters?.hostId) {
      const rows = await this.prisma.$queryRaw<ShowWithHosts[]>`
        SELECT
          s.*,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'slug', h.slug,
              'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = s.id
          ) as hosts_json
        FROM shows s
        WHERE s.is_active = true
          AND EXISTS (
            SELECT 1 FROM show_hosts sh2 WHERE sh2.show_id = s.id AND sh2.host_id = ${filters.hostId}
          )
        ORDER BY s.name ASC
      `;
      return rows.map((r) => this.formatShowWithHosts(r));
    }

    const rows = await this.prisma.$queryRaw<ShowWithHosts[]>`
      SELECT
        s.*,
        (
          SELECT json_agg(json_build_object(
            'id', h.id, 'name', h.name, 'slug', h.slug,
            'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
          ))
          FROM show_hosts sh
          JOIN hosts h ON h.id = sh.host_id
          WHERE sh.show_id = s.id
        ) as hosts_json
      FROM shows s
      WHERE s.is_active = true
      ORDER BY s.name ASC
    `;
    return rows.map((r) => this.formatShowWithHosts(r));
  }

  /**
   * Get a single show by ID with hosts and recent episodes.
   */
  async findById(id: string) {
    this.logger.debug(`Finding show ${id}`);

    const rows = await this.prisma.$queryRaw<ShowWithHosts[]>`
      SELECT
        s.*,
        (
          SELECT json_agg(json_build_object(
            'id', h.id, 'name', h.name, 'slug', h.slug,
            'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
          ))
          FROM show_hosts sh
          JOIN hosts h ON h.id = sh.host_id
          WHERE sh.show_id = s.id
        ) as hosts_json
      FROM shows s
      WHERE s.id = ${id}
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    // Fetch recent episodes
    const episodes = await this.prisma.$queryRaw<EpisodeRow[]>`
      SELECT *
      FROM show_episodes
      WHERE show_id = ${id}
      ORDER BY air_date DESC NULLS LAST
      LIMIT 20
    `;

    const show = this.formatShowWithHosts(rows[0]);
    return {
      ...show,
      episodes: episodes.map((e) => this.formatEpisode(e)),
    };
  }

  /**
   * Create a new show (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating show');
    const id = (dto.id as string) ?? randomUUID();
    const name = dto.name as string;
    const slug = (dto.slug as string) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const description = (dto.description as string) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const isActive = (dto.isActive as boolean) ?? true;
    const now = new Date();

    try {
      await this.prisma.$executeRaw`
        INSERT INTO shows (id, name, slug, description, image_url, is_active, created_at, updated_at)
        VALUES (${id}, ${name}, ${slug}, ${description}, ${imageUrl}, ${isActive}, ${now}, ${now})
      `;
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('unique')) {
        throw new ConflictException(`Show with slug "${slug}" already exists`);
      }
      throw err;
    }

    // Assign hosts if provided
    const hostIds = dto.hostIds as string[] | undefined;
    if (hostIds && hostIds.length > 0) {
      for (let i = 0; i < hostIds.length; i++) {
        const hostId = hostIds[i];
        const isPrimary = i === 0;
        await this.prisma.$executeRaw`
          INSERT INTO show_hosts (show_id, host_id, is_primary)
          VALUES (${id}, ${hostId}, ${isPrimary})
          ON CONFLICT (show_id, host_id) DO NOTHING
        `;
      }
    }

    return this.findById(id);
  }

  /**
   * Update a show (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating show ${id}`);

    // Verify exists
    await this.findById(id);

    const now = new Date();
    const name = (dto.name as string) ?? null;
    const slug = (dto.slug as string) ?? null;
    const description = (dto.description as string) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const isActive = dto.isActive as boolean | undefined;

    await this.prisma.$executeRaw`
      UPDATE shows SET
        name = COALESCE(${name}, name),
        slug = COALESCE(${slug}, slug),
        description = COALESCE(${description}, description),
        image_url = COALESCE(${imageUrl}, image_url),
        is_active = COALESCE(${isActive ?? null}::boolean, is_active),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    // Replace hosts if provided
    const hostIds = dto.hostIds as string[] | undefined;
    if (hostIds !== undefined) {
      await this.prisma.$executeRaw`DELETE FROM show_hosts WHERE show_id = ${id}`;
      for (let i = 0; i < hostIds.length; i++) {
        const hostId = hostIds[i];
        const isPrimary = i === 0;
        await this.prisma.$executeRaw`
          INSERT INTO show_hosts (show_id, host_id, is_primary)
          VALUES (${id}, ${hostId}, ${isPrimary})
          ON CONFLICT (show_id, host_id) DO NOTHING
        `;
      }
    }

    return this.findById(id);
  }

  /**
   * Delete a show (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting show ${id}`);

    // Verify exists
    await this.findById(id);

    // Delete in dependency order
    await this.prisma.$executeRaw`DELETE FROM show_episodes WHERE show_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM show_hosts WHERE show_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM schedule_blocks WHERE show_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM favorites WHERE show_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM shows WHERE id = ${id}`;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatShowWithHosts(row: ShowWithHosts) {
    let hosts: HostInfo[] = [];
    if (row.hosts_json) {
      try {
        const parsed = typeof row.hosts_json === 'string'
          ? JSON.parse(row.hosts_json)
          : row.hosts_json;
        hosts = (parsed as any[]).map((h: any) => ({
          id: h.id,
          name: h.name,
          slug: h.slug,
          avatarUrl: h.avatar_url,
          isPrimary: h.is_primary,
        })) as any;
      } catch {
        hosts = [];
      }
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      isActive: row.is_active,
      hosts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatEpisode(row: EpisodeRow) {
    return {
      id: row.id,
      showId: row.show_id,
      title: row.title,
      description: row.description,
      airDate: row.air_date,
      duration: row.duration,
      audioUrl: row.audio_url,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
