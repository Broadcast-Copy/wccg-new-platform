-- ============================================================================
-- Migration 017: Master Control + EAS Logbook
-- ============================================================================
-- Operator-facing surfaces:
--   - mcr_state                — singleton row holding the current on-air
--                                snapshot (now playing, current DJ, last
--                                update). Updated by the metadata-poll worker
--                                and DJ portal manual overrides.
--   - eas_alerts               — every EAS event the station originates OR
--                                receives. FCC-grade log: append-only by
--                                convention (no DELETE policy).
--   - eas_test_schedule        — calendar of required weekly + monthly tests
--                                (RWT/RMT) the operator must run on-air.
-- Idempotent.

BEGIN;

-- ─── Master-control singleton ─────────────────────────────────────────────
-- One row, id = 1. We use a CHECK to enforce singleton (Postgres has no
-- native "single row" type). Updates from anywhere are fine; reads are
-- public-ish (any logged-in user can read; non-auth gets it via the public
-- /on-air endpoint).
CREATE TABLE IF NOT EXISTS mcr_state (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- What's playing right now
  now_playing_title   TEXT,
  now_playing_artist  TEXT,
  now_playing_album   TEXT,
  now_playing_art_url TEXT,
  now_playing_started_at TIMESTAMPTZ,
  now_playing_source  TEXT,                          -- 'icecast','manual','automation','live'
  -- Current show / DJ
  current_show_title  TEXT,
  current_dj_id       TEXT REFERENCES djs(id) ON DELETE SET NULL,
  current_dj_slug     TEXT,                          -- cached for fast reads
  -- Signal status
  signal_status       TEXT NOT NULL DEFAULT 'unknown'
                      CHECK (signal_status IN ('on_air','silent','off_air','unknown')),
  listeners           INT,
  bitrate_kbps        INT,
  -- Health pings
  last_metadata_at    TIMESTAMPTZ,
  last_audio_at       TIMESTAMPTZ,
  last_eas_at         TIMESTAMPTZ,
  -- Generic notes for the operator
  operator_note       TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single row if missing.
INSERT INTO mcr_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE mcr_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "MCR state readable" ON mcr_state;
CREATE POLICY "MCR state readable" ON mcr_state
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "MCR state service write" ON mcr_state;
CREATE POLICY "MCR state service write" ON mcr_state
  FOR ALL USING (auth.role() = 'service_role');

-- ─── EAS alerts ───────────────────────────────────────────────────────────
-- Captures both alerts the station ORIGINATES (sent_at populated, originator
-- = 'WCCG') and alerts the station RECEIVES from upstream sources (NWS,
-- state, county, PEP via SAME radio). For FCC inspection the operator just
-- prints a date range from /my/admin/eas.
CREATE TABLE IF NOT EXISTS eas_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Direction
  direction     TEXT NOT NULL CHECK (direction IN ('received','originated','test')),

  -- SAME / EAS classification
  same_code     TEXT,                         -- e.g. 'RWT','RMT','TOR','SVR','EAN','EAS'
  event_label   TEXT NOT NULL,                -- human-readable: "Tornado Warning", "Required Weekly Test"
  severity      TEXT NOT NULL DEFAULT 'minor'
                CHECK (severity IN ('minor','moderate','severe','extreme','test')),
  originator    TEXT,                         -- 'NWS','EAS','CIV','PEP','WCCG'
  fips_codes    TEXT[] DEFAULT '{}',          -- ['037051','037067', ...] for affected counties

  -- Timing
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at   TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  aired_for_seconds INT,

  -- Audio + text payload
  message_text  TEXT,
  audio_url     TEXT,                         -- URL to recorded/synthesized EAS message
  raw_same_burst TEXT,                        -- SAME burst payload if captured

  -- Provenance
  source        TEXT,                         -- 'sage_endec','trilithic','manual','test_schedule'
  test_schedule_id UUID,                      -- FK below — set if this is a scheduled test event
  logged_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eas_alerts_issued   ON eas_alerts(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_eas_alerts_dir      ON eas_alerts(direction, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_eas_alerts_code     ON eas_alerts(same_code);

ALTER TABLE eas_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "EAS readable" ON eas_alerts;
CREATE POLICY "EAS readable" ON eas_alerts
  FOR SELECT USING (auth.role() IN ('service_role','authenticated'));
DROP POLICY IF EXISTS "EAS service write" ON eas_alerts;
CREATE POLICY "EAS service write" ON eas_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Required test schedule ──────────────────────────────────────────────
-- FCC requires:
--   - RWT: Required Weekly Test, must air weekly at random varied times
--   - RMT: Required Monthly Test, originated by the state EOC and relayed
-- We seed an upcoming-test calendar so the operator sees what's due. Each
-- row gets a corresponding eas_alerts row once completed.
CREATE TABLE IF NOT EXISTS eas_test_schedule (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           TEXT NOT NULL CHECK (kind IN ('RWT','RMT')),
  scheduled_for  TIMESTAMPTZ NOT NULL,
  completed_at   TIMESTAMPTZ,
  alert_id       UUID REFERENCES eas_alerts(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eas_test_schedule_pending
  ON eas_test_schedule(scheduled_for) WHERE completed_at IS NULL;

ALTER TABLE eas_test_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "EAS schedule readable" ON eas_test_schedule;
CREATE POLICY "EAS schedule readable" ON eas_test_schedule
  FOR SELECT USING (auth.role() IN ('service_role','authenticated'));
DROP POLICY IF EXISTS "EAS schedule service write" ON eas_test_schedule;
CREATE POLICY "EAS schedule service write" ON eas_test_schedule
  FOR ALL USING (auth.role() = 'service_role');

-- FK back-reference (was forward-declared above on eas_alerts.test_schedule_id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eas_alerts_test_schedule_fk'
  ) THEN
    ALTER TABLE eas_alerts
      ADD CONSTRAINT eas_alerts_test_schedule_fk
      FOREIGN KEY (test_schedule_id) REFERENCES eas_test_schedule(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Seed: next 12 weeks of RWT placeholders ─────────────────────────────
-- The operator can shift these as needed; goal is just to have them on the
-- calendar so nothing slips. Each RWT is scheduled for Wed @ 10:00 ET by
-- default — operator should vary actual run times for FCC compliance.
INSERT INTO eas_test_schedule (kind, scheduled_for, notes)
SELECT 'RWT',
       date_trunc('week', now() AT TIME ZONE 'America/New_York')::date
         + INTERVAL '1 day' * 2          -- Mon→Wed
         + INTERVAL '1 week' * gs
         + INTERVAL '10 hours',
       'Auto-scheduled. Vary the actual on-air time for FCC compliance.'
FROM generate_series(0, 11) gs
WHERE NOT EXISTS (
  SELECT 1 FROM eas_test_schedule
  WHERE kind = 'RWT'
    AND scheduled_for >=
        date_trunc('week', now() AT TIME ZONE 'America/New_York')::date
          + INTERVAL '1 day' * 2
          + INTERVAL '1 week' * gs
          + INTERVAL '10 hours'
    AND scheduled_for <
        date_trunc('week', now() AT TIME ZONE 'America/New_York')::date
          + INTERVAL '1 day' * 2
          + INTERVAL '1 week' * (gs + 1)
          + INTERVAL '10 hours'
);

-- ─── Helper view: MCR dashboard payload ──────────────────────────────────
CREATE OR REPLACE VIEW mcr_dashboard AS
SELECT
  s.*,
  (SELECT count(*) FROM eas_alerts
     WHERE issued_at >= now() - INTERVAL '30 days')                          AS eas_last_30d,
  (SELECT count(*) FROM eas_test_schedule
     WHERE completed_at IS NULL AND scheduled_for <= now() + INTERVAL '7 days') AS tests_due_7d,
  (SELECT count(*) FROM dj_drops
     WHERE status IN ('uploaded','validated')
       AND uploaded_at >= now() - INTERVAL '24 hours')                        AS drops_last_24h,
  (SELECT count(*) FROM dj_slots WHERE dj_id IS NULL)                         AS slots_unassigned,
  (SELECT count(*) FROM record_pool_tracks WHERE status = 'pending')          AS pool_pending
FROM mcr_state s;

COMMIT;
