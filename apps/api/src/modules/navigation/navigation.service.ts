import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * Get all navigation items grouped by location.
   */
  async findAll() {
    const { data, error } = await this.db.from('site_navigation')
      .select('*')
      .order('location')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.format(row));
  }

  /**
   * Add a new navigation item.
   */
  async create(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating navigation item');

    await this.requireAdmin(userId);

    const { data, error } = await this.db.from('site_navigation')
      .insert({
        location: dto.location as string,
        label: dto.label as string,
        href: dto.href as string,
        icon: (dto.icon as string) ?? null,
        sort_order: (dto.sort_order as number) ?? 0,
        parent_id: (dto.parent_id as string) ?? null,
        is_visible: (dto.is_visible as boolean) ?? true,
        updated_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.format(data);
  }

  /**
   * Bulk update all navigation items (replace all).
   */
  async bulkUpdate(userId: string, items: Record<string, unknown>[]) {
    this.logger.debug(`Bulk updating ${items.length} navigation items`);

    await this.requireAdmin(userId);

    // Delete all existing items and re-insert
    await this.db.from('site_navigation').delete().neq('id', '');

    if (items.length > 0) {
      const rows = items.map((item, index) => ({
        id: (item.id as string) || undefined,
        location: item.location as string,
        label: item.label as string,
        href: item.href as string,
        icon: (item.icon as string) ?? null,
        sort_order: (item.sort_order as number) ?? index,
        parent_id: (item.parent_id as string) ?? null,
        is_visible: (item.is_visible as boolean) ?? true,
        updated_by: userId,
      }));

      const { error } = await this.db.from('site_navigation').insert(rows);
      if (error) throw error;
    }

    return this.findAll();
  }

  /**
   * Remove a navigation item.
   */
  async remove(id: string, userId: string) {
    await this.requireAdmin(userId);

    const { error } = await this.db.from('site_navigation')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true };
  }

  private async requireAdmin(userId: string) {
    const { data: adminRole } = await this.db.from('user_roles')
      .select('role_id')
      .eq('profile_id', userId)
      .in('role_id', ['admin', 'super_admin', 'role_admin'])
      .limit(1)
      .maybeSingle();

    if (!adminRole) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private format(row: any) {
    return {
      id: row.id,
      location: row.location,
      label: row.label,
      href: row.href,
      icon: row.icon,
      sortOrder: row.sort_order,
      parentId: row.parent_id,
      isVisible: row.is_visible,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
