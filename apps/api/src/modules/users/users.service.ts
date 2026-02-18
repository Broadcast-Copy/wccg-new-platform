import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ProfileWithRoles extends ProfileRow {
  roles: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all users (admin only) with pagination.
   */
  async findAll(page = 1, limit = 20) {
    this.logger.debug(`Finding all users, page=${page}, limit=${limit}`);
    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
      this.prisma.$queryRaw<ProfileWithRoles[]>`
        SELECT
          p.id, p.email, p.first_name, p.last_name, p.display_name,
          p.avatar_url, p.is_active, p.created_at, p.updated_at,
          STRING_AGG(ur.role_id, ',') as roles
        FROM profiles p
        LEFT JOIN user_roles ur ON ur.profile_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM profiles
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: users.map((u) => this.formatProfile(u)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single user by their Supabase UUID.
   */
  async findById(userId: string) {
    this.logger.debug(`Finding user ${userId}`);

    const rows = await this.prisma.$queryRaw<ProfileWithRoles[]>`
      SELECT
        p.id, p.email, p.first_name, p.last_name, p.display_name,
        p.avatar_url, p.is_active, p.created_at, p.updated_at,
        STRING_AGG(ur.role_id, ',') as roles
      FROM profiles p
      LEFT JOIN user_roles ur ON ur.profile_id = p.id
      WHERE p.id = ${userId}::uuid
      GROUP BY p.id
    `;

    if (rows.length === 0) return null;
    return this.formatProfile(rows[0]);
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

    const now = new Date();
    const firstName = (dto.firstName as string) ?? null;
    const lastName = (dto.lastName as string) ?? null;
    const displayName = (dto.displayName as string) ?? null;
    const avatarUrl = (dto.avatarUrl as string) ?? null;
    const isActive = dto.isActive as boolean | undefined;

    await this.prisma.$executeRaw`
      UPDATE profiles SET
        first_name = COALESCE(${firstName}, first_name),
        last_name = COALESCE(${lastName}, last_name),
        display_name = COALESCE(${displayName}, display_name),
        avatar_url = COALESCE(${avatarUrl}, avatar_url),
        is_active = COALESCE(${isActive ?? null}::boolean, is_active),
        updated_at = ${now}
      WHERE id = ${userId}::uuid
    `;

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

  private formatProfile(row: ProfileWithRoles) {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      roles: row.roles ? row.roles.split(',') : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
