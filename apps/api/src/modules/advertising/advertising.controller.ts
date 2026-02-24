import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { AdvertisingService } from './advertising.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('advertising')
export class AdvertisingController {
  constructor(private readonly advertisingService: AdvertisingService) {}

  // ─── Public endpoints ───────────────────────────────────────────

  /**
   * GET /advertising/rate-cards — List rate cards (public).
   */
  @Public()
  @Get('rate-cards')
  getRateCards() {
    return this.advertisingService.getRateCards();
  }

  /**
   * POST /advertising/impressions — Track an ad impression (public).
   */
  @Public()
  @Post('impressions')
  trackImpression(@Body() dto: Record<string, unknown>) {
    return this.advertisingService.trackImpression(dto);
  }

  // ─── Authenticated endpoints ────────────────────────────────────

  /**
   * POST /advertising/accounts — Register as an advertiser (authenticated).
   */
  @Post('accounts')
  createAccount(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.advertisingService.createAccount(user.sub, dto);
  }

  /**
   * GET /advertising/campaigns — List my campaigns (authenticated).
   */
  @Get('campaigns')
  findMyCampaigns(@CurrentUser() user: SupabaseUser) {
    return this.advertisingService.findCampaignsByAdvertiser(user.sub);
  }

  /**
   * POST /advertising/campaigns — Create a campaign (authenticated).
   */
  @Post('campaigns')
  createCampaign(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.advertisingService.createCampaign(user.sub, dto);
  }

  /**
   * PATCH /advertising/campaigns/:id — Update a campaign (authenticated).
   */
  @Patch('campaigns/:id')
  updateCampaign(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.advertisingService.updateCampaign(id, user.sub, dto);
  }

  /**
   * POST /advertising/creatives — Upload a creative (authenticated).
   */
  @Post('creatives')
  createCreative(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.advertisingService.createCreative(user.sub, dto);
  }

  /**
   * GET /advertising/campaigns/:id/report — Performance report (authenticated).
   */
  @Get('campaigns/:id/report')
  getCampaignReport(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.advertisingService.getCampaignReport(id, user.sub);
  }
}
