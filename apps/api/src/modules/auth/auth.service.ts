import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Called after successful JWT verification to sync user profile.
   * Creates a local user record if it does not exist yet.
   */
  async syncUser(supabaseUser: SupabaseUser): Promise<void> {
    // TODO: Upsert user record in the database using supabaseUser.sub as the ID
    this.logger.debug(`Syncing user ${supabaseUser.sub}`);
  }

  /**
   * Look up the user's role from the database.
   */
  async getUserRole(userId: string): Promise<string> {
    // TODO: Query user record and return their role
    // For now, return a default role
    return 'listener';
  }
}
