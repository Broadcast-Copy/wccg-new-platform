import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * Get users that the given user follows.
   */
  async getFollowing(userId: string) {
    this.logger.debug(`Getting following list for user ${userId}`);

    const { data, error } = await this.db.from('follows')
      .select('*, followed:followed_id(id, display_name, avatar_url)')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatFollow(row, 'following'));
  }

  /**
   * Get followers of the given user.
   */
  async getFollowers(userId: string) {
    this.logger.debug(`Getting followers for user ${userId}`);

    const { data, error } = await this.db.from('follows')
      .select('*, follower:follower_id(id, display_name, avatar_url)')
      .eq('followed_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatFollow(row, 'follower'));
  }

  /**
   * Follow a user.
   */
  async follow(followerId: string, followedId: string) {
    this.logger.debug(`User ${followerId} following ${followedId}`);

    if (followerId === followedId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await this.db.from('profiles')
      .select('id')
      .eq('id', followedId)
      .maybeSingle();

    if (userError) throw userError;

    if (!targetUser) {
      throw new NotFoundException(`User ${followedId} not found`);
    }

    // Check if already following (upsert to avoid duplicates)
    const { data: existing } = await this.db.from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle();

    if (existing) {
      return { followed: true, alreadyFollowing: true };
    }

    const { error } = await this.db.from('follows')
      .insert({
        follower_id: followerId,
        followed_id: followedId,
      });

    if (error) throw error;

    return { followed: true, alreadyFollowing: false };
  }

  /**
   * Unfollow a user.
   */
  async unfollow(followerId: string, followedId: string) {
    this.logger.debug(`User ${followerId} unfollowing ${followedId}`);

    const { data: existing, error: fetchError } = await this.db.from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      throw new NotFoundException('Follow relationship not found');
    }

    const { error } = await this.db.from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId);

    if (error) throw error;

    return { unfollowed: true };
  }

  /**
   * Get follower and following counts for a user.
   */
  async getCounts(userId: string) {
    this.logger.debug(`Getting counts for user ${userId}`);

    const { count: followersCount, error: followersError } = await this.db.from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('followed_id', userId);

    if (followersError) throw followersError;

    const { count: followingCount, error: followingError } = await this.db.from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (followingError) throw followingError;

    return {
      userId,
      followers: followersCount ?? 0,
      following: followingCount ?? 0,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Format a follow row for API response.
   */
  private formatFollow(row: any, type: 'follower' | 'following') {
    const base = {
      id: row.id,
      followerId: row.follower_id,
      followedId: row.followed_id,
      createdAt: row.created_at,
    };

    if (type === 'following' && row.followed) {
      return {
        ...base,
        user: {
          id: row.followed.id,
          displayName: row.followed.display_name,
          avatarUrl: row.followed.avatar_url,
        },
      };
    }

    if (type === 'follower' && row.follower) {
      return {
        ...base,
        user: {
          id: row.follower.id,
          displayName: row.follower.display_name,
          avatarUrl: row.follower.avatar_url,
        },
      };
    }

    return base;
  }
}
