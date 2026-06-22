-- =====================================================================
-- 087_tenancy_station_columns
-- Adds station_id to every STATION-SCOPED table (content / broadcast ops
-- / loyalty / station-site / DJ / FCC).
--
-- The DEFAULT 'station_wccg' is doing two jobs:
--   1. Fast-fills all existing rows as a PG11+ metadata-only change
--      (no table rewrite, no lock — safe even for points_history ~210k).
--   2. Acts as the Phase-0 bridge so every legacy service_role insert
--      that omits station_id still lands on WCCG. Phase 1 wires station_id
--      explicitly everywhere and drops this default.
-- NOT NULL + FK + per-station unique surgery happen in 089.
-- =====================================================================

begin;

do $$
declare
  t text;
  station_tables text[] := array[
    -- broadcast / streams / programming
    'streams','stream_sources','stream_metadata',
    'shows','show_hosts','show_episodes','hosts','schedule_blocks',
    -- DJ ops
    'djs','dj_slots','dj_drops','dj_ftp_accounts','dj_ftp_log','dj_mixes',
    'dj_bookings','dj_collections',
    'record_pool_labels','record_pool_tracks','record_pool_downloads',
    -- now-playing / requests / chat / FCC / restream / master control
    'song_history','song_requests','chat_messages','keyword_entries','mcr_state',
    'eas_alerts','eas_test_schedule','restream_destinations','restream_events',
    -- content
    'videos','video_progress','sermons','blog_posts',
    'podcast_series','podcast_episodes','podcast_subscriptions',
    -- events
    'events','ticket_types','event_registrations','event_organizers','event_checkins',
    'deal_redemptions',
    -- listening / engagement
    'content_plays','listening_history','listening_sessions','listening_tracks',
    'listening_locations','session_tracks','favorites','user_favorites',
    -- loyalty (per-station)
    'user_points','points_history','points_ledger','points_rules','reward_catalog',
    'weekly_leaderboard','listener_of_the_week','user_bounties_claimed','birthday_club',
    'user_milestones','referral_codes','referral_signups','user_referrals','user_playlists',
    -- streaming logs
    'stream_log_entries','stream_log_daily_stats',
    -- per-station site / cms / moderation / notifications
    'cms_pages','site_content','site_navigation','site_ad_placements',
    'moderation_queue','notifications',
    -- creator / studio
    'submissions','studio_projects','productions',
    -- community hub (per-station) + station newsletter
    'hub_posts','hub_post_likes','hub_groups','hub_group_members','hub_group_messages',
    'hub_memberships','newsletter_subscribers'
  ];
begin
  foreach t in array station_tables loop
    execute format(
      'alter table public.%I add column if not exists station_id text default %L',
      t, 'station_wccg'
    );
    execute format(
      'create index if not exists %I on public.%I (station_id)',
      'idx_' || t || '_station_id', t
    );
  end loop;
end $$;

commit;
