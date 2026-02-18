import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Events CRUD ───────────────────────────────────────────────

  /**
   * List all events (public, filterable).
   * Supports filtering by upcoming events and category.
   */
  async findAll(filters?: { upcoming?: boolean; category?: string }) {
    this.logger.debug('Finding all events', filters);

    const now = new Date();

    const where: Prisma.eventsWhereInput = {
      visibility: 'PUBLIC',
      status: { not: 'CANCELLED' },
    };

    if (filters?.upcoming) {
      where.start_date = { gte: now };
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const events = await this.prisma.events.findMany({
      where,
      orderBy: {
        start_date: filters?.upcoming ? 'asc' : 'desc',
      },
    });

    return events.map((e) => this.formatEvent(e));
  }

  /**
   * Get a single event by ID with ticket types and organizers.
   */
  async findById(id: string) {
    this.logger.debug(`Finding event ${id}`);

    const event = await this.prisma.events.findUnique({
      where: { id },
      include: {
        ticket_types: {
          orderBy: { price: 'asc' },
        },
        event_organizers: {
          include: {
            user: {
              select: {
                display_name: true,
                email: true,
                avatar_url: true,
              },
            },
          },
        },
        _count: {
          select: {
            event_registrations: {
              where: { status: { not: 'CANCELLED' } },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    return {
      ...this.formatEvent(event),
      ticketTypes: event.ticket_types.map((t) => this.formatTicketType(t)),
      organizers: event.event_organizers.map((o) => ({
        userId: o.user_id,
        role: o.role,
        displayName: o.user.display_name,
        email: o.user.email,
        avatarUrl: o.user.avatar_url,
      })),
      registrationCount: event._count.event_registrations,
    };
  }

  /**
   * Create a new event (authenticated user becomes organizer).
   */
  async create(userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`User ${userId} creating event`);
    const id = (dto.id as string) ?? randomUUID();
    const title = dto.title as string;
    const slug = (dto.slug as string) ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const ticketTypes = dto.ticketTypes as any[] | undefined;

    try {
      await this.prisma.events.create({
        data: {
          id,
          creator_id: userId,
          title,
          slug,
          description: (dto.description as string) ?? null,
          image_url: (dto.imageUrl as string) ?? null,
          banner_url: (dto.bannerUrl as string) ?? null,
          venue: (dto.venue as string) ?? null,
          address: (dto.address as string) ?? null,
          city: (dto.city as string) ?? null,
          state: (dto.state as string) ?? null,
          zip_code: (dto.zipCode as string) ?? null,
          latitude: (dto.latitude as number) ?? null,
          longitude: (dto.longitude as number) ?? null,
          start_date: new Date(dto.startDate as string),
          end_date: new Date(dto.endDate as string),
          timezone: (dto.timezone as string) ?? 'America/New_York',
          category: (dto.category as string) ?? null,
          status: ((dto.status as string) ?? 'draft').toUpperCase() as any,
          visibility: ((dto.visibility as string) ?? 'public').toUpperCase() as any,
          max_attendees: (dto.maxAttendees as number) ?? null,
          is_free: (dto.isFree as boolean) ?? true,

          // Nested create: add creator as organizer with OWNER role
          event_organizers: {
            create: {
              user_id: userId,
              role: 'OWNER',
            },
          },

          // Nested create: ticket types if provided
          ...(ticketTypes && ticketTypes.length > 0
            ? {
                ticket_types: {
                  create: ticketTypes.map((tt) => ({
                    id: tt.id ?? randomUUID(),
                    name: tt.name as string,
                    price: tt.price ?? 0,
                    quantity: tt.quantity ?? 0,
                    quantity_sold: 0,
                    description: (tt.description as string) ?? null,
                    sales_start: tt.salesStart
                      ? new Date(tt.salesStart as string)
                      : null,
                    sales_end: tt.salesEnd
                      ? new Date(tt.salesEnd as string)
                      : null,
                    is_active: true,
                  })),
                },
              }
            : {}),
        },
      });
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`Event with slug "${slug}" already exists`);
      }
      throw err;
    }

    return this.findById(id);
  }

  /**
   * Update an event (owner/organizer only).
   */
  async update(eventId: string, userId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Updating event ${eventId}`);

    // Verify exists and check ownership
    await this.verifyOrganizer(eventId, userId);

    // Build data object with only the fields that were provided
    const data: Prisma.eventsUpdateInput = {
      updated_at: new Date(),
    };

    if (dto.title !== undefined) data.title = dto.title as string;
    if (dto.slug !== undefined) data.slug = dto.slug as string;
    if (dto.description !== undefined)
      data.description = dto.description as string;
    if (dto.imageUrl !== undefined) data.image_url = dto.imageUrl as string;
    if (dto.bannerUrl !== undefined) data.banner_url = dto.bannerUrl as string;
    if (dto.venue !== undefined) data.venue = dto.venue as string;
    if (dto.address !== undefined) data.address = dto.address as string;
    if (dto.city !== undefined) data.city = dto.city as string;
    if (dto.state !== undefined) data.state = dto.state as string;
    if (dto.zipCode !== undefined) data.zip_code = dto.zipCode as string;
    if (dto.latitude !== undefined) data.latitude = dto.latitude as number;
    if (dto.longitude !== undefined) data.longitude = dto.longitude as number;
    if (dto.startDate !== undefined)
      data.start_date = new Date(dto.startDate as string);
    if (dto.endDate !== undefined)
      data.end_date = new Date(dto.endDate as string);
    if (dto.timezone !== undefined) data.timezone = dto.timezone as string;
    if (dto.category !== undefined) data.category = dto.category as string;
    if (dto.status !== undefined)
      data.status = (dto.status as string).toUpperCase() as any;
    if (dto.visibility !== undefined)
      data.visibility = (dto.visibility as string).toUpperCase() as any;
    if (dto.maxAttendees !== undefined)
      data.max_attendees = dto.maxAttendees as number;
    if (dto.isFree !== undefined) data.is_free = dto.isFree as boolean;

    await this.prisma.events.update({
      where: { id: eventId },
      data,
    });

    return this.findById(eventId);
  }

  /**
   * Delete an event (owner only). Cascade deletes related records.
   */
  async remove(eventId: string, userId: string) {
    this.logger.debug(`Deleting event ${eventId}`);

    // Verify ownership (must be creator)
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: {
        creator_id: true,
        event_organizers: {
          where: { user_id: userId },
          select: { role: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const isCreator = event.creator_id === userId;
    const isOwnerOrganizer = event.event_organizers.some(
      (o) => o.role === 'OWNER',
    );

    if (!isCreator && !isOwnerOrganizer) {
      throw new ForbiddenException(
        'Only the event creator can delete this event',
      );
    }

    // Cascade delete handles ticket_types, event_registrations, event_organizers
    await this.prisma.events.delete({
      where: { id: eventId },
    });

    return { deleted: true, id: eventId };
  }

  // ─── Ticket Types ──────────────────────────────────────────────

  /**
   * Get ticket types for an event.
   */
  async getTicketTypes(eventId: string) {
    this.logger.debug(`Getting ticket types for event ${eventId}`);

    const tickets = await this.prisma.ticket_types.findMany({
      where: { event_id: eventId },
      orderBy: { price: 'asc' },
    });

    return tickets.map((t) => this.formatTicketType(t));
  }

  // ─── Registrations ────────────────────────────────────────────

  /**
   * Register the current user for an event.
   * Uses a transaction to atomically increment quantity_sold and create the registration.
   */
  async register(
    eventId: string,
    userId: string,
    dto: { ticketTypeId?: string },
  ) {
    this.logger.debug(`User ${userId} registering for event ${eventId}`);

    // Verify event exists
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Check if event is cancelled
    if (event.status === 'CANCELLED') {
      throw new BadRequestException('This event has been cancelled');
    }

    // Check for duplicate registration
    const existingCount = await this.prisma.event_registrations.count({
      where: {
        event_id: eventId,
        user_id: userId,
        status: { not: 'CANCELLED' },
      },
    });

    if (existingCount > 0) {
      throw new ConflictException('You are already registered for this event');
    }

    // Check max attendees
    if (event.max_attendees) {
      const regCount = await this.prisma.event_registrations.count({
        where: {
          event_id: eventId,
          status: { not: 'CANCELLED' },
        },
      });

      if (regCount >= event.max_attendees) {
        throw new BadRequestException('This event is at full capacity');
      }
    }

    const id = randomUUID();
    const qrCode =
      `WCCG-${eventId.slice(0, 8)}-${id.slice(0, 8)}`.toUpperCase();
    const now = new Date();

    // If ticket type is specified, atomically update quantity_sold and create registration
    if (dto.ticketTypeId) {
      const ticket = await this.prisma.ticket_types.findFirst({
        where: { id: dto.ticketTypeId, event_id: eventId },
      });

      if (!ticket) {
        throw new NotFoundException(
          `Ticket type ${dto.ticketTypeId} not found for this event`,
        );
      }

      if (!ticket.is_active) {
        throw new BadRequestException('This ticket type is not available');
      }

      if (ticket.quantity_sold >= ticket.quantity) {
        throw new BadRequestException('This ticket type is sold out');
      }

      // Atomic transaction: increment quantity_sold + create registration
      await this.prisma.$transaction(async (tx) => {
        // Optimistic concurrency: only update if quantity_sold < quantity
        const updated = await tx.ticket_types.updateMany({
          where: {
            id: dto.ticketTypeId!,
            quantity_sold: { lt: ticket.quantity },
          },
          data: {
            quantity_sold: { increment: 1 },
            updated_at: now,
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException('This ticket type is sold out');
        }

        await tx.event_registrations.create({
          data: {
            id,
            event_id: eventId,
            user_id: userId,
            ticket_type_id: dto.ticketTypeId!,
            status: 'CONFIRMED',
            qr_code: qrCode,
            purchased_at: now,
          },
        });
      });
    } else {
      // Free event or no ticket type: create registration without ticket
      // ticket_type_id is required in the schema, so we need a ticket type.
      // For free events without a specific ticket, find or create a default "General Admission" ticket.
      let defaultTicketId: string;

      const defaultTicket = await this.prisma.ticket_types.findFirst({
        where: {
          event_id: eventId,
          name: 'General Admission',
        },
      });

      if (defaultTicket) {
        defaultTicketId = defaultTicket.id;
      } else {
        // Create a default free ticket type
        const newTicket = await this.prisma.ticket_types.create({
          data: {
            event_id: eventId,
            name: 'General Admission',
            price: 0,
            quantity: event.max_attendees ?? 999999,
            quantity_sold: 0,
            is_active: true,
          },
        });
        defaultTicketId = newTicket.id;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.ticket_types.update({
          where: { id: defaultTicketId },
          data: {
            quantity_sold: { increment: 1 },
            updated_at: now,
          },
        });

        await tx.event_registrations.create({
          data: {
            id,
            event_id: eventId,
            user_id: userId,
            ticket_type_id: defaultTicketId,
            status: 'CONFIRMED',
            qr_code: qrCode,
            purchased_at: now,
          },
        });
      });
    }

    return {
      id,
      eventId,
      userId,
      ticketTypeId: dto.ticketTypeId ?? null,
      status: 'confirmed',
      qrCode,
      purchasedAt: now,
      createdAt: now,
    };
  }

  /**
   * Get the current user's registrations with event details.
   */
  async getMyRegistrations(userId: string) {
    this.logger.debug(`Getting registrations for user ${userId}`);

    const registrations = await this.prisma.event_registrations.findMany({
      where: { user_id: userId },
      include: {
        event: {
          select: {
            title: true,
            slug: true,
            start_date: true,
            end_date: true,
            venue: true,
            image_url: true,
          },
        },
        ticket_type: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        event: {
          start_date: 'asc',
        },
      },
    });

    return registrations.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      userId: r.user_id,
      ticketTypeId: r.ticket_type_id,
      status: r.status,
      qrCode: r.qr_code,
      purchasedAt: r.purchased_at,
      checkedInAt: r.checked_in_at,
      createdAt: r.created_at,
      event: {
        title: r.event.title,
        slug: r.event.slug,
        startDate: r.event.start_date,
        endDate: r.event.end_date,
        venue: r.event.venue,
        imageUrl: r.event.image_url,
      },
      ticketName: r.ticket_type.name,
    }));
  }

  /**
   * Check in a registration (event organizer / admin).
   */
  async checkin(registrationId: string, userId: string) {
    this.logger.debug(`Checking in registration ${registrationId}`);

    // Get the registration
    const reg = await this.prisma.event_registrations.findUnique({
      where: { id: registrationId },
    });

    if (!reg) {
      throw new NotFoundException(
        `Registration ${registrationId} not found`,
      );
    }

    // Verify the user doing the checkin is an organizer of the event
    await this.verifyOrganizer(reg.event_id, userId);

    if (reg.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot check in a cancelled registration',
      );
    }

    if (reg.checked_in_at) {
      throw new ConflictException(
        'This registration has already been checked in',
      );
    }

    const now = new Date();
    await this.prisma.event_registrations.update({
      where: { id: registrationId },
      data: {
        status: 'CHECKED_IN',
        checked_in_at: now,
      },
    });

    return {
      id: registrationId,
      status: 'checked_in',
      checkedInAt: now,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Verify that a user is an organizer of the given event.
   * Throws ForbiddenException if not.
   */
  private async verifyOrganizer(
    eventId: string,
    userId: string,
  ): Promise<void> {
    // Check event_organizers table
    const organizer = await this.prisma.event_organizers.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId,
        },
      },
    });

    if (organizer) return;

    // Also check creator_id on the events table itself
    const event = await this.prisma.events.findFirst({
      where: {
        id: eventId,
        creator_id: userId,
      },
      select: { id: true },
    });

    if (event) return;

    throw new ForbiddenException('You are not an organizer of this event');
  }

  private formatEvent(row: {
    id: string;
    creator_id: string;
    title: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    banner_url: string | null;
    venue: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    latitude: number | null;
    longitude: number | null;
    start_date: Date;
    end_date: Date;
    timezone: string;
    category: string | null;
    status: string;
    visibility: string;
    max_attendees: number | null;
    is_free: boolean;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: row.id,
      creatorId: row.creator_id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      bannerUrl: row.banner_url,
      venue: row.venue,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      latitude: row.latitude,
      longitude: row.longitude,
      startDate: row.start_date,
      endDate: row.end_date,
      timezone: row.timezone,
      category: row.category,
      status: row.status,
      visibility: row.visibility,
      maxAttendees: row.max_attendees,
      isFree: row.is_free,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatTicketType(row: {
    id: string;
    event_id: string;
    name: string;
    price: Prisma.Decimal | number;
    quantity: number;
    quantity_sold: number;
    description: string | null;
    sales_start: Date | null;
    sales_end: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }) {
    const price = Number(row.price);
    return {
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      price,
      quantity: row.quantity,
      quantitySold: row.quantity_sold,
      available: row.quantity - row.quantity_sold,
      description: row.description,
      salesStart: row.sales_start,
      salesEnd: row.sales_end,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
