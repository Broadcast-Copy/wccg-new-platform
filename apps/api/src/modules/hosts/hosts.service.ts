import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface HostRow {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface HostWithShows extends HostRow {
  shows_json: string | null;
}

@Injectable()
export class HostsService {
  private readonly logger = new Logger(HostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all active hosts.
   */
  async findAll() {
    this.logger.debug('Finding all hosts');

    const rows = await this.prisma.$queryRaw<HostRow[]>`
      SELECT h.*
      FROM hosts h
      WHERE h.is_active = true
      ORDER BY h.name ASC
    `;

    return rows.map((h) => this.formatHost(h));
  }

  /**
   * Get a single host by ID with their shows.
   */
  async findById(id: string) {
    this.logger.debug(`Finding host ${id}`);

    const rows = await this.prisma.$queryRaw<HostWithShows[]>`
      SELECT
        h.*,
        (
          SELECT json_agg(json_build_object(
            'id', s.id, 'name', s.name, 'slug', s.slug,
            'image_url', s.image_url, 'is_primary', sh.is_primary
          ))
          FROM show_hosts sh
          JOIN shows s ON s.id = sh.show_id
          WHERE sh.host_id = h.id AND s.is_active = true
        ) as shows_json
      FROM hosts h
      WHERE h.id = ${id}
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Host ${id} not found`);
    }

    return this.formatHostWithShows(rows[0]);
  }

  /**
   * Create a new host profile (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating host');
    const id = (dto.id as string) ?? randomUUID();
    const name = dto.name as string;
    const slug = (dto.slug as string) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const bio = (dto.bio as string) ?? null;
    const avatarUrl = (dto.avatarUrl as string) ?? null;
    const email = (dto.email as string) ?? null;
    const isActive = (dto.isActive as boolean) ?? true;
    const now = new Date();

    try {
      await this.prisma.$executeRaw`
        INSERT INTO hosts (id, name, slug, bio, avatar_url, email, is_active, created_at, updated_at)
        VALUES (${id}, ${name}, ${slug}, ${bio}, ${avatarUrl}, ${email}, ${isActive}, ${now}, ${now})
      `;
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('unique')) {
        throw new ConflictException(`Host with slug "${slug}" already exists`);
      }
      throw err;
    }

    return this.findById(id);
  }

  /**
   * Update a host profile (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating host ${id}`);

    // Verify exists
    await this.findById(id);

    const now = new Date();
    const name = (dto.name as string) ?? null;
    const slug = (dto.slug as string) ?? null;
    const bio = (dto.bio as string) ?? null;
    const avatarUrl = (dto.avatarUrl as string) ?? null;
    const email = (dto.email as string) ?? null;
    const isActive = dto.isActive as boolean | undefined;

    await this.prisma.$executeRaw`
      UPDATE hosts SET
        name = COALESCE(${name}, name),
        slug = COALESCE(${slug}, slug),
        bio = COALESCE(${bio}, bio),
        avatar_url = COALESCE(${avatarUrl}, avatar_url),
        email = COALESCE(${email}, email),
        is_active = COALESCE(${isActive ?? null}::boolean, is_active),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    return this.findById(id);
  }

  /**
   * Delete a host profile (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting host ${id}`);

    // Verify exists
    await this.findById(id);

    // Remove from show_hosts join table first
    await this.prisma.$executeRaw`DELETE FROM show_hosts WHERE host_id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM hosts WHERE id = ${id}`;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatHost(row: HostRow) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      email: row.email,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatHostWithShows(row: HostWithShows) {
    let shows: any[] = [];
    if (row.shows_json) {
      try {
        const parsed = typeof row.shows_json === 'string'
          ? JSON.parse(row.shows_json)
          : row.shows_json;
        shows = (parsed as any[]).map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          imageUrl: s.image_url,
          isPrimary: s.is_primary,
        }));
      } catch {
        shows = [];
      }
    }

    return {
      ...this.formatHost(row),
      shows,
    };
  }
}
