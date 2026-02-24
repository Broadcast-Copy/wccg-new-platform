-- WCCG 104.5 FM — Podcasts & Episodes Schema
-- Run in Supabase SQL Editor after 004_seed_directory_listings.sql

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE podcast_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE episode_status AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- ============================================================================
-- PODCAST SERIES
-- ============================================================================
CREATE TABLE podcast_series (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  category TEXT,                    -- e.g. 'News', 'Comedy', 'Culture', 'Music'
  language TEXT NOT NULL DEFAULT 'en',
  website_url TEXT,
  rss_url TEXT,                     -- auto-generated RSS feed URL
  is_explicit BOOLEAN NOT NULL DEFAULT false,
  status podcast_status NOT NULL DEFAULT 'DRAFT',
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  total_plays INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',  -- { "spotify": "...", "apple": "...", "youtube": "..." }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_podcast_series_creator ON podcast_series(creator_id);
CREATE INDEX idx_podcast_series_status ON podcast_series(status);
CREATE INDEX idx_podcast_series_slug ON podcast_series(slug);

-- ============================================================================
-- PODCAST EPISODES
-- ============================================================================
CREATE TABLE podcast_episodes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  series_id TEXT NOT NULL REFERENCES podcast_series(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  show_notes TEXT,                  -- rich text / markdown
  audio_url TEXT,
  audio_duration INTEGER,           -- seconds
  audio_file_size BIGINT,           -- bytes
  cover_image_url TEXT,             -- episode-specific cover (optional, falls back to series)
  episode_number INTEGER,
  season_number INTEGER DEFAULT 1,
  transcript TEXT,
  guest_names TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status episode_status NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  play_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, slug)
);

CREATE INDEX idx_podcast_episodes_series ON podcast_episodes(series_id);
CREATE INDEX idx_podcast_episodes_status ON podcast_episodes(status);
CREATE INDEX idx_podcast_episodes_published ON podcast_episodes(published_at DESC);

-- ============================================================================
-- PODCAST SUBSCRIPTIONS (listener follows a series)
-- ============================================================================
CREATE TABLE podcast_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  series_id TEXT NOT NULL REFERENCES podcast_series(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, series_id)
);

CREATE INDEX idx_podcast_subs_user ON podcast_subscriptions(user_id);
CREATE INDEX idx_podcast_subs_series ON podcast_subscriptions(series_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER set_updated_at_podcast_series
  BEFORE UPDATE ON podcast_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_podcast_episodes
  BEFORE UPDATE ON podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE podcast_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published podcast series are viewable" ON podcast_series
  FOR SELECT USING (status = 'ACTIVE' OR creator_id = auth.uid());
CREATE POLICY "Creators can insert own series" ON podcast_series
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own series" ON podcast_series
  FOR UPDATE USING (auth.uid() = creator_id);

ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published episodes are viewable" ON podcast_episodes
  FOR SELECT USING (
    status = 'PUBLISHED'
    OR EXISTS (
      SELECT 1 FROM podcast_series ps WHERE ps.id = series_id AND ps.creator_id = auth.uid()
    )
  );
CREATE POLICY "Creators can insert episodes" ON podcast_episodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM podcast_series ps WHERE ps.id = series_id AND ps.creator_id = auth.uid()
    )
  );
CREATE POLICY "Creators can update own episodes" ON podcast_episodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM podcast_series ps WHERE ps.id = series_id AND ps.creator_id = auth.uid()
    )
  );

ALTER TABLE podcast_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON podcast_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can subscribe" ON podcast_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsubscribe" ON podcast_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
