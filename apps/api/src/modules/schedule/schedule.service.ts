import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  schedule_blocks,
  shows,
  hosts,
  show_hosts,
  streams,
  stream_metadata,
  Prisma,
} from '@prisma/client';

// ─── Prisma include types ────────────────────────────────────────

/** The shape returned by findMany with our standard "include show + hosts" */
type BlockWithShow = schedule_blocks & {
  show:
    | (shows & {
        show_hosts: (show_hosts & { host: hosts })[];
      })
    | null;
};

/** Full block with stream + metadata, used by resolveNow */
type BlockFull = BlockWithShow & {
  stream: streams & {
    stream_metadata: stream_metadata | null;
  };
};

// ─── Shared Prisma include fragments ─────────────────────────────

const INCLUDE_SHOW = {
  show: {
    include: {
      show_hosts: {
        include: {
          host: true,
        },
      },
    },
  },
} as const satisfies Prisma.schedule_blocksInclude;

const INCLUDE_FULL = {
  ...INCLUDE_SHOW,
  stream: {
    include: {
      stream_metadata: true,
    },
  },
} as const satisfies Prisma.schedule_blocksInclude;

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      const overrideDateValue = new Date(date);

      const rows = await this.prisma.schedule_blocks.findMany({
        where: {
          stream_id: streamId,
          is_active: true,
          OR: [
            {
              is_override: true,
              override_date: overrideDateValue,
            },
            {
              is_override: false,
              day_of_week: dayOfWeek,
            },
          ],
        },
        include: INCLUDE_SHOW,
        orderBy: { start_time: 'asc' },
      });

      return rows.map((r) => this.formatBlockWithShow(r));
    }

    // No date: return all recurring blocks
    const rows = await this.prisma.schedule_blocks.findMany({
      where: {
        stream_id: streamId,
        is_active: true,
        is_override: false,
      },
      include: INCLUDE_SHOW,
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });

    return rows.map((r) => this.formatBlockWithShow(r));
  }

  /**
   * Resolve "Live Now" -- which show is currently on air for a given stream.
   *
   * Algorithm:
   * 1. Get current day_of_week and time in HH:mm format
   * 2. First check for override blocks matching today's date
   * 3. If no override, find the recurring block for this day/time range
   * 4. Return the matching block enriched with show details + stream metadata
   */
  async resolveNow(streamId?: string) {
    this.logger.debug(`Resolving live-now for stream ${streamId ?? 'all'}`);

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday
    const currentTime = now.toTimeString().slice(0, 5); // "HH:mm"
    const todayDate = new Date(now.toISOString().slice(0, 10)); // midnight UTC for date comparison

    // ── Shared where fragments ──
    const streamFilter: Prisma.schedule_blocksWhereInput = streamId
      ? { stream_id: streamId }
      : {};

    // Step 1: Check for override blocks matching today's date + time window
    const overrideWhere: Prisma.schedule_blocksWhereInput = {
      ...streamFilter,
      is_active: true,
      is_override: true,
      override_date: todayDate,
      start_time: { lte: currentTime },
      end_time: { gt: currentTime },
    };

    const overrideRows = await this.prisma.schedule_blocks.findMany({
      where: overrideWhere,
      include: INCLUDE_FULL,
      orderBy: { start_time: 'desc' },
      ...(streamId ? { take: 1 } : {}),
    });

    if (overrideRows.length > 0) {
      if (streamId) {
        return this.formatBlockFull(overrideRows[0]);
      }
      return overrideRows.map((r) => this.formatBlockFull(r));
    }

    // Step 2: No override found, check recurring blocks
    const recurringWhere: Prisma.schedule_blocksWhereInput = {
      ...streamFilter,
      is_active: true,
      is_override: false,
      day_of_week: dayOfWeek,
      start_time: { lte: currentTime },
      end_time: { gt: currentTime },
    };

    const recurringRows = await this.prisma.schedule_blocks.findMany({
      where: recurringWhere,
      include: INCLUDE_FULL,
      orderBy: { start_time: 'desc' },
      ...(streamId ? { take: 1 } : {}),
    });

    if (recurringRows.length > 0) {
      if (streamId) {
        return this.formatBlockFull(recurringRows[0]);
      }
      return recurringRows.map((r) => this.formatBlockFull(r));
    }

    // Nothing on air right now
    return streamId ? null : [];
  }

  /**
   * Get what's coming up next on a stream.
   * Looks at today's remaining override blocks + recurring blocks that haven't started yet.
   */
  async upNext(streamId: string, limit = 5) {
    this.logger.debug(`Finding up-next for stream ${streamId}, limit=${limit}`);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const todayDate = new Date(now.toISOString().slice(0, 10));

    // Fetch override blocks for today that haven't started yet
    const overrideBlocks = await this.prisma.schedule_blocks.findMany({
      where: {
        stream_id: streamId,
        is_active: true,
        is_override: true,
        override_date: todayDate,
        start_time: { gt: currentTime },
      },
      include: INCLUDE_SHOW,
      orderBy: { start_time: 'asc' },
      take: limit,
    });

    // Fetch recurring blocks for today that haven't started yet
    const recurringBlocks = await this.prisma.schedule_blocks.findMany({
      where: {
        stream_id: streamId,
        is_active: true,
        is_override: false,
        day_of_week: dayOfWeek,
        start_time: { gt: currentTime },
      },
      include: INCLUDE_SHOW,
      orderBy: { start_time: 'asc' },
      take: limit,
    });

    // Merge, sort by start_time, and take the requested limit
    const combined = [...overrideBlocks, ...recurringBlocks]
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, limit);

    return combined.map((r) => this.formatBlockWithShow(r));
  }

  /**
   * Create a schedule block (admin only).
   * Validates no overlapping blocks on the same stream/day/time.
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

    // Check for overlapping blocks on the same stream, same day/override_date, with overlapping time ranges
    const overlapWhere: Prisma.schedule_blocksWhereInput = {
      stream_id: streamId,
      is_active: true,
      start_time: { lt: endTime },
      end_time: { gt: startTime },
    };

    if (isOverride) {
      overlapWhere.is_override = true;
      overlapWhere.override_date = overrideDate ? new Date(overrideDate) : undefined;
    } else {
      overlapWhere.is_override = false;
      overlapWhere.day_of_week = dayOfWeek;
    }

    const overlapCount = await this.prisma.schedule_blocks.count({
      where: overlapWhere,
    });

    if (overlapCount > 0) {
      throw new ConflictException('Schedule block overlaps with an existing block');
    }

    const created = await this.prisma.schedule_blocks.create({
      data: {
        stream_id: streamId,
        show_id: showId,
        title,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_override: isOverride,
        override_date: overrideDate ? new Date(overrideDate) : null,
        is_active: isActive,
        color,
      },
      include: INCLUDE_SHOW,
    });

    return this.formatBlockWithShow(created);
  }

  /**
   * Update a schedule block (admin only).
   */
  async updateBlock(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating schedule block ${id}`);

    const existing = await this.prisma.schedule_blocks.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Schedule block ${id} not found`);
    }

    // Build the update data, only including fields that were provided.
    // Use UncheckedUpdateInput so we can set scalar FK fields directly.
    const data: Prisma.schedule_blocksUncheckedUpdateInput = {
      updated_at: new Date(),
    };

    if (dto.showId !== undefined) data.show_id = (dto.showId as string) || null;
    if (dto.title !== undefined) data.title = dto.title as string;
    if (dto.dayOfWeek !== undefined) data.day_of_week = dto.dayOfWeek as number;
    if (dto.startTime !== undefined) data.start_time = dto.startTime as string;
    if (dto.endTime !== undefined) data.end_time = dto.endTime as string;
    if (dto.isActive !== undefined) data.is_active = dto.isActive as boolean;
    if (dto.color !== undefined) data.color = dto.color as string;

    const updated = await this.prisma.schedule_blocks.update({
      where: { id },
      data,
      include: INCLUDE_SHOW,
    });

    return this.formatBlockWithShow(updated);
  }

  /**
   * Delete a schedule block (admin only).
   */
  async removeBlock(id: string) {
    this.logger.debug(`Deleting schedule block ${id}`);

    const existing = await this.prisma.schedule_blocks.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Schedule block ${id} not found`);
    }

    await this.prisma.schedule_blocks.delete({ where: { id } });

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private formatBlockWithShow(row: BlockWithShow) {
    const hosts =
      row.show?.show_hosts.map((sh) => ({
        id: sh.host.id,
        name: sh.host.name,
        avatarUrl: sh.host.avatar_url,
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
      show: row.show
        ? {
            id: row.show.id,
            name: row.show.name,
            slug: row.show.slug,
            imageUrl: row.show.image_url,
            hosts,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatBlockFull(row: BlockFull) {
    const base = this.formatBlockWithShow(row);
    const meta = row.stream.stream_metadata;
    return {
      ...base,
      stream: {
        id: row.stream.id,
        name: row.stream.name,
        slug: row.stream.slug,
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
