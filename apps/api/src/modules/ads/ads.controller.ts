import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { AdsService } from './ads.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * GET /ads/placements — List active ad placements (public).
   */
  @Public()
  @Get('placements')
  findAll() {
    return this.adsService.findAll();
  }

  /**
   * GET /ads/placements/:slot — Get ad for a specific slot (public).
   */
  @Public()
  @Get('placements/:slot')
  findBySlot(@Param('slot') slot: string) {
    return this.adsService.findBySlot(slot);
  }

  /**
   * POST /ads/placements — Create a new ad placement (admin only).
   */
  @Post('placements')
  create(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.adsService.create(user.sub, dto);
  }

  /**
   * PUT /ads/placements/:id — Update an ad placement (admin only).
   */
  @Put('placements/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.adsService.update(id, user.sub, dto);
  }

  /**
   * DELETE /ads/placements/:id — Delete an ad placement (admin only).
   */
  @Delete('placements/:id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.adsService.remove(id, user.sub);
  }

  /**
   * POST /ads/placements/:id/impression — Track an impression (public).
   */
  @Public()
  @Post('placements/:id/impression')
  trackImpression(@Param('id') id: string) {
    return this.adsService.trackImpression(id);
  }

  /**
   * POST /ads/placements/:id/click — Track a click (public).
   */
  @Public()
  @Post('placements/:id/click')
  trackClick(@Param('id') id: string) {
    return this.adsService.trackClick(id);
  }
}
