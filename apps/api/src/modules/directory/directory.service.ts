import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

interface DirectoryFilters {
  category?: string;
  county?: string;
  search?: string;
  featured?: boolean;
}

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── Queries ────────────────────────────────────────────────────

  /**
   * List all directory listings with optional filters.
   */
  async findAll(filters: DirectoryFilters = {}) {
    this.logger.debug('Finding all directory listings', filters);

    let query = this.db.from('directory_listings').select('*');

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.county) {
      query = query.eq('county', filters.county);
    }

    if (filters.search) {
      // ILIKE search on name and description
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }

    if (filters.featured === true) {
      query = query.eq('featured', true);
    }

    const { data, error } = await query
      .order('featured', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatListing(row));
  }

  /**
   * Get a single listing by ID.
   */
  async findById(id: string) {
    this.logger.debug(`Finding directory listing ${id}`);

    const { data: row, error } = await this.db
      .from('directory_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Directory listing ${id} not found`);
    }

    return this.formatListing(row);
  }

  /**
   * Get all listings owned by a specific user.
   */
  async findByOwner(userId: string) {
    this.logger.debug(`Finding directory listings for owner ${userId}`);

    const { data, error } = await this.db
      .from('directory_listings')
      .select('*')
      .eq('owner_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatListing(row));
  }

  // ─── Mutations ──────────────────────────────────────────────────

  /**
   * Create a new directory listing.
   */
  async create(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating directory listing');

    const name = dto.name as string;
    const slug =
      (dto.slug as string) ??
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: row, error } = await this.db
      .from('directory_listings')
      .insert({
        owner_id: userId,
        name,
        slug,
        category: (dto.category as string) ?? null,
        description: (dto.description as string) ?? null,
        address: (dto.address as string) ?? null,
        city: (dto.city as string) ?? null,
        county: (dto.county as string) ?? null,
        state: (dto.state as string) ?? 'NC',
        zip_code: (dto.zipCode as string) ?? null,
        phone: (dto.phone as string) ?? null,
        email: (dto.email as string) ?? null,
        website: (dto.website as string) ?? null,
        image_url: (dto.imageUrl as string) ?? null,
        lat: (dto.lat as number) ?? null,
        lng: (dto.lng as number) ?? null,
        featured: (dto.featured as boolean) ?? false,
        status: (dto.status as string) ?? 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          `Listing with slug "${slug}" already exists`,
        );
      }
      throw error;
    }

    return this.formatListing(row);
  }

  /**
   * Update a directory listing (owner or admin only).
   */
  async update(id: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating directory listing ${id}`);

    // Verify listing exists
    const listing = await this.findByIdRaw(id);

    // Check ownership or admin role
    await this.assertOwnerOrAdmin(listing.owner_id, userId);

    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.category !== undefined) data.category = dto.category as string;
    if (dto.description !== undefined)
      data.description = dto.description as string;
    if (dto.address !== undefined) data.address = dto.address as string;
    if (dto.city !== undefined) data.city = dto.city as string;
    if (dto.county !== undefined) data.county = dto.county as string;
    if (dto.state !== undefined) data.state = dto.state as string;
    if (dto.zipCode !== undefined) data.zip_code = dto.zipCode as string;
    if (dto.phone !== undefined) data.phone = dto.phone as string;
    if (dto.email !== undefined) data.email = dto.email as string;
    if (dto.website !== undefined) data.website = dto.website as string;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;
    if (dto.lat !== undefined) data.lat = dto.lat as number;
    if (dto.lng !== undefined) data.lng = dto.lng as number;
    if (dto.featured !== undefined) data.featured = dto.featured as boolean;
    if (dto.status !== undefined) data.status = dto.status as string;

    const { error } = await this.db
      .from('directory_listings')
      .update(data)
      .eq('id', id);

    if (error) throw error;

    return this.findById(id);
  }

  /**
   * Delete a directory listing (owner or admin only).
   */
  async remove(id: string, userId: string) {
    this.logger.debug(`Deleting directory listing ${id}`);

    // Verify listing exists
    const listing = await this.findByIdRaw(id);

    // Check ownership or admin role
    await this.assertOwnerOrAdmin(listing.owner_id, userId);

    const { error } = await this.db
      .from('directory_listings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  // ─── Private helpers ────────────────────────────────────────────

  /**
   * Get the raw DB row (without formatting) for internal checks.
   */
  private async findByIdRaw(id: string) {
    const { data: row, error } = await this.db
      .from('directory_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Directory listing ${id} not found`);
    }

    return row as any;
  }

  /**
   * Assert the current user is the owner or has admin/super_admin role.
   */
  private async assertOwnerOrAdmin(ownerId: string, userId: string) {
    if (ownerId === userId) return;

    const { data: adminRole } = await this.db
      .from('user_roles')
      .select('role_id')
      .eq('profile_id', userId)
      .in('role_id', ['admin', 'super_admin'])
      .limit(1)
      .maybeSingle();

    if (!adminRole) {
      throw new ForbiddenException(
        'You do not have permission to modify this listing',
      );
    }
  }

  /**
   * Convert a raw DB row (snake_case) into a camelCase response object.
   */
  private formatListing(row: any) {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      description: row.description,
      address: row.address,
      city: row.city,
      county: row.county,
      state: row.state,
      zipCode: row.zip_code,
      phone: row.phone,
      email: row.email,
      website: row.website,
      imageUrl: row.image_url,
      lat: row.lat,
      lng: row.lng,
      featured: row.featured,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
