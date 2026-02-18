import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface ScheduleBlockRow {
  id: string;
  stream_id: string;
  show_id: string | null;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_override: boolean;
  override_date: Date | null;
  is_active: boolean;
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ScheduleBlockWithShow extends ScheduleBlockRow {
  show_name: string | null;
  show_slug: string | null;
  show_image_url: string | null;
  hosts_json: string | null;
}

interface ScheduleBlockFull extends ScheduleBlockWithShow {
  stream_name: string | null;
  stream_slug: string | null;
  current_title: string | null;
  current_artist: string | null;
  album_art: string | null;
  listener_count: number | null;
  is_live: boolean | null;
}

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
      // Parse the date to get day_of_week (0=Sunday)
      const d = new Date(date);
      const dayOfWeek = d.getDay();

      const rows = await this.prisma.$queryRaw<ScheduleBlockWithShow[]>`
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        WHERE sb.stream_id = ${streamId}
          AND sb.is_active = true
          AND (
            (sb.is_override = true AND sb.override_date = ${date}::date)
            OR
            (sb.is_override = false AND sb.day_of_week = ${dayOfWeek})
          )
        ORDER BY sb.start_time ASC
      `;

      return rows.map((r) => this.formatBlockWithShow(r));
    }

    // No date: return all recurring blocks
    const rows = await this.prisma.$queryRaw<ScheduleBlockWithShow[]>`
      SELECT
        sb.*,
        s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
        (
          SELECT json_agg(json_build_object(
            'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
          ))
          FROM show_hosts sh
          JOIN hosts h ON h.id = sh.host_id
          WHERE sh.show_id = sb.show_id
        ) as hosts_json
      FROM schedule_blocks sb
      LEFT JOIN shows s ON s.id = sb.show_id
      WHERE sb.stream_id = ${streamId}
        AND sb.is_active = true
        AND sb.is_override = false
      ORDER BY sb.day_of_week ASC, sb.start_time ASC
    `;

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
    const todayDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Step 1: Check for override blocks matching today's date
    let overrideRows: ScheduleBlockFull[];

    if (streamId) {
      overrideRows = await this.prisma.$queryRaw<ScheduleBlockFull[]>`
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json,
          st.name as stream_name, st.slug as stream_slug,
          sm.current_title, sm.current_artist, sm.album_art,
          sm.listener_count, sm.is_live
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        LEFT JOIN streams st ON st.id = sb.stream_id
        LEFT JOIN stream_metadata sm ON sm.stream_id = sb.stream_id
        WHERE sb.stream_id = ${streamId}
          AND sb.is_active = true
          AND sb.is_override = true
          AND sb.override_date = ${todayDate}::date
          AND sb.start_time <= ${currentTime}
          AND sb.end_time > ${currentTime}
        ORDER BY sb.start_time DESC
        LIMIT 1
      `;
    } else {
      overrideRows = await this.prisma.$queryRaw<ScheduleBlockFull[]>`
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json,
          st.name as stream_name, st.slug as stream_slug,
          sm.current_title, sm.current_artist, sm.album_art,
          sm.listener_count, sm.is_live
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        LEFT JOIN streams st ON st.id = sb.stream_id
        LEFT JOIN stream_metadata sm ON sm.stream_id = sb.stream_id
        WHERE sb.is_active = true
          AND sb.is_override = true
          AND sb.override_date = ${todayDate}::date
          AND sb.start_time <= ${currentTime}
          AND sb.end_time > ${currentTime}
        ORDER BY sb.start_time DESC
      `;
    }

    if (overrideRows.length > 0) {
      if (streamId) {
        return this.formatBlockFull(overrideRows[0]);
      }
      return overrideRows.map((r) => this.formatBlockFull(r));
    }

    // Step 2: No override found, check recurring blocks
    let recurringRows: ScheduleBlockFull[];

    if (streamId) {
      recurringRows = await this.prisma.$queryRaw<ScheduleBlockFull[]>`
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json,
          st.name as stream_name, st.slug as stream_slug,
          sm.current_title, sm.current_artist, sm.album_art,
          sm.listener_count, sm.is_live
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        LEFT JOIN streams st ON st.id = sb.stream_id
        LEFT JOIN stream_metadata sm ON sm.stream_id = sb.stream_id
        WHERE sb.stream_id = ${streamId}
          AND sb.is_active = true
          AND sb.is_override = false
          AND sb.day_of_week = ${dayOfWeek}
          AND sb.start_time <= ${currentTime}
          AND sb.end_time > ${currentTime}
        ORDER BY sb.start_time DESC
        LIMIT 1
      `;
    } else {
      recurringRows = await this.prisma.$queryRaw<ScheduleBlockFull[]>`
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json,
          st.name as stream_name, st.slug as stream_slug,
          sm.current_title, sm.current_artist, sm.album_art,
          sm.listener_count, sm.is_live
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        LEFT JOIN streams st ON st.id = sb.stream_id
        LEFT JOIN stream_metadata sm ON sm.stream_id = sb.stream_id
        WHERE sb.is_active = true
          AND sb.is_override = false
          AND sb.day_of_week = ${dayOfWeek}
          AND sb.start_time <= ${currentTime}
          AND sb.end_time > ${currentTime}
        ORDER BY sb.start_time DESC
      `;
    }

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
   * Looks at today's remaining blocks, then wraps to tomorrow if needed.
   */
  async upNext(streamId: string, limit = 5) {
    this.logger.debug(`Finding up-next for stream ${streamId}, limit=${limit}`);

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    const todayDate = now.toISOString().slice(0, 10);

    // Get remaining blocks today (overrides first, then recurring)
    // plus tomorrow's blocks if we need more
    const rows = await this.prisma.$queryRaw<ScheduleBlockWithShow[]>`
      (
        -- Override blocks for today that haven't started yet
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        WHERE sb.stream_id = ${streamId}
          AND sb.is_active = true
          AND sb.is_override = true
          AND sb.override_date = ${todayDate}::date
          AND sb.start_time > ${currentTime}
      )
      UNION ALL
      (
        -- Recurring blocks for today that haven't started yet
        SELECT
          sb.*,
          s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
          (
            SELECT json_agg(json_build_object(
              'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
            ))
            FROM show_hosts sh
            JOIN hosts h ON h.id = sh.host_id
            WHERE sh.show_id = sb.show_id
          ) as hosts_json
        FROM schedule_blocks sb
        LEFT JOIN shows s ON s.id = sb.show_id
        WHERE sb.stream_id = ${streamId}
          AND sb.is_active = true
          AND sb.is_override = false
          AND sb.day_of_week = ${dayOfWeek}
          AND sb.start_time > ${currentTime}
      )
      ORDER BY start_time ASC
      LIMIT ${limit}
    `;

    return rows.map((r) => this.formatBlockWithShow(r));
  }

  /**
   * Create a schedule block (admin only).
   * Validates no overlapping blocks on the same stream/day/time.
   */
  async createBlock(dto: Record<string, unknown>) {
    this.logger.debug('Creating schedule block');
    const id = (dto.id as string) ?? randomUUID();
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
    const now = new Date();

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BadRequestException('Time must be in HH:mm format');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('start_time must be before end_time');
    }

    // Check for overlapping blocks
    const overlaps = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM schedule_blocks
      WHERE stream_id = ${streamId}
        AND is_active = true
        AND id != ${id}
        AND (
          CASE
            WHEN ${isOverride}::boolean = true AND is_override = true
              THEN override_date = ${overrideDate}::date
            WHEN ${isOverride}::boolean = false AND is_override = false
              THEN day_of_week = ${dayOfWeek}
            ELSE false
          END
        )
        AND start_time < ${endTime}
        AND end_time > ${startTime}
    `;

    if (Number(overlaps[0]?.count ?? 0) > 0) {
      throw new ConflictException('Schedule block overlaps with an existing block');
    }

    await this.prisma.$executeRaw`
      INSERT INTO schedule_blocks (
        id, stream_id, show_id, title, day_of_week, start_time, end_time,
        is_override, override_date, is_active, color, created_at, updated_at
      )
      VALUES (
        ${id}, ${streamId}, ${showId}, ${title}, ${dayOfWeek}, ${startTime}, ${endTime},
        ${isOverride}, ${overrideDate}::date, ${isActive}, ${color}, ${now}, ${now}
      )
    `;

    return this.getBlockById(id);
  }

  /**
   * Update a schedule block (admin only).
   */
  async updateBlock(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating schedule block ${id}`);

    const existing = await this.getBlockById(id);
    if (!existing) {
      throw new NotFoundException(`Schedule block ${id} not found`);
    }

    const now = new Date();
    const showId = (dto.showId as string) ?? null;
    const title = (dto.title as string) ?? null;
    const dayOfWeek = dto.dayOfWeek as number | undefined;
    const startTime = (dto.startTime as string) ?? null;
    const endTime = (dto.endTime as string) ?? null;
    const isActive = dto.isActive as boolean | undefined;
    const color = (dto.color as string) ?? null;

    await this.prisma.$executeRaw`
      UPDATE schedule_blocks SET
        show_id = COALESCE(${showId}, show_id),
        title = COALESCE(${title}, title),
        day_of_week = COALESCE(${dayOfWeek ?? null}::int, day_of_week),
        start_time = COALESCE(${startTime}, start_time),
        end_time = COALESCE(${endTime}, end_time),
        is_active = COALESCE(${isActive ?? null}::boolean, is_active),
        color = COALESCE(${color}, color),
        updated_at = ${now}
      WHERE id = ${id}
    `;

    return this.getBlockById(id);
  }

  /**
   * Delete a schedule block (admin only).
   */
  async removeBlock(id: string) {
    this.logger.debug(`Deleting schedule block ${id}`);

    const existing = await this.getBlockById(id);
    if (!existing) {
      throw new NotFoundException(`Schedule block ${id} not found`);
    }

    await this.prisma.$executeRaw`DELETE FROM schedule_blocks WHERE id = ${id}`;

    return { deleted: true, id };
  }

  // ─── Private helpers ──────────────────────────────────────────

  private async getBlockById(id: string) {
    const rows = await this.prisma.$queryRaw<ScheduleBlockWithShow[]>`
      SELECT
        sb.*,
        s.name as show_name, s.slug as show_slug, s.image_url as show_image_url,
        (
          SELECT json_agg(json_build_object(
            'id', h.id, 'name', h.name, 'avatar_url', h.avatar_url, 'is_primary', sh.is_primary
          ))
          FROM show_hosts sh
          JOIN hosts h ON h.id = sh.host_id
          WHERE sh.show_id = sb.show_id
        ) as hosts_json
      FROM schedule_blocks sb
      LEFT JOIN shows s ON s.id = sb.show_id
      WHERE sb.id = ${id}
    `;

    if (rows.length === 0) return null;
    return this.formatBlockWithShow(rows[0]);
  }

  private formatBlockWithShow(row: ScheduleBlockWithShow) {
    let hosts: any[] = [];
    if (row.hosts_json) {
      try {
        const parsed = typeof row.hosts_json === 'string'
          ? JSON.parse(row.hosts_json)
          : row.hosts_json;
        hosts = (parsed as any[]).map((h: any) => ({
          id: h.id,
          name: h.name,
          avatarUrl: h.avatar_url,
          isPrimary: h.is_primary,
        }));
      } catch {
        hosts = [];
      }
    }

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
      show: row.show_id
        ? {
            id: row.show_id,
            name: row.show_name,
            slug: row.show_slug,
            imageUrl: row.show_image_url,
            hosts,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatBlockFull(row: ScheduleBlockFull) {
    const base = this.formatBlockWithShow(row);
    return {
      ...base,
      stream: {
        id: row.stream_id,
        name: row.stream_name,
        slug: row.stream_slug,
      },
      nowPlaying: {
        currentTitle: row.current_title,
        currentArtist: row.current_artist,
        albumArt: row.album_art,
        listenerCount: row.listener_count ?? 0,
        isLive: row.is_live ?? false,
      },
    };
  }
}
