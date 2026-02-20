import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

/** Maps incoming camelCase target types to the DB enum values */
const TARGET_TYPE_MAP: Record<string, string> = {
  stream: 'STREAM',
  show: 'SHOW',
  STREAM: 'STREAM',
  SHOW: 'SHOW',
};

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * Get all favorites for the current user, enriched with target details.
   */
  async findByUser(userId: string) {
    this.logger.debug(`Finding favorites for user ${userId}`);

    const { data: rows, error } = await this.db.from('favorites')
      .select('*, streams(*), shows(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (rows ?? []).map((r: any) => this.formatFavorite(r));
  }

  /**
   * Add a favorite (idempotent -- returns existing if duplicate).
   */
  async add(userId: string, dto: { targetType: string; targetId: string }) {
    this.logger.debug(`User ${userId} favoriting ${dto.targetType}:${dto.targetId}`);

    const { targetType, targetId } = dto;

    // Validate and map target type
    const dbTargetType = TARGET_TYPE_MAP[targetType];
    if (!dbTargetType) {
      throw new BadRequestException('targetType must be "stream" or "show"');
    }

    // Verify target exists
    if (dbTargetType === 'STREAM') {
      const { data: stream } = await this.db.from('streams')
        .select('id')
        .eq('id', targetId)
        .maybeSingle();
      if (!stream) {
        throw new NotFoundException(`Stream ${targetId} not found`);
      }
    } else {
      const { data: show } = await this.db.from('shows')
        .select('id')
        .eq('id', targetId)
        .maybeSingle();
      if (!show) {
        throw new NotFoundException(`Show ${targetId} not found`);
      }
    }

    const streamId = dbTargetType === 'STREAM' ? targetId : null;
    const showId = dbTargetType === 'SHOW' ? targetId : null;

    // Check if already favorited (idempotent)
    let existingQuery = this.db.from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('target_type', dbTargetType);

    if (streamId) {
      existingQuery = existingQuery.eq('stream_id', streamId);
    } else {
      existingQuery = existingQuery.is('stream_id', null);
    }

    if (showId) {
      existingQuery = existingQuery.eq('show_id', showId);
    } else {
      existingQuery = existingQuery.is('show_id', null);
    }

    const { data: existing } = await existingQuery.limit(1).maybeSingle();

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

    const { data: created, error } = await this.db.from('favorites')
      .insert({
        user_id: userId,
        target_type: dbTargetType,
        stream_id: streamId,
        show_id: showId,
      })
      .select()
      .single();

    if (error) throw error;

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

    const { data: existing } = await this.db.from('favorites')
      .select('*')
      .eq('id', favoriteId)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Favorite ${favoriteId} not found`);
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException("Cannot remove another user's favorite");
    }

    const { error } = await this.db.from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) throw error;

    return { deleted: true, id: favoriteId };
  }

  /**
   * Check if a user has favorited a specific target.
   */
  async check(userId: string, targetType: string, targetId: string) {
    this.logger.debug(`Checking favorite ${targetType}:${targetId} for user ${userId}`);

    const dbTargetType = TARGET_TYPE_MAP[targetType];
    const streamId = dbTargetType === 'STREAM' ? targetId : null;
    const showId = dbTargetType === 'SHOW' ? targetId : null;

    let query = this.db.from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', dbTargetType);

    if (streamId) {
      query = query.eq('stream_id', streamId);
    } else {
      query = query.is('stream_id', null);
    }

    if (showId) {
      query = query.eq('show_id', showId);
    } else {
      query = query.is('show_id', null);
    }

    const { data: found } = await query.limit(1).maybeSingle();

    return {
      isFavorited: !!found,
      favoriteId: found?.id ?? null,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatFavorite(row: any) {
    const target = row.streams ?? row.shows;
    return {
      id: row.id,
      userId: row.user_id,
      targetType: row.target_type === 'STREAM' ? 'stream' : 'show',
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
