import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { points_reason } from '@prisma/client';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current points balance for a user.
   * Uses the balance column from the most recent ledger entry (running balance).
   */
  async getBalance(userId: string) {
    this.logger.debug(`Getting balance for user ${userId}`);

    const latest = await this.prisma.points_ledger.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: { balance: true },
    });

    const balance = latest?.balance ?? 0;
    return { userId, balance };
  }

  /**
   * Get the transaction history for a user with pagination.
   */
  async getHistory(userId: string, page = 1, limit = 20) {
    this.logger.debug(`Getting points history for user ${userId}`);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.points_ledger.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.points_ledger.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      data: entries.map((e) => ({
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
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get all active points rules from the database.
   */
  async getRules() {
    this.logger.debug('Getting points rules');

    const rows = await this.prisma.points_rules.findMany({
      where: { is_active: true },
      orderBy: { trigger_type: 'asc' },
    });

    return rows.map((r) => ({
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
   * Uses a transaction to ensure atomicity between reading the balance and inserting the entry.
   */
  async award(
    userId: string,
    dto: { amount: number; reason: string; referenceType?: string; referenceId?: string },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Award amount must be positive');
    }

    this.logger.debug(`Awarding ${dto.amount} points to user ${userId}: ${dto.reason}`);

    const entry = await this.prisma.$transaction(async (tx) => {
      // Get current balance inside the transaction for consistency
      const latest = await tx.points_ledger.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        select: { balance: true },
      });

      const currentBalance = latest?.balance ?? 0;
      const newBalance = currentBalance + dto.amount;

      return tx.points_ledger.create({
        data: {
          user_id: userId,
          amount: dto.amount,
          reason: dto.reason as points_reason,
          reference_type: dto.referenceType ?? null,
          reference_id: dto.referenceId ?? null,
          balance: newBalance,
        },
      });
    });

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
   * Uses a transaction to ensure atomicity across balance check, stock decrement, and ledger insert.
   */
  async redeem(
    userId: string,
    dto: { amount: number; rewardId?: string; reason: string },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Redeem amount must be positive');
    }

    this.logger.debug(`Redeeming ${dto.amount} points from user ${userId}: ${dto.reason}`);

    const entry = await this.prisma.$transaction(async (tx) => {
      // Check sufficient balance inside the transaction
      const latest = await tx.points_ledger.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        select: { balance: true },
      });

      const currentBalance = latest?.balance ?? 0;
      if (currentBalance < dto.amount) {
        throw new BadRequestException(
          `Insufficient points balance. Have ${currentBalance}, need ${dto.amount}`,
        );
      }

      // If redeeming for a reward, verify it exists and has stock
      if (dto.rewardId) {
        const reward = await tx.reward_catalog.findUnique({
          where: { id: dto.rewardId },
          select: { id: true, stock_count: true, is_active: true },
        });

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
          await tx.reward_catalog.update({
            where: { id: dto.rewardId },
            data: { stock_count: { decrement: 1 } },
          });
        }
      }

      const newBalance = currentBalance - dto.amount;

      return tx.points_ledger.create({
        data: {
          user_id: userId,
          amount: -dto.amount,
          reason: dto.reason as points_reason,
          reference_type: dto.rewardId ? 'reward' : null,
          reference_id: dto.rewardId ?? null,
          balance: newBalance,
        },
      });
    });

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
