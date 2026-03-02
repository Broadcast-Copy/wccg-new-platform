import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { CmsService } from './cms.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  /**
   * GET /cms/content — List all content blocks (public).
   */
  @Public()
  @Get('content')
  findAll(@Query('page') page?: string) {
    return this.cmsService.findAll(page);
  }

  /**
   * GET /cms/content/:slug — Get a single content block (public).
   */
  @Public()
  @Get('content/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.cmsService.findBySlug(slug);
  }

  /**
   * PUT /cms/content/:slug — Upsert a content block (admin only).
   */
  @Put('content/:slug')
  upsert(
    @Param('slug') slug: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.cmsService.upsert(slug, user.sub, dto);
  }

  /**
   * DELETE /cms/content/:slug — Delete a content block (admin only).
   */
  @Delete('content/:slug')
  remove(
    @Param('slug') slug: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.cmsService.remove(slug, user.sub);
  }
}
