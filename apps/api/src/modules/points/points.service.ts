import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * Get the current points balance for a user.
   * Uses the balance column from the most recent ledger entry (running balance).
   */
  async getBalance(userId: string) {
    this.logger.debug(`Getting balance for user ${userId}`);

    const { data: latest } = await this.db.from('points_ledger')
      .select('balance')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const balance = latest?.balance ?? 0;
    return { userId, balance };
  }

  /**
   * Get the transaction history for a user with pagination.
   */
  async getHistory(userId: string, page = 1, limit = 20) {
    this.logger.debug(`Getting points history for user ${userId}`);
    const skip = (page - 1) * limit;

    const { data: entries, count: total, error } = await this.db.from('points_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;

    const totalCount = total ?? 0;

    return {
      data: (entries ?? []).map((e: any) => ({
        id: e.id,
        userId: e.user_id,
        amount: e.amount,
        reason: e.reason,
        referenceType: e.reference_type,
        referenceId: e.reference_id,
        balance: e.balance,
        type: e.amount >= 0 ? 'earn' : 'redeem',
        createdAt: e.created_at,
      })),
      meta: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  /**
   * Get all active points rules from the database.
   */
  async getRules() {
    this.logger.debug('Getting points rules');

    const { data: rows, error } = await this.db.from('points_rules')
      .select('*')
      .eq('is_active', true)
      .order('trigger_type', { ascending: true });

    if (error) throw error;

    return (rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      triggerType: r.trigger_type,
      pointsAmount: r.points_amount,
      threshold: r.threshold,
      isActive: r.is_active,
      cooldownMinutes: r.cooldown_minutes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Award points to a user (admin or system).
   * Creates a ledger entry with a running balance.
   * Uses sequential operations (Supabase doesn't support transactions via REST).
   */
  async award(
    userId: string,
    dto: { amount: number; reason: string; referenceType?: string; referenceId?: string },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Award amount must be positive');
    }

    this.logger.debug(`Awarding ${dto.amount} points to user ${userId}: ${dto.reason}`);

    // Get current balance
    const { data: latest } = await this.db.from('points_ledger')
      .select('balance')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = latest?.balance ?? 0;
    const newBalance = currentBalance + dto.amount;

    const { data: entry, error } = await this.db.from('points_ledger')
      .insert({
        user_id: userId,
        amount: dto.amount,
        reason: dto.reason,
        reference_type: dto.referenceType ?? null,
        reference_id: dto.referenceId ?? null,
        balance: newBalance,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: entry.id,
      userId: entry.user_id,
      amount: entry.amount,
      reason: entry.reason,
      referenceType: entry.reference_type,
      referenceId: entry.reference_id,
      balance: entry.balance,
      type: 'earn',
      createdAt: entry.created_at,
    };
  }

  /**
   * Redeem points from a user's balance.
   * Optionally links to a reward catalog item and decrements stock.
   * Uses sequential operations (acceptable risk of race conditions for this app).
   */
  async redeem(
    userId: string,
    dto: { amount: number; rewardId?: string; reason: string },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Redeem amount must be positive');
    }

    this.logger.debug(`Redeeming ${dto.amount} points from user ${userId}: ${dto.reason}`);

    // Check sufficient balance
    const { data: latest } = await this.db.from('points_ledger')
      .select('balance')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = latest?.balance ?? 0;
    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient points balance. Have ${currentBalance}, need ${dto.amount}`,
      );
    }

    // If redeeming for a reward, verify it exists and has stock
    if (dto.rewardId) {
      const { data: reward } = await this.db.from('reward_catalog')
        .select('id, stock_count, is_active')
        .eq('id', dto.rewardId)
        .maybeSingle();

      if (!reward) {
        throw new NotFoundException(`Reward ${dto.rewardId} not found`);
      }

      if (!reward.is_active) {
        throw new BadRequestException('This reward is no longer available');
      }

      if (reward.stock_count !== null && reward.stock_count <= 0) {
        throw new BadRequestException('This reward is out of stock');
      }

      // Decrement stock (only if stock_count is tracked, i.e. not null)
      if (reward.stock_count !== null) {
        await this.db.from('reward_catalog')
          .update({ stock_count: reward.stock_count - 1 })
          .eq('id', dto.rewardId);
      }
    }

    const newBalance = currentBalance - dto.amount;

    const { data: entry, error } = await this.db.from('points_ledger')
      .insert({
        user_id: userId,
        amount: -dto.amount,
        reason: dto.reason,
        reference_type: dto.rewardId ? 'reward' : null,
        reference_id: dto.rewardId ?? null,
        balance: newBalance,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: entry.id,
      userId: entry.user_id,
      amount: entry.amount,
      reason: entry.reason,
      referenceType: entry.reference_type,
      referenceId: entry.reference_id,
      balance: entry.balance,
      type: 'redeem',
      createdAt: entry.created_at,
    };
  }
}
