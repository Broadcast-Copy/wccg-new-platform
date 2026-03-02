import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { NavigationService } from './navigation.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  /**
   * GET /navigation — Get full navigation tree (public).
   */
  @Public()
  @Get()
  findAll() {
    return this.navigationService.findAll();
  }

  /**
   * POST /navigation — Add a navigation item (admin only).
   */
  @Post()
  create(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.navigationService.create(user.sub, dto);
  }

  /**
   * PUT /navigation — Bulk update navigation items (admin only).
   */
  @Put()
  bulkUpdate(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: { items: Record<string, unknown>[] },
  ) {
    return this.navigationService.bulkUpdate(user.sub, dto.items);
  }

  /**
   * DELETE /navigation/:id — Remove a navigation item (admin only).
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.navigationService.remove(id, user.sub);
  }
}
