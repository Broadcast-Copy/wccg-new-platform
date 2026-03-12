-- ============================================================================
-- User Data Tables — Move localStorage data to Supabase
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. LISTENING POINTS — User points balance & transaction history
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_points (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance       integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.points_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer NOT NULL,            -- positive = earned, negative = spent
  reason        text NOT NULL,               -- LISTENING, EVENT_CHECKIN, PURCHASE, REDEMPTION, etc.
  description   text,                        -- human-readable description
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_history_user
  ON public.points_history (user_id, created_at DESC);

-- RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages points"
  ON public.user_points FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own points history"
  ON public.points_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages points history"
  ON public.points_history FOR ALL
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. LISTENING HISTORY — User listening sessions & tracks heard
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listening_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_name     text NOT NULL DEFAULT 'WCCG 104.5 FM',
  title           text,                      -- last known song/show title
  artist          text,                      -- last known artist
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,               -- null = still active
  duration_secs   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_sessions_user
  ON public.listening_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.listening_tracks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.listening_sessions(id) ON DELETE CASCADE,
  title           text NOT NULL,
  artist          text NOT NULL,
  album_art       text,
  heard_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_tracks_session
  ON public.listening_tracks (session_id, heard_at DESC);

-- RLS
ALTER TABLE public.listening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own listening sessions"
  ON public.listening_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listening sessions"
  ON public.listening_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listening sessions"
  ON public.listening_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own listening tracks"
  ON public.listening_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listening_sessions ls
    WHERE ls.id = session_id AND ls.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert tracks to own sessions"
  ON public.listening_tracks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.listening_sessions ls
    WHERE ls.id = session_id AND ls.user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. FAVORITES — User saved shows, streams, content
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type     text NOT NULL,              -- 'show', 'stream', 'host', 'mix', 'podcast'
  item_id       text NOT NULL,              -- ID of the favorited item
  title         text,                       -- cached display title
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user
  ON public.user_favorites (user_id, created_at DESC);

-- RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. SUBMISSIONS — Creator submissions (podcast apps, music uploads, etc.)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL,               -- 'podcast', 'music', 'voiceover', 'booking', 'social', 'video', 'live'
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  data          jsonb NOT NULL DEFAULT '{}', -- form data specific to submission type
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user
  ON public.submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_type
  ON public.submissions (type, status);

-- RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON public.submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all submissions"
  ON public.submissions FOR SELECT
  USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. STUDIO PROJECTS — User studio projects (podcasts, mixes, video)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.studio_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL,               -- 'podcast', 'mix', 'video', 'audio'
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'draft', -- draft, published, archived
  data          jsonb NOT NULL DEFAULT '{}', -- project-specific data (episodes, files, settings)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_projects_user
  ON public.studio_projects (user_id, updated_at DESC);

-- RLS
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own studio projects"
  ON public.studio_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own studio projects"
  ON public.studio_projects FOR ALL
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. EVENT REGISTRATIONS / TICKETS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id      text NOT NULL,               -- ID of the event
  event_title   text,                        -- cached display title
  status        text NOT NULL DEFAULT 'registered', -- registered, attended, cancelled
  ticket_code   text,                        -- unique ticket/QR code
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user
  ON public.event_registrations (user_id, created_at DESC);

-- RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own registrations"
  ON public.event_registrations FOR UPDATE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- Comments
-- ──────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.user_points IS 'User points balance — replaces localStorage wccg_listening_points';
COMMENT ON TABLE public.points_history IS 'Points transaction log — earning and spending';
COMMENT ON TABLE public.listening_sessions IS 'User listening sessions — replaces localStorage wccg_listening_history';
COMMENT ON TABLE public.listening_tracks IS 'Tracks heard during a listening session';
COMMENT ON TABLE public.user_favorites IS 'User favorited shows/streams/content — replaces localStorage wccg_favorites';
COMMENT ON TABLE public.submissions IS 'Creator submissions (podcast apps, music, bookings) — replaces localStorage wccg-submissions';
COMMENT ON TABLE public.studio_projects IS 'Studio projects (podcast series, mixes, video) — replaces localStorage wccg_studio_projects';
COMMENT ON TABLE public.event_registrations IS 'User event registrations/tickets';
