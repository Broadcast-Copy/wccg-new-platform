import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict access to users with specific roles.
 * Usage: @Roles('admin', 'host')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
