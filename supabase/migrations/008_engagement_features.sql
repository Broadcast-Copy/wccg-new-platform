-- 008_engagement_features.sql
-- 11 new tables for engagement, gamification, social, location, and sponsorship features.
-- All tables use UUID PKs, user_id FK to auth.users, and RLS policies.

-- ============================================================================
-- 1. Song Requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art TEXT,
  is_priority BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'played', 'rejected')),
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all requests" ON public.song_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own requests" ON public.song_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own requests" ON public.song_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Keyword Contest Entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.keyword_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword_id TEXT NOT NULL,
  keyword_text TEXT NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.keyword_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own entries" ON public.keyword_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.keyword_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. Weekly Leaderboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  rank INTEGER,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.weekly_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leaderboard" ON public.weekly_leaderboard FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 4. Listener of the Week
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.listener_of_the_week (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  city TEXT,
  points_earned INTEGER DEFAULT 0,
  listening_hours NUMERIC(10,1) DEFAULT 0,
  quote TEXT,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.listener_of_the_week ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view listener of week" ON public.listener_of_the_week FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 5. User Playlists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  songs JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own playlists" ON public.user_playlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view public playlists" ON public.user_playlists FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Users can insert own playlists" ON public.user_playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON public.user_playlists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON public.user_playlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Chat Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL,
  show_id TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. Notification Preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_ids TEXT[] DEFAULT '{}',
  host_ids TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prefs" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prefs" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- 8. User Referrals
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.user_referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id);
CREATE POLICY "Users can insert own referrals" ON public.user_referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_user_id);

-- ============================================================================
-- 9. Birthday Club
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.birthday_club (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_month INTEGER NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_day INTEGER NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
  shoutout_requested BOOLEAN DEFAULT false,
  shoutout_name TEXT,
  last_awarded_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.birthday_club ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own birthday" ON public.birthday_club FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own birthday" ON public.birthday_club FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own birthday" ON public.birthday_club FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- 10. Event Check-Ins (Street Team)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own checkins" ON public.event_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.event_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 11. Deal Redemptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deal_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  deal_name TEXT NOT NULL,
  sponsor TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.deal_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own redemptions" ON public.deal_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON public.deal_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
