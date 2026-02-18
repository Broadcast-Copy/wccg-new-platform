-- WCCG 104.5 FM — Seed Data
-- Run this AFTER 001_initial_schema.sql

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================
INSERT INTO roles (id, name, description) VALUES
  ('role_admin', 'ADMIN', 'Full platform access'),
  ('role_editor', 'EDITOR', 'Content management access'),
  ('role_listener', 'LISTENER', 'Default listener role');

INSERT INTO permissions (id, name, description) VALUES
  ('perm_streams_create', 'streams.create', 'Create streams'),
  ('perm_streams_update', 'streams.update', 'Update streams'),
  ('perm_streams_delete', 'streams.delete', 'Delete streams'),
  ('perm_shows_create', 'shows.create', 'Create shows'),
  ('perm_shows_update', 'shows.update', 'Update shows'),
  ('perm_shows_delete', 'shows.delete', 'Delete shows'),
  ('perm_hosts_manage', 'hosts.manage', 'Manage hosts'),
  ('perm_schedule_manage', 'schedule.manage', 'Manage schedule'),
  ('perm_users_manage', 'users.manage', 'Manage users'),
  ('perm_points_manage', 'points.manage', 'Manage points and rewards'),
  ('perm_events_manage', 'events.manage', 'Manage all events');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_admin', id FROM permissions;

-- Editor gets content permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_editor', id FROM permissions
WHERE name IN ('streams.update', 'shows.create', 'shows.update', 'hosts.manage', 'schedule.manage');

-- ============================================================================
-- STREAMS
-- ============================================================================
INSERT INTO streams (id, name, slug, description, category, status, sort_order, image_url) VALUES
  ('stream_main', 'WCCG 104.5 FM', 'wccg-main', 'Charlotte''s #1 Gospel Station — live from the Queen City', 'MAIN', 'ACTIVE', 1, NULL),
  ('stream_gospel', 'Gospel Classics', 'gospel-classics', 'Timeless gospel hymns and classics', 'GOSPEL', 'ACTIVE', 2, NULL),
  ('stream_hiphop', 'Holy Hip Hop', 'holy-hip-hop', 'Christian hip hop and rap', 'HIP_HOP', 'ACTIVE', 3, NULL),
  ('stream_rnb', 'Inspirational R&B', 'inspirational-rnb', 'Uplifting R&B and soul', 'RNB', 'ACTIVE', 4, NULL),
  ('stream_talk', 'WCCG Talk', 'wccg-talk', 'Community discussions and talk shows', 'TALK', 'ACTIVE', 5, NULL);

INSERT INTO stream_sources (stream_id, primary_url, fallback_url, bitrate) VALUES
  ('stream_main', 'https://stream.example.com/wccg-main', NULL, 128),
  ('stream_gospel', 'https://stream.example.com/gospel-classics', NULL, 128),
  ('stream_hiphop', 'https://stream.example.com/holy-hiphop', NULL, 128),
  ('stream_rnb', 'https://stream.example.com/inspirational-rnb', NULL, 128),
  ('stream_talk', 'https://stream.example.com/wccg-talk', NULL, 64);

INSERT INTO stream_metadata (stream_id, current_title, current_artist, is_live) VALUES
  ('stream_main', 'Gospel Morning', 'WCCG Morning Show', true),
  ('stream_gospel', 'Amazing Grace', 'Aretha Franklin', true),
  ('stream_hiphop', 'Testimony', 'Lecrae', true),
  ('stream_rnb', 'I Believe I Can Fly', 'R. Kelly', false),
  ('stream_talk', 'Community Voice', 'Pastor Williams', true);

-- ============================================================================
-- SHOWS
-- ============================================================================
INSERT INTO shows (id, name, slug, description, is_active) VALUES
  ('show_morning', 'Gospel Morning', 'gospel-morning', 'Start your day with uplifting gospel music and devotionals', true),
  ('show_midday', 'Midday Praise', 'midday-praise', 'Your midday praise break with the best in gospel', true),
  ('show_drive', 'Drive Time Gospel', 'drive-time-gospel', 'Gospel music to power your evening commute', true),
  ('show_night', 'Quiet Storm Gospel', 'quiet-storm-gospel', 'Smooth gospel and inspirational music for the evening', true),
  ('show_sunday', 'Sunday Morning Worship', 'sunday-worship', 'Live worship experience every Sunday morning', true),
  ('show_talk', 'Community Voice', 'community-voice', 'Discussions on issues affecting the Charlotte community', true),
  ('show_youth', 'Next Gen Praise', 'next-gen-praise', 'Gospel music for the younger generation', true),
  ('show_classics', 'Gospel Hall of Fame', 'gospel-hall-of-fame', 'Classic gospel from the legends', true);

-- ============================================================================
-- HOSTS
-- ============================================================================
INSERT INTO hosts (id, name, slug, bio, is_active) VALUES
  ('host_james', 'Brother James', 'brother-james', 'Morning show host for 15+ years at WCCG. Known for his warm spirit and encouraging words.', true),
  ('host_sarah', 'Sister Sarah', 'sister-sarah', 'Midday praise host and community advocate. Passionate about uplifting Charlotte through gospel music.', true),
  ('host_mike', 'DJ Mike G', 'dj-mike-g', 'Drive time host with 20 years in gospel radio. Mixing classic and contemporary gospel.', true),
  ('host_lisa', 'Lisa Grace', 'lisa-grace', 'Evening host specializing in smooth gospel and quiet storm vibes.', true),
  ('host_williams', 'Pastor D. Williams', 'pastor-williams', 'Community voice host and senior pastor at New Life Church.', true),
  ('host_tasha', 'Tasha Joy', 'tasha-joy', 'Youth programming host connecting gospel with the next generation.', true);

INSERT INTO show_hosts (show_id, host_id, is_primary) VALUES
  ('show_morning', 'host_james', true),
  ('show_midday', 'host_sarah', true),
  ('show_drive', 'host_mike', true),
  ('show_night', 'host_lisa', true),
  ('show_talk', 'host_williams', true),
  ('show_youth', 'host_tasha', true),
  ('show_sunday', 'host_james', true),
  ('show_sunday', 'host_sarah', false),
  ('show_classics', 'host_mike', true);

-- ============================================================================
-- SCHEDULE (Mon-Fri default)
-- ============================================================================
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday

-- Monday-Friday schedule for main stream
-- Using generate_series to create Mon-Fri blocks
DO $$
DECLARE
  d INTEGER;
BEGIN
  FOR d IN 1..5 LOOP
    INSERT INTO schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, color) VALUES
      ('stream_main', 'show_morning', 'Gospel Morning', d, '06:00', '10:00', '#F59E0B'),
      ('stream_main', 'show_midday', 'Midday Praise', d, '10:00', '14:00', '#10B981'),
      ('stream_main', 'show_drive', 'Drive Time Gospel', d, '14:00', '19:00', '#3B82F6'),
      ('stream_main', 'show_night', 'Quiet Storm Gospel', d, '19:00', '23:00', '#8B5CF6');
  END LOOP;
END $$;

-- Saturday schedule
INSERT INTO schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, color) VALUES
  ('stream_main', 'show_classics', 'Gospel Hall of Fame', 6, '08:00', '12:00', '#EC4899'),
  ('stream_main', 'show_youth', 'Next Gen Praise', 6, '12:00', '16:00', '#06B6D4'),
  ('stream_main', 'show_night', 'Saturday Night Gospel', 6, '16:00', '22:00', '#8B5CF6');

-- Sunday schedule
INSERT INTO schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, color) VALUES
  ('stream_main', 'show_sunday', 'Sunday Morning Worship', 0, '06:00', '12:00', '#F59E0B'),
  ('stream_main', 'show_classics', 'Sunday Gospel Classics', 0, '12:00', '18:00', '#EC4899'),
  ('stream_main', 'show_night', 'Sunday Evening Grace', 0, '18:00', '23:00', '#8B5CF6');

-- ============================================================================
-- POINTS RULES
-- ============================================================================
INSERT INTO points_rules (name, trigger_type, points_amount, threshold, is_active, cooldown_minutes) VALUES
  ('Listen 30 minutes', 'LISTEN_MINUTES', 10, 30, true, 30),
  ('Listen 60 minutes', 'LISTEN_MINUTES', 25, 60, true, 60),
  ('Event check-in', 'EVENT_ATTENDANCE', 50, 1, true, 0),
  ('Sign-up bonus', 'SIGNUP', 100, 1, true, 0);

-- ============================================================================
-- REWARD CATALOG
-- ============================================================================
INSERT INTO reward_catalog (name, description, points_cost, category, stock_count, is_active) VALUES
  ('WCCG T-Shirt', 'Official WCCG 104.5 FM branded t-shirt', 500, 'Merchandise', 100, true),
  ('WCCG Coffee Mug', 'Start your morning with gospel and coffee', 300, 'Merchandise', 50, true),
  ('Concert Ticket', 'Free ticket to a WCCG sponsored gospel concert', 1000, 'Experiences', 20, true),
  ('Meet & Greet Pass', 'Backstage meet and greet with gospel artists', 2000, 'Experiences', 5, true),
  ('Premium Listener Badge', 'Digital badge for your profile', 100, 'Digital', -1, true),
  ('Shout-Out on Air', 'Get a personal shout-out during a live show', 750, 'Experiences', -1, true);
