import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all favorites for the current user.
   */
  async findByUser(userId: string) {
    // TODO: Query favorites for user, join with shows/hosts
    this.logger.debug(`Finding favorites for user ${userId}`);
    return [];
  }

  /**
   * Add a favorite (toggle on).
   */
  async add(userId: string, dto: { targetType: string; targetId: string }) {
    // TODO: Upsert favorite record (idempotent)
    this.logger.debug(`User ${userId} favoriting ${dto.targetType}:${dto.targetId}`);
    return { userId, ...dto, createdAt: new Date().toISOString() };
  }

  /**
   * Remove a favorite by ID (toggle off).
   */
  async remove(userId: string, favoriteId: string) {
    // TODO: Delete favorite record, ensure it belongs to user
    this.logger.debug(`User ${userId} unfavoriting ${favoriteId}`);
    return { deleted: true, id: favoriteId };
  }

  /**
   * Check if a user has favorited a specific target.
   */
  async check(userId: string, targetType: string, targetId: string) {
    // TODO: Query for existence of favorite
    this.logger.debug(`Checking favorite ${targetType}:${targetId} for user ${userId}`);
    return { isFavorited: false };
  }
}
