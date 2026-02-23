import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users — List all users (admin only).
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll(page, limit);
  }

  /**
   * GET /users/me — Get the current user's profile.
   */
  @Get('me')
  getMe(@CurrentUser() user: SupabaseUser) {
    return this.usersService.findMe(user.sub);
  }

  /**
   * GET /users/me/roles — Get the current user's roles.
   */
  @Get('me/roles')
  getMyRoles(@CurrentUser() user: SupabaseUser) {
    return this.usersService.findMyRoles(user.sub);
  }

  /**
   * PATCH /users/me — Update the current user's own profile.
   */
  @Patch('me')
  updateMe(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    // TODO: Replace Record<string, unknown> with UpdateMyProfileDto
    return this.usersService.updateMe(user.sub, dto);
  }

  /**
   * PATCH /users/:id — Update any user's profile (admin only).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    // TODO: Replace Record<string, unknown> with AdminUpdateUserDto
    return this.usersService.update(id, dto);
  }
}
