import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/** Role priority — lower number = higher privilege. */
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  host: 3,
  listener: 4,
};

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
      await this.prisma.profiles.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email,
          display_name: displayName,
          avatar_url: avatarUrl,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        update: {
          email: email ?? undefined,
          avatar_url: avatarUrl ?? undefined,
          updated_at: now,
        },
      });

      // Ensure user has the default 'listener' role if no roles assigned
      const roleCount = await this.prisma.user_roles.count({
        where: { profile_id: userId },
      });

      if (roleCount === 0) {
        await this.prisma.user_roles.upsert({
          where: {
            profile_id_role_id: { profile_id: userId, role_id: 'listener' },
          },
          create: {
            profile_id: userId,
            role_id: 'listener',
            created_at: now,
          },
          update: {},
        });
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
      const userRoles = await this.prisma.user_roles.findMany({
        where: { profile_id: userId },
        select: { role_id: true },
      });

      if (userRoles.length === 0) return 'listener';

      // Sort by priority (lower number = higher privilege) and return the top one
      userRoles.sort(
        (a, b) =>
          (ROLE_PRIORITY[a.role_id] ?? 5) - (ROLE_PRIORITY[b.role_id] ?? 5),
      );

      return userRoles[0].role_id;
    } catch (err) {
      this.logger.error(`Failed to get role for user ${userId}: ${(err as Error).message}`);
      return 'listener';
    }
  }
}
