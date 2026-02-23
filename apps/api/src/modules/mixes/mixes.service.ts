import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class MixesService {
  private readonly logger = new Logger(MixesService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all published mixes with optional filters.
   */
  async findAll(filters: { hostId?: string; genre?: string } = {}) {
    this.logger.debug('Finding all published mixes');

    let query = this.db.from('dj_mixes')
      .select('*, hosts(name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (filters.hostId) {
      query = query.eq('host_id', filters.hostId);
    }
    if (filters.genre) {
      query = query.eq('genre', filters.genre);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatMix(row));
  }

  /**
   * Get a single mix by ID with host info.
   */
  async findById(id: string) {
    this.logger.debug(`Finding mix ${id}`);

    const { data: row, error } = await this.db.from('dj_mixes')
      .select('*, hosts(name)')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Mix ${id} not found`);
    }

    return this.formatMix(row);
  }

  /**
   * Get all mixes uploaded by a specific user (any status).
   */
  async findByUploader(userId: string) {
    this.logger.debug(`Finding mixes for uploader ${userId}`);

    const { data, error } = await this.db.from('dj_mixes')
      .select('*, hosts(name)')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatMix(row));
  }

  /**
   * Create a new mix.
   * Required fields: title, audioUrl, hostId.
   * Optional: description, coverImageUrl, duration, genre, tags.
   */
  async create(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating mix');

    const { data: row, error } = await this.db.from('dj_mixes')
      .insert({
        uploader_id: userId,
        host_id: dto.hostId as string,
        title: dto.title as string,
        description: (dto.description as string) ?? null,
        audio_url: dto.audioUrl as string,
        cover_image_url: (dto.coverImageUrl as string) ?? null,
        duration: (dto.duration as number) ?? null,
        genre: (dto.genre as string) ?? null,
        tags: (dto.tags as string[]) ?? null,
        status: 'draft',
        play_count: 0,
      })
      .select('*, hosts(name)')
      .single();

    if (error) throw error;

    return this.formatMix(row);
  }

  /**
   * Update a mix. Only the uploader or an admin can update.
   */
  async update(id: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating mix ${id}`);

    // Verify exists and get current data
    const { data: existing, error: fetchError } = await this.db.from('dj_mixes')
      .select('uploader_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Mix ${id} not found`);
    }

    // Check ownership or admin
    if (existing.uploader_id !== userId) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the uploader or an admin can update this mix');
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.title !== undefined) updates.title = dto.title as string;
    if (dto.description !== undefined) updates.description = dto.description as string;
    if (dto.audioUrl !== undefined) updates.audio_url = dto.audioUrl as string;
    if (dto.coverImageUrl !== undefined) updates.cover_image_url = dto.coverImageUrl as string;
    if (dto.duration !== undefined) updates.duration = dto.duration as number;
    if (dto.genre !== undefined) updates.genre = dto.genre as string;
    if (dto.tags !== undefined) updates.tags = dto.tags as string[];
    if (dto.hostId !== undefined) updates.host_id = dto.hostId as string;
    if (dto.status !== undefined) updates.status = dto.status as string;

    const { error } = await this.db.from('dj_mixes')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return this.findById(id);
  }

  /**
   * Delete a mix. Only the uploader or an admin can delete.
   */
  async remove(id: string, userId: string) {
    this.logger.debug(`Deleting mix ${id}`);

    // Verify exists and get current data
    const { data: existing, error: fetchError } = await this.db.from('dj_mixes')
      .select('uploader_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Mix ${id} not found`);
    }

    // Check ownership or admin
    if (existing.uploader_id !== userId) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the uploader or an admin can delete this mix');
      }
    }

    const { error } = await this.db.from('dj_mixes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  /**
   * Increment the play count for a mix.
   */
  async incrementPlayCount(id: string) {
    this.logger.debug(`Incrementing play count for mix ${id}`);

    // Verify exists
    const { data: existing, error: fetchError } = await this.db.from('dj_mixes')
      .select('play_count')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Mix ${id} not found`);
    }

    const { error } = await this.db.from('dj_mixes')
      .update({ play_count: (existing.play_count ?? 0) + 1 })
      .eq('id', id);

    if (error) throw error;

    return { id, playCount: (existing.play_count ?? 0) + 1 };
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

  /**
   * Convert a database row (snake_case) to camelCase API response.
   */
  private formatMix(row: any) {
    return {
      id: row.id,
      hostId: row.host_id,
      uploaderId: row.uploader_id,
      title: row.title,
      description: row.description,
      audioUrl: row.audio_url,
      coverImageUrl: row.cover_image_url,
      duration: row.duration,
      genre: row.genre,
      tags: row.tags,
      playCount: row.play_count,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hostName: row.hosts?.name ?? null,
    };
  }
}
