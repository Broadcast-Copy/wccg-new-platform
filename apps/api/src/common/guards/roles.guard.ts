import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { SupabaseDbService } from '../supabase/supabase-db.service.js';
import type { SupabaseUser } from './supabase-auth.guard.js';

/** Role priority — lower number = higher privilege. */
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 0,
  role_admin: 1,
  admin: 2,
  editor: 3,
  content_creator: 4,
  host: 5,
  listener: 6,
};

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly db: SupabaseDbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Query database for actual roles
    const userId = user.sub;
    try {
      const { data: userRoles, error } = await this.db.from('user_roles')
        .select('role_id')
        .eq('profile_id', userId);

      if (error) {
        this.logger.warn(`Failed to fetch roles for ${userId}: ${error.message}`);
      }

      const dbRoles = (userRoles ?? []).map((ur: any) => ur.role_id as string);

      // Super admins bypass all role checks
      if (dbRoles.includes('super_admin')) {
        return true;
      }

      // Check if user has any of the required roles
      // Also allow higher-privilege roles to access lower-privilege endpoints
      const hasRole = requiredRoles.some((required) => {
        // Direct match
        if (dbRoles.includes(required)) return true;

        // Check if user has a higher-privilege role
        const requiredPriority = ROLE_PRIORITY[required] ?? 99;
        return dbRoles.some((userRole: string) => {
          const userPriority = ROLE_PRIORITY[userRole] ?? 99;
          return userPriority < requiredPriority;
        });
      });

      if (!hasRole) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredRoles.join(', ')}`,
        );
      }

      // Attach resolved roles to request for downstream use
      (request as any).userRoles = dbRoles;

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.error(`Role check failed: ${(err as Error).message}`);
      throw new ForbiddenException('Unable to verify permissions');
    }
  }
}
