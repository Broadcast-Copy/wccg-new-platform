import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Events CRUD ───────────────────────────────────────────────

  /**
   * List all events (public, filterable).
   */
  async findAll(filters?: { upcoming?: boolean; type?: string }) {
    // TODO: Query events with optional filters, ordered by date
    this.logger.debug('Finding all events', filters);
    return [];
  }

  /**
   * Get a single event by ID with ticket types.
   */
  async findById(id: string) {
    // TODO: Query event by ID, include ticket_types and organizer
    this.logger.debug(`Finding event ${id}`);
    return null;
  }

  /**
   * Create a new event (authenticated user becomes organizer).
   */
  async create(userId: string, dto: Record<string, unknown>) {
    // TODO: Validate and create event with userId as organizer_id
    this.logger.debug(`User ${userId} creating event`);
    return { id: 'new-event-id', organizerId: userId, ...dto };
  }

  /**
   * Update an event (owner only).
   */
  async update(eventId: string, userId: string, dto: Record<string, unknown>) {
    // TODO: Verify ownership, validate, update
    const event = await this.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    // TODO: Check (event as any).organizerId === userId
    this.logger.debug(`Updating event ${eventId}`);
    return { id: eventId, ...dto };
  }

  /**
   * Delete an event (owner only).
   */
  async remove(eventId: string, userId: string) {
    const event = await this.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    // TODO: Check ownership
    this.logger.debug(`Deleting event ${eventId}`);
    return { deleted: true, id: eventId };
  }

  // ─── Ticket Types ──────────────────────────────────────────────

  /**
   * Get ticket types for an event.
   */
  async getTicketTypes(eventId: string) {
    // TODO: Query ticket_types by event_id
    this.logger.debug(`Getting ticket types for event ${eventId}`);
    return [];
  }

  // ─── Registrations ────────────────────────────────────────────

  /**
   * Register the current user for an event.
   */
  async register(eventId: string, userId: string, dto: { ticketTypeId?: string }) {
    // TODO: Check event capacity, create registration
    this.logger.debug(`User ${userId} registering for event ${eventId}`);
    return {
      id: 'new-registration-id',
      eventId,
      userId,
      ticketTypeId: dto.ticketTypeId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get the current user's registrations.
   */
  async getMyRegistrations(userId: string) {
    // TODO: Query registrations by user_id, include event details
    this.logger.debug(`Getting registrations for user ${userId}`);
    return [];
  }

  /**
   * Check in a registration (event organizer / admin).
   */
  async checkin(registrationId: string, userId: string) {
    // TODO: Verify organizer, update registration status to 'checked_in'
    this.logger.debug(`Checking in registration ${registrationId}`);
    return { id: registrationId, status: 'checked_in' };
  }
}
