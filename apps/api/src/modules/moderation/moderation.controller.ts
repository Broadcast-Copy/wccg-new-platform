import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ModerationService } from './moderation.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('moderation')
@UseGuards(RolesGuard)
@Roles('admin', 'super_admin')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ─── All endpoints require admin role ───────────────────────────

  /**
   * GET /moderation/queue — List pending moderation items.
   */
  @Get('queue')
  findQueue() {
    return this.moderationService.findQueue();
  }

  /**
   * GET /moderation/queue/:id — Get a single moderation item.
   */
  @Get('queue/:id')
  findOne(@Param('id') id: string) {
    return this.moderationService.findById(id);
  }

  /**
   * POST /moderation/queue/:id/approve — Approve a moderation item.
   */
  @Post('queue/:id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.moderationService.approve(id, user.sub, dto);
  }

  /**
   * POST /moderation/queue/:id/reject — Reject a moderation item.
   */
  @Post('queue/:id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.moderationService.reject(id, user.sub, dto);
  }
}
