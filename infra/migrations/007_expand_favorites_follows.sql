-- WCCG 104.5 FM — Expand Favorites & Add Follows System
-- Run in Supabase SQL Editor after 006_advertising.sql

-- ============================================================================
-- Expand favorite_target_type to include mixes, podcasts, hosts, episodes
-- ============================================================================
ALTER TYPE favorite_target_type ADD VALUE IF NOT EXISTS 'MIX';
ALTER TYPE favorite_target_type ADD VALUE IF NOT EXISTS 'PODCAST';
ALTER TYPE favorite_target_type ADD VALUE IF NOT EXISTS 'EPISODE';
ALTER TYPE favorite_target_type ADD VALUE IF NOT EXISTS 'HOST';

-- Add new FK columns to favorites for the expanded types
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS mix_id TEXT REFERENCES dj_mixes(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS podcast_series_id TEXT REFERENCES podcast_series(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS episode_id TEXT REFERENCES podcast_episodes(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS host_id TEXT REFERENCES hosts(id) ON DELETE CASCADE;

-- ============================================================================
-- FOLLOWS (user follows a creator/host/dj)
-- ============================================================================
CREATE TABLE follows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================================
-- CONTENT PLAYS (unified play tracking for mixes, episodes, etc.)
-- ============================================================================
CREATE TABLE content_plays (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,         -- 'mix', 'episode', 'track'
  content_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_listened INTEGER DEFAULT 0, -- seconds actually listened
  total_duration INTEGER,              -- total content duration
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_plays_content ON content_plays(content_type, content_id);
CREATE INDEX idx_content_plays_user ON content_plays(user_id);
CREATE INDEX idx_content_plays_date ON content_plays(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                 -- 'new_episode', 'event_reminder', 'points_earned', 'follow', 'content_approved'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                          -- deep link path, e.g. '/shows/streetz-morning'
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- CONTENT MODERATION QUEUE
-- ============================================================================
CREATE TABLE moderation_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content_type TEXT NOT NULL,         -- 'mix', 'episode', 'event', 'directory_claim'
  content_id TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  reviewer_id UUID REFERENCES profiles(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_queue_status ON moderation_queue(status, created_at);
CREATE INDEX idx_moderation_queue_type ON moderation_queue(content_type, status);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,               -- 'user.create', 'mix.approve', 'campaign.activate', etc.
  resource_type TEXT NOT NULL,        -- 'user', 'mix', 'campaign', 'event', etc.
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER set_updated_at_moderation_queue
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

ALTER TABLE content_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plays" ON content_plays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can record a play" ON content_plays FOR INSERT WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own as read" ON notifications FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submitters view own submissions" ON moderation_queue
  FOR SELECT USING (auth.uid() = submitted_by);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Audit log: no public access, admin-only via service role key
