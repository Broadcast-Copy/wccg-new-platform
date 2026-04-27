-- ============================================================================
-- A7 — Seed shows / hosts / schedule_blocks from data/schedule.ts
-- ============================================================================
-- Idempotent. Safe to re-run; uses ON CONFLICT to upsert.

-- ─── Stream ────────────────────────────────────────────────────────────────
INSERT INTO streams (id, name, slug, description, stream_url, is_active)
VALUES (
  'stream_wccg_main',
  'WCCG 104.5 FM',
  'wccg-main',
  'Fayetteville''s Hip Hop Station — main on-air feed.',
  'https://ice66.securenetsystems.net/WCCG',
  true
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      stream_url = EXCLUDED.stream_url,
      is_active = true;

-- ─── Hosts ─────────────────────────────────────────────────────────────────
INSERT INTO hosts (id, name, slug, is_active) VALUES
  ('host_bootleg_kev',         'Bootleg Kev',                 'bootleg-kev',         true),
  ('host_yung_joc',            'Yung Joc',                    'yung-joc',            true),
  ('host_mz_shyneka',          'Mz Shyneka',                  'mz-shyneka',          true),
  ('host_shawty_shawty',       'Shawty Shawty',               'shawty-shawty',       true),
  ('host_angela_yee',          'Angela Yee',                  'angela-yee',          true),
  ('host_wccg',                'WCCG',                        'wccg',                true),
  ('host_incognito',           'Incognito',                   'incognito',           true),
  ('host_dj_ricovelli',        'DJ Ricovelli',                'dj-ricovelli',        true),
  ('host_slim',                'Slim',                        'slim',                true),
  ('host_dj_tony_neal',        'DJ Tony Neal',                'dj-tony-neal',        true),
  ('host_apostle_monds',       'Apostle Anthony Monds',       'apostle-anthony-monds', true),
  ('host_dr_tony_haire',       'Dr. Tony Haire',              'dr-tony-haire',       true),
  ('host_bishop_marvin_sapp',  'Bishop Marvin Sapp',          'bishop-marvin-sapp',  true),
  ('host_ffwc',                'Family Fellowship Worship Center', 'family-fellowship-worship-center', true),
  ('host_pastor_fuller',       'Pastor F. Benard Fuller',     'pastor-f-benard-fuller', true),
  ('host_pastor_stackhouse',   'Pastor Christopher Stackhouse','pastor-christopher-stackhouse', true),
  ('host_shorty_corleone',     'Shorty Corleone',             'shorty-corleone',     true),
  ('host_wright_brothers',     'The Wright Brothers',         'the-wright-brothers', true)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, is_active = true;

-- ─── Shows ─────────────────────────────────────────────────────────────────
INSERT INTO shows (id, name, slug, description, is_active) VALUES
  ('show_bootleg_kev',                       'Overnights — Bootleg Kev',                            'overnights-bootleg-kev',                  null, true),
  ('show_streetz_morning',                   'Young Joc and the Streetz Morning Take Over',         'streetz-morning-takeover',                null, true),
  ('show_way_up_angela_yee',                 'Way Up with Angela Yee',                              'way-up-angela-yee',                       null, true),
  ('show_general_programming_weekday',       'General Programming',                                 'general-programming-weekday',             null, true),
  ('show_posted_corner',                     'Incognito "Posted On the Corner"',                    'posted-on-the-corner',                    null, true),
  ('show_general_programming_sat_overnight', 'Overnights — General Programming',                    'overnights-general-programming-saturday', null, true),
  ('show_streetz_weekend_countdown',         'Yung Joc and the Streetz Weekend Countdown',          'streetz-weekend-countdown',               null, true),
  ('show_deja_vu',                           'The Deja Vu Show',                                    'the-deja-vu-show',                        null, true),
  ('show_day_party',                         'Day Party Radio: The Weekend Top 50',                 'day-party-radio',                         null, true),
  ('show_riich_villianz',                    'Riich Villianz Radio',                                'riich-villianz-radio',                    null, true),
  ('show_praise_mix',                        'Praise Mix at 6am',                                   'praise-mix',                              null, true),
  ('show_grace_plus_nothing',                'Grace Plus Nothing Ministries',                       'grace-plus-nothing',                      null, true),
  ('show_encouraging_moment',                'The Encouraging Moment',                              'encouraging-moment',                      null, true),
  ('show_marvin_sapp',                       'The Marvin Sapp Radio Show',                          'marvin-sapp-radio',                       null, true),
  ('show_family_fellowship',                 'Family Fellowship Worship Center',                    'family-fellowship-worship-center',        null, true),
  ('show_mt_pisgah',                         'Mt. Pisgah Missionary Baptist Church',                'mt-pisgah',                               null, true),
  ('show_lewis_chapel',                      'Lewis Chapel Baptist Church',                         'lewis-chapel',                            null, true),
  ('show_general_programming_sunday',        'General Programming (Sunday)',                        'general-programming-sunday',              null, true),
  ('show_sunday_snacks',                     'Sunday Snacks',                                       'sunday-snacks',                           null, true)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, is_active = true;

-- ─── Show ↔ Host links (primary host marked first) ─────────────────────────
INSERT INTO show_hosts (show_id, host_id, is_primary) VALUES
  ('show_bootleg_kev',                       'host_bootleg_kev',         true),
  ('show_streetz_morning',                   'host_yung_joc',            true),
  ('show_streetz_morning',                   'host_mz_shyneka',          false),
  ('show_streetz_morning',                   'host_shawty_shawty',       false),
  ('show_way_up_angela_yee',                 'host_angela_yee',          true),
  ('show_general_programming_weekday',       'host_wccg',                true),
  ('show_posted_corner',                     'host_incognito',           true),
  ('show_general_programming_sat_overnight', 'host_wccg',                true),
  ('show_streetz_weekend_countdown',         'host_yung_joc',            true),
  ('show_streetz_weekend_countdown',         'host_mz_shyneka',          false),
  ('show_streetz_weekend_countdown',         'host_shawty_shawty',       false),
  ('show_deja_vu',                           'host_wccg',                true),
  ('show_day_party',                         'host_wccg',                true),
  ('show_riich_villianz',                    'host_dj_ricovelli',        true),
  ('show_riich_villianz',                    'host_slim',                false),
  ('show_riich_villianz',                    'host_dj_tony_neal',        false),
  ('show_praise_mix',                        'host_wccg',                true),
  ('show_grace_plus_nothing',                'host_apostle_monds',       true),
  ('show_encouraging_moment',                'host_dr_tony_haire',       true),
  ('show_marvin_sapp',                       'host_bishop_marvin_sapp',  true),
  ('show_family_fellowship',                 'host_ffwc',                true),
  ('show_mt_pisgah',                         'host_pastor_fuller',       true),
  ('show_lewis_chapel',                      'host_pastor_stackhouse',   true),
  ('show_general_programming_sunday',        'host_wccg',                true),
  ('show_general_programming_sunday',        'host_shorty_corleone',     false),
  ('show_sunday_snacks',                     'host_wright_brothers',     true)
ON CONFLICT (show_id, host_id) DO UPDATE SET is_primary = EXCLUDED.is_primary;

-- ─── Schedule blocks ───────────────────────────────────────────────────────
-- Wipe and re-seed from the canonical schedule. Safe because all admin-edited
-- blocks live in a separate is_override=true row.
DELETE FROM schedule_blocks
WHERE stream_id = 'stream_wccg_main'
  AND is_override = false;

-- Helper: insert blocks for a list of weekday indices.
DO $$
DECLARE
  weekday_idx INT;
BEGIN
  -- Weekdays (Mon-Fri = 1..5)
  FOREACH weekday_idx IN ARRAY ARRAY[1,2,3,4,5] LOOP
    INSERT INTO schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, is_active)
    VALUES
      ('stream_wccg_main', 'show_bootleg_kev',                 'Overnights — Bootleg Kev',                            weekday_idx, '00:00', '06:00', true),
      ('stream_wccg_main', 'show_streetz_morning',             'Young Joc and the Streetz Morning Take Over',         weekday_idx, '06:00', '10:00', true),
      ('stream_wccg_main', 'show_way_up_angela_yee',           'Way Up with Angela Yee',                              weekday_idx, '10:00', '15:00', true),
      ('stream_wccg_main', 'show_general_programming_weekday', 'General Programming',                                 weekday_idx, '15:00', '19:00', true),
      ('stream_wccg_main', 'show_posted_corner',               'Incognito "Posted On the Corner"',                    weekday_idx, '19:00', '23:59', true);
  END LOOP;
END$$;

-- Saturday (6)
INSERT INTO schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, is_active) VALUES
  ('stream_wccg_main', 'show_general_programming_sat_overnight', 'Overnights — General Programming',                    6, '00:00', '06:00', true),
  ('stream_wccg_main', 'show_streetz_weekend_countdown',         'Yung Joc and the Streetz Weekend Countdown',          6, '06:00', '09:00', true),
  ('stream_wccg_main', 'show_deja_vu',                           'The Deja Vu Show',                                    6, '10:00', '15:00', true),
  ('stream_wccg_main', 'show_day_party',                         'Day Party Radio: The Weekend Top 50',                 6, '15:00', '19:00', true),
  ('stream_wccg_main', 'show_riich_villianz',                    'Riich Villianz Radio',                                6, '19:00', '23:59', true);

-- Sunday (0)
INSERT INTO schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, is_active) VALUES
  ('stream_wccg_main', 'show_praise_mix',                  'Praise Mix at 6am',                       0, '06:00', '08:00', true),
  ('stream_wccg_main', 'show_grace_plus_nothing',          'Grace Plus Nothing Ministries',           0, '08:00', '09:00', true),
  ('stream_wccg_main', 'show_encouraging_moment',          'The Encouraging Moment',                  0, '09:00', '10:00', true),
  ('stream_wccg_main', 'show_marvin_sapp',                 'The Marvin Sapp Radio Show',              0, '10:00', '12:00', true),
  ('stream_wccg_main', 'show_family_fellowship',           'Family Fellowship Worship Center',        0, '12:00', '13:00', true),
  ('stream_wccg_main', 'show_mt_pisgah',                   'Mt. Pisgah Missionary Baptist Church',    0, '13:00', '14:00', true),
  ('stream_wccg_main', 'show_lewis_chapel',                'Lewis Chapel Baptist Church',             0, '14:00', '15:00', true),
  ('stream_wccg_main', 'show_general_programming_sunday',  'General Programming',                     0, '15:00', '19:00', true),
  ('stream_wccg_main', 'show_sunday_snacks',               'Sunday Snacks',                           0, '19:00', '23:59', true);
