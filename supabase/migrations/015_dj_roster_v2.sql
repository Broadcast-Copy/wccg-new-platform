-- ============================================================================
-- Migration 015: DJ Roster v2 + Schedule Reset
-- ============================================================================
-- Apply after 014_seed_djs.sql.
--
-- Changes from 014:
--   1. dj_slots.dj_id becomes nullable — unassigned rotation slots are now
--      first-class so an admin can fill them in via the UI.
--   2. UNIQUE constraint moves from (day_of_week, start_time, dj_id) →
--      (day_of_week, start_time) so we enforce one slot per day-part.
--   3. The `dj_drops_this_week` view switches its djs join to LEFT so empty
--      slots still appear.
--   4. Roster grows from 24 → 33 DJs, every DJ now has email + phone, and
--      `notes` carries the real name.
--   5. Full weekly schedule is wiped and reseeded to match the current
--      production air calendar. DJ Corleone holds the Sun 5pm slot with the
--      intentional DJB_75093/75094 file codes.
--
-- Idempotent — DJ rows upsert by slug, schedule rows are deleted and
-- reinserted.

BEGIN;

-- ─── Schema: nullable dj_id + tighter slot uniqueness ────────────────────
ALTER TABLE dj_slots ALTER COLUMN dj_id DROP NOT NULL;

DO $$
DECLARE c text;
BEGIN
  -- Drop every UNIQUE constraint on dj_slots so we can re-define one cleanly.
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'dj_slots'::regclass AND contype = 'u'
  LOOP
    EXECUTE 'ALTER TABLE dj_slots DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
END $$;

ALTER TABLE dj_slots
  ADD CONSTRAINT dj_slots_day_start_unique UNIQUE (day_of_week, start_time);

-- ─── View: tolerate NULL dj_id ───────────────────────────────────────────
DROP VIEW IF EXISTS dj_drops_this_week;
CREATE OR REPLACE VIEW dj_drops_this_week AS
WITH this_week AS (
  SELECT date_trunc('week', (now() AT TIME ZONE 'America/New_York'))::date AS week_of
),
expected AS (
  SELECT
    s.id AS slot_id,
    s.dj_id,
    d.display_name AS dj_name,
    d.slug AS dj_slug,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.status AS slot_status,
    unnest(s.file_codes) AS file_code,
    tw.week_of
  FROM dj_slots s
  LEFT JOIN djs d ON d.id = s.dj_id          -- allow NULL dj_id
  CROSS JOIN this_week tw
  WHERE s.status IN ('active','tentative')
)
SELECT
  e.slot_id, e.dj_id, e.dj_name, e.dj_slug,
  e.day_of_week, e.start_time, e.end_time, e.slot_status,
  e.file_code, e.week_of,
  COALESCE(dd.status, 'pending') AS drop_status,
  dd.uploaded_at,
  dd.storage_path,
  dd.source
FROM expected e
LEFT JOIN dj_drops dd
  ON dd.slot_id = e.slot_id
  AND dd.file_code = e.file_code
  AND dd.week_of = e.week_of;

-- ─── Roster: 33 active DJs with full contact info ────────────────────────
-- `notes` field holds the real (legal) name; `email`/`phone` come from the
-- WCCG DJ contact sheet (as of 2026-05).
INSERT INTO djs (id, slug, display_name, email, phone, notes, is_active) VALUES
  ('dj_spin_wiz',     'dj-spin-wiz',     'DJ SpinWiz',     'fleetdjspinwiz@gmail.com',     '910-302-0692', 'Nakia McLauglin',         true),
  ('dj_dane_dinero',  'dj-dane-dinero',  'DJ Dane Dinero', 'danedinero@icloud.com',        '919-721-4910', 'Dana Daniels',            true),
  ('dj_weezy',        'dj-weezy',        'DJ Weezy',       'weezy.fleetdjs@gmail.com',     '910-574-0790', 'Dwayne Smith',            true),
  ('dj_jay_b',        'dj-jay-b',        'DJ Jay B',       'jermainebright08@yahoo.com',   '910-986-3999', 'Jermaine Bright',         true),
  ('dj_rayn',         'dj-rayn',         'DJ Rayn',        'deejrayn@gmail.com',           '910-988-2271', 'Clarence Morrow',         true),
  ('dj_daddy_black',  'dj-daddy-black',  'DJ Daddy Black', 'djdaddyblack005@gmail.com',    '919-799-1262', 'Keith Black',             true),
  ('dj_crisco',       'dj-crisco',       'DJ Crisco',      'Cirsco1@gmail.com',            '910-813-6513', 'Chris Kennard',           true),
  ('dj_tommy_gee',    'dj-tommy-gee',    'DJ TommyGee Mix','tommygeemixx@gmail.com',       '996-517-9382', 'George Wall',             true),
  ('dj_yodo',         'dj-yodo',         'DJ Yodo',        'Theyodoshow@gmail.com',        '910-920-7124', 'Antoine Hill',            true),
  ('dj_whosane',      'dj-whosane',      'DJ Whosane',     'kotcokeboydjwhosane@gmail.com','910-705-6062', 'Julio Rodriguez',         true),
  ('dj_ricoveli',     'dj-ricoveli',     'DJ Ricoveli',    'djricoveli@gmail.com',         '910-676-4646', 'DreShawn Spearman',       true),
  ('dj_daffie',       'dj-daffie',       'DJ Daffie',      'djdaffiebookings@gmail.com',   '516-667-9701', 'Iton Anderson',           true),
  ('dj_yafeelme',     'dj-yafeelme',     'DJ YaFeelMe',    'Reggielee3rd@gmail.com',       '984-233-3427', 'Reggie Lee',              true),
  ('dj_ike_gda',      'dj-ike-gda',      'DJ Ike GDA',     'djikegdamusic@gmail.com',      '910-527-0783', 'Isaiah Griffin',          true),
  ('dj_chuck',        'dj-chuck',        'DJ Chuck',       'c_murphy00@yahoo.com',         '910-578-8432', 'Charles Murphy',          true),
  ('dj_official',     'dj-official',     'DJ Official',    'danielwilliams05@gmail.com',   '910-489-9097', 'Daniel Williams',         true),
  ('dj_tone_lo',      'dj-tone-lo',      'DJ Tone Lo',     'booktonelo@gmail.com',         '910-725-9941', 'Tony Albrooks',           true),
  ('dj_itanist',      'dj-itanist',      'DJ Itanist',     'itanmeade@gmail.com',          '754-610-5479', 'Itan Meade',              true),
  ('dj_izzy_nice',    'dj-izzy-nice',    'DJ Izzy Nice',   'unitsinthecity@gmail.com',     '980-457-4517', 'Michael Miller',          true),
  ('dj_killako',      'dj-killako',      'DJ KillaKo',     'Djkillako2017@gmail.com',      '910-549-9868', 'James Buie',              true),
  ('dj_kingviv',      'dj-kingviv',      'DJ KingViv',     'Kingviv93@gmail.com',          '910-703-0631', 'Vivian Smith',            true),
  ('dj_t_money',      'dj-t-money',      'DJ T-Money',     'Djtmoney910@gmail.com',        '910-728-2597', 'Anthony Dudley',          true),
  ('dj_swayzee',      'dj-swayzee',      'DJ Swayzee',     'Ewynn22@gmail.com',            '843-475-5122', 'Erik Wynn',               true),
  ('dj_lou_diamonds', 'dj-lou-diamonds', 'DJ LouDiamonds', 'ruggedlocks@gmail.com',        '910-978-8713', 'Luis Maymi',              true),
  ('dj_ljay',         'dj-ljay',         'DJ LJay',        'Djlj242@gmail.com',            '786-545-6697', 'Lawrence Hepburn',        true),
  ('dj_wolf',         'dj-wolf',         'DJ Wolf',        'Djwolfcp4life@gmail.com',      '914-413-4486', 'Nathaniel B. Mention',    true),
  ('dj_juice',        'dj-juice',        'DJ Juice',       'Im_juice@icloud.com',          '910-988-2896', 'Dominique Hosley',        true),
  ('dj_tony_neal',    'dj-tony-neal',    'DJ Tony Neal',   'tnealmusic@gmail.com',         '305-780-3113', 'Tony Neal',               true),
  ('dj_kvng',         'dj-kvng',         'DJ KVNG',        'youngkvngonthebeat@gmail.com', '478-464-4014', 'Terry Hollingshed',       true),
  ('dj_drop',         'dj-drop',         'DJ Drop',        'djdropnc@gmail.com',           '919-980-2134', 'Justin Lesesne',          true),
  ('dj_chuck_t',      'dj-chuck-t',      'DJ Chuck T',     'djchuckt@gmail.com',           '843-568-0036', 'David Thrower',           true),
  ('dj_vi',           'dj-vi',           'DJ VI',          'Djvi914@gmail.com',            '845-518-3600', NULL,                      true),
  ('dj_corleone',     'dj-corleone',     'DJ Corleone',    'cjgarris3@hotmail.com',        '202-705-5180', 'Charles Garris',          true)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email        = COALESCE(EXCLUDED.email,  djs.email),
  phone        = COALESCE(EXCLUDED.phone,  djs.phone),
  notes        = COALESCE(EXCLUDED.notes,  djs.notes),
  is_active    = EXCLUDED.is_active,
  updated_at   = now();

-- ─── Schedule wipe-and-reseed ────────────────────────────────────────────
-- dj_drops rows from prior weeks have a CASCADE on slot_id; we wipe drops
-- first to be explicit about the data loss (test/historical only).
DELETE FROM dj_drops;
DELETE FROM dj_slots;

-- day_of_week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun. Times ET 24h.
INSERT INTO dj_slots (id, dj_id, day_of_week, start_time, end_time, file_codes, status, notes) VALUES
  -- Monday
  ('slot_mon_12_ike_gda',  'dj_ike_gda',     1, '12:00', '14:00', ARRAY['DJB_76051','DJB_76052'], 'active', 'Mon 12pm — DJ Ike GDA'),
  ('slot_mon_17_vi',       'dj_vi',          1, '17:00', '19:00', ARRAY['DJB_76053','DJB_76054'], 'active', 'Mon 5pm — DJ VI'),
  ('slot_mon_22_open',     NULL,             1, '22:00', '00:00', ARRAY['DJB_76055','DJB_76056'], 'active', 'Mon 10pm — unassigned'),

  -- Tuesday
  ('slot_tue_12_tommy',    'dj_tommy_gee',   2, '12:00', '14:00', ARRAY['DJB_76057','DJB_76058'], 'active', 'Tue 12pm — DJ TommyGee Mix'),
  ('slot_tue_17_killako',  'dj_killako',     2, '17:00', '19:00', ARRAY['DJB_76059','DJB_76060'], 'active', 'Tue 5pm — DJ KillaKo'),
  ('slot_tue_22_kvng',     'dj_kvng',        2, '22:00', '00:00', ARRAY['DJB_76061','DJB_76062'], 'active', 'Tue 10pm — DJ KVNG'),

  -- Wednesday
  ('slot_wed_12_open',     NULL,             3, '12:00', '14:00', ARRAY['DJB_76063','DJB_76064'], 'active', 'Wed 12pm — unassigned'),
  ('slot_wed_17_yodo',     'dj_yodo',        3, '17:00', '19:00', ARRAY['DJB_76065','DJB_76066'], 'active', 'Wed 5pm — DJ Yodo'),
  ('slot_wed_22_t_money',  'dj_t_money',     3, '22:00', '00:00', ARRAY['DJB_76067','DJB_76068'], 'active', 'Wed 10pm — DJ T-Money'),

  -- Thursday
  ('slot_thu_12_drop',     'dj_drop',        4, '12:00', '14:00', ARRAY['DJB_76069','DJB_76070'], 'active', 'Thu 12pm — DJ Drop'),
  ('slot_thu_17_wolf',     'dj_wolf',        4, '17:00', '19:00', ARRAY['DJB_76071','DJB_76072'], 'active', 'Thu 5pm — DJ Wolf'),
  ('slot_thu_22_chuck',    'dj_chuck',       4, '22:00', '00:00', ARRAY['DJB_76073','DJB_76074'], 'active', 'Thu 10pm — DJ Chuck'),

  -- Friday
  ('slot_fri_12_daddy',    'dj_daddy_black', 5, '12:00', '14:00', ARRAY['DJB_76075','DJB_76076'], 'active', 'Fri 12pm — DJ Daddy Black'),
  ('slot_fri_17_chuck_t',  'dj_chuck_t',     5, '17:00', '19:00', ARRAY['DJB_76077','DJB_76078'], 'active', 'Fri 5pm — DJ Chuck T'),
  ('slot_fri_21_open',     NULL,             5, '21:00', '22:00', ARRAY['DJB_76079','DJB_76080'], 'active', 'Fri 9pm — unassigned'),
  ('slot_fri_22_tone_lo',  'dj_tone_lo',     5, '22:00', '23:00', ARRAY['DJB_76081','DJB_76082'], 'active', 'Fri 10pm — DJ Tone Lo'),
  ('slot_fri_23_juice',    'dj_juice',       5, '23:00', '00:00', ARRAY['DJB_76083','DJB_76084'], 'active', 'Fri 11pm — DJ Juice'),

  -- Saturday (all currently unassigned — admin will fill in later)
  ('slot_sat_12_open',     NULL,             6, '12:00', '14:00', ARRAY['DJB_76087','DJB_76088'], 'active', 'Sat 12pm — unassigned'),
  ('slot_sat_17_open',     NULL,             6, '17:00', '19:00', ARRAY['DJB_76089','DJB_76090'], 'active', 'Sat 5pm — unassigned'),
  ('slot_sat_22_open',     NULL,             6, '22:00', '23:00', ARRAY['DJB_76097','DJB_76098'], 'active', 'Sat 10pm — unassigned'),
  ('slot_sat_23_open',     NULL,             6, '23:00', '00:00', ARRAY['DJB_76099','DJB_76100'], 'active', 'Sat 11pm — unassigned'),

  -- Sunday
  ('slot_sun_06_open',     NULL,             0, '06:00', '07:00', ARRAY['DJB_76091','DJB_76092'], 'active', 'Sun 6am — unassigned'),
  ('slot_sun_07_open',     NULL,             0, '07:00', '08:00', ARRAY['DJB_76093','DJB_76094'], 'active', 'Sun 7am — unassigned'),
  ('slot_sun_17_corleone', 'dj_corleone',    0, '17:00', '18:00', ARRAY['DJB_75093','DJB_75094'], 'active', 'Sun 5pm — DJ Corleone (DJB_75 prefix intentional)'),
  ('slot_sun_18_open',     NULL,             0, '18:00', '19:00', ARRAY['DJB_76095','DJB_76096'], 'active', 'Sun 6pm — unassigned');

COMMIT;

-- ─── Sanity checks (run manually after applying) ─────────────────────────
--   SELECT count(*) FROM djs WHERE is_active;                        -- expect 33
--   SELECT count(*) FROM dj_slots;                                   -- expect 25
--   SELECT count(*) FROM dj_slots WHERE dj_id IS NULL;               -- expect 10
--   SELECT count(DISTINCT fc) FROM dj_slots, unnest(file_codes) fc;  -- expect 50
