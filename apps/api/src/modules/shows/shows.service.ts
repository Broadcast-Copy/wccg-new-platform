import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

/**
 * Exported for controller/other consumers that reference the host shape.
 */
export interface HostInfo {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  isPrimary: boolean;
}

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all shows with their hosts. Optional filter by hostId.
   */
  async findAll(filters?: {
    genre?: string;
    hostId?: string;
    streamId?: string;
  }) {
    this.logger.debug('Finding all shows', filters);

    let query = this.db.from('shows')
      .select('*, show_hosts(*, hosts(*))')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (filters?.hostId) {
      // Filter shows that have this host via the join table
      // We'll filter after fetching since Supabase doesn't support
      // "some" filtering on nested relations directly in .select()
    }

    const { data, error } = await query;
    if (error) throw error;

    let shows = data ?? [];

    // Post-filter by hostId if provided
    if (filters?.hostId) {
      shows = shows.filter((s: any) =>
        s.show_hosts?.some((sh: any) => sh.host_id === filters.hostId),
      );
    }

    return shows.map((s: any) => this.formatShowWithHosts(s));
  }

  /**
   * Get a single show by ID with hosts and recent episodes.
   */
  async findById(id: string) {
    this.logger.debug(`Finding show ${id}`);

    const { data: show, error } = await this.db.from('shows')
      .select('*, show_hosts(*, hosts(*))')
      .eq('id', id)
      .single();

    if (error || !show) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    // Separately fetch episodes since we need ordering and limit
    const { data: episodes } = await this.db.from('show_episodes')
      .select('*')
      .eq('show_id', id)
      .order('air_date', { ascending: false })
      .limit(20);

    return this.formatShowFull(show, episodes ?? []);
  }

  /**
   * Create a new show (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating show');

    const name = dto.name as string;
    const slug =
      (dto.slug as string) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const hostIds = dto.hostIds as string[] | undefined;

    // Insert the show
    const { data: show, error } = await this.db.from('shows')
      .insert({
        ...(dto.id ? { id: dto.id as string } : {}),
        name,
        slug,
        description: (dto.description as string) ?? null,
        image_url: (dto.imageUrl as string) ?? null,
        is_active: (dto.isActive as boolean) ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          `Show with slug "${slug}" already exists`,
        );
      }
      throw error;
    }

    // Insert host associations
    if (hostIds && hostIds.length > 0) {
      const hostRows = hostIds.map((hostId, i) => ({
        show_id: show.id,
        host_id: hostId,
        is_primary: i === 0,
      }));
      await this.db.from('show_hosts').insert(hostRows);
    }

    return this.findById(show.id);
  }

  /**
   * Update a show (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating show ${id}`);

    // Verify exists
    const { data: existing } = await this.db.from('shows')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    // Build partial update
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.description !== undefined)
      data.description = dto.description as string;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;

    await this.db.from('shows')
      .update(data)
      .eq('id', id);

    // Replace hosts if hostIds is provided (even an empty array clears them)
    const hostIds = dto.hostIds as string[] | undefined;
    if (hostIds !== undefined) {
      // Delete existing associations then re-create
      await this.db.from('show_hosts')
        .delete()
        .eq('show_id', id);

      if (hostIds.length > 0) {
        const hostRows = hostIds.map((hostId, i) => ({
          show_id: id,
          host_id: hostId,
          is_primary: i === 0,
        }));
        await this.db.from('show_hosts').insert(hostRows);
      }
    }

    return this.findById(id);
  }

  /**
   * Delete a show (admin only).
   * Cascade deletes handle show_hosts, show_episodes,
   * schedule_blocks, and favorites.
   */
  async remove(id: string) {
    this.logger.debug(`Deleting show ${id}`);

    // Verify exists
    const { data: existing } = await this.db.from('shows')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Show ${id} not found`);
    }

    const { error } = await this.db.from('shows')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  // --- Private helpers ---

  /**
   * Format a show row that includes the show_hosts -> hosts relation.
   */
  private formatShowWithHosts(row: any) {
    const hosts: HostInfo[] = (row.show_hosts ?? []).map((sh: any) => ({
      id: sh.hosts.id,
      name: sh.hosts.name,
      slug: sh.hosts.slug,
      avatarUrl: sh.hosts.avatar_url,
      isPrimary: sh.is_primary,
    }));

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      isActive: row.is_active,
      hosts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Format a full show row that includes hosts and episodes.
   */
  private formatShowFull(row: any, episodes: any[]) {
    return {
      ...this.formatShowWithHosts(row),
      episodes: episodes.map((e: any) => ({
        id: e.id,
        showId: e.show_id,
        title: e.title,
        description: e.description,
        airDate: e.air_date,
        duration: e.duration,
        audioUrl: e.audio_url,
        imageUrl: e.image_url,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
    };
  }
}
