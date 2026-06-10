/**
 * Shared types for the Rewards Arcade surfaces.
 *
 * Data sources (all Supabase-direct, RLS-gated):
 * - RPC points_leaderboard(p_limit)        → all-time board (rank/…/balance)
 * - RPC points_leaderboard_weekly(p_limit) → since Monday 00:00 ET (rank/…/points)
 * - table reward_catalog                   → live prize inventory
 * - table listener_of_the_week             → spotlight (public read)
 * - table user_milestones                  → own unlocked badge ids
 */

export type Loadable<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: T };

export interface ArcadeLeaderEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
}

export interface ArcadeReward {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  category: string | null;
  /** null = unlimited stock */
  stockCount: number | null;
}

export interface SpotlightListener {
  displayName: string;
  city: string | null;
  pointsEarned: number | null;
  listeningHours: number | null;
  quote: string | null;
  weekStartDate: string | null;
}
