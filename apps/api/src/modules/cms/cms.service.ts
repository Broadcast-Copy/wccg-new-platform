import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all content blocks, optionally filtered by page.
   */
  async findAll(page?: string) {
    this.logger.debug(`Fetching content blocks${page ? ` for page: ${page}` : ''}`);

    let query = this.db.from('site_content').select('*').order('page').order('slug');

    if (page) {
      query = query.eq('page', page);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: any) => this.format(row));
  }

  /**
   * Get a single content block by slug.
   */
  async findBySlug(slug: string) {
    const { data, error } = await this.db.from('site_content')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException(`Content block "${slug}" not found`);

    return this.format(data);
  }

  /**
   * Upsert a content block.
   */
  async upsert(slug: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Upserting content block: ${slug}`);

    await this.requireAdmin(userId);

    const payload = {
      slug,
      title: dto.title as string,
      content_type: dto.content_type as string,
      value: dto.value as string,
      page: (dto.page as string) ?? null,
      metadata: (dto.metadata as Record<string, unknown>) ?? {},
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.db.from('site_content')
      .upsert(payload, { onConflict: 'slug' })
      .select('*')
      .single();

    if (error) throw error;

    return this.format(data);
  }

  /**
   * Delete a content block.
   */
  async remove(slug: string, userId: string) {
    this.logger.debug(`Deleting content block: ${slug}`);

    await this.requireAdmin(userId);

    const { error } = await this.db.from('site_content')
      .delete()
      .eq('slug', slug);

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
      slug: row.slug,
      contentType: row.content_type,
      title: row.title,
      value: row.value,
      metadata: row.metadata,
      page: row.page,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
