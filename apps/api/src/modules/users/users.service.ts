import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * Get all users (admin only) with pagination.
   */
  async findAll(page = 1, limit = 20) {
    this.logger.debug(`Finding all users, page=${page}, limit=${limit}`);
    const skip = (page - 1) * limit;

    const { data: users, count: total, error } = await this.db.from('profiles')
      .select('*, user_roles(role_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;

    const totalCount = total ?? 0;

    return {
      data: (users ?? []).map((u: any) => this.formatProfile(u)),
      meta: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  /**
   * Get a single user by their Supabase UUID.
   */
  async findById(userId: string) {
    this.logger.debug(`Finding user ${userId}`);

    const { data: row, error } = await this.db.from('profiles')
      .select('*, user_roles(role_id)')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return null;
    return this.formatProfile(row);
  }

  /**
   * Get the currently authenticated user's profile.
   */
  async findMe(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  /**
   * Get the current user's roles as an array of role name strings.
   */
  async findMyRoles(userId: string) {
    this.logger.debug(`Finding roles for user ${userId}`);

    const { data: userRoles, error } = await this.db.from('user_roles')
      .select('role_id')
      .eq('profile_id', userId);

    if (error) throw error;

    const roles = (userRoles ?? []).map((ur: any) => ur.role_id);

    // If no roles assigned, default to listener
    if (roles.length === 0) {
      return { roles: ['listener'] };
    }

    return { roles };
  }

  /**
   * Update user profile (admin updating any user).
   * Admins can update all fields including is_active and roles.
   */
  async update(userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating user ${userId}`);

    // Verify user exists
    const existing = await this.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.firstName !== undefined) data.first_name = dto.firstName as string;
    if (dto.lastName !== undefined) data.last_name = dto.lastName as string;
    if (dto.displayName !== undefined) data.display_name = dto.displayName as string;
    if (dto.avatarUrl !== undefined) data.avatar_url = dto.avatarUrl as string;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;

    await this.db.from('profiles')
      .update(data)
      .eq('id', userId);

    return this.findById(userId);
  }

  /**
   * Update the current user's own profile (restricted fields).
   * Users can only update their own display info, not roles or active status.
   */
  async updateMe(userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`User ${userId} updating own profile`);

    // Restrict fields users can update on themselves
    const allowedFields = ['firstName', 'lastName', 'displayName', 'avatarUrl'];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        sanitized[key] = dto[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    return this.update(userId, sanitized);
  }

  // ─── Impersonation ──────────────────────────────────────────

  /**
   * Verify that the requesting user has super_admin role.
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.db.from('user_roles')
      .select('role_id')
      .eq('profile_id', userId)
      .eq('role_id', 'super_admin')
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  /**
   * Get full dashboard data for a target user (for impersonation).
   * Returns the user's profile, roles, podcasts, points, etc.
   */
  async getUserDashboard(targetUserId: string) {
    const profile = await this.findById(targetUserId);
    if (!profile) throw new NotFoundException('Target user not found');

    // Fetch user's podcast series
    const { data: podcasts } = await this.db.from('podcast_series')
      .select('id, title, status, subscriber_count, total_plays, created_at')
      .eq('creator_id', targetUserId)
      .order('created_at', { ascending: false });

    // Fetch user's podcast episodes count
    const { count: episodeCount } = await this.db.from('podcast_episodes')
      .select('id', { count: 'exact', head: true })
      .in('series_id', (podcasts ?? []).map((p: any) => p.id));

    // Fetch user's points balance
    const { data: pointsData } = await this.db.from('point_balances')
      .select('balance')
      .eq('profile_id', targetUserId)
      .maybeSingle();

    // Fetch user's favorites count
    const { count: favoritesCount } = await this.db.from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', targetUserId);

    return {
      profile,
      podcasts: (podcasts ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        subscriberCount: p.subscriber_count,
        totalPlays: p.total_plays,
        createdAt: p.created_at,
      })),
      stats: {
        podcastSeries: (podcasts ?? []).length,
        podcastEpisodes: episodeCount ?? 0,
        points: pointsData?.balance ?? 0,
        favorites: favoritesCount ?? 0,
      },
    };
  }

  /**
   * Log an impersonation event.
   */
  async logImpersonation(adminId: string, targetUserId: string, action: 'start' | 'end') {
    await this.db.from('impersonation_log')
      .insert({
        admin_id: adminId,
        target_user_id: targetUserId,
        action,
      });
  }

  /**
   * Update a user's roles (super_admin only).
   */
  async updateRoles(userId: string, roles: string[]) {
    this.logger.debug(`Updating roles for ${userId}: ${roles.join(', ')}`);

    // Validate user exists
    const existing = await this.findById(userId);
    if (!existing) throw new NotFoundException('User not found');

    // Delete existing roles
    await this.db.from('user_roles')
      .delete()
      .eq('profile_id', userId);

    // Insert new roles
    if (roles.length > 0) {
      const rows = roles.map((roleId) => ({
        profile_id: userId,
        role_id: roleId,
      }));
      await this.db.from('user_roles').insert(rows);
    }

    return this.findById(userId);
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatProfile(row: any) {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      roles: (row.user_roles ?? []).map((ur: any) => ur.role_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
