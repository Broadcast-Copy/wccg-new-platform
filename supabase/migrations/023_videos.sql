-- ============================================================================
-- Migration 023: Videos (YouTube-style video wall)
-- ============================================================================
-- Creators publish videos from the studio; published videos appear on the
-- public /videos wall and play at /videos/:id. A video can be an uploaded
-- file (Supabase Storage) and/or linked to a YouTube video.

CREATE TABLE IF NOT EXISTS videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name    TEXT,                                  -- denormalized for display
  title           TEXT NOT NULL,
  description     TEXT,

  -- Source: uploaded file and/or external YouTube link
  storage_path    TEXT,                                  -- bucket-relative path (uploaded)
  video_url       TEXT,                                  -- public URL (uploaded or external)
  youtube_id      TEXT,                                  -- e.g. "dQw4w9WgXcQ"
  youtube_url     TEXT,

  thumbnail_url   TEXT,
  thumbnail_path  TEXT,
  duration_seconds INT,
  category        TEXT,
  tags            TEXT[] DEFAULT '{}',

  visibility      TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public','unlisted','private')),
  status          TEXT NOT NULL DEFAULT 'published'
                  CHECK (status IN ('draft','processing','published','removed')),

  views           BIGINT NOT NULL DEFAULT 0,
  likes           BIGINT NOT NULL DEFAULT 0,

  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(status, visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user      ON videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category  ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_search ON videos
  USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(creator_name,'')));

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Public can read published + public videos.
DROP POLICY IF EXISTS "Public read published videos" ON videos;
CREATE POLICY "Public read published videos" ON videos
  FOR SELECT USING (status = 'published' AND visibility IN ('public','unlisted'));

-- Creators read their own (any status).
DROP POLICY IF EXISTS "Creators read own videos" ON videos;
CREATE POLICY "Creators read own videos" ON videos
  FOR SELECT USING (user_id = auth.uid());

-- Creators insert / update / delete their own.
DROP POLICY IF EXISTS "Creators insert own videos" ON videos;
CREATE POLICY "Creators insert own videos" ON videos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Creators update own videos" ON videos;
CREATE POLICY "Creators update own videos" ON videos
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Creators delete own videos" ON videos;
CREATE POLICY "Creators delete own videos" ON videos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Admins manage everything.
DROP POLICY IF EXISTS "Admins manage videos" ON videos;
CREATE POLICY "Admins manage videos" ON videos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles ur
            WHERE ur.profile_id = auth.uid()
              AND ur.role_id IN ('admin','super_admin','management','role_admin'))
  );

-- View counter: callable by anyone (anon + authenticated) for published videos.
CREATE OR REPLACE FUNCTION public.increment_video_views(p_video_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.videos SET views = views + 1
  WHERE id = p_video_id AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_video_views(UUID) TO anon, authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.videos_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS videos_touch_updated_at ON videos;
CREATE TRIGGER videos_touch_updated_at
  BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION public.videos_touch_updated_at();
