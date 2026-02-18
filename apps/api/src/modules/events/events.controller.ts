import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ─── Events CRUD ───────────────────────────────────────────────

  /**
   * GET /events — List all events (public, filterable).
   */
  @Public()
  @Get()
  findAll(
    @Query('upcoming') upcoming?: boolean,
    @Query('category') category?: string,
  ) {
    return this.eventsService.findAll({ upcoming, category });
  }

  /**
   * GET /events/:id — Get a single event (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  /**
   * POST /events — Create a new event (authenticated).
   */
  @Post()
  create(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    // TODO: Replace with CreateEventDto
    return this.eventsService.create(user.sub, dto);
  }

  /**
   * PATCH /events/:id — Update an event (owner only).
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    // TODO: Replace with UpdateEventDto
    return this.eventsService.update(id, user.sub, dto);
  }

  /**
   * DELETE /events/:id — Delete an event (owner only).
   */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    return this.eventsService.remove(id, user.sub);
  }

  // ─── Ticket Types ──────────────────────────────────────────────

  /**
   * GET /events/:id/tickets — Get ticket types for an event (public).
   */
  @Public()
  @Get(':id/tickets')
  getTicketTypes(@Param('id') id: string) {
    return this.eventsService.getTicketTypes(id);
  }

  // ─── Registrations (under /events/:id) ─────────────────────────

  /**
   * POST /events/:id/register — Register for an event (authenticated).
   */
  @Post(':id/register')
  register(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: { ticketTypeId?: string },
  ) {
    // TODO: Replace with RegisterEventDto
    return this.eventsService.register(id, user.sub, dto);
  }
}
