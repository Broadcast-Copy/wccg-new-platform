-- WCCG 104.5 FM Digital Platform — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================================================
-- Enable extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE stream_category AS ENUM (
  'MAIN', 'GOSPEL', 'HIP_HOP', 'RNB', 'JAZZ', 'TALK', 'SPORTS', 'COMMUNITY'
);

CREATE TYPE stream_status AS ENUM (
  'ACTIVE', 'INACTIVE', 'MAINTENANCE'
);

CREATE TYPE favorite_target_type AS ENUM (
  'STREAM', 'SHOW'
);

CREATE TYPE points_reason AS ENUM (
  'LISTENING', 'EVENT_CHECKIN', 'PURCHASE', 'REDEMPTION', 'ADMIN_GRANT', 'SIGNUP'
);

CREATE TYPE points_trigger_type AS ENUM (
  'LISTEN_MINUTES', 'EVENT_ATTENDANCE', 'PURCHASE', 'SIGNUP'
);

CREATE TYPE event_status AS ENUM (
  'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'
);

CREATE TYPE event_visibility AS ENUM (
  'PUBLIC', 'PRIVATE', 'INVITE_ONLY'
);

CREATE TYPE registration_status AS ENUM (
  'CONFIRMED', 'CANCELLED', 'CHECKED_IN'
);

CREATE TYPE organizer_role AS ENUM (
  'OWNER', 'COHOST', 'STAFF'
);

-- ============================================================================
-- PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ROLES & PERMISSIONS (RBAC)
-- ============================================================================
CREATE TABLE roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, role_id)
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- STREAMS
-- ============================================================================
CREATE TABLE streams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category stream_category NOT NULL DEFAULT 'MAIN',
  status stream_status NOT NULL DEFAULT 'ACTIVE',
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stream_sources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stream_id TEXT NOT NULL UNIQUE REFERENCES streams(id) ON DELETE CASCADE,
  primary_url TEXT,
  fallback_url TEXT,
  mount_point TEXT,
  format TEXT DEFAULT 'audio/mpeg',
  bitrate INTEGER DEFAULT 128,
  centova_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stream_metadata (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stream_id TEXT NOT NULL UNIQUE REFERENCES streams(id) ON DELETE CASCADE,
  current_title TEXT,
  current_artist TEXT,
  current_track TEXT,
  album_art TEXT,
  listener_count INTEGER DEFAULT 0,
  is_live BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SHOWS & HOSTS
-- ============================================================================
CREATE TABLE shows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hosts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE show_hosts (
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (show_id, host_id)
);

CREATE TABLE show_episodes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  air_date TIMESTAMPTZ,
  duration INTEGER,
  audio_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SCHEDULE
-- ============================================================================
CREATE TABLE schedule_blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  show_id TEXT REFERENCES shows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,  -- "HH:mm" format
  end_time TEXT NOT NULL,    -- "HH:mm" format
  is_override BOOLEAN NOT NULL DEFAULT false,
  override_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_blocks_stream ON schedule_blocks(stream_id);
CREATE INDEX idx_schedule_blocks_day ON schedule_blocks(day_of_week);
CREATE INDEX idx_schedule_blocks_override ON schedule_blocks(is_override, override_date);

-- ============================================================================
-- FAVORITES & LISTENING HISTORY
-- ============================================================================
CREATE TABLE favorites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type favorite_target_type NOT NULL,
  stream_id TEXT REFERENCES streams(id) ON DELETE CASCADE,
  show_id TEXT REFERENCES shows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, stream_id, show_id)
);

CREATE TABLE listening_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listening_history_user ON listening_history(user_id);
CREATE INDEX idx_listening_history_stream ON listening_history(stream_id);

-- ============================================================================
-- POINTS & REWARDS (Listen & Earn)
-- ============================================================================
CREATE TABLE points_ledger (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason points_reason NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_ledger_user ON points_ledger(user_id);

CREATE TABLE points_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  trigger_type points_trigger_type NOT NULL,
  points_amount INTEGER NOT NULL,
  threshold INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reward_catalog (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INTEGER NOT NULL,
  category TEXT,
  stock_count INTEGER DEFAULT -1,  -- -1 means unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- EVENTS (Eventbrite-style)
-- ============================================================================
CREATE TABLE events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  banner_url TEXT,
  venue TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  category TEXT,
  status event_status NOT NULL DEFAULT 'DRAFT',
  visibility event_visibility NOT NULL DEFAULT 'PUBLIC',
  max_attendees INTEGER,
  is_free BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_creator ON events(creator_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);

CREATE TABLE ticket_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_type_id TEXT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  status registration_status NOT NULL DEFAULT 'CONFIRMED',
  qr_code TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);

CREATE TABLE event_organizers (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role organizer_role NOT NULL DEFAULT 'STAFF',
  PRIMARY KEY (event_id, user_id)
);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_streams BEFORE UPDATE ON streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_stream_sources BEFORE UPDATE ON stream_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shows BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_hosts BEFORE UPDATE ON hosts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_show_episodes BEFORE UPDATE ON show_episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_schedule_blocks BEFORE UPDATE ON schedule_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_points_rules BEFORE UPDATE ON points_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_reward_catalog BEFORE UPDATE ON reward_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_ticket_types BEFORE UPDATE ON ticket_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUTO-CREATE PROFILE ON AUTH.USERS INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (basic policies)
-- ============================================================================

-- Profiles: users can read all, update own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Streams: public read
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streams are viewable by everyone" ON streams FOR SELECT USING (true);

-- Shows: public read
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shows are viewable by everyone" ON shows FOR SELECT USING (true);

-- Hosts: public read
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts are viewable by everyone" ON hosts FOR SELECT USING (true);

-- Schedule: public read
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedule is viewable by everyone" ON schedule_blocks FOR SELECT USING (true);

-- Events: public published events viewable
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published events are viewable" ON events FOR SELECT USING (status = 'PUBLISHED' OR creator_id = auth.uid());
CREATE POLICY "Users can create events" ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own events" ON events FOR UPDATE USING (auth.uid() = creator_id);

-- Favorites: users manage own
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Points: users view own
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON points_ledger FOR SELECT USING (auth.uid() = user_id);

-- Registrations: users view own
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own registrations" ON event_registrations FOR SELECT USING (auth.uid() = user_id);

-- NOTE: Admin write operations bypass RLS via the NestJS API using the service role key.
-- The API validates admin role via application-level guards, not RLS.
