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
  user_id: string;
  amount: number;
  reason: PointsReason;
  reference_type: string | null;
  reference_id: string | null;
  balance: number;
  created_at: string;
}

export interface PointsRule {
  id: string;
  name: string;
  trigger_type: PointsTriggerType;
  points_amount: number;
  threshold: number | null;
  is_active: boolean;
  cooldown_minutes: number | null;
}

export interface RewardCatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  category: string | null;
  stock_count: number | null;
  is_active: boolean;
}
