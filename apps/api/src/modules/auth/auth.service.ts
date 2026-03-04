import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/** Role priority -- lower number = higher privilege. */
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 0,
  management: 1,
  role_admin: 1,
  admin: 2,
  sales: 3,
  production: 3,
  engineering: 3,
  promotions: 3,
  host: 4,
  editor: 4,
  content_creator: 5,
  listener: 6,
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
   * Handles three user types: listener (default), creator, employee.
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

    // Read user-type metadata provided during sign-up
    const userType = (metadata.user_type as string) ?? 'listener';
    const creatorType = (metadata.creator_type as string) ?? null;
    const artistName = (metadata.artist_name as string) ?? null;
    const employeeCode = (metadata.employee_code as string) ?? null;

    this.logger.debug(`Syncing user ${userId} (${email}) type=${userType}`);

    try {
      // Upsert profile: insert if new, update email/avatar on subsequent logins
      const { error: profileError } = await this.db.from('profiles')
        .upsert(
          {
            id: userId,
            email,
            display_name: displayName,
            avatar_url: avatarUrl,
            user_type: userType,
            creator_type: creatorType,
            artist_name: artistName,
            employee_code: employeeCode,
            is_active: true,
            updated_at: now,
          },
          { onConflict: 'id' },
        );

      if (profileError) {
        this.logger.error(`Failed to upsert profile: ${profileError.message}`);
        return;
      }

      // Check if user already has roles assigned
      const { count, error: countError } = await this.db.from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId);

      if (countError) {
        this.logger.error(`Failed to count roles: ${countError.message}`);
        return;
      }

      // Only assign roles if the user has none yet
      if ((count ?? 0) === 0) {
        await this.assignInitialRole(userId, userType, employeeCode, now);
      }
    } catch (err) {
      this.logger.error(`Failed to sync user ${userId}: ${(err as Error).message}`);
      // Do not throw -- auth should not fail if profile sync has issues
    }
  }

  /**
   * Assign initial role based on user type.
   * - listener  -> role 'listener'
   * - creator   -> role 'content_creator'
   * - employee  -> validated against employee_invite_codes table
   */
  private async assignInitialRole(
    userId: string,
    userType: string,
    employeeCode: string | null,
    now: string,
  ): Promise<void> {
    let roleId = 'listener';
    let department: string | null = null;

    if (userType === 'creator') {
      roleId = 'content_creator';
    } else if (userType === 'employee') {
      // Validate employee invite code
      if (employeeCode) {
        const resolved = await this.resolveEmployeeInvite(userId, employeeCode, now);
        roleId = resolved.roleId;
        department = resolved.department;
      } else {
        this.logger.warn(
          `Employee user ${userId} has no employee_code — falling back to listener`,
        );
      }
    }

    // Upsert the resolved role
    const { error: roleError } = await this.db.from('user_roles')
      .upsert(
        {
          profile_id: userId,
          role_id: roleId,
          created_at: now,
        },
        { onConflict: 'profile_id,role_id' },
      );

    if (roleError) {
      this.logger.error(`Failed to assign role ${roleId}: ${roleError.message}`);
    }

    // If we resolved a department from the invite code, patch the profile
    if (department) {
      const { error: deptError } = await this.db.from('profiles')
        .update({ department, updated_at: now })
        .eq('id', userId);

      if (deptError) {
        this.logger.error(`Failed to set department: ${deptError.message}`);
      }
    }
  }

  /**
   * Validate an employee invite code and mark it as used.
   * Returns the role and department from the code, or falls back to listener.
   */
  private async resolveEmployeeInvite(
    userId: string,
    code: string,
    now: string,
  ): Promise<{ roleId: string; department: string | null }> {
    // Look up valid, unused invite code
    const { data: invites, error: inviteError } = await this.db
      .from('employee_invite_codes')
      .select('id, role_id, department')
      .eq('code', code)
      .is('used_by', null)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (inviteError) {
      this.logger.error(`Failed to query invite codes: ${inviteError.message}`);
      return { roleId: 'listener', department: null };
    }

    if (!invites || invites.length === 0) {
      this.logger.warn(
        `Invalid or expired employee invite code "${code}" for user ${userId} — falling back to listener`,
      );
      return { roleId: 'listener', department: null };
    }

    const invite = invites[0];

    // Mark the invite code as used
    const { error: markError } = await this.db.from('employee_invite_codes')
      .update({ used_by: userId, used_at: now })
      .eq('id', invite.id);

    if (markError) {
      this.logger.error(`Failed to mark invite code as used: ${markError.message}`);
      // Still use the role even if marking failed
    }

    this.logger.log(
      `Employee invite code redeemed: user=${userId} role=${invite.role_id} dept=${invite.department}`,
    );

    return {
      roleId: invite.role_id ?? 'listener',
      department: invite.department ?? null,
    };
  }

  /**
   * Look up the user's highest-priority role from the database.
   * Priority: super_admin > management/role_admin > admin > department roles > host/editor > content_creator > listener
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
          (ROLE_PRIORITY[a.role_id] ?? 99) - (ROLE_PRIORITY[b.role_id] ?? 99),
      );

      return userRoles[0].role_id;
    } catch (err) {
      this.logger.error(`Failed to get role for user ${userId}: ${(err as Error).message}`);
      return 'listener';
    }
  }

  /**
   * Get all roles for a user as an array of strings.
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const { data: userRoles, error } = await this.db.from('user_roles')
        .select('role_id')
        .eq('profile_id', userId);

      if (error || !userRoles || userRoles.length === 0) return ['listener'];

      return userRoles.map((ur: any) => ur.role_id as string);
    } catch (err) {
      this.logger.error(`Failed to get roles for user ${userId}: ${(err as Error).message}`);
      return ['listener'];
    }
  }
}
