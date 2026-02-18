import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface FavoriteRow {
  id: string;
  user_id: string;
  target_type: string;
  stream_id: string | null;
  show_id: string | null;
  created_at: Date;
}

interface FavoriteWithDetails extends FavoriteRow {
  target_name: string | null;
  target_slug: string | null;
  target_image_url: string | null;
}

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all favorites for the current user, enriched with target details.
   */
  async findByUser(userId: string) {
    this.logger.debug(`Finding favorites for user ${userId}`);

    const rows = await this.prisma.$queryRaw<FavoriteWithDetails[]>`
      SELECT
        f.*,
        COALESCE(st.name, sh.name) as target_name,
        COALESCE(st.slug, sh.slug) as target_slug,
        COALESCE(st.image_url, sh.image_url) as target_image_url
      FROM favorites f
      LEFT JOIN streams st ON st.id = f.stream_id AND f.target_type = 'stream'
      LEFT JOIN shows sh ON sh.id = f.show_id AND f.target_type = 'show'
      WHERE f.user_id = ${userId}::uuid
      ORDER BY f.created_at DESC
    `;

    return rows.map((r) => this.formatFavorite(r));
  }

  /**
   * Add a favorite (idempotent -- returns existing if duplicate).
   */
  async add(userId: string, dto: { targetType: string; targetId: string }) {
    this.logger.debug(`User ${userId} favoriting ${dto.targetType}:${dto.targetId}`);

    const { targetType, targetId } = dto;

    // Validate target type
    if (!['stream', 'show'].includes(targetType)) {
      throw new BadRequestException('targetType must be "stream" or "show"');
    }

    // Verify target exists
    if (targetType === 'stream') {
      const exists = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM streams WHERE id = ${targetId}
      `;
      if (Number(exists[0]?.count ?? 0) === 0) {
        throw new NotFoundException(`Stream ${targetId} not found`);
      }
    } else {
      const exists = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM shows WHERE id = ${targetId}
      `;
      if (Number(exists[0]?.count ?? 0) === 0) {
        throw new NotFoundException(`Show ${targetId} not found`);
      }
    }

    const streamId = targetType === 'stream' ? targetId : null;
    const showId = targetType === 'show' ? targetId : null;

    // Check if already favorited (idempotent)
    const existing = await this.prisma.$queryRaw<FavoriteRow[]>`
      SELECT * FROM favorites
      WHERE user_id = ${userId}::uuid
        AND target_type = ${targetType}
        AND COALESCE(stream_id, '') = COALESCE(${streamId}, '')
        AND COALESCE(show_id, '') = COALESCE(${showId}, '')
    `;

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        userId: existing[0].user_id,
        targetType: existing[0].target_type,
        targetId,
        createdAt: existing[0].created_at,
        alreadyExisted: true,
      };
    }

    const id = randomUUID();
    const now = new Date();

    await this.prisma.$executeRaw`
      INSERT INTO favorites (id, user_id, target_type, stream_id, show_id, created_at)
      VALUES (${id}, ${userId}::uuid, ${targetType}, ${streamId}, ${showId}, ${now})
    `;

    return {
      id,
      userId,
      targetType,
      targetId,
      createdAt: now,
      alreadyExisted: false,
    };
  }

  /**
   * Remove a favorite by ID (must belong to user).
   */
  async remove(userId: string, favoriteId: string) {
    this.logger.debug(`User ${userId} unfavoriting ${favoriteId}`);

    // Verify the favorite exists and belongs to the user
    const rows = await this.prisma.$queryRaw<FavoriteRow[]>`
      SELECT * FROM favorites WHERE id = ${favoriteId}
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Favorite ${favoriteId} not found`);
    }

    if (rows[0].user_id !== userId) {
      throw new ForbiddenException('Cannot remove another user\'s favorite');
    }

    await this.prisma.$executeRaw`
      DELETE FROM favorites WHERE id = ${favoriteId} AND user_id = ${userId}::uuid
    `;

    return { deleted: true, id: favoriteId };
  }

  /**
   * Check if a user has favorited a specific target.
   */
  async check(userId: string, targetType: string, targetId: string) {
    this.logger.debug(`Checking favorite ${targetType}:${targetId} for user ${userId}`);

    const streamId = targetType === 'stream' ? targetId : null;
    const showId = targetType === 'show' ? targetId : null;

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM favorites
      WHERE user_id = ${userId}::uuid
        AND target_type = ${targetType}
        AND COALESCE(stream_id, '') = COALESCE(${streamId}, '')
        AND COALESCE(show_id, '') = COALESCE(${showId}, '')
      LIMIT 1
    `;

    return {
      isFavorited: rows.length > 0,
      favoriteId: rows[0]?.id ?? null,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatFavorite(row: FavoriteWithDetails) {
    return {
      id: row.id,
      userId: row.user_id,
      targetType: row.target_type,
      targetId: row.stream_id ?? row.show_id,
      target: row.target_name
        ? {
            name: row.target_name,
            slug: row.target_slug,
            imageUrl: row.target_image_url,
          }
        : null,
      createdAt: row.created_at,
    };
  }
}
