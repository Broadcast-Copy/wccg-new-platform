import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all streams (public), optionally filtered by category.
   */
  async findAll(category?: string) {
    this.logger.debug(`Finding all streams, category=${category ?? 'all'}`);

    let query = this.db.from('streams')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((s: any) => this.formatStream(s));
  }

  /**
   * Get a single stream by ID with its source configuration and current metadata.
   */
  async findById(id: string) {
    this.logger.debug(`Finding stream ${id}`);

    const { data: stream, error } = await this.db.from('streams')
      .select('*, stream_sources(*), stream_metadata(*)')
      .eq('id', id)
      .single();

    if (error || !stream) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    return this.formatStreamFull(stream);
  }

  /**
   * Create a new stream (admin only).
   */
  async create(dto: Record<string, unknown>) {
    this.logger.debug('Creating stream');

    const name = dto.name as string;
    const slug =
      (dto.slug as string) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Insert the stream
    const { data: stream, error } = await this.db.from('streams')
      .insert({
        ...(dto.id ? { id: dto.id as string } : {}),
        name,
        slug,
        description: (dto.description as string) ?? null,
        category: (dto.category as string) ?? 'MAIN',
        status: (dto.status as string) ?? 'ACTIVE',
        sort_order: (dto.sortOrder as number) ?? 0,
        image_url: (dto.imageUrl as string) ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          `Stream with slug "${slug}" already exists`,
        );
      }
      throw error;
    }

    // Create stream source if primary URL is provided
    if (dto.primaryUrl) {
      await this.db.from('stream_sources')
        .insert({
          stream_id: stream.id,
          primary_url: (dto.primaryUrl as string) ?? null,
          fallback_url: (dto.fallbackUrl as string) ?? null,
          mount_point: (dto.mountPoint as string) ?? null,
          format: (dto.format as string) ?? null,
          bitrate: (dto.bitrate as number) ?? null,
        });
    }

    // Always initialize metadata row
    await this.db.from('stream_metadata')
      .insert({
        stream_id: stream.id,
        listener_count: 0,
        is_live: false,
        last_updated: new Date().toISOString(),
      });

    return this.findById(stream.id);
  }

  /**
   * Update a stream (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating stream ${id}`);

    // Verify exists
    const { data: existing } = await this.db.from('streams')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    // Build a partial update object, only setting fields that were provided
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.description !== undefined)
      data.description = dto.description as string;
    if (dto.category !== undefined)
      data.category = dto.category as string;
    if (dto.status !== undefined) data.status = dto.status as string;
    if (dto.sortOrder !== undefined) data.sort_order = dto.sortOrder as number;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;

    await this.db.from('streams')
      .update(data)
      .eq('id', id);

    // Update source if any source-related fields are provided
    if (
      dto.primaryUrl !== undefined ||
      dto.fallbackUrl !== undefined ||
      dto.mountPoint !== undefined
    ) {
      const sourceData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (dto.primaryUrl !== undefined)
        sourceData.primary_url = dto.primaryUrl as string;
      if (dto.fallbackUrl !== undefined)
        sourceData.fallback_url = dto.fallbackUrl as string;
      if (dto.mountPoint !== undefined)
        sourceData.mount_point = dto.mountPoint as string;
      if (dto.format !== undefined) sourceData.format = dto.format as string;
      if (dto.bitrate !== undefined) sourceData.bitrate = dto.bitrate as number;

      await this.db.from('stream_sources')
        .upsert(
          {
            stream_id: id,
            primary_url: (dto.primaryUrl as string) ?? null,
            fallback_url: (dto.fallbackUrl as string) ?? null,
            mount_point: (dto.mountPoint as string) ?? null,
            format: (dto.format as string) ?? null,
            bitrate: (dto.bitrate as number) ?? null,
            ...sourceData,
          },
          { onConflict: 'stream_id' },
        );
    }

    return this.findById(id);
  }

  /**
   * Delete a stream and its related source/metadata (admin only).
   * Cascade deletes handle stream_sources, stream_metadata,
   * schedule_blocks, favorites, and listening_history.
   */
  async remove(id: string) {
    this.logger.debug(`Deleting stream ${id}`);

    // Verify exists
    const { data: existing } = await this.db.from('streams')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    const { error } = await this.db.from('streams')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  // --- Private helpers ---

  private formatStream(row: any) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      status: row.status,
      sortOrder: row.sort_order,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatStreamFull(row: any) {
    // Supabase returns 1-to-1 relations as single objects under the table name
    const source = row.stream_sources;
    const metadata = row.stream_metadata;

    return {
      ...this.formatStream(row),
      source: source
        ? {
            id: source.id,
            primaryUrl: source.primary_url,
            fallbackUrl: source.fallback_url,
            mountPoint: source.mount_point,
            format: source.format,
            bitrate: source.bitrate,
          }
        : null,
      metadata: {
        currentTitle: metadata?.current_title ?? null,
        currentArtist: metadata?.current_artist ?? null,
        currentTrack: metadata?.current_track ?? null,
        albumArt: metadata?.album_art ?? null,
        listenerCount: metadata?.listener_count ?? 0,
        isLive: metadata?.is_live ?? false,
        lastUpdated: metadata?.last_updated ?? null,
      },
    };
  }
}
