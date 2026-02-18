import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

/**
 * Exported for controller/other consumers that reference the host shape.
 */
export interface HostInfo {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  isPrimary: boolean;
}

// Prisma include for a show with its hosts (via join table)
const SHOW_WITH_HOSTS_INCLUDE = {
  show_hosts: {
    include: { host: true },
  },
} as const;

// Prisma include for a full show detail (hosts + recent episodes)
const SHOW_FULL_INCLUDE = {
  show_hosts: {
    include: { host: true },
  },
  show_episodes: {
    orderBy: { air_date: 'desc' as const },
    take: 20,
  },
} as const;

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all shows with their hosts. Optional filter by hostId.
   */
  async findAll(filters?: {
    genre?: string;
    hostId?: string;
    streamId?: string;
  }) {
    this.logger.debug('Finding all shows', filters);

    const where: Prisma.showsWhereInput = {
      is_active: true,
    };

    if (filters?.hostId) {
      where.show_hosts = {
        some: { host_id: filters.hostId },
      };
    }

    const shows = await this.prisma.shows.findMany({
      where,
      include: SHOW_WITH_HOSTS_INCLUDE,
      orderBy: { name: 'asc' },
    });

    return shows.map((s) => this.formatShowWithHosts(s));
  }

  /**
   * Get a single show by ID with hosts and recent episodes.
   */
  async findById(id: string) {
    this.logger.debug(`Finding show ${id}`);

    const show = await this.prisma.shows.findUnique({
      where: { id },
      include: SHOW_FULL_INCLUDE,
    });

    if (!show) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    return this.formatShowFull(show);
  }

  /**
   * Create a new show (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating show');

    const name = dto.name as string;
    const slug =
      (dto.slug as string) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const hostIds = dto.hostIds as string[] | undefined;

    try {
      const show = await this.prisma.shows.create({
        data: {
          id: (dto.id as string) ?? undefined,
          name,
          slug,
          description: (dto.description as string) ?? null,
          image_url: (dto.imageUrl as string) ?? null,
          is_active: (dto.isActive as boolean) ?? true,
          // Nested create for host associations
          ...(hostIds && hostIds.length > 0
            ? {
                show_hosts: {
                  createMany: {
                    data: hostIds.map((hostId, i) => ({
                      host_id: hostId,
                      is_primary: i === 0,
                    })),
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        },
        include: SHOW_FULL_INCLUDE,
      });

      return this.formatShowFull(show);
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Show with slug "${slug}" already exists`,
        );
      }
      throw err;
    }
  }

  /**
   * Update a show (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating show ${id}`);

    // Verify exists
    const existing = await this.prisma.shows.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    // Build partial update
    const data: Prisma.showsUpdateInput = {
      updated_at: new Date(),
    };
    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.description !== undefined)
      data.description = dto.description as string;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;

    await this.prisma.shows.update({
      where: { id },
      data,
    });

    // Replace hosts if hostIds is provided (even an empty array clears them)
    const hostIds = dto.hostIds as string[] | undefined;
    if (hostIds !== undefined) {
      // Delete existing associations then re-create
      await this.prisma.show_hosts.deleteMany({ where: { show_id: id } });
      if (hostIds.length > 0) {
        await this.prisma.show_hosts.createMany({
          data: hostIds.map((hostId, i) => ({
            show_id: id,
            host_id: hostId,
            is_primary: i === 0,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findById(id);
  }

  /**
   * Delete a show (admin only).
   * Cascade deletes handle show_hosts, show_episodes,
   * schedule_blocks, and favorites.
   */
  async remove(id: string) {
    this.logger.debug(`Deleting show ${id}`);

    // Verify exists
    const existing = await this.prisma.shows.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    await this.prisma.shows.delete({ where: { id } });

    return { deleted: true, id };
  }

  // --- Private helpers ---

  /**
   * Format a show row that includes the show_hosts -> host relation.
   */
  private formatShowWithHosts(row: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    show_hosts: Array<{
      is_primary: boolean;
      host: {
        id: string;
        name: string;
        slug: string;
        avatar_url: string | null;
      };
    }>;
  }) {
    const hosts: HostInfo[] = row.show_hosts.map((sh) => ({
      id: sh.host.id,
      name: sh.host.name,
      slug: sh.host.slug,
      avatarUrl: sh.host.avatar_url,
      isPrimary: sh.is_primary,
    }));

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

  /**
   * Format a full show row that includes hosts and episodes.
   */
  private formatShowFull(
    row: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      image_url: string | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      show_hosts: Array<{
        is_primary: boolean;
        host: {
          id: string;
          name: string;
          slug: string;
          avatar_url: string | null;
        };
      }>;
      show_episodes: Array<{
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
      }>;
    },
  ) {
    return {
      ...this.formatShowWithHosts(row),
      episodes: row.show_episodes.map((e) => ({
        id: e.id,
        showId: e.show_id,
        title: e.title,
        description: e.description,
        airDate: e.air_date,
        duration: e.duration,
        audioUrl: e.audio_url,
        imageUrl: e.image_url,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
    };
  }
}
