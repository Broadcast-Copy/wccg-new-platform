import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class HostsService {
  private readonly logger = new Logger(HostsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all active hosts.
   */
  async findAll() {
    this.logger.debug('Finding all hosts');

    const { data, error } = await this.db.from('hosts')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((h: any) => this.formatHost(h));
  }

  /**
   * Get a single host by ID with their shows.
   */
  async findById(id: string) {
    this.logger.debug(`Finding host ${id}`);

    const { data: row, error } = await this.db.from('hosts')
      .select('*, show_hosts(is_primary, shows(id, name, slug, image_url))')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Host ${id} not found`);
    }

    return this.formatHostWithShows(row);
  }

  /**
   * Create a new host profile (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating host');
    const name = dto.name as string;
    const slug =
      (dto.slug as string) ??
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data: row, error } = await this.db.from('hosts')
      .insert({
        ...(dto.id ? { id: dto.id as string } : {}),
        name,
        slug,
        bio: (dto.bio as string) ?? null,
        avatar_url: (dto.avatarUrl as string) ?? null,
        email: (dto.email as string) ?? null,
        is_active: (dto.isActive as boolean) ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(`Host with slug "${slug}" already exists`);
      }
      throw error;
    }

    return this.findById(row.id);
  }

  /**
   * Update a host profile (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating host ${id}`);

    // Verify exists
    await this.findById(id);

    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.bio !== undefined) data.bio = dto.bio as string;
    if (dto.avatarUrl !== undefined) data.avatar_url = dto.avatarUrl as string;
    if (dto.email !== undefined) data.email = dto.email as string;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;

    await this.db.from('hosts')
      .update(data)
      .eq('id', id);

    return this.findById(id);
  }

  /**
   * Delete a host profile (admin only).
   */
  async remove(id: string) {
    this.logger.debug(`Deleting host ${id}`);

    // Verify exists
    await this.findById(id);

    // show_hosts rows are cascade-deleted by the DB, but delete explicitly
    // for clarity and backward compatibility
    await this.db.from('show_hosts')
      .delete()
      .eq('host_id', id);

    const { error } = await this.db.from('hosts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatHost(row: any) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      email: row.email,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatHostWithShows(row: any) {
    // Filter show_hosts where the show is active (can't filter nested in select)
    const shows = (row.show_hosts ?? [])
      .filter((sh: any) => sh.shows != null)
      .map((sh: any) => ({
        id: sh.shows.id,
        name: sh.shows.name,
        slug: sh.shows.slug,
        imageUrl: sh.shows.image_url,
        isPrimary: sh.is_primary,
      }));

    return {
      ...this.formatHost(row),
      shows,
    };
  }
}
