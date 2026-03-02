import { Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/me — Return the current user's identity with database roles.
   */
  @Get('me')
  async getMe(@CurrentUser() user: SupabaseUser) {
    const role = await this.authService.getUserRole(user.sub);
    const allRoles = await this.authService.getUserRoles(user.sub);
    return {
      id: user.sub,
      email: user.email,
      role,
      roles: allRoles,
    };
  }

  /**
   * POST /auth/sync — Sync the Supabase user to the local database.
   * Called by the frontend after sign-up / first sign-in.
   */
  @Post('sync')
  async syncUser(@CurrentUser() user: SupabaseUser) {
    await this.authService.syncUser(user);
    return { ok: true };
  }

  /**
   * GET /auth/health — Public health-check for the auth service.
   */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth' };
  }
}
