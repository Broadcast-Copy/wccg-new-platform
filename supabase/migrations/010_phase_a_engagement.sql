-- ============================================================================
-- Phase A migrations — server-side ledger sync, leaderboard, push, newsletter
-- ============================================================================
-- Owner: WCCG Platform v2 / Phase A tickets A2, A5, A6, A8
-- Apply via Supabase SQL Editor.
-- All statements are idempotent (IF NOT EXISTS / DO blocks) so re-running is safe.

-- ─── A2: Idempotency + extra reason values for client-driven sync ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'DAILY_BOUNTY') THEN
    ALTER TYPE points_reason ADD VALUE 'DAILY_BOUNTY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'STREAK_BONUS') THEN
    ALTER TYPE points_reason ADD VALUE 'STREAK_BONUS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'SHARE') THEN
    ALTER TYPE points_reason ADD VALUE 'SHARE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'REFERRAL') THEN
    ALTER TYPE points_reason ADD VALUE 'REFERRAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'VIDEO_WATCH') THEN
    ALTER TYPE points_reason ADD VALUE 'VIDEO_WATCH';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'KEYWORD_ENTRY') THEN
    ALTER TYPE points_reason ADD VALUE 'KEYWORD_ENTRY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'NEWSLETTER') THEN
    ALTER TYPE points_reason ADD VALUE 'NEWSLETTER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'PUSH_OPTIN') THEN
    ALTER TYPE points_reason ADD VALUE 'PUSH_OPTIN';
  END IF;
END$$;

-- Idempotency key on points_ledger so the client outbox can be retried safely.
ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_user_idem_uniq
  ON points_ledger(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- For leaderboard period scans.
CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at
  ON points_ledger(created_at);

-- Daily-cap counter so server can rate-limit per reason per day.
CREATE TABLE IF NOT EXISTS points_daily_caps (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, reason)
);

-- ─── A5: Leaderboard view ──────────────────────────────────────────────────
-- Materialized for performance; refreshed by a cron / API call.
-- For MVP we use a view; Phase B can convert to materialized + pg_cron refresh.
CREATE OR REPLACE VIEW points_weekly_leaderboard AS
SELECT
  user_id,
  SUM(amount) FILTER (WHERE amount > 0)::INTEGER AS points_earned,
  COUNT(*) FILTER (WHERE amount > 0)::INTEGER AS events
FROM points_ledger
WHERE created_at >= date_trunc('week', now())
GROUP BY user_id
ORDER BY points_earned DESC NULLS LAST;

CREATE OR REPLACE VIEW points_monthly_leaderboard AS
SELECT
  user_id,
  SUM(amount) FILTER (WHERE amount > 0)::INTEGER AS points_earned,
  COUNT(*) FILTER (WHERE amount > 0)::INTEGER AS events
FROM points_ledger
WHERE created_at >= date_trunc('month', now())
GROUP BY user_id
ORDER BY points_earned DESC NULLS LAST;

CREATE OR REPLACE VIEW points_alltime_leaderboard AS
SELECT
  user_id,
  SUM(amount) FILTER (WHERE amount > 0)::INTEGER AS points_earned,
  COUNT(*) FILTER (WHERE amount > 0)::INTEGER AS events
FROM points_ledger
GROUP BY user_id
ORDER BY points_earned DESC NULLS LAST;

-- ─── A6: Push subscriptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subs" ON push_subscriptions;
CREATE POLICY "Users manage own push subs"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── A8: Newsletter subscribers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'unsubscribed'
  confirmation_token TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);

-- citext extension required for case-insensitive email uniqueness
CREATE EXTENSION IF NOT EXISTS citext;

-- ─── Streak helper view (A4) ───────────────────────────────────────────────
-- Computes the current consecutive-day listening streak for each user.
CREATE OR REPLACE VIEW user_listening_streaks AS
WITH days AS (
  SELECT
    user_id,
    (created_at AT TIME ZONE 'America/New_York')::date AS listen_day
  FROM points_ledger
  WHERE reason = 'LISTENING'
  GROUP BY user_id, (created_at AT TIME ZONE 'America/New_York')::date
),
streak_calc AS (
  SELECT
    user_id,
    listen_day,
    listen_day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY listen_day))::INTEGER AS streak_group
  FROM days
)
SELECT
  user_id,
  COUNT(*) AS streak_days,
  MIN(listen_day) AS streak_started,
  MAX(listen_day) AS streak_last
FROM streak_calc
WHERE streak_group = (
  SELECT streak_group
  FROM streak_calc s2
  WHERE s2.user_id = streak_calc.user_id
  ORDER BY listen_day DESC
  LIMIT 1
)
GROUP BY user_id;

COMMENT ON VIEW user_listening_streaks IS
  'Current consecutive-day listening streak per user, in ET. Streak counts only days with at least one LISTENING ledger entry.';
