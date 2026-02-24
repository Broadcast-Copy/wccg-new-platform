import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class AdvertisingService {
  private readonly logger = new Logger(AdvertisingService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── Rate Cards ─────────────────────────────────────────────────

  /**
   * List all active rate cards.
   */
  async getRateCards() {
    this.logger.debug('Fetching rate cards');

    const { data, error } = await this.db.from('ad_rate_cards')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatRateCard(row));
  }

  // ─── Advertiser Accounts ────────────────────────────────────────

  /**
   * Register a new advertiser account.
   * Required fields: companyName.
   * Optional: contactEmail, contactPhone, website, billingAddress.
   */
  async createAccount(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating advertiser account');

    const { data: row, error } = await this.db.from('advertiser_accounts')
      .insert({
        user_id: userId,
        company_name: dto.companyName as string,
        contact_email: (dto.contactEmail as string) ?? null,
        contact_phone: (dto.contactPhone as string) ?? null,
        website: (dto.website as string) ?? null,
        billing_address: (dto.billingAddress as string) ?? null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.formatAccount(row);
  }

  // ─── Campaigns ──────────────────────────────────────────────────

  /**
   * List campaigns for an advertiser (by user ID).
   */
  async findCampaignsByAdvertiser(userId: string) {
    this.logger.debug(`Finding campaigns for user ${userId}`);

    // First get the advertiser account for this user
    const { data: account, error: accError } = await this.db.from('advertiser_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (accError) throw accError;

    if (!account) {
      return []; // No advertiser account, return empty
    }

    const { data, error } = await this.db.from('ad_campaigns')
      .select('*')
      .eq('advertiser_id', account.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatCampaign(row));
  }

  /**
   * Create a new campaign.
   * Required fields: name, startDate, endDate, budget.
   * Optional: targetAudience, placement, frequency.
   */
  async createCampaign(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating ad campaign');

    // Get advertiser account
    const { data: account, error: accError } = await this.db.from('advertiser_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (accError || !account) {
      throw new NotFoundException('No advertiser account found. Register first.');
    }

    const { data: row, error } = await this.db.from('ad_campaigns')
      .insert({
        advertiser_id: account.id,
        name: dto.name as string,
        start_date: dto.startDate as string,
        end_date: dto.endDate as string,
        budget: dto.budget as number,
        target_audience: (dto.targetAudience as string) ?? null,
        placement: (dto.placement as string) ?? null,
        frequency: (dto.frequency as string) ?? null,
        status: 'draft',
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.formatCampaign(row);
  }

  /**
   * Update a campaign. Only the owning advertiser or an admin can update.
   */
  async updateCampaign(id: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating campaign ${id}`);

    // Get advertiser account for this user
    const { data: account, error: accError } = await this.db.from('advertiser_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (accError) throw accError;

    // Verify campaign exists
    const { data: existing, error: fetchError } = await this.db.from('ad_campaigns')
      .select('advertiser_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Check ownership or admin
    if (!account || existing.advertiser_id !== account.id) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the campaign owner or an admin can update this campaign');
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) updates.name = dto.name as string;
    if (dto.startDate !== undefined) updates.start_date = dto.startDate as string;
    if (dto.endDate !== undefined) updates.end_date = dto.endDate as string;
    if (dto.budget !== undefined) updates.budget = dto.budget as number;
    if (dto.targetAudience !== undefined) updates.target_audience = dto.targetAudience as string;
    if (dto.placement !== undefined) updates.placement = dto.placement as string;
    if (dto.frequency !== undefined) updates.frequency = dto.frequency as string;
    if (dto.status !== undefined) updates.status = dto.status as string;

    const { error } = await this.db.from('ad_campaigns')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    const { data: updated, error: refetchError } = await this.db.from('ad_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (refetchError) throw refetchError;

    return this.formatCampaign(updated);
  }

  // ─── Creatives ──────────────────────────────────────────────────

  /**
   * Create a new ad creative.
   * Required fields: campaignId, type, assetUrl.
   * Optional: name, clickUrl, altText.
   */
  async createCreative(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating ad creative');

    // Get advertiser account
    const { data: account, error: accError } = await this.db.from('advertiser_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (accError || !account) {
      throw new NotFoundException('No advertiser account found. Register first.');
    }

    // Verify campaign ownership
    const { data: campaign, error: campError } = await this.db.from('ad_campaigns')
      .select('advertiser_id')
      .eq('id', dto.campaignId as string)
      .single();

    if (campError || !campaign) {
      throw new NotFoundException(`Campaign ${dto.campaignId} not found`);
    }

    if (campaign.advertiser_id !== account.id) {
      throw new ForbiddenException('You do not own this campaign');
    }

    const { data: row, error } = await this.db.from('ad_creatives')
      .insert({
        campaign_id: dto.campaignId as string,
        name: (dto.name as string) ?? null,
        type: dto.type as string,
        asset_url: dto.assetUrl as string,
        click_url: (dto.clickUrl as string) ?? null,
        alt_text: (dto.altText as string) ?? null,
        status: 'pending_review',
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.formatCreative(row);
  }

  // ─── Impressions ────────────────────────────────────────────────

  /**
   * Track an ad impression.
   * Required fields: creativeId.
   * Optional: ipAddress, userAgent, referrer.
   */
  async trackImpression(dto: Record<string, unknown>) {
    this.logger.debug('Tracking ad impression');

    const { data: row, error } = await this.db.from('ad_impressions')
      .insert({
        creative_id: dto.creativeId as string,
        ip_address: (dto.ipAddress as string) ?? null,
        user_agent: (dto.userAgent as string) ?? null,
        referrer: (dto.referrer as string) ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { tracked: true, id: row.id };
  }

  // ─── Reports ────────────────────────────────────────────────────

  /**
   * Get a performance report for a campaign.
   */
  async getCampaignReport(campaignId: string, userId: string) {
    this.logger.debug(`Generating report for campaign ${campaignId}`);

    // Get advertiser account
    const { data: account, error: accError } = await this.db.from('advertiser_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (accError) throw accError;

    // Verify campaign exists
    const { data: campaign, error: campError } = await this.db.from('ad_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Check ownership or admin
    if (!account || campaign.advertiser_id !== account.id) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the campaign owner or an admin can view this report');
      }
    }

    // Fetch creatives for this campaign
    const { data: creatives, error: crError } = await this.db.from('ad_creatives')
      .select('id, name, type, status')
      .eq('campaign_id', campaignId);

    if (crError) throw crError;

    // Fetch impression counts for each creative
    const creativeIds = (creatives ?? []).map((c: any) => c.id);
    let totalImpressions = 0;

    if (creativeIds.length > 0) {
      const { count, error: countError } = await this.db.from('ad_impressions')
        .select('id', { count: 'exact', head: true })
        .in('creative_id', creativeIds);

      if (countError) throw countError;
      totalImpressions = count ?? 0;
    }

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      budget: campaign.budget,
      totalCreatives: (creatives ?? []).length,
      totalImpressions,
      creatives: (creatives ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
      })),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Check if a user has an admin or super_admin role.
   */
  private async isAdmin(userId: string): Promise<boolean> {
    const { data: adminRole } = await this.db.from('user_roles')
      .select('role_id')
      .eq('profile_id', userId)
      .in('role_id', ['admin', 'super_admin'])
      .limit(1)
      .maybeSingle();

    return !!adminRole;
  }

  private formatRateCard(row: any) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      price: row.price,
      duration: row.duration,
      position: row.position,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatAccount(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      website: row.website,
      billingAddress: row.billing_address,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatCampaign(row: any) {
    return {
      id: row.id,
      advertiserId: row.advertiser_id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      budget: row.budget,
      targetAudience: row.target_audience,
      placement: row.placement,
      frequency: row.frequency,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatCreative(row: any) {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      name: row.name,
      type: row.type,
      assetUrl: row.asset_url,
      clickUrl: row.click_url,
      altText: row.alt_text,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
