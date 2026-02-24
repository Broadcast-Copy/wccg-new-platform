import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all notifications for a user, ordered by most recent first.
   */
  async findByUser(userId: string) {
    this.logger.debug(`Finding notifications for user ${userId}`);

    const { data, error } = await this.db.from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatNotification(row));
  }

  /**
   * Get the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string) {
    this.logger.debug(`Getting unread count for user ${userId}`);

    const { count, error } = await this.db.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return { unreadCount: count ?? 0 };
  }

  /**
   * Mark a single notification as read.
   * Only the notification owner can mark it.
   */
  async markAsRead(id: string, userId: string) {
    this.logger.debug(`Marking notification ${id} as read`);

    const { data: existing, error: fetchError } = await this.db.from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    const { error } = await this.db.from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return { id, read: true };
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    this.logger.debug(`Marking all notifications as read for user ${userId}`);

    const { error } = await this.db.from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return { success: true, message: 'All notifications marked as read' };
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Convert a notifications row (snake_case) to camelCase API response.
   */
  private formatNotification(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body,
      actionUrl: row.action_url,
      read: row.read,
      readAt: row.read_at,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }
}
