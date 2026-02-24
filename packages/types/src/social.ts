/** Follows — user-to-user follow relationships */
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

/** Notifications */
export type NotificationType =
  | 'new_episode'
  | 'event_reminder'
  | 'points_earned'
  | 'follow'
  | 'content_approved'
  | 'content_rejected'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Content play tracking */
export type ContentPlayType = 'mix' | 'episode' | 'track';

export interface ContentPlay {
  id: string;
  userId: string | null;
  contentType: ContentPlayType;
  contentId: string;
  startedAt: string;
  durationListened: number;
  totalDuration: number | null;
  completed: boolean;
  createdAt: string;
}

/** Moderation queue */
export type ModerationContentType = 'mix' | 'episode' | 'event' | 'directory_claim';
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ModerationItem {
  id: string;
  contentType: ModerationContentType;
  contentId: string;
  submittedBy: string;
  status: ModerationStatus;
  reviewerId: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Audit log */
export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}
