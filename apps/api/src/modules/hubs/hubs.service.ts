import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

const VALID_HUB_TYPES = ['creator', 'vendor', 'listener'] as const;
type HubType = (typeof VALID_HUB_TYPES)[number];

const PAGE_SIZE = 20;

@Injectable()
export class HubsService {
  private readonly logger = new Logger(HubsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── Posts ──────────────────────────────────────────────────────

  /**
   * List posts for a hub (paginated).
   */
  async listPosts(hubType: HubType, page = 1) {
    this.validateHubType(hubType);
    this.logger.debug(`Listing posts for ${hubType} hub, page ${page}`);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await this.db.from('hub_posts')
      .select('*', { count: 'exact' })
      .eq('hub_type', hubType)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Fetch display names for post authors
    const posts = data ?? [];
    const userIds: string[] = posts.map((p: any) => String(p.user_id)).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    const profiles = await this.fetchProfiles(userIds);

    return {
      posts: posts.map((p: any) => this.formatPost(p, profiles)),
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  /**
   * Create a new hub post.
   */
  async createPost(
    hubType: HubType,
    userId: string,
    body: { content: string; postType: string; mediaUrl?: string; linkUrl?: string },
  ) {
    this.validateHubType(hubType);

    if (!body.content?.trim()) {
      throw new BadRequestException('Post content cannot be empty');
    }

    this.logger.debug(`User ${userId} creating ${hubType} post`);

    const { data, error } = await this.db.from('hub_posts')
      .insert({
        hub_type: hubType,
        user_id: userId,
        post_type: body.postType,
        content: body.content.trim(),
        media_url: body.mediaUrl ?? null,
        link_url: body.linkUrl ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return this.formatPost(data, {});
  }

  /**
   * Delete own post.
   */
  async deletePost(hubType: HubType, postId: string, userId: string) {
    this.validateHubType(hubType);
    this.logger.debug(`User ${userId} deleting post ${postId}`);

    const { data: post, error: fetchError } = await this.db.from('hub_posts')
      .select('id, user_id')
      .eq('id', postId)
      .eq('hub_type', hubType)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!post) throw new NotFoundException('Post not found');
    if (post.user_id !== userId) throw new ForbiddenException('Cannot delete another user\'s post');

    const { error } = await this.db.from('hub_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    return { deleted: true };
  }

  // ─── Likes ──────────────────────────────────────────────────────

  /**
   * Like a post.
   */
  async likePost(hubType: HubType, postId: string, userId: string) {
    this.validateHubType(hubType);
    this.logger.debug(`User ${userId} liking post ${postId}`);

    // Check post exists
    const { data: post, error: postError } = await this.db.from('hub_posts')
      .select('id, likes_count')
      .eq('id', postId)
      .eq('hub_type', hubType)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) throw new NotFoundException('Post not found');

    // Check if already liked
    const { data: existing } = await this.db.from('hub_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { liked: true, alreadyLiked: true };
    }

    // Insert like
    const { error: likeError } = await this.db.from('hub_post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (likeError) throw likeError;

    // Increment likes_count
    await this.db.from('hub_posts')
      .update({ likes_count: (post.likes_count ?? 0) + 1 })
      .eq('id', postId);

    return { liked: true, alreadyLiked: false };
  }

  /**
   * Unlike a post.
   */
  async unlikePost(hubType: HubType, postId: string, userId: string) {
    this.validateHubType(hubType);
    this.logger.debug(`User ${userId} unliking post ${postId}`);

    const { data: existing, error: fetchError } = await this.db.from('hub_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new NotFoundException('Like not found');

    const { error } = await this.db.from('hub_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;

    // Decrement likes_count
    const { data: post } = await this.db.from('hub_posts')
      .select('likes_count')
      .eq('id', postId)
      .maybeSingle();

    if (post) {
      await this.db.from('hub_posts')
        .update({ likes_count: Math.max(0, (post.likes_count ?? 1) - 1) })
        .eq('id', postId);
    }

    return { unliked: true };
  }

  // ─── Membership ─────────────────────────────────────────────────

  /**
   * Check if user is a member of a hub.
   */
  async checkMembership(hubType: HubType, userId: string) {
    this.validateHubType(hubType);

    const { data, error } = await this.db.from('hub_memberships')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('hub_type', hubType)
      .maybeSingle();

    if (error) throw error;

    return {
      isMember: !!data,
      joinedAt: data?.created_at ?? null,
    };
  }

  /**
   * Join a hub.
   */
  async joinHub(hubType: HubType, userId: string) {
    this.validateHubType(hubType);
    this.logger.debug(`User ${userId} joining ${hubType} hub`);

    // Check if already a member
    const { data: existing } = await this.db.from('hub_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('hub_type', hubType)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Already a member of this hub');
    }

    const { error } = await this.db.from('hub_memberships')
      .insert({ user_id: userId, hub_type: hubType });

    if (error) throw error;

    return { joined: true, hubType };
  }

  /**
   * Leave a hub.
   */
  async leaveHub(hubType: HubType, userId: string) {
    this.validateHubType(hubType);
    this.logger.debug(`User ${userId} leaving ${hubType} hub`);

    const { data: existing, error: fetchError } = await this.db.from('hub_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('hub_type', hubType)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new NotFoundException('Not a member of this hub');

    const { error } = await this.db.from('hub_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('hub_type', hubType);

    if (error) throw error;

    return { left: true, hubType };
  }

  // ─── Stats ──────────────────────────────────────────────────────

  /**
   * Get hub statistics.
   */
  async getStats(hubType: HubType) {
    this.validateHubType(hubType);

    const { count: memberCount } = await this.db.from('hub_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('hub_type', hubType);

    const { count: postCount } = await this.db.from('hub_posts')
      .select('id', { count: 'exact', head: true })
      .eq('hub_type', hubType);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: weeklyPosts } = await this.db.from('hub_posts')
      .select('id', { count: 'exact', head: true })
      .eq('hub_type', hubType)
      .gte('created_at', weekAgo);

    return {
      hubType,
      members: memberCount ?? 0,
      totalPosts: postCount ?? 0,
      postsThisWeek: weeklyPosts ?? 0,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────

  private validateHubType(type: string): asserts type is HubType {
    if (!VALID_HUB_TYPES.includes(type as HubType)) {
      throw new BadRequestException(`Invalid hub type: ${type}. Must be one of: ${VALID_HUB_TYPES.join(', ')}`);
    }
  }

  private async fetchProfiles(userIds: string[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};

    const { data } = await this.db.from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    const map: Record<string, string> = {};
    for (const p of data ?? []) {
      map[p.id] = p.display_name ?? 'Anonymous';
    }
    return map;
  }

  private formatPost(row: any, profiles: Record<string, string>) {
    return {
      id: row.id,
      hubType: row.hub_type,
      userId: row.user_id,
      postType: row.post_type,
      content: row.content,
      mediaUrl: row.media_url,
      linkUrl: row.link_url,
      linkTitle: row.link_title,
      likesCount: row.likes_count ?? 0,
      createdAt: row.created_at,
      displayName: profiles[row.user_id] ?? 'Anonymous',
    };
  }
}
