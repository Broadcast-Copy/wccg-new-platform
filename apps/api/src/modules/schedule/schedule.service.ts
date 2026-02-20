import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * Get schedule blocks for a stream, optionally filtered by date.
   * If date is provided, returns overrides for that date + recurring blocks for that day.
   * If no date, returns all recurring blocks for the stream.
   */
  async findByStream(streamId: string, date?: string) {
    this.logger.debug(`Finding schedule for stream ${streamId}, date=${date}`);

    if (date) {
      const d = new Date(date);
      const dayOfWeek = d.getDay();

      const { data, error } = await this.db.from('schedule_blocks')
        .select('*, shows(*, show_hosts(*, hosts(*)))')
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .or(`and(is_override.eq.true,override_date.eq.${date}),and(is_override.eq.false,day_of_week.eq.${dayOfWeek})`)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((r: any) => this.formatBlockWithShow(r));
    }

    // No date: return all recurring blocks
    const { data, error } = await this.db.from('schedule_blocks')
      .select('*, shows(*, show_hosts(*, hosts(*)))')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .eq('is_override', false)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((r: any) => this.formatBlockWithShow(r));
  }

  /**
   * Resolve "Live Now" -- which show is currently on air for a given stream.
   */
  async resolveNow(streamId?: string) {
    this.logger.debug(`Resolving live-now for stream ${streamId ?? 'all'}`);

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const currentTime = now.toTimeString().slice(0, 5); // "HH:mm"
    const todayDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Step 1: Check for override blocks matching today's date + time window
    let overrideQuery = this.db.from('schedule_blocks')
      .select('*, shows(*, show_hosts(*, hosts(*))), streams(*, stream_metadata(*))')
      .eq('is_active', true)
      .eq('is_override', true)
      .eq('override_date', todayDate)
      .lte('start_time', currentTime)
      .gt('end_time', currentTime)
      .order('start_time', { ascending: false });

    if (streamId) {
      overrideQuery = overrideQuery.eq('stream_id', streamId).limit(1);
    }

    const { data: overrideRows, error: overrideError } = await overrideQuery;
    if (overrideError) throw overrideError;

    if (overrideRows && overrideRows.length > 0) {
      if (streamId) {
        return this.formatBlockFull(overrideRows[0]);
      }
      return overrideRows.map((r: any) => this.formatBlockFull(r));
    }

    // Step 2: No override found, check recurring blocks
    let recurringQuery = this.db.from('schedule_blocks')
      .select('*, shows(*, show_hosts(*, hosts(*))), streams(*, stream_metadata(*))')
      .eq('is_active', true)
      .eq('is_override', false)
      .eq('day_of_week', dayOfWeek)
      .lte('start_time', currentTime)
      .gt('end_time', currentTime)
      .order('start_time', { ascending: false });

    if (streamId) {
      recurringQuery = recurringQuery.eq('stream_id', streamId).limit(1);
    }

    const { data: recurringRows, error: recurringError } = await recurringQuery;
    if (recurringError) throw recurringError;

    if (recurringRows && recurringRows.length > 0) {
      if (streamId) {
        return this.formatBlockFull(recurringRows[0]);
      }
      return recurringRows.map((r: any) => this.formatBlockFull(r));
    }

    // Nothing on air right now
    return streamId ? null : [];
  }

  /**
   * Get what's coming up next on a stream.
   */
  async upNext(streamId: string, limit = 5) {
    this.logger.debug(`Finding up-next for stream ${streamId}, limit=${limit}`);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const todayDate = now.toISOString().slice(0, 10);

    // Fetch override blocks for today that haven't started yet
    const { data: overrideBlocks } = await this.db.from('schedule_blocks')
      .select('*, shows(*, show_hosts(*, hosts(*)))')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .eq('is_override', true)
      .eq('override_date', todayDate)
      .gt('start_time', currentTime)
      .order('start_time', { ascending: true })
      .limit(limit);

    // Fetch recurring blocks for today that haven't started yet
    const { data: recurringBlocks } = await this.db.from('schedule_blocks')
      .select('*, shows(*, show_hosts(*, hosts(*)))')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .eq('is_override', false)
      .eq('day_of_week', dayOfWeek)
      .gt('start_time', currentTime)
      .order('start_time', { ascending: true })
      .limit(limit);

    // Merge, sort by start_time, and take the requested limit
    const combined = [...(overrideBlocks ?? []), ...(recurringBlocks ?? [])]
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
      .slice(0, limit);

    return combined.map((r: any) => this.formatBlockWithShow(r));
  }

  /**
   * Create a schedule block (admin only).
   */
  async createBlock(dto: Record<string, unknown>) {
    this.logger.debug('Creating schedule block');

    const streamId = dto.streamId as string;
    const showId = (dto.showId as string) ?? null;
    const title = dto.title as string;
    const dayOfWeek = dto.dayOfWeek as number;
    const startTime = dto.startTime as string;
    const endTime = dto.endTime as string;
    const isOverride = (dto.isOverride as boolean) ?? false;
    const overrideDate = (dto.overrideDate as string) ?? null;
    const isActive = (dto.isActive as boolean) ?? true;
    const color = (dto.color as string) ?? null;

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BadRequestException('Time must be in HH:mm format');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('start_time must be before end_time');
    }

    // Check for overlapping blocks
    let overlapQuery = this.db.from('schedule_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (isOverride) {
      overlapQuery = overlapQuery.eq('is_override', true);
      if (overrideDate) {
        overlapQuery = overlapQuery.eq('override_date', overrideDate);
      }
    } else {
      overlapQuery = overlapQuery.eq('is_override', false).eq('day_of_week', dayOfWeek);
    }

    const { count: overlapCount } = await overlapQuery;

    if (overlapCount && overlapCount > 0) {
      throw new ConflictException('Schedule block overlaps with an existing block');
    }

    const { data: created, error } = await this.db.from('schedule_blocks')
      .insert({
        stream_id: streamId,
        show_id: showId,
        title,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_override: isOverride,
        override_date: overrideDate,
        is_active: isActive,
        color,
      })
      .select('*, shows(*, show_hosts(*, hosts(*)))')
      .single();

    if (error) throw error;

    return this.formatBlockWithShow(created);
  }

  /**
   * Update a schedule block (admin only).
   */
  async updateBlock(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating schedule block ${id}`);

    const { data: existing } = await this.db.from('schedule_blocks')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Schedule block ${id} not found`);
    }

    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.showId !== undefined) data.show_id = (dto.showId as string) || null;
    if (dto.title !== undefined) data.title = dto.title as string;
    if (dto.dayOfWeek !== undefined) data.day_of_week = dto.dayOfWeek as number;
    if (dto.startTime !== undefined) data.start_time = dto.startTime as string;
    if (dto.endTime !== undefined) data.end_time = dto.endTime as string;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;
    if (dto.color !== undefined) data.color = dto.color as string;

    const { data: updated, error } = await this.db.from('schedule_blocks')
      .update(data)
      .eq('id', id)
      .select('*, shows(*, show_hosts(*, hosts(*)))')
      .single();

    if (error) throw error;

    return this.formatBlockWithShow(updated);
  }

  /**
   * Delete a schedule block (admin only).
   */
  async removeBlock(id: string) {
    this.logger.debug(`Deleting schedule block ${id}`);

    const { data: existing } = await this.db.from('schedule_blocks')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Schedule block ${id} not found`);
    }

    const { error } = await this.db.from('schedule_blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatBlockWithShow(row: any) {
    const show = row.shows;
    const hosts =
      show?.show_hosts?.map((sh: any) => ({
        id: sh.hosts.id,
        name: sh.hosts.name,
        avatarUrl: sh.hosts.avatar_url,
        isPrimary: sh.is_primary,
      })) ?? [];

    return {
      id: row.id,
      streamId: row.stream_id,
      showId: row.show_id,
      title: row.title,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isOverride: row.is_override,
      overrideDate: row.override_date,
      isActive: row.is_active,
      color: row.color,
      show: show
        ? {
            id: show.id,
            name: show.name,
            slug: show.slug,
            imageUrl: show.image_url,
            hosts,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatBlockFull(row: any) {
    const base = this.formatBlockWithShow(row);
    const stream = row.streams;
    const meta = stream?.stream_metadata;
    return {
      ...base,
      stream: {
        id: stream?.id,
        name: stream?.name,
        slug: stream?.slug,
      },
      nowPlaying: {
        currentTitle: meta?.current_title ?? null,
        currentArtist: meta?.current_artist ?? null,
        albumArt: meta?.album_art ?? null,
        listenerCount: meta?.listener_count ?? 0,
        isLive: meta?.is_live ?? false,
      },
    };
  }
}
