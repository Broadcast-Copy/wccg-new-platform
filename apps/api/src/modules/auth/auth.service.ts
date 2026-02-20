import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/** Role priority -- lower number = higher privilege. */
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
    private readonly db: SupabaseDbService,
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
    const now = new Date().toISOString();

    this.logger.debug(`Syncing user ${userId} (${email})`);

    try {
      // Upsert profile: insert if new, update email/avatar on subsequent logins
      const { error: profileError } = await this.db.from('profiles')
        .upsert(
          {
            id: userId,
            email,
            display_name: displayName,
            avatar_url: avatarUrl,
            is_active: true,
            updated_at: now,
          },
          { onConflict: 'id' },
        );

      if (profileError) {
        this.logger.error(`Failed to upsert profile: ${profileError.message}`);
        return;
      }

      // Ensure user has the default 'listener' role if no roles assigned
      const { count, error: countError } = await this.db.from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId);

      if (countError) {
        this.logger.error(`Failed to count roles: ${countError.message}`);
        return;
      }

      if ((count ?? 0) === 0) {
        await this.db.from('user_roles')
          .upsert(
            {
              profile_id: userId,
              role_id: 'listener',
              created_at: now,
            },
            { onConflict: 'profile_id,role_id' },
          );
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
      const { data: userRoles, error } = await this.db.from('user_roles')
        .select('role_id')
        .eq('profile_id', userId);

      if (error || !userRoles || userRoles.length === 0) return 'listener';

      // Sort by priority (lower number = higher privilege) and return the top one
      userRoles.sort(
        (a: any, b: any) =>
          (ROLE_PRIORITY[a.role_id] ?? 5) - (ROLE_PRIORITY[b.role_id] ?? 5),
      );

      return userRoles[0].role_id;
    } catch (err) {
      this.logger.error(`Failed to get role for user ${userId}: ${(err as Error).message}`);
      return 'listener';
    }
  }
}
