import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { PointsService } from '../points/points.service.js';

interface SubscribeDto {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  userAgent?: string;
}

/**
 * Web Push subscription management. Phase A6.
 *
 * MVP scope: persist subscriptions, award the opt-in WP bonus, return success.
 * Sending pushes is wired in a follower ticket (notifications dispatch worker)
 * that reads from `push_subscriptions` and uses VAPID via `web-push`.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly db: SupabaseDbService,
    private readonly points: PointsService,
  ) {}

  async subscribe(userId: string, dto: SubscribeDto) {
    if (!dto?.subscription?.endpoint || !dto.subscription.keys?.p256dh || !dto.subscription.keys?.auth) {
      throw new BadRequestException('Invalid push subscription payload');
    }

    // Upsert by unique endpoint.
    const { error } = await this.db.from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: dto.subscription.endpoint,
          p256dh: dto.subscription.keys.p256dh,
          auth: dto.subscription.keys.auth,
          user_agent: dto.userAgent ?? null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' } as any,
      );

    if (error) throw error;

    // Award the opt-in bonus exactly once per user (idempotency by reason+user).
    const idempotencyKey = `push_optin:${userId}`;
    await this.points.award(userId, {
      amount: 50,
      reason: 'PUSH_OPTIN',
      idempotencyKey,
    });

    this.logger.debug(`Push subscription registered for user ${userId}`);
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    if (!endpoint) throw new BadRequestException('endpoint required');
    const { error } = await this.db.from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    if (error) throw error;
    return { ok: true };
  }
}
