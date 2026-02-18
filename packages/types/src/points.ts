export type PointsReason =
  | 'LISTENING'
  | 'EVENT_CHECKIN'
  | 'PURCHASE'
  | 'REDEMPTION'
  | 'ADMIN_GRANT'
  | 'SIGNUP';

export type PointsTriggerType =
  | 'LISTEN_MINUTES'
  | 'EVENT_ATTENDANCE'
  | 'PURCHASE'
  | 'SIGNUP';

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  amount: number;
  reason: PointsReason;
  referenceType: string | null;
  referenceId: string | null;
  balance: number;
  createdAt: string;
}

export interface PointsRule {
  id: string;
  name: string;
  triggerType: PointsTriggerType;
  pointsAmount: number;
  threshold: number | null;
  isActive: boolean;
  cooldownMinutes: number | null;
}

export interface RewardCatalogItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  category: string | null;
  stockCount: number | null;
  isActive: boolean;
}
