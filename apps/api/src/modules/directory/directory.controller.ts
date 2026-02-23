import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DirectoryService } from './directory.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  // ─── Public Endpoints ─────────────────────────────────────────

  /**
   * GET /directory — List all directory listings (public, filterable).
   */
  @Public()
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('county') county?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
  ) {
    return this.directoryService.findAll({
      category,
      county,
      search,
      featured: featured === 'true' ? true : undefined,
    });
  }

  /**
   * GET /directory/my — Get current user's listings (authenticated).
   * IMPORTANT: This route must be defined BEFORE :id to avoid "my" being treated as an ID.
   */
  @Get('my')
  findMy(@CurrentUser() user: SupabaseUser) {
    return this.directoryService.findByOwner(user.sub);
  }

  /**
   * GET /directory/:id — Get a single listing by ID (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.directoryService.findById(id);
  }

  // ─── Authenticated Endpoints ──────────────────────────────────

  /**
   * POST /directory — Create a new listing (authenticated).
   */
  @Post()
  create(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.directoryService.create(user.sub, dto);
  }

  /**
   * PATCH /directory/:id — Update a listing (owner or admin).
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.directoryService.update(id, user.sub, dto);
  }

  /**
   * DELETE /directory/:id — Delete a listing (owner or admin).
   */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    return this.directoryService.remove(id, user.sub);
  }
}
