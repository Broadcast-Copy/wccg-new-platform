import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
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
    return this.usersService.updateMe(user.sub, dto);
  }

  /**
   * GET /users/:id — Get a specific user's profile (admin only).
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /**
   * PATCH /users/:id — Update any user's profile (admin only).
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.usersService.update(id, dto);
  }

  /**
   * PATCH /users/:id/roles — Update a user's roles (super_admin only).
   */
  @Patch(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateRoles(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: { roles: string[] },
  ) {
    // Only super_admins can change roles
    const isSuperAdmin = await this.usersService.isSuperAdmin(user.sub);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only super admins can modify user roles');
    }
    return this.usersService.updateRoles(id, dto.roles);
  }

  // ─── Impersonation ──────────────────────────────────────────

  /**
   * GET /users/:id/dashboard — View a user's dashboard data (super_admin only).
   * Used for the "view as user" impersonation feature.
   */
  @Get(':id/dashboard')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUserDashboard(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    const isSuperAdmin = await this.usersService.isSuperAdmin(user.sub);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only super admins can view user dashboards');
    }
    return this.usersService.getUserDashboard(id);
  }

  /**
   * POST /users/:id/impersonate — Start impersonation session (super_admin only).
   * Logs the impersonation event and returns target user's full profile.
   */
  @Post(':id/impersonate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async startImpersonation(
    @Param('id') targetId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    const isSuperAdmin = await this.usersService.isSuperAdmin(user.sub);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only super admins can impersonate users');
    }

    // Log the impersonation
    await this.usersService.logImpersonation(user.sub, targetId, 'start');

    // Return the target user's dashboard
    return this.usersService.getUserDashboard(targetId);
  }

  /**
   * POST /users/:id/impersonate/end — End impersonation session.
   */
  @Post(':id/impersonate/end')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async endImpersonation(
    @Param('id') targetId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    await this.usersService.logImpersonation(user.sub, targetId, 'end');
    return { ok: true };
  }
}
