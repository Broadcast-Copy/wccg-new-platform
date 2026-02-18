import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all users (admin only).
   */
  async findAll(page = 1, limit = 20) {
    // TODO: Query users with pagination from Prisma
    this.logger.debug(`Finding all users, page=${page}, limit=${limit}`);
    return { data: [], meta: { page, limit, total: 0 } };
  }

  /**
   * Get a single user by their Supabase ID.
   */
  async findById(userId: string) {
    // TODO: Query user by ID from Prisma
    this.logger.debug(`Finding user ${userId}`);
    return null;
  }

  /**
   * Get the currently authenticated user's profile.
   */
  async findMe(userId: string) {
    // TODO: Query the current user's profile
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  /**
   * Update user profile (admin updating any user).
   */
  async update(userId: string, dto: Record<string, unknown>) {
    // TODO: Validate and update user record
    this.logger.debug(`Updating user ${userId}`);
    return { id: userId, ...dto };
  }

  /**
   * Update the current user's own profile.
   */
  async updateMe(userId: string, dto: Record<string, unknown>) {
    // TODO: Validate and update own profile (restricted fields)
    this.logger.debug(`User ${userId} updating own profile`);
    return { id: userId, ...dto };
  }
}
