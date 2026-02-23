-- ============================================================================
-- Migration: dj_mixes table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enum for mix status
DO $$ BEGIN
  CREATE TYPE mix_status AS ENUM ('PROCESSING', 'PUBLISHED', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DJ Mixes table
CREATE TABLE IF NOT EXISTS dj_mixes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration INT,
  genre TEXT,
  tags TEXT[],
  play_count INT DEFAULT 0,
  status mix_status DEFAULT 'PROCESSING',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_mixes_host ON dj_mixes(host_id);
CREATE INDEX IF NOT EXISTS idx_dj_mixes_uploader ON dj_mixes(uploader_id);
CREATE INDEX IF NOT EXISTS idx_dj_mixes_status ON dj_mixes(status);
CREATE INDEX IF NOT EXISTS idx_dj_mixes_genre ON dj_mixes(genre);

-- RLS
ALTER TABLE dj_mixes ENABLE ROW LEVEL SECURITY;

-- Public can read published mixes
CREATE POLICY "Anyone can view published mixes"
  ON dj_mixes FOR SELECT
  USING (status = 'PUBLISHED');

-- Authenticated hosts can insert mixes
CREATE POLICY "Hosts can create mixes"
  ON dj_mixes FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid());

-- Uploaders can update their own mixes
CREATE POLICY "Uploaders can update their mixes"
  ON dj_mixes FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid());

-- Uploaders can delete their own mixes
CREATE POLICY "Uploaders can delete their mixes"
  ON dj_mixes FOR DELETE
  TO authenticated
  USING (uploader_id = auth.uid());
