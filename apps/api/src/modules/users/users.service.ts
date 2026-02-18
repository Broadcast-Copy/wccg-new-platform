import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { profiles, user_roles } from '@prisma/client';

/** Profile row returned from Prisma with its user_roles included. */
type ProfileWithRoles = profiles & { user_roles: Pick<user_roles, 'role_id'>[] };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all users (admin only) with pagination.
   */
  async findAll(page = 1, limit = 20) {
    this.logger.debug(`Finding all users, page=${page}, limit=${limit}`);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.profiles.findMany({
        include: { user_roles: { select: { role_id: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.profiles.count(),
    ]);

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

    const row = await this.prisma.profiles.findUnique({
      where: { id: userId },
      include: { user_roles: { select: { role_id: true } } },
    });

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

    await this.prisma.profiles.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { first_name: dto.firstName as string }),
        ...(dto.lastName !== undefined && { last_name: dto.lastName as string }),
        ...(dto.displayName !== undefined && { display_name: dto.displayName as string }),
        ...(dto.avatarUrl !== undefined && { avatar_url: dto.avatarUrl as string }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive as boolean }),
        updated_at: new Date(),
      },
    });

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
      roles: row.user_roles.map((ur) => ur.role_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
