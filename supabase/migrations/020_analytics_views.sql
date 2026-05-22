-- ============================================================================
-- Migration 020: Analytics views
-- ============================================================================
-- Pre-aggregated views over the tables that have real data today:
--   - points_history (27k+ events)
--   - dj_drops (DJ portal uploads)
--   - record_pool_tracks, record_pool_downloads
--   - auth.users (signup curve)
--   - dj_drops_this_week (already exists, derived from dj_slots + dj_drops)
--
-- All views run with security_invoker=on so the caller's RLS applies
-- (anonymous gets nothing, authenticated gets aggregates).
-- Idempotent.

BEGIN;

-- ─── Engagement: events per day, last 90 days ────────────────────────────
DROP VIEW IF EXISTS analytics_engagement_daily CASCADE;
CREATE VIEW analytics_engagement_daily WITH (security_invoker = on) AS
SELECT
  (created_at AT TIME ZONE 'America/New_York')::date AS day,
  count(*)                                           AS events,
  count(DISTINCT user_id)                            AS active_users,
  sum(amount)                                        AS points_awarded
FROM public.points_history
WHERE created_at >= now() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1 DESC;

-- ─── Engagement: by reason (LISTENING / DAILY_BOUNTY / etc.) ────────────
DROP VIEW IF EXISTS analytics_engagement_by_reason CASCADE;
CREATE VIEW analytics_engagement_by_reason WITH (security_invoker = on) AS
SELECT
  reason,
  count(*)                                           AS events,
  count(DISTINCT user_id)                            AS users,
  sum(amount)                                        AS points,
  min(created_at)                                    AS first_seen,
  max(created_at)                                    AS last_seen
FROM public.points_history
WHERE created_at >= now() - INTERVAL '90 days'
GROUP BY reason
ORDER BY events DESC;

-- ─── Signup curve: new auth users per week, last 12 weeks ───────────────
DROP VIEW IF EXISTS analytics_signups_weekly CASCADE;
CREATE VIEW analytics_signups_weekly WITH (security_invoker = on) AS
SELECT
  date_trunc('week', (u.created_at AT TIME ZONE 'America/New_York'))::date AS week,
  count(*)                                                                  AS signups
FROM auth.users u
WHERE u.created_at >= now() - INTERVAL '12 weeks'
GROUP BY 1
ORDER BY 1 DESC;

-- ─── DJ portal activity: drops per DJ, last 4 weeks ─────────────────────
DROP VIEW IF EXISTS analytics_dj_activity_weekly CASCADE;
CREATE VIEW analytics_dj_activity_weekly WITH (security_invoker = on) AS
SELECT
  date_trunc('week', (d.uploaded_at AT TIME ZONE 'America/New_York'))::date AS week,
  d.dj_id,
  dj.display_name,
  dj.slug,
  count(*) FILTER (WHERE d.status IN ('uploaded','validated','published')) AS drops_count,
  sum(d.size_bytes) FILTER (WHERE d.status IN ('uploaded','validated','published')) AS total_bytes
FROM public.dj_drops d
JOIN public.djs dj ON dj.id = d.dj_id
WHERE d.uploaded_at >= now() - INTERVAL '4 weeks'
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, drops_count DESC;

-- ─── Record pool: uploads + downloads per week ──────────────────────────
DROP VIEW IF EXISTS analytics_pool_activity_weekly CASCADE;
CREATE VIEW analytics_pool_activity_weekly WITH (security_invoker = on) AS
WITH upload_weeks AS (
  SELECT date_trunc('week', (created_at AT TIME ZONE 'America/New_York'))::date AS week,
         count(*) AS uploads,
         count(*) FILTER (WHERE status='approved') AS uploads_approved
  FROM public.record_pool_tracks
  WHERE created_at >= now() - INTERVAL '12 weeks'
  GROUP BY 1
),
download_weeks AS (
  SELECT date_trunc('week', (created_at AT TIME ZONE 'America/New_York'))::date AS week,
         count(*) AS downloads,
         count(DISTINCT user_id) AS distinct_downloaders
  FROM public.record_pool_downloads
  WHERE created_at >= now() - INTERVAL '12 weeks'
  GROUP BY 1
)
SELECT
  COALESCE(u.week, d.week)             AS week,
  COALESCE(u.uploads, 0)               AS uploads,
  COALESCE(u.uploads_approved, 0)      AS uploads_approved,
  COALESCE(d.downloads, 0)             AS downloads,
  COALESCE(d.distinct_downloaders, 0)  AS distinct_downloaders
FROM upload_weeks u
FULL OUTER JOIN download_weeks d ON u.week = d.week
ORDER BY 1 DESC;

-- ─── Top tracks in the record pool by download count (all time) ─────────
DROP VIEW IF EXISTS analytics_pool_top_tracks CASCADE;
CREATE VIEW analytics_pool_top_tracks WITH (security_invoker = on) AS
SELECT
  t.id,
  t.title,
  t.artist,
  t.label_name,
  t.genre,
  t.download_count,
  t.play_count,
  t.created_at,
  t.uploader_type
FROM public.record_pool_tracks t
WHERE t.status = 'approved'
ORDER BY t.download_count DESC, t.created_at DESC
LIMIT 100;

-- ─── Overview: high-level counters powering the dashboard hero row ─────
DROP VIEW IF EXISTS analytics_overview CASCADE;
CREATE VIEW analytics_overview WITH (security_invoker = on) AS
SELECT
  -- Engagement
  (SELECT count(*) FROM public.points_history WHERE created_at >= now() - INTERVAL '24 hours')  AS events_24h,
  (SELECT count(*) FROM public.points_history WHERE created_at >= now() - INTERVAL '7 days')    AS events_7d,
  (SELECT count(*) FROM public.points_history WHERE created_at >= now() - INTERVAL '30 days')   AS events_30d,
  -- Active users
  (SELECT count(DISTINCT user_id) FROM public.points_history WHERE created_at >= now() - INTERVAL '24 hours') AS dau,
  (SELECT count(DISTINCT user_id) FROM public.points_history WHERE created_at >= now() - INTERVAL '7 days')   AS wau,
  (SELECT count(DISTINCT user_id) FROM public.points_history WHERE created_at >= now() - INTERVAL '30 days')  AS mau,
  -- Total signups
  (SELECT count(*) FROM auth.users)                                                              AS total_signups,
  (SELECT count(*) FROM auth.users WHERE created_at >= now() - INTERVAL '7 days')                AS signups_7d,
  -- Listening points awarded
  (SELECT coalesce(sum(amount), 0) FROM public.points_history WHERE created_at >= now() - INTERVAL '7 days') AS points_awarded_7d,
  -- DJ portal
  (SELECT count(*) FROM public.dj_drops WHERE uploaded_at >= now() - INTERVAL '7 days')          AS drops_uploaded_7d,
  (SELECT count(*) FROM public.dj_slots WHERE dj_id IS NULL)                                     AS slots_unassigned,
  -- Record pool
  (SELECT count(*) FROM public.record_pool_tracks WHERE status='approved')                       AS pool_tracks_approved,
  (SELECT count(*) FROM public.record_pool_tracks WHERE status='pending')                        AS pool_tracks_pending,
  (SELECT count(*) FROM public.record_pool_downloads WHERE created_at >= now() - INTERVAL '7 days') AS pool_downloads_7d;

COMMIT;
