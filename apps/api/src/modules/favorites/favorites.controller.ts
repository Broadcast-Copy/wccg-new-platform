import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /**
   * GET /favorites — Get all favorites for the current user.
   */
  @Get()
  findAll(@CurrentUser() user: SupabaseUser) {
    return this.favoritesService.findByUser(user.sub);
  }

  /**
   * POST /favorites — Add a favorite.
   */
  @Post()
  add(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: { targetType: string; targetId: string },
  ) {
    // TODO: Replace with CreateFavoriteDto
    return this.favoritesService.add(user.sub, dto);
  }

  /**
   * DELETE /favorites/:id — Remove a favorite.
   */
  @Delete(':id')
  remove(@CurrentUser() user: SupabaseUser, @Param('id') id: string) {
    return this.favoritesService.remove(user.sub, id);
  }

  /**
   * GET /favorites/check?targetType=...&targetId=... — Check if favorited.
   */
  @Get('check')
  check(
    @CurrentUser() user: SupabaseUser,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
  ) {
    return this.favoritesService.check(user.sub, targetType, targetId);
  }
}
