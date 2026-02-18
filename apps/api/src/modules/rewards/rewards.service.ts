import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface RewardRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  category: string | null;
  stock_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all rewards (catalog), optionally filtered by active status.
   */
  async findAll(filters?: { active?: boolean }) {
    this.logger.debug('Finding all rewards');

    if (filters?.active !== undefined) {
      const rows = await this.prisma.$queryRaw<RewardRow[]>`
        SELECT *
        FROM reward_catalog
        WHERE is_active = ${filters.active}
        ORDER BY points_cost ASC, name ASC
      `;
      return rows.map((r) => this.formatReward(r));
    }

    const rows = await this.prisma.$queryRaw<RewardRow[]>`
      SELECT *
      FROM reward_catalog
      ORDER BY points_cost ASC, name ASC
    `;
    return rows.map((r) => this.formatReward(r));
  }

  /**
   * Get a single reward by ID.
   */
  async findById(id: string) {
    this.logger.debug(`Finding reward ${id}`);

    const rows = await this.prisma.$queryRaw<RewardRow[]>`
      SELECT * FROM reward_catalog WHERE id = ${id}
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Reward ${id} not found`);
    }

    return this.formatReward(rows[0]);
  }

  /**
   * Create a new reward (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating reward');
    const id = (dto.id as string) ?? randomUUID();
    const name = dto.name as string;
    const description = (dto.description as string) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const pointsCost = dto.pointsCost as number;
    const category = (dto.category as string) ?? null;
    const stockCount = (dto.stockCount as number) ?? 0;
    const isActive = (dto.isActive as boolean) ?? true;
    const now = new Date();

    await this.prisma.$executeRaw`
      INSERT INTO reward_catalog (id, name, description, image_url, points_cost, category, stock_count, is_active, created_at, updated_at)
      VALUES (${id}, ${name}, ${description}, ${imageUrl}, ${pointsCost}, ${category}, ${stockCount}, ${isActive}, ${now}, ${now})
    `;

    return this.findById(id);
  }

  /**
   * Update a reward (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating reward ${id}`);

    // Verify exists
    await this.findById(id);

    const now = new Date();
    const name = (dto.name as string) ?? null;
    const description = (dto.description as string) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const pointsCost = (dto.pointsCost as number) ?? null;
    const category = (dto.category as string) ?? null;
    const stockCount = (dto.stockCount as number) ?? null;
    const isActive = dto.isActive as boolean | undefined;

    await this.prisma.$executeRaw`
      UPDATE reward_catalog SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        image_url = COALESCE(${imageUrl}, image_url),
        points_cost = COALESCE(${pointsCost}, points_cost),
        category = COALESCE(${category}, category),
        stock_count = COALESCE(${stockCount}, stock_count),
        is_active = COALESCE(${isActive ?? null}::boolean, is_active),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    return this.findById(id);
  }

  /**
   * Delete a reward (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting reward ${id}`);

    // Verify exists
    await this.findById(id);

    await this.prisma.$executeRaw`DELETE FROM reward_catalog WHERE id = ${id}`;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatReward(row: RewardRow) {
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
