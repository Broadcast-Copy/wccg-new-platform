-- ============================================================================
-- Migration 016: Record Pool
-- ============================================================================
-- A shared library of tracks uploaded by DJs and record labels. DJs download
-- tracks for their mixes; labels promote new releases to the WCCG DJ pool.
--
-- Storage: Supabase Storage bucket `record-pool` (private; signed-URL reads).
-- Upload metadata is auto-filled from ID3 tags on the server when possible;
-- the audio-fingerprinting (ACRCloud / Shazam-style) integration is gated
-- behind future env wiring (table fields are reserved here).
--
-- Idempotent.

BEGIN;

-- ─── Record labels ───────────────────────────────────────────────────────
-- Verified labels get an auto-approve flag on uploads. v1 keeps labels
-- claimable by a single user; we can move to multi-user labels later.
CREATE TABLE IF NOT EXISTS record_pool_labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  contact_email   TEXT,
  website         TEXT,
  logo_url        TEXT,
  bio             TEXT,
  verified        BOOLEAN NOT NULL DEFAULT false,
  auto_approve    BOOLEAN NOT NULL DEFAULT false,  -- skips moderation queue
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_record_pool_labels_owner    ON record_pool_labels(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_record_pool_labels_verified ON record_pool_labels(verified);

-- ─── Tracks ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS record_pool_tracks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_type   TEXT NOT NULL CHECK (uploader_type IN ('dj','label','admin')),
  dj_id           TEXT REFERENCES djs(id) ON DELETE SET NULL,
  label_id        UUID REFERENCES record_pool_labels(id) ON DELETE SET NULL,

  -- Core metadata (auto-extracted from ID3 where possible; user-editable).
  title           TEXT NOT NULL,
  artist          TEXT NOT NULL,
  remix_artist    TEXT,                          -- feat. / vs. / remixed by
  label_name      TEXT,                          -- free-form when label_id is null
  album           TEXT,
  genre           TEXT,
  subgenre        TEXT,
  bpm             NUMERIC(5,2),
  musical_key     TEXT,                          -- "8A", "Cm", Camelot or musical notation
  release_year    SMALLINT,
  release_date    DATE,
  version         TEXT CHECK (version IS NULL OR version IN
                              ('Clean','Dirty','Instrumental','Acapella','Radio Edit',
                               'Extended','Intro','Outro','Quick Hit','Short Edit',
                               'Original','Remix','Other')),
  duration_seconds INT,
  isrc            TEXT,
  artwork_url     TEXT,

  -- Storage
  storage_path    TEXT NOT NULL,                 -- bucket-relative path
  size_bytes      BIGINT,
  format          TEXT,                          -- 'mp3','wav','flac','aiff','m4a'
  bitrate_kbps    INT,
  sample_rate     INT,
  checksum_sha256 TEXT,

  -- Auto-identification (placeholders for ACRCloud/Shazam-style integration).
  fingerprint_id  TEXT,
  identified_at   TIMESTAMPTZ,
  identify_source TEXT,                          -- 'id3','acrcloud','shazam','serato','manual'
  confidence      NUMERIC(4,3),                  -- 0..1

  -- Moderation
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','removed')),
  rejection_reason TEXT,
  approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,

  -- Engagement counters (updated by triggers / API).
  download_count  INT NOT NULL DEFAULT 0,
  play_count      INT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_status   ON record_pool_tracks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_uploader ON record_pool_tracks(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_dj       ON record_pool_tracks(dj_id);
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_label    ON record_pool_tracks(label_id);
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_genre    ON record_pool_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_bpm      ON record_pool_tracks(bpm);
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_release  ON record_pool_tracks(release_date DESC);

-- Full-text search across title + artist + label + remix credit
CREATE INDEX IF NOT EXISTS idx_record_pool_tracks_search ON record_pool_tracks
  USING GIN (to_tsvector('simple',
    coalesce(title,'')        || ' ' ||
    coalesce(artist,'')       || ' ' ||
    coalesce(remix_artist,'') || ' ' ||
    coalesce(label_name,'')   || ' ' ||
    coalesce(album,'')
  ));

-- ─── Downloads log (for play_count / download_count and per-user history) ─
CREATE TABLE IF NOT EXISTS record_pool_downloads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    UUID NOT NULL REFERENCES record_pool_tracks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dj_id       TEXT REFERENCES djs(id) ON DELETE SET NULL,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_record_pool_downloads_track ON record_pool_downloads(track_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_pool_downloads_user  ON record_pool_downloads(user_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE record_pool_tracks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_pool_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_pool_labels    ENABLE ROW LEVEL SECURITY;

-- A "DJ user" is anyone whose auth uid maps to a djs.user_id.
-- DJs see approved tracks.
DROP POLICY IF EXISTS "DJs read approved tracks" ON record_pool_tracks;
CREATE POLICY "DJs read approved tracks" ON record_pool_tracks
  FOR SELECT USING (
    status = 'approved'
    AND EXISTS (SELECT 1 FROM djs WHERE djs.user_id = auth.uid())
  );

-- Uploaders always see their own tracks (any status).
DROP POLICY IF EXISTS "Uploaders read own tracks" ON record_pool_tracks;
CREATE POLICY "Uploaders read own tracks" ON record_pool_tracks
  FOR SELECT USING (uploaded_by = auth.uid());

-- Uploaders can insert under their own uid.
DROP POLICY IF EXISTS "Uploaders insert" ON record_pool_tracks;
CREATE POLICY "Uploaders insert" ON record_pool_tracks
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Uploaders can edit metadata on their own *pending* tracks only.
DROP POLICY IF EXISTS "Uploaders update own pending" ON record_pool_tracks;
CREATE POLICY "Uploaders update own pending" ON record_pool_tracks
  FOR UPDATE USING (uploaded_by = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Service role manages tracks" ON record_pool_tracks;
CREATE POLICY "Service role manages tracks" ON record_pool_tracks
  FOR ALL USING (auth.role() = 'service_role');

-- Downloads: a user reads their own history; service role writes.
DROP POLICY IF EXISTS "Users read own downloads" ON record_pool_downloads;
CREATE POLICY "Users read own downloads" ON record_pool_downloads
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Service role manages downloads" ON record_pool_downloads;
CREATE POLICY "Service role manages downloads" ON record_pool_downloads
  FOR ALL USING (auth.role() = 'service_role');

-- Labels: public read; owners can edit their own row; service role manages.
DROP POLICY IF EXISTS "Labels readable" ON record_pool_labels;
CREATE POLICY "Labels readable" ON record_pool_labels
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Label owners write" ON record_pool_labels;
CREATE POLICY "Label owners write" ON record_pool_labels
  FOR UPDATE USING (owner_user_id = auth.uid());
DROP POLICY IF EXISTS "Service role manages labels" ON record_pool_labels;
CREATE POLICY "Service role manages labels" ON record_pool_labels
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Storage bucket policy ───────────────────────────────────────────────
-- Bucket `record-pool` must be created manually in Supabase Storage as
-- PRIVATE. Uploads are scoped to the user's own folder; reads happen via
-- service-role-issued signed URLs (no anonymous reads).
--
-- Storage path convention:
--   record-pool/<auth_uid>/<track_uuid>.<ext>

DROP POLICY IF EXISTS "Record pool: user uploads to own folder" ON storage.objects;
CREATE POLICY "Record pool: user uploads to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'record-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Record pool: user updates own files" ON storage.objects;
CREATE POLICY "Record pool: user updates own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'record-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Record pool: user deletes own files" ON storage.objects;
CREATE POLICY "Record pool: user deletes own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'record-pool'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Trigger: bump updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_pool_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS record_pool_tracks_touch_updated_at ON record_pool_tracks;
CREATE TRIGGER record_pool_tracks_touch_updated_at
  BEFORE UPDATE ON record_pool_tracks
  FOR EACH ROW EXECUTE FUNCTION record_pool_touch_updated_at();

DROP TRIGGER IF EXISTS record_pool_labels_touch_updated_at ON record_pool_labels;
CREATE TRIGGER record_pool_labels_touch_updated_at
  BEFORE UPDATE ON record_pool_labels
  FOR EACH ROW EXECUTE FUNCTION record_pool_touch_updated_at();

COMMIT;

-- ─── Manual follow-ups (run in Supabase dashboard) ───────────────────────
--   1. Storage → New bucket → name: record-pool, public: OFF.
--   2. Optional: seed verified labels you trust as `auto_approve=true`.
