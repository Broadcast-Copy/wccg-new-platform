import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface LedgerRow {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  balance: number;
  created_at: Date;
}

interface PointsRuleRow {
  id: string;
  name: string;
  trigger_type: string;
  points_amount: number;
  threshold: number;
  is_active: boolean;
  cooldown_minutes: number;
  created_at: Date;
  updated_at: Date;
}

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

    const rows = await this.prisma.$queryRaw<{ balance: number }[]>`
      SELECT balance
      FROM points_ledger
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const balance = rows[0]?.balance ?? 0;
    return { userId, balance };
  }

  /**
   * Get the transaction history for a user with pagination.
   */
  async getHistory(userId: string, page = 1, limit = 20) {
    this.logger.debug(`Getting points history for user ${userId}`);
    const offset = (page - 1) * limit;

    const [entries, countResult] = await Promise.all([
      this.prisma.$queryRaw<LedgerRow[]>`
        SELECT *
        FROM points_ledger
        WHERE user_id = ${userId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM points_ledger
        WHERE user_id = ${userId}::uuid
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);

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

    const rows = await this.prisma.$queryRaw<PointsRuleRow[]>`
      SELECT *
      FROM points_rules
      WHERE is_active = true
      ORDER BY trigger_type ASC
    `;

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
    const { balance: currentBalance } = await this.getBalance(userId);
    const newBalance = currentBalance + dto.amount;

    const id = randomUUID();
    const now = new Date();
    const referenceType = dto.referenceType ?? null;
    const referenceId = dto.referenceId ?? null;

    await this.prisma.$executeRaw`
      INSERT INTO points_ledger (id, user_id, amount, reason, reference_type, reference_id, balance, created_at)
      VALUES (
        ${id}, ${userId}::uuid, ${dto.amount}, ${dto.reason},
        ${referenceType}, ${referenceId}, ${newBalance}, ${now}
      )
    `;

    return {
      id,
      userId,
      amount: dto.amount,
      reason: dto.reason,
      referenceType,
      referenceId,
      balance: newBalance,
      type: 'earn',
      createdAt: now,
    };
  }

  /**
   * Redeem points from a user's balance.
   * Optionally links to a reward catalog item and decrements stock.
   */
  async redeem(
    userId: string,
    dto: { amount: number; rewardId?: string; reason: string },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Redeem amount must be positive');
    }

    // Check sufficient balance
    const { balance: currentBalance } = await this.getBalance(userId);
    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient points balance. Have ${currentBalance}, need ${dto.amount}`,
      );
    }

    this.logger.debug(`Redeeming ${dto.amount} points from user ${userId}: ${dto.reason}`);

    // If redeeming for a reward, verify it exists and has stock
    if (dto.rewardId) {
      const rewards = await this.prisma.$queryRaw<{ id: string; stock_count: number; is_active: boolean }[]>`
        SELECT id, stock_count, is_active
        FROM reward_catalog
        WHERE id = ${dto.rewardId}
      `;

      if (rewards.length === 0) {
        throw new NotFoundException(`Reward ${dto.rewardId} not found`);
      }

      if (!rewards[0].is_active) {
        throw new BadRequestException('This reward is no longer available');
      }

      if (rewards[0].stock_count <= 0) {
        throw new BadRequestException('This reward is out of stock');
      }

      // Decrement stock
      await this.prisma.$executeRaw`
        UPDATE reward_catalog
        SET stock_count = stock_count - 1
        WHERE id = ${dto.rewardId} AND stock_count > 0
      `;
    }

    const newBalance = currentBalance - dto.amount;
    const id = randomUUID();
    const now = new Date();
    const referenceType = dto.rewardId ? 'reward' : null;
    const referenceId = dto.rewardId ?? null;

    await this.prisma.$executeRaw`
      INSERT INTO points_ledger (id, user_id, amount, reason, reference_type, reference_id, balance, created_at)
      VALUES (
        ${id}, ${userId}::uuid, ${-dto.amount}, ${dto.reason},
        ${referenceType}, ${referenceId}, ${newBalance}, ${now}
      )
    `;

    return {
      id,
      userId,
      amount: -dto.amount,
      reason: dto.reason,
      referenceType,
      referenceId,
      balance: newBalance,
      type: 'redeem',
      createdAt: now,
    };
  }
}
