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
