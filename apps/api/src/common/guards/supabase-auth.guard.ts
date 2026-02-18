import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

export interface SupabaseUser {
  /** Supabase auth.users.id  (UUID) */
  sub: string;
  email?: string;
  phone?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret || secret === 'changeme') {
      this.logger.warn(
        'SUPABASE_JWT_SECRET is not configured. Auth will reject all requests until set.',
      );
    }
    this.jwtSecret = secret || 'not-configured';
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as SupabaseUser;

      // Attach decoded user to the request object
      (request as any).user = decoded;

      return true;
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
