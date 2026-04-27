import { Body, Controller, Delete, Post, Query } from '@nestjs/common';
import { PushService } from './push.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

interface SubscribeDto {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  userAgent?: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /**
   * POST /push/subscribe — Register a Web Push subscription for the current
   * user, then award the +50 WP opt-in bonus (idempotent per endpoint).
   * Phase A6.
   */
  @Post('subscribe')
  subscribe(@CurrentUser() user: SupabaseUser, @Body() dto: SubscribeDto) {
    return this.pushService.subscribe(user.sub, dto);
  }

  /**
   * DELETE /push/subscribe?endpoint=... — Remove a subscription on logout
   * or unsubscribe.
   */
  @Delete('subscribe')
  unsubscribe(
    @CurrentUser() user: SupabaseUser,
    @Query('endpoint') endpoint: string,
  ) {
    return this.pushService.unsubscribe(user.sub, endpoint);
  }
}
