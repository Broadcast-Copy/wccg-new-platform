import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { SupabaseUser } from './supabase-auth.guard.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator present — allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: SupabaseUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No user context available');
    }

    // Check app_metadata.role (Supabase convention) or user_metadata.role
    const userRole =
      (user.app_metadata?.role as string) ??
      (user.user_metadata?.role as string) ??
      user.role ??
      'listener';

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
