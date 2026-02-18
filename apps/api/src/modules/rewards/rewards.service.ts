import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all available rewards (catalog).
   */
  async findAll(filters?: { active?: boolean }) {
    // TODO: Query rewards catalog, optionally filter by active status
    this.logger.debug('Finding all rewards');
    return [];
  }

  /**
   * Get a single reward by ID.
   */
  async findById(id: string) {
    // TODO: Query reward by ID
    this.logger.debug(`Finding reward ${id}`);
    return null;
  }

  /**
   * Create a new reward (admin only).
   */
  async create(dto: Record<string, unknown>) {
    // TODO: Validate and create reward record
    this.logger.debug('Creating reward');
    return { id: 'new-reward-id', ...dto };
  }

  /**
   * Update a reward (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    // TODO: Validate and update reward record
    this.logger.debug(`Updating reward ${id}`);
    return { id, ...dto };
  }

  /**
   * Delete a reward (admin only).
   */
  async remove(id: string) {
    // TODO: Soft-delete or hard-delete reward
    this.logger.debug(`Deleting reward ${id}`);
    return { deleted: true, id };
  }
}
