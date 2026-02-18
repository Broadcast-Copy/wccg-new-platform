import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all shows with optional filters (genre, host, stream).
   */
  async findAll(filters?: { genre?: string; hostId?: string; streamId?: string }) {
    // TODO: Build dynamic Prisma query with filters
    this.logger.debug('Finding all shows', filters);
    return [];
  }

  /**
   * Get a single show by ID.
   */
  async findById(id: string) {
    // TODO: Query show by ID with relations (host, stream)
    this.logger.debug(`Finding show ${id}`);
    return null;
  }

  /**
   * Create a new show (admin only).
   */
  async create(dto: Record<string, unknown>) {
    // TODO: Validate and create show record
    this.logger.debug('Creating show');
    return { id: 'new-show-id', ...dto };
  }

  /**
   * Update a show (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    // TODO: Validate and update show record
    this.logger.debug(`Updating show ${id}`);
    return { id, ...dto };
  }

  /**
   * Delete a show (admin only).
   */
  async remove(id: string) {
    // TODO: Soft-delete or hard-delete show
    this.logger.debug(`Deleting show ${id}`);
    return { deleted: true, id };
  }
}
