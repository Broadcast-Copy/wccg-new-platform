import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { reward_catalog } from '@prisma/client';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all rewards (catalog), optionally filtered by active status.
   */
  async findAll(filters?: { active?: boolean }) {
    this.logger.debug('Finding all rewards');

    const rows = await this.prisma.reward_catalog.findMany({
      where:
        filters?.active !== undefined
          ? { is_active: filters.active }
          : undefined,
      orderBy: [{ points_cost: 'asc' }, { name: 'asc' }],
    });

    return rows.map((r) => this.formatReward(r));
  }

  /**
   * Get a single reward by ID.
   */
  async findById(id: string) {
    this.logger.debug(`Finding reward ${id}`);

    const row = await this.prisma.reward_catalog.findUnique({
      where: { id },
    });

    if (!row) {
      throw new NotFoundException(`Reward ${id} not found`);
    }

    return this.formatReward(row);
  }

  /**
   * Create a new reward (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating reward');

    const row = await this.prisma.reward_catalog.create({
      data: {
        id: (dto.id as string) ?? undefined,
        name: dto.name as string,
        description: (dto.description as string) ?? null,
        image_url: (dto.imageUrl as string) ?? null,
        points_cost: dto.pointsCost as number,
        category: (dto.category as string) ?? null,
        stock_count: (dto.stockCount as number) ?? 0,
        is_active: (dto.isActive as boolean) ?? true,
      },
    });

    return this.formatReward(row);
  }

  /**
   * Update a reward (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating reward ${id}`);

    // Verify exists
    await this.findById(id);

    const row = await this.prisma.reward_catalog.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name as string }),
        ...(dto.description !== undefined && { description: dto.description as string }),
        ...(dto.imageUrl !== undefined && { image_url: dto.imageUrl as string }),
        ...(dto.pointsCost !== undefined && { points_cost: dto.pointsCost as number }),
        ...(dto.category !== undefined && { category: dto.category as string }),
        ...(dto.stockCount !== undefined && { stock_count: dto.stockCount as number }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive as boolean }),
        updated_at: new Date(),
      },
    });

    return this.formatReward(row);
  }

  /**
   * Delete a reward (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting reward ${id}`);

    // Verify exists
    await this.findById(id);

    await this.prisma.reward_catalog.delete({ where: { id } });

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatReward(row: reward_catalog) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      pointsCost: row.points_cost,
      category: row.category,
      stockCount: row.stock_count,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
