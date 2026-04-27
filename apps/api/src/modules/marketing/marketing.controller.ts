import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MarketingService } from './marketing.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly service: MarketingService) {}

  /**
   * POST /marketing/newsletter — Subscribe an email to the WCCG newsletter.
   * Public endpoint (visitors don't need an account to sign up).
   * Sends a confirmation email; awards +100 WP on confirmation if linked
   * to an authenticated user account. (Phase A8)
   */
  @Public()
  @Post('newsletter')
  subscribe(@Body() dto: { email: string; source?: string }) {
    return this.service.subscribeNewsletter(dto?.email, dto?.source);
  }

  /**
   * GET /marketing/newsletter/confirm?token=... — Confirm subscription via
   * the magic link in the welcome email. Awards +100 WP if a user is linked.
   */
  @Public()
  @Get('newsletter/confirm')
  confirm(@Query('token') token: string) {
    return this.service.confirmNewsletter(token);
  }
}
