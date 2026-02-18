import {
  Controller,
  Get,
  Post,
  Param,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /registrations/me — Get the current user's event registrations.
   */
  @Get('me')
  getMyRegistrations(@CurrentUser() user: SupabaseUser) {
    return this.eventsService.getMyRegistrations(user.sub);
  }

  /**
   * POST /registrations/:id/checkin — Check in a registration.
   */
  @Post(':id/checkin')
  checkin(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.eventsService.checkin(id, user.sub);
  }
}
