-- ============================================================================
-- DJ Portal — seed all 25 DJs and their slot assignments
-- Source: WCCG Two-Segment Day-Part Mix Show Format
-- File-code prefix: DJB_  (Centova/automation cart numbers)
-- ============================================================================
-- Apply after 013_dj_portal_schema.sql.
-- Idempotent (ON CONFLICT DO UPDATE).
--
-- Status legend (from the source schedule):
--   -x   → active           ('active')
--   -?   → tentative        ('tentative')
--   -??  → uncertain        ('tentative' with note)
--   none → status='active'
--
-- Day numbers: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

-- ─── DJs ─────────────────────────────────────────────────────────────────
INSERT INTO djs (id, slug, display_name, is_active) VALUES
  ('dj_ike_gda',      'dj-ike-gda',      'DJ IKE GDA',      true),
  ('dj_weezy',        'dj-weezy',        'DJ WEEZY',        true),
  ('dj_izzy_nice',    'dj-izzy-nice',    'DJ IZZY NICE',    true),
  ('dj_itanist',      'dj-itanist',      'DJ ITANIST',      true),
  ('dj_dane_dinero',  'dj-dane-dinero',  'DJ DANE DINERO',  true),
  ('dj_drop',         'dj-drop',         'DJ DROP',         true),
  ('dj_daddy_black',  'dj-daddy-black',  'DJ DADDY BLACK',  true),
  ('dj_vi',           'dj-vi',           'DJ VI',           true),
  ('dj_killako',      'dj-killako',      'DJ KILLAKO',      true),
  ('dj_yodo',         'dj-yodo',         'DJ YODO',         true),
  ('dj_wolf',         'dj-wolf',         'DJ WOLF',         true),
  ('dj_chuck_t',      'dj-chuck-t',      'DJ CHUCK T',      true),
  ('dj_spin_wiz',     'dj-spin-wiz',     'DJ SPIN WIZ',     true),
  ('dj_t_money',      'dj-t-money',      'DJ T MONEY',      true),
  ('dj_kvng',         'dj-kvng',         'DJ KVNG',         true),
  ('dj_jay_b',        'dj-jay-b',        'DJ JAY B',        true),
  ('dj_chuck',        'dj-chuck',        'DJ CHUCK',        true),
  ('dj_tone_lo',      'dj-tone-lo',      'DJ TONE LO',      true),
  ('dj_juice',        'dj-juice',        'DJ JUICE',        true),
  ('dj_daffie',       'dj-daffie',       'DJ DAFFIE',       true),
  ('dj_yafeelme',     'dj-yafeelme',     'DJ YAFEELME',     true),
  ('dj_tony_neal',    'dj-tony-neal',    'DJ TONY NEAL',    true),
  ('dj_official',     'dj-official',     'DJ OFFICIAL',     true),
  ('dj_rayn',         'dj-rayn',         'DJ RAYN',         true)
ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name, is_active = true;

-- ─── Weekday 12:00 PM (2-file segments) ──────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_mon_12_ike',         'dj_ike_gda',     1, '12:00', '14:00', ARRAY['DJB_76051','DJB_76052'], 'active',     'Mon 12pm — DJB_76051 -x'),
  ('slot_tue_12_weezy',       'dj_weezy',       2, '12:00', '14:00', ARRAY['DJB_76057','DJB_76058'], 'tentative',  'Tue 12pm — flagged -??'),
  ('slot_wed_12_izzy_nice',   'dj_izzy_nice',   3, '12:00', '13:00', ARRAY['DJB_76063'],             'active',     'Wed 12pm seg 1 — DJB_76063 -x'),
  ('slot_wed_12_itanist',     'dj_itanist',     3, '13:00', '14:00', ARRAY['DJB_76064'],             'active',     'Wed 1pm seg 2 — DJB_76064'),
  ('slot_thu_12_dane',        'dj_dane_dinero', 4, '12:00', '13:00', ARRAY['DJB_76069'],             'active',     'Thu 12pm seg 1 — DJB_76069 -x'),
  ('slot_thu_12_drop',        'dj_drop',        4, '13:00', '14:00', ARRAY['DJB_76070'],             'active',     'Thu 1pm seg 2 — DJB_76070'),
  ('slot_fri_12_daddy_black', 'dj_daddy_black', 5, '12:00', '14:00', ARRAY['DJB_76075','DJB_76076'], 'active',     'Fri 12pm — DJB_76075 -x')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Weekday 5:00 PM (2-file segments) ───────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_mon_17_vi',         'dj_vi',       1, '17:00', '19:00', ARRAY['DJB_76053','DJB_76054'], 'active', '-x'),
  ('slot_tue_17_killako',    'dj_killako',  2, '17:00', '19:00', ARRAY['DJB_76059','DJB_76060'], 'active', '-x'),
  ('slot_wed_17_yodo',       'dj_yodo',     3, '17:00', '19:00', ARRAY['DJB_76065','DJB_76066'], 'active', '-x'),
  ('slot_thu_17_wolf',       'dj_wolf',     4, '17:00', '19:00', ARRAY['DJB_76071','DJB_76072'], 'active', '-x'),
  ('slot_fri_17_chuck_t',    'dj_chuck_t',  5, '17:00', '19:00', ARRAY['DJB_76077','DJB_76078'], 'active', '-x')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Friday 9:00 PM ──────────────────────────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_fri_21_spin_wiz',   'dj_spin_wiz', 5, '21:00', '22:00', ARRAY['DJB_76079','DJB_76080'], 'active', '-x')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Weekday 10:00 PM (2-file segments) ──────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_mon_22_t_money',    'dj_t_money',  1, '22:00', '00:00', ARRAY['DJB_76055','DJB_76056'], 'tentative', 'Mon 10pm — flagged -??'),
  ('slot_tue_22_kvng',       'dj_kvng',     2, '22:00', '00:00', ARRAY['DJB_76061','DJB_76062'], 'tentative', 'Tue 10pm — flagged -??'),
  ('slot_wed_22_jay_b',      'dj_jay_b',    3, '22:00', '00:00', ARRAY['DJB_76067','DJB_76068'], 'tentative', 'Wed 10pm — flagged -??'),
  ('slot_thu_22_chuck',      'dj_chuck',    4, '22:00', '00:00', ARRAY['DJB_76073','DJB_76074'], 'active',    '-x'),
  ('slot_fri_22_tone_lo',    'dj_tone_lo',  5, '22:00', '23:00', ARRAY['DJB_76081','DJB_76082'], 'active',    '-x')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Friday 11:00 PM ─────────────────────────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_fri_23_juice',      'dj_juice',    5, '23:00', '00:00', ARRAY['DJB_76083','DJB_76084'], 'active', '-x')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Saturday slots ──────────────────────────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_sat_12_daffie',     'dj_daffie',    6, '12:00', '14:00', ARRAY['DJB_76087','DJB_76088'],                          'active', '-x'),
  ('slot_sat_17_yafeelme',   'dj_yafeelme',  6, '17:00', '19:00', ARRAY['DJB_76089','DJB_76090'],                          'active', '-x'),
  ('slot_sat_21_tony_neal',  'dj_tony_neal', 6, '21:00', '00:00', ARRAY['DJB_76097','DJB_76098','DJB_76099','DJB_76100'],  'active', 'Sat 9pm-Mid (4 segments)')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Sunday slots ────────────────────────────────────────────────────────
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  ('slot_sun_06_official',   'dj_official', 0, '06:00', '12:00', ARRAY['DJB_76091','DJB_76092','DJB_76093','DJB_76094'], 'tentative', 'Sun 6am — DJB_76091/92 -x; flagged -?'),
  ('slot_sun_17_rayn',       'dj_rayn',     0, '17:00', '19:00', ARRAY['DJB_76095','DJB_76096'],                          'tentative', 'Sun 5pm — flagged -?')
ON CONFLICT (id) DO UPDATE SET file_codes = EXCLUDED.file_codes, status = EXCLUDED.status, notes = EXCLUDED.notes;

-- ─── Sanity check ────────────────────────────────────────────────────────
-- Expected: 50 unique file codes (76051..76100, with gaps for unused codes).
-- Run the following to verify in the SQL Editor after applying:
--   SELECT count(distinct fc) FROM dj_slots, unnest(file_codes) fc;
