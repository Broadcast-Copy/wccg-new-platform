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
   * Creates a local profile record if it does not exist yet (upsert).
   */
  async syncUser(supabaseUser: SupabaseUser): Promise<void> {
    const userId = supabaseUser.sub;
    const email = supabaseUser.email ?? null;
    const metadata = supabaseUser.user_metadata ?? {};
    const displayName =
      (metadata.full_name as string) ??
      (metadata.name as string) ??
      email ??
      'User';
    const avatarUrl = (metadata.avatar_url as string) ?? null;
    const now = new Date();

    this.logger.debug(`Syncing user ${userId} (${email})`);

    try {
      // Upsert profile: insert if new, update email/avatar on subsequent logins
      await this.prisma.$executeRaw`
        INSERT INTO profiles (id, email, display_name, avatar_url, is_active, created_at, updated_at)
        VALUES (${userId}::uuid, ${email}, ${displayName}, ${avatarUrl}, true, ${now}, ${now})
        ON CONFLICT (id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, profiles.email),
          avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
          updated_at = ${now}
      `;

      // Ensure user has the default 'listener' role if no roles assigned
      const existingRoles = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM user_roles WHERE profile_id = ${userId}::uuid
      `;

      const roleCount = Number(existingRoles[0]?.count ?? 0);
      if (roleCount === 0) {
        await this.prisma.$executeRaw`
          INSERT INTO user_roles (profile_id, role_id, created_at)
          VALUES (${userId}::uuid, 'listener', ${now})
          ON CONFLICT (profile_id, role_id) DO NOTHING
        `;
      }
    } catch (err) {
      this.logger.error(`Failed to sync user ${userId}: ${(err as Error).message}`);
      // Do not throw -- auth should not fail if profile sync has issues
    }
  }

  /**
   * Look up the user's highest-priority role from the database.
   * Priority: super_admin > admin > host > listener
   */
  async getUserRole(userId: string): Promise<string> {
    this.logger.debug(`Getting role for user ${userId}`);

    try {
      const roles = await this.prisma.$queryRaw<{ role_id: string }[]>`
        SELECT ur.role_id
        FROM user_roles ur
        WHERE ur.profile_id = ${userId}::uuid
        ORDER BY
          CASE ur.role_id
            WHEN 'super_admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'host' THEN 3
            WHEN 'listener' THEN 4
            ELSE 5
          END
        LIMIT 1
      `;

      return roles[0]?.role_id ?? 'listener';
    } catch (err) {
      this.logger.error(`Failed to get role for user ${userId}: ${(err as Error).message}`);
      return 'listener';
    }
  }
}
