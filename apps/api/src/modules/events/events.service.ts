import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomUUID } from 'node:crypto';

interface EventRow {
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
  timezone: string | null;
  category: string | null;
  status: string | null;
  visibility: string | null;
  max_attendees: number | null;
  is_free: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  description: string | null;
  sales_start: Date | null;
  sales_end: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface RegistrationRow {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type_id: string | null;
  status: string;
  qr_code: string | null;
  purchased_at: Date | null;
  checked_in_at: Date | null;
  created_at: Date;
}

interface RegistrationWithEvent extends RegistrationRow {
  event_title: string | null;
  event_slug: string | null;
  event_start_date: Date | null;
  event_end_date: Date | null;
  event_venue: string | null;
  event_image_url: string | null;
  ticket_name: string | null;
}

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

    if (filters?.upcoming && filters?.category) {
      const rows = await this.prisma.$queryRaw<EventRow[]>`
        SELECT *
        FROM events
        WHERE visibility = 'public'
          AND status != 'cancelled'
          AND start_date >= ${now}
          AND category = ${filters.category}
        ORDER BY start_date ASC
      `;
      return rows.map((e) => this.formatEvent(e));
    }

    if (filters?.upcoming) {
      const rows = await this.prisma.$queryRaw<EventRow[]>`
        SELECT *
        FROM events
        WHERE visibility = 'public'
          AND status != 'cancelled'
          AND start_date >= ${now}
        ORDER BY start_date ASC
      `;
      return rows.map((e) => this.formatEvent(e));
    }

    if (filters?.category) {
      const rows = await this.prisma.$queryRaw<EventRow[]>`
        SELECT *
        FROM events
        WHERE visibility = 'public'
          AND status != 'cancelled'
          AND category = ${filters.category}
        ORDER BY start_date DESC
      `;
      return rows.map((e) => this.formatEvent(e));
    }

    const rows = await this.prisma.$queryRaw<EventRow[]>`
      SELECT *
      FROM events
      WHERE visibility = 'public'
        AND status != 'cancelled'
      ORDER BY start_date DESC
    `;
    return rows.map((e) => this.formatEvent(e));
  }

  /**
   * Get a single event by ID with ticket types and organizers.
   */
  async findById(id: string) {
    this.logger.debug(`Finding event ${id}`);

    const rows = await this.prisma.$queryRaw<EventRow[]>`
      SELECT * FROM events WHERE id = ${id}
    `;

    if (rows.length === 0) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    const event = this.formatEvent(rows[0]);

    // Get ticket types
    const tickets = await this.prisma.$queryRaw<TicketTypeRow[]>`
      SELECT * FROM ticket_types
      WHERE event_id = ${id}
      ORDER BY price ASC
    `;

    // Get organizers
    const organizers = await this.prisma.$queryRaw<{
      user_id: string;
      role: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
    }[]>`
      SELECT
        eo.user_id, eo.role,
        p.display_name, p.email, p.avatar_url
      FROM event_organizers eo
      LEFT JOIN profiles p ON p.id = eo.user_id
      WHERE eo.event_id = ${id}
    `;

    // Get registration count
    const regCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM event_registrations
      WHERE event_id = ${id} AND status != 'cancelled'
    `;

    return {
      ...event,
      ticketTypes: tickets.map((t) => this.formatTicketType(t)),
      organizers: organizers.map((o) => ({
        userId: o.user_id,
        role: o.role,
        displayName: o.display_name,
        email: o.email,
        avatarUrl: o.avatar_url,
      })),
      registrationCount: Number(regCount[0]?.count ?? 0),
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
    const description = (dto.description as string) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const bannerUrl = (dto.bannerUrl as string) ?? null;
    const venue = (dto.venue as string) ?? null;
    const address = (dto.address as string) ?? null;
    const city = (dto.city as string) ?? null;
    const state = (dto.state as string) ?? null;
    const zipCode = (dto.zipCode as string) ?? null;
    const latitude = (dto.latitude as number) ?? null;
    const longitude = (dto.longitude as number) ?? null;
    const startDate = new Date(dto.startDate as string);
    const endDate = new Date(dto.endDate as string);
    const timezone = (dto.timezone as string) ?? 'America/New_York';
    const category = (dto.category as string) ?? null;
    const status = (dto.status as string) ?? 'draft';
    const visibility = (dto.visibility as string) ?? 'public';
    const maxAttendees = (dto.maxAttendees as number) ?? null;
    const isFree = (dto.isFree as boolean) ?? true;
    const now = new Date();

    try {
      await this.prisma.$executeRaw`
        INSERT INTO events (
          id, creator_id, title, slug, description, image_url, banner_url,
          venue, address, city, state, zip_code, latitude, longitude,
          start_date, end_date, timezone, category, status, visibility,
          max_attendees, is_free, created_at, updated_at
        )
        VALUES (
          ${id}, ${userId}::uuid, ${title}, ${slug}, ${description}, ${imageUrl}, ${bannerUrl},
          ${venue}, ${address}, ${city}, ${state}, ${zipCode}, ${latitude}, ${longitude},
          ${startDate}, ${endDate}, ${timezone}, ${category}, ${status}, ${visibility},
          ${maxAttendees}, ${isFree}, ${now}, ${now}
        )
      `;
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('unique')) {
        throw new ConflictException(`Event with slug "${slug}" already exists`);
      }
      throw err;
    }

    // Add creator as organizer with 'creator' role
    await this.prisma.$executeRaw`
      INSERT INTO event_organizers (event_id, user_id, role)
      VALUES (${id}, ${userId}::uuid, 'creator')
    `;

    // Create ticket types if provided
    const ticketTypes = dto.ticketTypes as any[] | undefined;
    if (ticketTypes && ticketTypes.length > 0) {
      for (const tt of ticketTypes) {
        const ttId = tt.id ?? randomUUID();
        await this.prisma.$executeRaw`
          INSERT INTO ticket_types (
            id, event_id, name, price, quantity, quantity_sold,
            description, sales_start, sales_end, is_active, created_at, updated_at
          )
          VALUES (
            ${ttId}, ${id}, ${tt.name as string}, ${tt.price as number ?? 0},
            ${tt.quantity as number ?? 0}, ${0},
            ${(tt.description as string) ?? null},
            ${tt.salesStart ? new Date(tt.salesStart as string) : null},
            ${tt.salesEnd ? new Date(tt.salesEnd as string) : null},
            ${true}, ${now}, ${now}
          )
        `;
      }
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

    const now = new Date();
    const title = (dto.title as string) ?? null;
    const slug = (dto.slug as string) ?? null;
    const description = (dto.description as string) ?? null;
    const imageUrl = (dto.imageUrl as string) ?? null;
    const bannerUrl = (dto.bannerUrl as string) ?? null;
    const venue = (dto.venue as string) ?? null;
    const address = (dto.address as string) ?? null;
    const city = (dto.city as string) ?? null;
    const state = (dto.state as string) ?? null;
    const zipCode = (dto.zipCode as string) ?? null;
    const latitude = (dto.latitude as number) ?? null;
    const longitude = (dto.longitude as number) ?? null;
    const startDate = dto.startDate ? new Date(dto.startDate as string) : null;
    const endDate = dto.endDate ? new Date(dto.endDate as string) : null;
    const timezone = (dto.timezone as string) ?? null;
    const category = (dto.category as string) ?? null;
    const status = (dto.status as string) ?? null;
    const visibility = (dto.visibility as string) ?? null;
    const maxAttendees = (dto.maxAttendees as number) ?? null;
    const isFree = dto.isFree as boolean | undefined;

    await this.prisma.$executeRaw`
      UPDATE events SET
        title = COALESCE(${title}, title),
        slug = COALESCE(${slug}, slug),
        description = COALESCE(${description}, description),
        image_url = COALESCE(${imageUrl}, image_url),
        banner_url = COALESCE(${bannerUrl}, banner_url),
        venue = COALESCE(${venue}, venue),
        address = COALESCE(${address}, address),
        city = COALESCE(${city}, city),
        state = COALESCE(${state}, state),
        zip_code = COALESCE(${zipCode}, zip_code),
        latitude = COALESCE(${latitude}, latitude),
        longitude = COALESCE(${longitude}, longitude),
        start_date = COALESCE(${startDate}, start_date),
        end_date = COALESCE(${endDate}, end_date),
        timezone = COALESCE(${timezone}, timezone),
        category = COALESCE(${category}, category),
        status = COALESCE(${status}, status),
        visibility = COALESCE(${visibility}, visibility),
        max_attendees = COALESCE(${maxAttendees}, max_attendees),
        is_free = COALESCE(${isFree ?? null}::boolean, is_free),
        updated_at = ${now}
      WHERE id = ${eventId}
    `;

    return this.findById(eventId);
  }

  /**
   * Delete an event (owner only). Also deletes related records.
   */
  async remove(eventId: string, userId: string) {
    this.logger.debug(`Deleting event ${eventId}`);

    // Verify ownership (must be creator)
    const event = await this.findById(eventId);
    if ((event as any).organizers?.find((o: any) => o.userId === userId && o.role === 'creator') === undefined) {
      // Also check creator_id directly
      const rows = await this.prisma.$queryRaw<{ creator_id: string }[]>`
        SELECT creator_id FROM events WHERE id = ${eventId}
      `;
      if (rows.length === 0 || rows[0].creator_id !== userId) {
        throw new ForbiddenException('Only the event creator can delete this event');
      }
    }

    // Delete in dependency order
    await this.prisma.$executeRaw`DELETE FROM event_registrations WHERE event_id = ${eventId}`;
    await this.prisma.$executeRaw`DELETE FROM ticket_types WHERE event_id = ${eventId}`;
    await this.prisma.$executeRaw`DELETE FROM event_organizers WHERE event_id = ${eventId}`;
    await this.prisma.$executeRaw`DELETE FROM events WHERE id = ${eventId}`;

    return { deleted: true, id: eventId };
  }

  // ─── Ticket Types ──────────────────────────────────────────────

  /**
   * Get ticket types for an event.
   */
  async getTicketTypes(eventId: string) {
    this.logger.debug(`Getting ticket types for event ${eventId}`);

    const rows = await this.prisma.$queryRaw<TicketTypeRow[]>`
      SELECT * FROM ticket_types
      WHERE event_id = ${eventId}
      ORDER BY price ASC
    `;

    return rows.map((t) => this.formatTicketType(t));
  }

  // ─── Registrations ────────────────────────────────────────────

  /**
   * Register the current user for an event.
   */
  async register(eventId: string, userId: string, dto: { ticketTypeId?: string }) {
    this.logger.debug(`User ${userId} registering for event ${eventId}`);

    // Verify event exists
    const events = await this.prisma.$queryRaw<EventRow[]>`
      SELECT * FROM events WHERE id = ${eventId}
    `;
    if (events.length === 0) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const event = events[0];

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      throw new BadRequestException('This event has been cancelled');
    }

    // Check for duplicate registration
    const existing = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM event_registrations
      WHERE event_id = ${eventId}
        AND user_id = ${userId}::uuid
        AND status != 'cancelled'
    `;

    if (Number(existing[0]?.count ?? 0) > 0) {
      throw new ConflictException('You are already registered for this event');
    }

    // Check max attendees
    if (event.max_attendees) {
      const regCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM event_registrations
        WHERE event_id = ${eventId} AND status != 'cancelled'
      `;

      if (Number(regCount[0]?.count ?? 0) >= event.max_attendees) {
        throw new BadRequestException('This event is at full capacity');
      }
    }

    // If ticket type is specified, verify it and check availability
    if (dto.ticketTypeId) {
      const tickets = await this.prisma.$queryRaw<TicketTypeRow[]>`
        SELECT * FROM ticket_types
        WHERE id = ${dto.ticketTypeId} AND event_id = ${eventId}
      `;

      if (tickets.length === 0) {
        throw new NotFoundException(`Ticket type ${dto.ticketTypeId} not found for this event`);
      }

      const ticket = tickets[0];
      if (!ticket.is_active) {
        throw new BadRequestException('This ticket type is not available');
      }

      if (ticket.quantity_sold >= ticket.quantity) {
        throw new BadRequestException('This ticket type is sold out');
      }

      // Increment quantity_sold
      await this.prisma.$executeRaw`
        UPDATE ticket_types
        SET quantity_sold = quantity_sold + 1, updated_at = ${new Date()}
        WHERE id = ${dto.ticketTypeId} AND quantity_sold < quantity
      `;
    }

    const id = randomUUID();
    const qrCode = `WCCG-${eventId.slice(0, 8)}-${id.slice(0, 8)}`.toUpperCase();
    const now = new Date();
    const ticketTypeId = dto.ticketTypeId ?? null;

    await this.prisma.$executeRaw`
      INSERT INTO event_registrations (id, event_id, user_id, ticket_type_id, status, qr_code, purchased_at, created_at)
      VALUES (${id}, ${eventId}, ${userId}::uuid, ${ticketTypeId}, 'confirmed', ${qrCode}, ${now}, ${now})
    `;

    return {
      id,
      eventId,
      userId,
      ticketTypeId,
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

    const rows = await this.prisma.$queryRaw<RegistrationWithEvent[]>`
      SELECT
        r.*,
        e.title as event_title, e.slug as event_slug,
        e.start_date as event_start_date, e.end_date as event_end_date,
        e.venue as event_venue, e.image_url as event_image_url,
        tt.name as ticket_name
      FROM event_registrations r
      LEFT JOIN events e ON e.id = r.event_id
      LEFT JOIN ticket_types tt ON tt.id = r.ticket_type_id
      WHERE r.user_id = ${userId}::uuid
      ORDER BY e.start_date ASC
    `;

    return rows.map((r) => ({
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
        title: r.event_title,
        slug: r.event_slug,
        startDate: r.event_start_date,
        endDate: r.event_end_date,
        venue: r.event_venue,
        imageUrl: r.event_image_url,
      },
      ticketName: r.ticket_name,
    }));
  }

  /**
   * Check in a registration (event organizer / admin).
   */
  async checkin(registrationId: string, userId: string) {
    this.logger.debug(`Checking in registration ${registrationId}`);

    // Get the registration
    const regs = await this.prisma.$queryRaw<RegistrationRow[]>`
      SELECT * FROM event_registrations WHERE id = ${registrationId}
    `;

    if (regs.length === 0) {
      throw new NotFoundException(`Registration ${registrationId} not found`);
    }

    const reg = regs[0];

    // Verify the user doing the checkin is an organizer of the event
    await this.verifyOrganizer(reg.event_id, userId);

    if (reg.status === 'cancelled') {
      throw new BadRequestException('Cannot check in a cancelled registration');
    }

    if (reg.checked_in_at) {
      throw new ConflictException('This registration has already been checked in');
    }

    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE event_registrations
      SET status = 'checked_in', checked_in_at = ${now}
      WHERE id = ${registrationId}
    `;

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
  private async verifyOrganizer(eventId: string, userId: string): Promise<void> {
    // Check event_organizers table
    const organizers = await this.prisma.$queryRaw<{ user_id: string }[]>`
      SELECT user_id FROM event_organizers
      WHERE event_id = ${eventId} AND user_id = ${userId}::uuid
    `;

    if (organizers.length > 0) return;

    // Also check creator_id on the events table itself
    const creators = await this.prisma.$queryRaw<{ creator_id: string }[]>`
      SELECT creator_id FROM events
      WHERE id = ${eventId} AND creator_id = ${userId}::uuid
    `;

    if (creators.length > 0) return;

    throw new ForbiddenException('You are not an organizer of this event');
  }

  private formatEvent(row: EventRow) {
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

  private formatTicketType(row: TicketTypeRow) {
    return {
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      price: row.price,
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
