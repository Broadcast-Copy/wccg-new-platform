import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma, stream_category, stream_status } from '@prisma/client';

// Prisma include shape for a fully-loaded stream
const STREAM_FULL_INCLUDE = {
  stream_source: true,
  stream_metadata: true,
} as const;

@Injectable()
export class StreamsService {
  private readonly logger = new Logger(StreamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all streams (public), optionally filtered by category.
   */
  async findAll(category?: string) {
    this.logger.debug(`Finding all streams, category=${category ?? 'all'}`);

    const where: Prisma.streamsWhereInput = {};
    if (category) {
      where.category = category as stream_category;
    }

    const streams = await this.prisma.streams.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    return streams.map((s) => this.formatStream(s));
  }

  /**
   * Get a single stream by ID with its source configuration and current metadata.
   */
  async findById(id: string) {
    this.logger.debug(`Finding stream ${id}`);

    const stream = await this.prisma.streams.findUnique({
      where: { id },
      include: STREAM_FULL_INCLUDE,
    });

    if (!stream) {
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

    try {
      const stream = await this.prisma.streams.create({
        data: {
          id: (dto.id as string) ?? undefined,
          name,
          slug,
          description: (dto.description as string) ?? null,
          category: ((dto.category as string) ?? 'MAIN') as stream_category,
          status: ((dto.status as string) ?? 'ACTIVE') as stream_status,
          sort_order: (dto.sortOrder as number) ?? 0,
          image_url: (dto.imageUrl as string) ?? null,
          // Nested create for stream source if primary URL is provided
          ...(dto.primaryUrl
            ? {
                stream_source: {
                  create: {
                    primary_url: (dto.primaryUrl as string) ?? null,
                    fallback_url: (dto.fallbackUrl as string) ?? null,
                    mount_point: (dto.mountPoint as string) ?? null,
                    format: (dto.format as string) ?? null,
                    bitrate: (dto.bitrate as number) ?? null,
                  },
                },
              }
            : {}),
          // Always initialize metadata row
          stream_metadata: {
            create: {
              listener_count: 0,
              is_live: false,
              last_updated: new Date(),
            },
          },
        },
        include: STREAM_FULL_INCLUDE,
      });

      return this.formatStreamFull(stream);
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Stream with slug "${slug}" already exists`,
        );
      }
      throw err;
    }
  }

  /**
   * Update a stream (admin only).
   */
  async update(id: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating stream ${id}`);

    // Verify exists
    const existing = await this.prisma.streams.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    // Build a partial update object, only setting fields that were provided
    const data: Prisma.streamsUpdateInput = {
      updated_at: new Date(),
    };
    if (dto.name !== undefined) data.name = dto.name as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.description !== undefined)
      data.description = dto.description as string;
    if (dto.category !== undefined)
      data.category = dto.category as stream_category;
    if (dto.status !== undefined) data.status = dto.status as stream_status;
    if (dto.sortOrder !== undefined) data.sort_order = dto.sortOrder as number;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;

    await this.prisma.streams.update({
      where: { id },
      data,
    });

    // Update source if any source-related fields are provided
    if (
      dto.primaryUrl !== undefined ||
      dto.fallbackUrl !== undefined ||
      dto.mountPoint !== undefined
    ) {
      const sourceData: Prisma.stream_sourcesUpdateInput = {
        updated_at: new Date(),
      };
      if (dto.primaryUrl !== undefined)
        sourceData.primary_url = dto.primaryUrl as string;
      if (dto.fallbackUrl !== undefined)
        sourceData.fallback_url = dto.fallbackUrl as string;
      if (dto.mountPoint !== undefined)
        sourceData.mount_point = dto.mountPoint as string;
      if (dto.format !== undefined) sourceData.format = dto.format as string;
      if (dto.bitrate !== undefined) sourceData.bitrate = dto.bitrate as number;

      await this.prisma.stream_sources.upsert({
        where: { stream_id: id },
        update: sourceData,
        create: {
          stream_id: id,
          primary_url: (dto.primaryUrl as string) ?? null,
          fallback_url: (dto.fallbackUrl as string) ?? null,
          mount_point: (dto.mountPoint as string) ?? null,
          format: (dto.format as string) ?? null,
          bitrate: (dto.bitrate as number) ?? null,
        },
      });
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
    const existing = await this.prisma.streams.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Stream ${id} not found`);
    }

    await this.prisma.streams.delete({ where: { id } });

    return { deleted: true, id };
  }

  // --- Private helpers ---

  private formatStream(row: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: stream_category;
    status: stream_status;
    sort_order: number;
    image_url: string | null;
    created_at: Date;
    updated_at: Date;
  }) {
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

  private formatStreamFull(
    row: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      category: stream_category;
      status: stream_status;
      sort_order: number;
      image_url: string | null;
      created_at: Date;
      updated_at: Date;
    } & {
      stream_source: {
        id: string;
        primary_url: string | null;
        fallback_url: string | null;
        mount_point: string | null;
        format: string | null;
        bitrate: number | null;
      } | null;
      stream_metadata: {
        current_title: string | null;
        current_artist: string | null;
        current_track: string | null;
        album_art: string | null;
        listener_count: number | null;
        is_live: boolean;
        last_updated: Date | null;
      } | null;
    },
  ) {
    return {
      ...this.formatStream(row),
      source: row.stream_source
        ? {
            id: row.stream_source.id,
            primaryUrl: row.stream_source.primary_url,
            fallbackUrl: row.stream_source.fallback_url,
            mountPoint: row.stream_source.mount_point,
            format: row.stream_source.format,
            bitrate: row.stream_source.bitrate,
          }
        : null,
      metadata: {
        currentTitle: row.stream_metadata?.current_title ?? null,
        currentArtist: row.stream_metadata?.current_artist ?? null,
        currentTrack: row.stream_metadata?.current_track ?? null,
        albumArt: row.stream_metadata?.album_art ?? null,
        listenerCount: row.stream_metadata?.listener_count ?? 0,
        isLive: row.stream_metadata?.is_live ?? false,
        lastUpdated: row.stream_metadata?.last_updated ?? null,
      },
    };
  }
}
