import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current points balance for a user.
   */
  async getBalance(userId: string) {
    // TODO: Sum points from ledger or read cached balance
    this.logger.debug(`Getting balance for user ${userId}`);
    return { userId, balance: 0 };
  }

  /**
   * Get the transaction history for a user.
   */
  async getHistory(userId: string, page = 1, limit = 20) {
    // TODO: Query points_ledger ordered by created_at DESC
    this.logger.debug(`Getting points history for user ${userId}`);
    return { data: [], meta: { page, limit, total: 0 } };
  }

  /**
   * Get all earning/spending rules.
   */
  async getRules() {
    // TODO: Query points_rules table or return hard-coded rules
    this.logger.debug('Getting points rules');
    return [
      { action: 'listen_minute', points: 1, description: 'Earn 1 point per minute of listening' },
      { action: 'daily_login', points: 5, description: 'Earn 5 points for daily login' },
      { action: 'share', points: 10, description: 'Earn 10 points for sharing a show' },
    ];
  }

  /**
   * Award points to a user (admin or system).
   */
  async award(userId: string, dto: { amount: number; reason: string; ruleAction?: string }) {
    // TODO: Insert ledger entry, update cached balance
    if (dto.amount <= 0) {
      throw new BadRequestException('Award amount must be positive');
    }
    this.logger.debug(`Awarding ${dto.amount} points to user ${userId}: ${dto.reason}`);
    return {
      userId,
      amount: dto.amount,
      reason: dto.reason,
      type: 'earn',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Redeem points from a user's balance.
   */
  async redeem(userId: string, dto: { amount: number; rewardId?: string; reason: string }) {
    // TODO: Check sufficient balance, insert negative ledger entry, update cached balance
    if (dto.amount <= 0) {
      throw new BadRequestException('Redeem amount must be positive');
    }
    const balance = await this.getBalance(userId);
    if (balance.balance < dto.amount) {
      throw new BadRequestException('Insufficient points balance');
    }
    this.logger.debug(`Redeeming ${dto.amount} points from user ${userId}: ${dto.reason}`);
    return {
      userId,
      amount: -dto.amount,
      reason: dto.reason,
      type: 'redeem',
      createdAt: new Date().toISOString(),
    };
  }
}
