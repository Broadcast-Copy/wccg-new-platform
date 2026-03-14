-- ============================================================================
-- User Sync — Enable client-side writes for cross-device data consistency
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Allow authenticated users to upsert their own user_points row
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can upsert own points"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points"
  ON public.user_points FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Allow authenticated users to insert their own points_history
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can insert own points history"
  ON public.points_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Add sync metadata columns to user_points
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_points
  ADD COLUMN IF NOT EXISTS total_listening_ms BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_share_date DATE,
  ADD COLUMN IF NOT EXISTS last_bounty_date DATE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. User milestones — tracks listening achievement badges per user
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_milestones (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_ids  text[] NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own milestones"
  ON public.user_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own milestones"
  ON public.user_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones"
  ON public.user_milestones FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_milestones IS 'User milestone badges — replaces localStorage wccg_milestones';

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Bounties claimed — prevents double-claiming share/video/referral bonuses
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_bounties_claimed (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bounty_id     text NOT NULL,
  claimed_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bounty_id)
);

ALTER TABLE public.user_bounties_claimed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bounties"
  ON public.user_bounties_claimed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bounties"
  ON public.user_bounties_claimed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_bounties_claimed IS 'Tracks which bounties a user has claimed to prevent double-claiming across devices';

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Add program column to points_history (matches localStorage schema)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.points_history
  ADD COLUMN IF NOT EXISTS program text;
