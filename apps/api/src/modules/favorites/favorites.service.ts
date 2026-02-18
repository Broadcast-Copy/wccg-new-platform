import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { favorite_target_type } from '@prisma/client';
import type { favorites, streams, shows } from '@prisma/client';

// ─── Prisma result types ─────────────────────────────────────────

type FavoriteWithRelations = favorites & {
  stream: streams | null;
  show: shows | null;
};

/** Maps incoming camelCase target types to the Prisma enum values */
const TARGET_TYPE_MAP: Record<string, favorite_target_type> = {
  stream: favorite_target_type.STREAM,
  show: favorite_target_type.SHOW,
  STREAM: favorite_target_type.STREAM,
  SHOW: favorite_target_type.SHOW,
};

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all favorites for the current user, enriched with target details.
   */
  async findByUser(userId: string) {
    this.logger.debug(`Finding favorites for user ${userId}`);

    const rows = await this.prisma.favorites.findMany({
      where: { user_id: userId },
      include: {
        stream: true,
        show: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((r) => this.formatFavorite(r));
  }

  /**
   * Add a favorite (idempotent -- returns existing if duplicate).
   */
  async add(userId: string, dto: { targetType: string; targetId: string }) {
    this.logger.debug(`User ${userId} favoriting ${dto.targetType}:${dto.targetId}`);

    const { targetType, targetId } = dto;

    // Validate and map target type
    const prismaTargetType = TARGET_TYPE_MAP[targetType];
    if (!prismaTargetType) {
      throw new BadRequestException('targetType must be "stream" or "show"');
    }

    // Verify target exists
    if (prismaTargetType === favorite_target_type.STREAM) {
      const stream = await this.prisma.streams.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!stream) {
        throw new NotFoundException(`Stream ${targetId} not found`);
      }
    } else {
      const show = await this.prisma.shows.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!show) {
        throw new NotFoundException(`Show ${targetId} not found`);
      }
    }

    const streamId = prismaTargetType === favorite_target_type.STREAM ? targetId : null;
    const showId = prismaTargetType === favorite_target_type.SHOW ? targetId : null;

    // Check if already favorited (idempotent)
    const existing = await this.prisma.favorites.findFirst({
      where: {
        user_id: userId,
        target_type: prismaTargetType,
        stream_id: streamId,
        show_id: showId,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        userId: existing.user_id,
        targetType: targetType.toLowerCase(),
        targetId,
        createdAt: existing.created_at,
        alreadyExisted: true,
      };
    }

    const created = await this.prisma.favorites.create({
      data: {
        user_id: userId,
        target_type: prismaTargetType,
        stream_id: streamId,
        show_id: showId,
      },
    });

    return {
      id: created.id,
      userId: created.user_id,
      targetType: targetType.toLowerCase(),
      targetId,
      createdAt: created.created_at,
      alreadyExisted: false,
    };
  }

  /**
   * Remove a favorite by ID (must belong to user).
   */
  async remove(userId: string, favoriteId: string) {
    this.logger.debug(`User ${userId} unfavoriting ${favoriteId}`);

    const existing = await this.prisma.favorites.findUnique({
      where: { id: favoriteId },
    });

    if (!existing) {
      throw new NotFoundException(`Favorite ${favoriteId} not found`);
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException("Cannot remove another user's favorite");
    }

    await this.prisma.favorites.delete({
      where: { id: favoriteId },
    });

    return { deleted: true, id: favoriteId };
  }

  /**
   * Check if a user has favorited a specific target.
   */
  async check(userId: string, targetType: string, targetId: string) {
    this.logger.debug(`Checking favorite ${targetType}:${targetId} for user ${userId}`);

    const prismaTargetType = TARGET_TYPE_MAP[targetType];
    const streamId = prismaTargetType === favorite_target_type.STREAM ? targetId : null;
    const showId = prismaTargetType === favorite_target_type.SHOW ? targetId : null;

    const found = await this.prisma.favorites.findFirst({
      where: {
        user_id: userId,
        target_type: prismaTargetType,
        stream_id: streamId,
        show_id: showId,
      },
      select: { id: true },
    });

    return {
      isFavorited: !!found,
      favoriteId: found?.id ?? null,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatFavorite(row: FavoriteWithRelations) {
    const target = row.stream ?? row.show;
    return {
      id: row.id,
      userId: row.user_id,
      targetType: row.target_type === favorite_target_type.STREAM ? 'stream' : 'show',
      targetId: row.stream_id ?? row.show_id,
      target: target
        ? {
            name: target.name,
            slug: target.slug,
            imageUrl: target.image_url,
          }
        : null,
      createdAt: row.created_at,
    };
  }
}
