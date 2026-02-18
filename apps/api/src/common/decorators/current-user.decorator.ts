import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extract the current authenticated user from the request.
 * The user object is set by SupabaseAuthGuard after JWT verification.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: SupabaseUser) { ... }
 *
 *   @Get('me')
 *   getMyId(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
