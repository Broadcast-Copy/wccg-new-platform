import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { MixesService } from './mixes.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('mixes')
export class MixesController {
  constructor(private readonly mixesService: MixesService) {}

  // ─── Public endpoints ───────────────────────────────────────────

  /**
   * GET /mixes — List all published mixes (public, filterable).
   */
  @Public()
  @Get()
  findAll(
    @Query('hostId') hostId?: string,
    @Query('genre') genre?: string,
  ) {
    return this.mixesService.findAll({ hostId, genre });
  }

  /**
   * GET /mixes/my — List current user's uploaded mixes (any status).
   * IMPORTANT: This route must be defined BEFORE :id to avoid conflict.
   */
  @Get('my')
  findMy(@CurrentUser() user: SupabaseUser) {
    return this.mixesService.findByUploader(user.sub);
  }

  /**
   * GET /mixes/:id — Get a single mix (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mixesService.findById(id);
  }

  // ─── Authenticated endpoints ────────────────────────────────────

  /**
   * POST /mixes — Create a new mix (authenticated).
   */
  @Post()
  create(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    // TODO: Replace with CreateMixDto
    return this.mixesService.create(user.sub, dto);
  }

  /**
   * PATCH /mixes/:id — Update a mix (uploader or admin).
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    // TODO: Replace with UpdateMixDto
    return this.mixesService.update(id, user.sub, dto);
  }

  /**
   * DELETE /mixes/:id — Delete a mix (uploader or admin).
   */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    return this.mixesService.remove(id, user.sub);
  }

  // ─── Play tracking ──────────────────────────────────────────────

  /**
   * POST /mixes/:id/play — Increment play count (public).
   */
  @Public()
  @Post(':id/play')
  incrementPlay(@Param('id') id: string) {
    return this.mixesService.incrementPlayCount(id);
  }
}
