import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly db: SupabaseDbService) {}

  /**
   * List all pending items in the moderation queue.
   */
  async findQueue() {
    this.logger.debug('Fetching moderation queue');

    const { data, error } = await this.db.from('moderation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => this.formatItem(row));
  }

  /**
   * Get a single moderation queue item by ID.
   */
  async findById(id: string) {
    this.logger.debug(`Finding moderation item ${id}`);

    const { data: row, error } = await this.db.from('moderation_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      throw new NotFoundException(`Moderation item ${id} not found`);
    }

    return this.formatItem(row);
  }

  /**
   * Approve a moderation queue item.
   * Sets status to 'approved' and records the reviewer.
   */
  async approve(id: string, reviewerId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Approving moderation item ${id}`);

    const { data: existing, error: fetchError } = await this.db.from('moderation_queue')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Moderation item ${id} not found`);
    }

    if (existing.status !== 'pending') {
      throw new ForbiddenException(`Item ${id} has already been ${existing.status}`);
    }

    const { error } = await this.db.from('moderation_queue')
      .update({
        status: 'approved',
        reviewer_id: reviewerId,
        reviewer_notes: (dto.notes as string) ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return this.findById(id);
  }

  /**
   * Reject a moderation queue item.
   * Sets status to 'rejected' and records the reviewer and reason.
   */
  async reject(id: string, reviewerId: string, dto: Record<string, unknown>) {
    this.logger.debug(`Rejecting moderation item ${id}`);

    const { data: existing, error: fetchError } = await this.db.from('moderation_queue')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Moderation item ${id} not found`);
    }

    if (existing.status !== 'pending') {
      throw new ForbiddenException(`Item ${id} has already been ${existing.status}`);
    }

    const { error } = await this.db.from('moderation_queue')
      .update({
        status: 'rejected',
        reviewer_id: reviewerId,
        reviewer_notes: (dto.notes as string) ?? null,
        rejection_reason: (dto.reason as string) ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return this.findById(id);
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Convert a moderation_queue row (snake_case) to camelCase API response.
   */
  private formatItem(row: any) {
    return {
      id: row.id,
      contentType: row.content_type,
      contentId: row.content_id,
      submitterId: row.submitter_id,
      status: row.status,
      reviewerId: row.reviewer_id,
      reviewerNotes: row.reviewer_notes,
      rejectionReason: row.rejection_reason,
      reviewedAt: row.reviewed_at,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
