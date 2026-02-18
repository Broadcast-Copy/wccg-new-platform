import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PointsService } from './points.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  /**
   * GET /points/balance — Get current user's points balance.
   */
  @Get('balance')
  getBalance(@CurrentUser() user: SupabaseUser) {
    return this.pointsService.getBalance(user.sub);
  }

  /**
   * GET /points/history — Get current user's points transaction history.
   */
  @Get('history')
  getHistory(
    @CurrentUser() user: SupabaseUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pointsService.getHistory(user.sub, page, limit);
  }

  /**
   * GET /points/rules — Get all earning/spending rules (authenticated).
   */
  @Get('rules')
  getRules() {
    return this.pointsService.getRules();
  }

  /**
   * POST /points/redeem — Redeem points from the current user's balance.
   */
  @Post('redeem')
  redeem(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: { amount: number; rewardId?: string; reason: string },
  ) {
    // TODO: Replace with RedeemPointsDto
    return this.pointsService.redeem(user.sub, dto);
  }

  /**
   * POST /points/award — Award points to a user (admin only).
   */
  @Post('award')
  @UseGuards(RolesGuard)
  @Roles('admin')
  award(@Body() dto: { userId: string; amount: number; reason: string; ruleAction?: string }) {
    // TODO: Replace with AwardPointsDto
    return this.pointsService.award(dto.userId, dto);
  }
}
