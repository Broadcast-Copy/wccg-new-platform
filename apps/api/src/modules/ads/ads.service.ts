import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all ad placements.
   */
  async findAll() {
    const { data, error } = await this.db.from('site_ad_placements')
      .select('*')
      .order('slot');

    if (error) throw error;

    return (data ?? []).map((row: any) => this.format(row));
  }

  /**
   * Get the active ad for a specific slot.
   */
  async findBySlot(slot: string) {
    const now = new Date().toISOString();

    const { data, error } = await this.db.from('site_ad_placements')
      .select('*')
      .eq('slot', slot)
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException(`No active ad for slot "${slot}"`);

    return this.format(data);
  }

  /**
   * Create a new ad placement.
   */
  async create(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating ad placement');

    await this.requireAdmin(userId);

    const { data, error } = await this.db.from('site_ad_placements')
      .insert({
        slot: dto.slot as string,
        title: dto.title as string,
        ad_type: dto.ad_type as string,
        content: (dto.content as string) ?? null,
        target_url: (dto.target_url as string) ?? null,
        image_url: (dto.image_url as string) ?? null,
        start_date: (dto.start_date as string) ?? null,
        end_date: (dto.end_date as string) ?? null,
        is_active: (dto.is_active as boolean) ?? true,
        advertiser_name: (dto.advertiser_name as string) ?? null,
        updated_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.format(data);
  }

  /**
   * Update an ad placement.
   */
  async update(id: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating ad placement ${id}`);

    await this.requireAdmin(userId);

    const updates: Record<string, unknown> = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (dto.slot !== undefined) updates.slot = dto.slot;
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.ad_type !== undefined) updates.ad_type = dto.ad_type;
    if (dto.content !== undefined) updates.content = dto.content;
    if (dto.target_url !== undefined) updates.target_url = dto.target_url;
    if (dto.image_url !== undefined) updates.image_url = dto.image_url;
    if (dto.start_date !== undefined) updates.start_date = dto.start_date;
    if (dto.end_date !== undefined) updates.end_date = dto.end_date;
    if (dto.is_active !== undefined) updates.is_active = dto.is_active;
    if (dto.advertiser_name !== undefined) updates.advertiser_name = dto.advertiser_name;

    const { error } = await this.db.from('site_ad_placements')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    const { data, error: refetchError } = await this.db.from('site_ad_placements')
      .select('*')
      .eq('id', id)
      .single();

    if (refetchError) throw refetchError;

    return this.format(data);
  }

  /**
   * Delete an ad placement.
   */
  async remove(id: string, userId: string) {
    await this.requireAdmin(userId);

    const { error } = await this.db.from('site_ad_placements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true };
  }

  /**
   * Increment impression count for an ad.
   */
  async trackImpression(id: string) {
    const { data, error } = await this.db.from('site_ad_placements')
      .select('impressions')
      .eq('id', id)
      .single();

    if (error || !data) return { tracked: false };

    await this.db.from('site_ad_placements')
      .update({ impressions: (data.impressions ?? 0) + 1 })
      .eq('id', id);

    return { tracked: true };
  }

  /**
   * Increment click count for an ad.
   */
  async trackClick(id: string) {
    const { data, error } = await this.db.from('site_ad_placements')
      .select('clicks')
      .eq('id', id)
      .single();

    if (error || !data) return { tracked: false };

    await this.db.from('site_ad_placements')
      .update({ clicks: (data.clicks ?? 0) + 1 })
      .eq('id', id);

    return { tracked: true };
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
      slot: row.slot,
      title: row.title,
      adType: row.ad_type,
      content: row.content,
      targetUrl: row.target_url,
      imageUrl: row.image_url,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      impressions: row.impressions,
      clicks: row.clicks,
      advertiserName: row.advertiser_name,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
