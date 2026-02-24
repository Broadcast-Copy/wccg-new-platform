import {
  Controller,
  Get,
  Patch,
  Param,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── All endpoints require authentication ───────────────────────

  /**
   * GET /notifications — List my notifications (authenticated).
   */
  @Get()
  findAll(@CurrentUser() user: SupabaseUser) {
    return this.notificationsService.findByUser(user.sub);
  }

  /**
   * GET /notifications/unread-count — Get unread notification count (authenticated).
   */
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: SupabaseUser) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  /**
   * PATCH /notifications/read-all — Mark all notifications as read (authenticated).
   * IMPORTANT: This route must be defined BEFORE :id to avoid conflict.
   */
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: SupabaseUser) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  /**
   * PATCH /notifications/:id/read — Mark a single notification as read (authenticated).
   */
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }
}
