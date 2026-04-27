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
    dto: { amount: number; reason: string; referenceType?: string; referenceId?: string; idempotencyKey?: string },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Award amount must be positive');
    }

    this.logger.debug(`Awarding ${dto.amount} points to user ${userId}: ${dto.reason}`);

    // Idempotency check — if a row with this key already exists, return it.
    if (dto.idempotencyKey) {
      const { data: existing } = await this.db.from('points_ledger')
        .select('*')
        .eq('user_id', userId)
        .eq('idempotency_key', dto.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return this.mapEntry(existing);
      }
    }

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
        idempotency_key: dto.idempotencyKey ?? null,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique-violation — concurrent retry of the same idempotency key.
      // Fetch the winning row and return it so the client gets a stable response.
      if ((error as any).code === '23505' && dto.idempotencyKey) {
        const { data: winner } = await this.db.from('points_ledger')
          .select('*')
          .eq('user_id', userId)
          .eq('idempotency_key', dto.idempotencyKey)
          .maybeSingle();
        if (winner) return this.mapEntry(winner);
      }
      throw error;
    }

    return this.mapEntry(entry);
  }

  /**
   * Daily caps per reason. Tunable without code change later by moving to DB.
   */
  private readonly DAILY_CAPS: Record<string, number> = {
    LISTENING: 240,
    DAILY_BOUNTY: 25,
    STREAK_BONUS: 15,
    SHARE: 2,
    VIDEO_WATCH: 30,
    KEYWORD_ENTRY: 25,
    EVENT_CHECKIN: 150,
  };

  /**
   * POST /points/sync entry point — accepts a batch of point events from the
   * authenticated user's outbox. Each event must carry its own idempotency
   * key. Daily caps are enforced server-side.
   *
   * Returns per-event results so the client can drain its outbox precisely.
   */
  async sync(
    userId: string,
    events: Array<{
      idempotencyKey: string;
      amount: number;
      reason: string;
      referenceType?: string;
      referenceId?: string;
      occurredAt?: string;
    }>,
  ) {
    if (!Array.isArray(events) || events.length === 0) {
      return { results: [], balance: (await this.getBalance(userId)).balance };
    }
    if (events.length > 100) {
      throw new BadRequestException('Batch too large (max 100 events)');
    }

    const today = new Date().toISOString().slice(0, 10); // UTC; cap drift across midnight ET is acceptable for MVP
    const results: Array<{
      idempotencyKey: string;
      status: 'awarded' | 'duplicate' | 'capped' | 'rejected';
      amount: number;
      reason?: string;
    }> = [];

    for (const ev of events) {
      if (!ev.idempotencyKey || ev.amount <= 0 || !ev.reason) {
        results.push({ idempotencyKey: ev.idempotencyKey ?? '', status: 'rejected', amount: 0 });
        continue;
      }

      // Cap check
      const cap = this.DAILY_CAPS[ev.reason];
      let allowed = ev.amount;
      let usedToday = 0;
      if (cap !== undefined) {
        const { data: capRow } = await this.db.from('points_daily_caps')
          .select('amount')
          .eq('user_id', userId)
          .eq('day', today)
          .eq('reason', ev.reason)
          .maybeSingle();
        usedToday = (capRow as any)?.amount ?? 0;
        const remaining = Math.max(0, cap - usedToday);
        if (remaining <= 0) {
          results.push({ idempotencyKey: ev.idempotencyKey, status: 'capped', amount: 0, reason: ev.reason });
          continue;
        }
        allowed = Math.min(ev.amount, remaining);
      }

      try {
        const awarded = await this.award(userId, {
          amount: allowed,
          reason: ev.reason,
          referenceType: ev.referenceType,
          referenceId: ev.referenceId,
          idempotencyKey: ev.idempotencyKey,
        });

        // Detect duplicate: if the awarded amount differs from `allowed`, it
        // was an idempotent replay (we returned the prior row). Mark it.
        const wasDuplicate = awarded.amount !== allowed;

        // Update daily cap counter (best-effort; not critical for correctness
        // because the unique idempotency key prevents double-spend).
        if (cap !== undefined && !wasDuplicate) {
          await this.db.from('points_daily_caps')
            .upsert(
              { user_id: userId, day: today, reason: ev.reason, amount: usedToday + allowed },
              { onConflict: 'user_id,day,reason' } as any,
            );
        }

        results.push({
          idempotencyKey: ev.idempotencyKey,
          status: wasDuplicate ? 'duplicate' : 'awarded',
          amount: awarded.amount,
          reason: ev.reason,
        });
      } catch (err) {
        this.logger.warn(`Failed to award event ${ev.idempotencyKey}: ${(err as Error).message}`);
        results.push({ idempotencyKey: ev.idempotencyKey, status: 'rejected', amount: 0 });
      }
    }

    const { balance } = await this.getBalance(userId);
    return { results, balance };
  }

  /**
   * GET /points/leaderboard — top earners for a period.
   */
  async leaderboard(period: 'weekly' | 'monthly' | 'alltime' = 'weekly', limit = 25, currentUserId?: string) {
    const view =
      period === 'monthly'
        ? 'points_monthly_leaderboard'
        : period === 'alltime'
          ? 'points_alltime_leaderboard'
          : 'points_weekly_leaderboard';

    const { data: rows, error } = await this.db.from(view)
      .select('user_id, points_earned, events')
      .limit(limit);
    if (error) throw error;

    // Hydrate with display names.
    const userIds = (rows ?? []).map((r: any) => r.user_id);
    const { data: profiles } = userIds.length
      ? await this.db.from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)
      : { data: [] as Array<{ id: string; display_name?: string; avatar_url?: string }> };

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const top = (rows ?? []).map((r: any, i: number) => {
      const p: any = profileMap.get(r.user_id);
      return {
        rank: i + 1,
        userId: r.user_id,
        displayName: p?.display_name ?? 'WCCG Listener',
        avatarUrl: p?.avatar_url ?? null,
        pointsEarned: r.points_earned,
        events: r.events,
      };
    });

    let me: { rank: number; pointsEarned: number } | null = null;
    if (currentUserId) {
      const meRow = top.find((t: { userId: string; rank: number; pointsEarned: number }) => t.userId === currentUserId);
      if (meRow) {
        me = { rank: meRow.rank, pointsEarned: meRow.pointsEarned };
      } else {
        // Compute the user's position by counting users above them.
        const { data: aboveCount } = await this.db.from(view)
          .select('user_id', { count: 'exact', head: true })
          .gt(
            'points_earned',
            await this.userPeriodPoints(currentUserId, period),
          );
        me = {
          rank: ((aboveCount as any)?.count ?? 0) + 1,
          pointsEarned: await this.userPeriodPoints(currentUserId, period),
        };
      }
    }

    return { period, top, me };
  }

  private async userPeriodPoints(userId: string, period: string): Promise<number> {
    const view =
      period === 'monthly'
        ? 'points_monthly_leaderboard'
        : period === 'alltime'
          ? 'points_alltime_leaderboard'
          : 'points_weekly_leaderboard';
    const { data } = await this.db.from(view)
      .select('points_earned')
      .eq('user_id', userId)
      .maybeSingle();
    return (data as any)?.points_earned ?? 0;
  }

  /**
   * GET /points/streak — current consecutive-day listening streak (ET).
   */
  async getStreak(userId: string) {
    const { data } = await this.db.from('user_listening_streaks')
      .select('streak_days, streak_started, streak_last')
      .eq('user_id', userId)
      .maybeSingle();
    return {
      streakDays: (data as any)?.streak_days ?? 0,
      lastListenDay: (data as any)?.streak_last ?? null,
      streakStarted: (data as any)?.streak_started ?? null,
    };
  }

  private mapEntry(e: any) {
    return {
      id: e.id,
      userId: e.user_id,
      amount: e.amount,
      reason: e.reason,
      referenceType: e.reference_type,
      referenceId: e.reference_id,
      balance: e.balance,
      type: e.amount >= 0 ? 'earn' : 'redeem',
      createdAt: e.created_at,
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
