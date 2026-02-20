import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  // ─── Events CRUD ───────────────────────────────────────────────

  /**
   * List all events (public, filterable).
   * Supports filtering by upcoming events and category.
   */
  async findAll(filters?: { upcoming?: boolean; category?: string }) {
    this.logger.debug('Finding all events', filters);

    const now = new Date().toISOString();

    let query = this.db.from('events')
      .select('*')
      .eq('visibility', 'PUBLIC')
      .neq('status', 'CANCELLED');

    if (filters?.upcoming) {
      query = query.gte('start_date', now).order('start_date', { ascending: true });
    } else {
      query = query.order('start_date', { ascending: false });
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    return (events ?? []).map((e: any) => this.formatEvent(e));
  }

  /**
   * Get a single event by ID with ticket types and organizers.
   */
  async findById(id: string) {
    this.logger.debug(`Finding event ${id}`);

    const { data: event, error } = await this.db.from('events')
      .select('*, ticket_types(*), event_organizers(*, profiles(display_name, email, avatar_url))')
      .eq('id', id)
      .single();

    if (error || !event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Separate count query for registrations (excluding cancelled)
    const { count: registrationCount } = await this.db.from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .neq('status', 'CANCELLED');

    // Sort ticket types by price
    const ticketTypes = (event.ticket_types ?? [])
      .sort((a: any, b: any) => Number(a.price) - Number(b.price));

    return {
      ...this.formatEvent(event),
      ticketTypes: ticketTypes.map((t: any) => this.formatTicketType(t)),
      organizers: (event.event_organizers ?? []).map((o: any) => ({
        userId: o.user_id,
        role: o.role,
        displayName: o.profiles?.display_name,
        email: o.profiles?.email,
        avatarUrl: o.profiles?.avatar_url,
      })),
      registrationCount: registrationCount ?? 0,
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

    // Insert the event
    const { error: eventError } = await this.db.from('events')
      .insert({
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
        start_date: new Date(dto.startDate as string).toISOString(),
        end_date: new Date(dto.endDate as string).toISOString(),
        timezone: (dto.timezone as string) ?? 'America/New_York',
        category: (dto.category as string) ?? null,
        status: ((dto.status as string) ?? 'DRAFT').toUpperCase(),
        visibility: ((dto.visibility as string) ?? 'PUBLIC').toUpperCase(),
        max_attendees: (dto.maxAttendees as number) ?? null,
        is_free: (dto.isFree as boolean) ?? true,
      });

    if (eventError) {
      if (eventError.code === '23505') {
        throw new ConflictException(`Event with slug "${slug}" already exists`);
      }
      throw eventError;
    }

    // Add creator as organizer with OWNER role
    await this.db.from('event_organizers')
      .insert({
        event_id: id,
        user_id: userId,
        role: 'OWNER',
      });

    // Insert ticket types if provided
    if (ticketTypes && ticketTypes.length > 0) {
      const ticketRows = ticketTypes.map((tt: any) => ({
        id: tt.id ?? randomUUID(),
        event_id: id,
        name: tt.name as string,
        price: tt.price ?? 0,
        quantity: tt.quantity ?? 0,
        quantity_sold: 0,
        description: (tt.description as string) ?? null,
        sales_start: tt.salesStart
          ? new Date(tt.salesStart as string).toISOString()
          : null,
        sales_end: tt.salesEnd
          ? new Date(tt.salesEnd as string).toISOString()
          : null,
        is_active: true,
      }));
      await this.db.from('ticket_types').insert(ticketRows);
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
    const data: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
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
      data.start_date = new Date(dto.startDate as string).toISOString();
    if (dto.endDate !== undefined)
      data.end_date = new Date(dto.endDate as string).toISOString();
    if (dto.timezone !== undefined) data.timezone = dto.timezone as string;
    if (dto.category !== undefined) data.category = dto.category as string;
    if (dto.status !== undefined)
      data.status = (dto.status as string).toUpperCase();
    if (dto.visibility !== undefined)
      data.visibility = (dto.visibility as string).toUpperCase();
    if (dto.maxAttendees !== undefined)
      data.max_attendees = dto.maxAttendees as number;
    if (dto.isFree !== undefined) data.is_free = dto.isFree as boolean;

    await this.db.from('events')
      .update(data)
      .eq('id', eventId);

    return this.findById(eventId);
  }

  /**
   * Delete an event (owner only). Cascade deletes related records.
   */
  async remove(eventId: string, userId: string) {
    this.logger.debug(`Deleting event ${eventId}`);

    // Verify ownership (must be creator)
    const { data: event } = await this.db.from('events')
      .select('creator_id')
      .eq('id', eventId)
      .maybeSingle();

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Check if user is the creator
    const isCreator = event.creator_id === userId;

    // Or an OWNER organizer
    const { data: orgRows } = await this.db.from('event_organizers')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    const isOwnerOrganizer = (orgRows ?? []).some((o: any) => o.role === 'OWNER');

    if (!isCreator && !isOwnerOrganizer) {
      throw new ForbiddenException(
        'Only the event creator can delete this event',
      );
    }

    // Cascade delete handles ticket_types, event_registrations, event_organizers
    const { error } = await this.db.from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;

    return { deleted: true, id: eventId };
  }

  // ─── Ticket Types ──────────────────────────────────────────────

  /**
   * Get ticket types for an event.
   */
  async getTicketTypes(eventId: string) {
    this.logger.debug(`Getting ticket types for event ${eventId}`);

    const { data: tickets, error } = await this.db.from('ticket_types')
      .select('*')
      .eq('event_id', eventId)
      .order('price', { ascending: true });

    if (error) throw error;

    return (tickets ?? []).map((t: any) => this.formatTicketType(t));
  }

  // ─── Registrations ────────────────────────────────────────────

  /**
   * Register the current user for an event.
   * Uses sequential operations (acceptable risk for this app).
   */
  async register(
    eventId: string,
    userId: string,
    dto: { ticketTypeId?: string },
  ) {
    this.logger.debug(`User ${userId} registering for event ${eventId}`);

    // Verify event exists
    const { data: event } = await this.db.from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Check if event is cancelled
    if (event.status === 'CANCELLED') {
      throw new BadRequestException('This event has been cancelled');
    }

    // Check for duplicate registration
    const { count: existingCount } = await this.db.from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .neq('status', 'CANCELLED');

    if (existingCount && existingCount > 0) {
      throw new ConflictException('You are already registered for this event');
    }

    // Check max attendees
    if (event.max_attendees) {
      const { count: regCount } = await this.db.from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .neq('status', 'CANCELLED');

      if ((regCount ?? 0) >= event.max_attendees) {
        throw new BadRequestException('This event is at full capacity');
      }
    }

    const id = randomUUID();
    const qrCode =
      `WCCG-${eventId.slice(0, 8)}-${id.slice(0, 8)}`.toUpperCase();
    const now = new Date().toISOString();

    // If ticket type is specified, update quantity_sold and create registration
    if (dto.ticketTypeId) {
      const { data: ticket } = await this.db.from('ticket_types')
        .select('*')
        .eq('id', dto.ticketTypeId)
        .eq('event_id', eventId)
        .maybeSingle();

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

      // Increment quantity_sold
      await this.db.from('ticket_types')
        .update({
          quantity_sold: ticket.quantity_sold + 1,
          updated_at: now,
        })
        .eq('id', dto.ticketTypeId);

      // Create registration
      await this.db.from('event_registrations')
        .insert({
          id,
          event_id: eventId,
          user_id: userId,
          ticket_type_id: dto.ticketTypeId,
          status: 'CONFIRMED',
          qr_code: qrCode,
          purchased_at: now,
        });
    } else {
      // Free event or no ticket type: find or create a default "General Admission" ticket
      let defaultTicketId: string;

      const { data: defaultTicket } = await this.db.from('ticket_types')
        .select('id')
        .eq('event_id', eventId)
        .eq('name', 'General Admission')
        .limit(1)
        .maybeSingle();

      if (defaultTicket) {
        defaultTicketId = defaultTicket.id;
      } else {
        // Create a default free ticket type
        const { data: newTicket, error: ticketError } = await this.db.from('ticket_types')
          .insert({
            event_id: eventId,
            name: 'General Admission',
            price: 0,
            quantity: event.max_attendees ?? 999999,
            quantity_sold: 0,
            is_active: true,
          })
          .select()
          .single();

        if (ticketError) throw ticketError;
        defaultTicketId = newTicket.id;
      }

      // Get current quantity_sold for default ticket
      const { data: currentTicket } = await this.db.from('ticket_types')
        .select('quantity_sold')
        .eq('id', defaultTicketId)
        .single();

      // Increment quantity_sold
      await this.db.from('ticket_types')
        .update({
          quantity_sold: (currentTicket?.quantity_sold ?? 0) + 1,
          updated_at: now,
        })
        .eq('id', defaultTicketId);

      // Create registration
      await this.db.from('event_registrations')
        .insert({
          id,
          event_id: eventId,
          user_id: userId,
          ticket_type_id: defaultTicketId,
          status: 'CONFIRMED',
          qr_code: qrCode,
          purchased_at: now,
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

    const { data: registrations, error } = await this.db.from('event_registrations')
      .select('*, events(title, slug, start_date, end_date, venue, image_url), ticket_types(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (registrations ?? []).map((r: any) => ({
      id: r.id,
      eventId: r.event_id,
      userId: r.user_id,
      ticketTypeId: r.ticket_type_id,
      status: r.status,
      qrCode: r.qr_code,
      purchasedAt: r.purchased_at,
      checkedInAt: r.checked_in_at,
      createdAt: r.created_at,
      event: r.events
        ? {
            title: r.events.title,
            slug: r.events.slug,
            startDate: r.events.start_date,
            endDate: r.events.end_date,
            venue: r.events.venue,
            imageUrl: r.events.image_url,
          }
        : null,
      ticketName: r.ticket_types?.name ?? null,
    }));
  }

  /**
   * Check in a registration (event organizer / admin).
   */
  async checkin(registrationId: string, userId: string) {
    this.logger.debug(`Checking in registration ${registrationId}`);

    // Get the registration
    const { data: reg } = await this.db.from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .maybeSingle();

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

    const now = new Date().toISOString();
    await this.db.from('event_registrations')
      .update({
        status: 'CHECKED_IN',
        checked_in_at: now,
      })
      .eq('id', registrationId);

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
    const { data: organizer } = await this.db.from('event_organizers')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (organizer) return;

    // Also check creator_id on the events table itself
    const { data: event } = await this.db.from('events')
      .select('id')
      .eq('id', eventId)
      .eq('creator_id', userId)
      .maybeSingle();

    if (event) return;

    throw new ForbiddenException('You are not an organizer of this event');
  }

  private formatEvent(row: any) {
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

  private formatTicketType(row: any) {
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
