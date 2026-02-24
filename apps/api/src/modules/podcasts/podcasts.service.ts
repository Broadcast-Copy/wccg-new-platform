import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class PodcastsService {
  private readonly logger = new Logger(PodcastsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── Series ─────────────────────────────────────────────────────

  /**
   * List all active podcast series with optional category filter.
   */
  async findAllSeries(filters: { category?: string } = {}) {
    this.logger.debug('Finding all active podcast series');

    let query = this.db.from('podcast_series')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatSeries(row));
  }

  /**
   * Get a single podcast series by ID with its episodes.
   */
  async findSeriesById(id: string) {
    this.logger.debug(`Finding podcast series ${id}`);

    const { data: row, error } = await this.db.from('podcast_series')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Podcast series ${id} not found`);
    }

    // Fetch episodes for this series
    const { data: episodes, error: epError } = await this.db.from('podcast_episodes')
      .select('*')
      .eq('series_id', id)
      .order('episode_number', { ascending: false });

    if (epError) throw epError;

    return {
      ...this.formatSeries(row),
      episodes: (episodes ?? []).map((ep: any) => this.formatEpisode(ep)),
    };
  }

  /**
   * Get all series created by a specific user (any status).
   */
  async findSeriesByCreator(userId: string) {
    this.logger.debug(`Finding podcast series for creator ${userId}`);

    const { data, error } = await this.db.from('podcast_series')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatSeries(row));
  }

  /**
   * Create a new podcast series.
   * Required fields: title.
   * Optional: description, coverImageUrl, category, language, explicit.
   */
  async createSeries(userId: string, dto: Record<string, unknown>) {
    this.logger.debug('Creating podcast series');

    const { data: row, error } = await this.db.from('podcast_series')
      .insert({
        creator_id: userId,
        title: dto.title as string,
        description: (dto.description as string) ?? null,
        cover_image_url: (dto.coverImageUrl as string) ?? null,
        category: (dto.category as string) ?? null,
        language: (dto.language as string) ?? 'en',
        explicit: (dto.explicit as boolean) ?? false,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.formatSeries(row);
  }

  /**
   * Update a podcast series. Only the creator or an admin can update.
   */
  async updateSeries(id: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating podcast series ${id}`);

    const { data: existing, error: fetchError } = await this.db.from('podcast_series')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Podcast series ${id} not found`);
    }

    if (existing.creator_id !== userId) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the creator or an admin can update this series');
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.title !== undefined) updates.title = dto.title as string;
    if (dto.description !== undefined) updates.description = dto.description as string;
    if (dto.coverImageUrl !== undefined) updates.cover_image_url = dto.coverImageUrl as string;
    if (dto.category !== undefined) updates.category = dto.category as string;
    if (dto.language !== undefined) updates.language = dto.language as string;
    if (dto.explicit !== undefined) updates.explicit = dto.explicit as boolean;
    if (dto.status !== undefined) updates.status = dto.status as string;

    const { error } = await this.db.from('podcast_series')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return this.findSeriesById(id);
  }

  // ─── Episodes ───────────────────────────────────────────────────

  /**
   * List all episodes for a podcast series.
   */
  async findEpisodes(seriesId: string) {
    this.logger.debug(`Finding episodes for series ${seriesId}`);

    const { data, error } = await this.db.from('podcast_episodes')
      .select('*')
      .eq('series_id', seriesId)
      .order('episode_number', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatEpisode(row));
  }

  /**
   * Create a new episode for a podcast series.
   * Required fields: title, audioUrl.
   * Optional: description, episodeNumber, duration, explicit.
   */
  async createEpisode(seriesId: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Creating episode for series ${seriesId}`);

    // Verify series exists and user owns it
    const { data: series, error: seriesError } = await this.db.from('podcast_series')
      .select('creator_id')
      .eq('id', seriesId)
      .single();

    if (seriesError || !series) {
      throw new NotFoundException(`Podcast series ${seriesId} not found`);
    }

    if (series.creator_id !== userId) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the series creator or an admin can add episodes');
      }
    }

    const { data: row, error } = await this.db.from('podcast_episodes')
      .insert({
        series_id: seriesId,
        title: dto.title as string,
        description: (dto.description as string) ?? null,
        audio_url: dto.audioUrl as string,
        episode_number: (dto.episodeNumber as number) ?? null,
        duration: (dto.duration as number) ?? null,
        explicit: (dto.explicit as boolean) ?? false,
        status: 'published',
        play_count: 0,
      })
      .select('*')
      .single();

    if (error) throw error;

    return this.formatEpisode(row);
  }

  /**
   * Update an episode. Only the series creator or an admin can update.
   */
  async updateEpisode(
    seriesId: string,
    episodeId: string,
    userId: string,
    dto: Record<string, unknown>,
  ) {
    this.logger.debug(`Updating episode ${episodeId} in series ${seriesId}`);

    // Verify series ownership
    const { data: series, error: seriesError } = await this.db.from('podcast_series')
      .select('creator_id')
      .eq('id', seriesId)
      .single();

    if (seriesError || !series) {
      throw new NotFoundException(`Podcast series ${seriesId} not found`);
    }

    if (series.creator_id !== userId) {
      const isAdmin = await this.isAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Only the series creator or an admin can update episodes');
      }
    }

    // Verify episode exists in this series
    const { data: existing, error: epError } = await this.db.from('podcast_episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('series_id', seriesId)
      .single();

    if (epError || !existing) {
      throw new NotFoundException(`Episode ${episodeId} not found in series ${seriesId}`);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.title !== undefined) updates.title = dto.title as string;
    if (dto.description !== undefined) updates.description = dto.description as string;
    if (dto.audioUrl !== undefined) updates.audio_url = dto.audioUrl as string;
    if (dto.episodeNumber !== undefined) updates.episode_number = dto.episodeNumber as number;
    if (dto.duration !== undefined) updates.duration = dto.duration as number;
    if (dto.explicit !== undefined) updates.explicit = dto.explicit as boolean;
    if (dto.status !== undefined) updates.status = dto.status as string;

    const { error } = await this.db.from('podcast_episodes')
      .update(updates)
      .eq('id', episodeId);

    if (error) throw error;

    const { data: updated, error: refetchError } = await this.db.from('podcast_episodes')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (refetchError) throw refetchError;

    return this.formatEpisode(updated);
  }

  /**
   * Increment the play count for an episode.
   */
  async incrementEpisodePlayCount(episodeId: string) {
    this.logger.debug(`Incrementing play count for episode ${episodeId}`);

    const { data: existing, error: fetchError } = await this.db.from('podcast_episodes')
      .select('play_count')
      .eq('id', episodeId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Episode ${episodeId} not found`);
    }

    const newCount = (existing.play_count ?? 0) + 1;

    const { error } = await this.db.from('podcast_episodes')
      .update({ play_count: newCount })
      .eq('id', episodeId);

    if (error) throw error;

    return { id: episodeId, playCount: newCount };
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
   * Convert a podcast_series row (snake_case) to camelCase API response.
   */
  private formatSeries(row: any) {
    return {
      id: row.id,
      creatorId: row.creator_id,
      title: row.title,
      description: row.description,
      coverImageUrl: row.cover_image_url,
      category: row.category,
      language: row.language,
      explicit: row.explicit,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert a podcast_episodes row (snake_case) to camelCase API response.
   */
  private formatEpisode(row: any) {
    return {
      id: row.id,
      seriesId: row.series_id,
      title: row.title,
      description: row.description,
      audioUrl: row.audio_url,
      episodeNumber: row.episode_number,
      duration: row.duration,
      explicit: row.explicit,
      playCount: row.play_count,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
