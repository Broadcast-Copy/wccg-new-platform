import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all rewards (catalog), optionally filtered by active status.
   */
  async findAll(filters?: { active?: boolean }) {
    this.logger.debug('Finding all rewards');

    let query = this.db.from('reward_catalog')
      .select('*')
      .order('points_cost', { ascending: true })
      .order('name', { ascending: true });

    if (filters?.active !== undefined) {
      query = query.eq('is_active', filters.active);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((r: any) => this.formatReward(r));
  }

  /**
   * Get a single reward by ID.
   */
  async findById(id: string) {
    this.logger.debug(`Finding reward ${id}`);

    const { data: row, error } = await this.db.from('reward_catalog')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Reward ${id} not found`);
    }

    return this.formatReward(row);
  }

  /**
   * Create a new reward (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating reward');

    const { data: row, error } = await this.db.from('reward_catalog')
      .insert({
        ...(dto.id ? { id: dto.id as string } : {}),
        name: dto.name as string,
        description: (dto.description as string) ?? null,
        image_url: (dto.imageUrl as string) ?? null,
        points_cost: dto.pointsCost as number,
        category: (dto.category as string) ?? null,
        stock_count: (dto.stockCount as number) ?? 0,
        is_active: (dto.isActive as boolean) ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return this.formatReward(row);
  }

  /**
   * Update a reward (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating reward ${id}`);

    // Verify exists
    await this.findById(id);

    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.description !== undefined) data.description = dto.description as string;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;
    if (dto.pointsCost !== undefined) data.points_cost = dto.pointsCost as number;
    if (dto.category !== undefined) data.category = dto.category as string;
    if (dto.stockCount !== undefined) data.stock_count = dto.stockCount as number;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;

    const { data: row, error } = await this.db.from('reward_catalog')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.formatReward(row);
  }

  /**
   * Delete a reward (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting reward ${id}`);

    // Verify exists
    await this.findById(id);

    const { error } = await this.db.from('reward_catalog')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatReward(row: any) {
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
