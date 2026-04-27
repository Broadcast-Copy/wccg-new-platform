-- ============================================================================
-- DJ Portal — schema for scheduled mix-show drops + FTP accounts
-- ============================================================================
-- Distinct from `dj_mixes` (general creator uploads). This set powers the
-- weekly drop schedule that feeds the automation software (Centova/Rivendell/
-- etc.) via FTP.
--
-- Apply in Supabase SQL Editor. Idempotent.

-- ─── Core tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS djs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- linked Supabase user (login)
  host_id TEXT REFERENCES hosts(id) ON DELETE SET NULL,    -- if this DJ also hosts a show
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_djs_active ON djs(is_active);

-- A "slot" = one DJ's recurring weekly day-part (e.g. "DJ IKE GDA, Mon 12pm").
-- Each slot has an ORDERED list of expected file codes (segment 1 of 2, etc.).
CREATE TABLE IF NOT EXISTS dj_slots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dj_id TEXT NOT NULL REFERENCES djs(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun..6=Sat
  start_time TEXT NOT NULL,                                            -- "HH:mm" 24h
  end_time TEXT NOT NULL,
  file_codes TEXT[] NOT NULL,                                          -- ['DJB_76051','DJB_76052']
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','tentative','inactive')),               -- maps your -x/-?/-?? markers
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week, start_time, dj_id)
);

CREATE INDEX IF NOT EXISTS idx_dj_slots_dj ON dj_slots(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_slots_day ON dj_slots(day_of_week, start_time);

-- A "drop" = a specific weekly upload of a specific file code.
-- One drop per (slot, file_code, week_of).
CREATE TABLE IF NOT EXISTS dj_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id TEXT NOT NULL REFERENCES djs(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL REFERENCES dj_slots(id) ON DELETE CASCADE,
  file_code TEXT NOT NULL,                                             -- e.g. 'DJB_76051'
  week_of DATE NOT NULL,                                               -- ISO Monday of the week
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','uploaded','validated','published','rejected')),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web','ftp')),
  storage_path TEXT,                                                   -- Supabase Storage path
  duration_seconds INT,
  size_bytes BIGINT,
  sample_rate INT,
  bitrate_kbps INT,
  format TEXT,                                                         -- 'mp3','wav','flac'
  checksum_sha256 TEXT,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, file_code, week_of)
);

CREATE INDEX IF NOT EXISTS idx_dj_drops_dj ON dj_drops(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_drops_slot ON dj_drops(slot_id, week_of);
CREATE INDEX IF NOT EXISTS idx_dj_drops_status ON dj_drops(status);
CREATE INDEX IF NOT EXISTS idx_dj_drops_week ON dj_drops(week_of, status);
CREATE INDEX IF NOT EXISTS idx_dj_drops_filecode ON dj_drops(file_code);

ALTER TABLE dj_drops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DJs read own drops" ON dj_drops;
CREATE POLICY "DJs read own drops" ON dj_drops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM djs WHERE djs.id = dj_drops.dj_id AND djs.user_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- ─── FTP accounts (one per DJ, plus an automation-export account) ─────────
-- password_hash uses bcrypt; FTP server verifies on connect.
CREATE TABLE IF NOT EXISTS dj_ftp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'dj' CHECK (role IN ('dj','automation','admin')),
  dj_id TEXT REFERENCES djs(id) ON DELETE CASCADE,                     -- null for automation/admin
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                       -- last password rotation
  last_login_at TIMESTAMPTZ,
  last_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dj_ftp_role ON dj_ftp_accounts(role);

-- ─── Audit log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dj_ftp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  ip TEXT,
  action TEXT NOT NULL,                                                -- 'login','login_fail','put','get','list','disconnect'
  path TEXT,
  bytes BIGINT,
  ok BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dj_ftp_log_user ON dj_ftp_log(username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dj_ftp_log_ts ON dj_ftp_log(created_at DESC);

-- ─── Helper view: this-week drops + missing files ────────────────────────
CREATE OR REPLACE VIEW dj_drops_this_week AS
WITH this_week AS (
  -- ISO Monday of the current week in ET
  SELECT date_trunc('week', (now() AT TIME ZONE 'America/New_York'))::date AS week_of
),
expected AS (
  SELECT
    s.id AS slot_id,
    s.dj_id,
    d.display_name AS dj_name,
    d.slug AS dj_slug,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.status AS slot_status,
    unnest(s.file_codes) AS file_code,
    tw.week_of
  FROM dj_slots s
  JOIN djs d ON d.id = s.dj_id
  CROSS JOIN this_week tw
  WHERE s.status IN ('active','tentative')
)
SELECT
  e.slot_id, e.dj_id, e.dj_name, e.dj_slug,
  e.day_of_week, e.start_time, e.end_time, e.slot_status,
  e.file_code, e.week_of,
  COALESCE(dd.status, 'pending') AS drop_status,
  dd.uploaded_at,
  dd.storage_path,
  dd.source
FROM expected e
LEFT JOIN dj_drops dd
  ON dd.slot_id = e.slot_id
  AND dd.file_code = e.file_code
  AND dd.week_of = e.week_of;
