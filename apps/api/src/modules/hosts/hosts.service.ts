import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import type { hosts } from '@prisma/client';

@Injectable()
export class HostsService {
  private readonly logger = new Logger(HostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all active hosts.
   */
  async findAll() {
    this.logger.debug('Finding all hosts');

    const rows = await this.prisma.hosts.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });

    return rows.map((h) => this.formatHost(h));
  }

  /**
   * Get a single host by ID with their shows.
   */
  async findById(id: string) {
    this.logger.debug(`Finding host ${id}`);

    const row = await this.prisma.hosts.findUnique({
      where: { id },
      include: {
        show_hosts: {
          where: { show: { is_active: true } },
          include: {
            show: {
              select: { id: true, name: true, slug: true, image_url: true },
            },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException(`Host ${id} not found`);
    }

    return this.formatHostWithShows(row);
  }

  /**
   * Create a new host profile (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating host');
    const name = dto.name as string;
    const slug =
      (dto.slug as string) ??
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    try {
      const row = await this.prisma.hosts.create({
        data: {
          id: (dto.id as string) ?? undefined,
          name,
          slug,
          bio: (dto.bio as string) ?? null,
          avatar_url: (dto.avatarUrl as string) ?? null,
          email: (dto.email as string) ?? null,
          is_active: (dto.isActive as boolean) ?? true,
        },
      });

      return this.findById(row.id);
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`Host with slug "${slug}" already exists`);
      }
      throw err;
    }
  }

  /**
   * Update a host profile (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating host ${id}`);

    // Verify exists
    await this.findById(id);

    await this.prisma.hosts.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name as string }),
        ...(dto.slug !== undefined && { slug: dto.slug as string }),
        ...(dto.bio !== undefined && { bio: dto.bio as string }),
        ...(dto.avatarUrl !== undefined && { avatar_url: dto.avatarUrl as string }),
        ...(dto.email !== undefined && { email: dto.email as string }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive as boolean }),
        updated_at: new Date(),
      },
    });

    return this.findById(id);
  }

  /**
   * Delete a host profile (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting host ${id}`);

    // Verify exists
    await this.findById(id);

    // show_hosts rows are cascade-deleted by the DB, but delete explicitly
    // for clarity and backward compatibility
    await this.prisma.show_hosts.deleteMany({ where: { host_id: id } });
    await this.prisma.hosts.delete({ where: { id } });

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatHost(row: hosts) {
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

  private formatHostWithShows(
    row: hosts & {
      show_hosts: Array<{
        is_primary: boolean;
        show: { id: string; name: string; slug: string; image_url: string | null };
      }>;
    },
  ) {
    const shows = row.show_hosts.map((sh) => ({
      id: sh.show.id,
      name: sh.show.name,
      slug: sh.show.slug,
      imageUrl: sh.show.image_url,
      isPrimary: sh.is_primary,
    }));

    return {
      ...this.formatHost(row),
      shows,
    };
  }
}
