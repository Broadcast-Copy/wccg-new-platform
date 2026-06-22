-- =====================================================================
-- 093_real_schedule_and_cleanup
-- Phase 1b (DB side): make the DB reflect WCCG's REAL lineup.
--  * Deletes the 8 original seed PLACEHOLDER gospel shows (stream_id NULL),
--    the 6 stale seed hosts (category NULL), and the 26 placeholder
--    schedule_blocks that pointed at them.
--  * Seeds the REAL weekly schedule from apps/web/src/data/schedule.ts
--    (WEEKLY_SCHEDULE) against the real shows seeded in 092.
-- Idempotent-ish: the deletes are keyed on the placeholder markers
-- (stream_id IS NULL / category IS NULL), which the real rows never have.
-- Does NOT touch the live app (still reads the TS files until the rewire).
-- =====================================================================

begin;

delete from public.show_hosts
 where show_id in (select id from public.shows where stream_id is null)
    or host_id in (select id from public.hosts where category is null);

delete from public.schedule_blocks
 where show_id in (select id from public.shows where stream_id is null);

delete from public.shows where stream_id is null;

update public.djs set host_id = null
 where host_id in (select id from public.hosts where category is null);

delete from public.hosts where category is null;

-- Weekday blocks repeat Mon–Fri (day_of_week 1–5)
insert into public.schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, is_active, station_id)
select 'stream_main', b.show_id, b.title, d.dow, b.st::time, b.et::time, true, 'station_wccg'
from (values
  ('show_bootleg_kev','Overnights — Bootleg Kev','00:00','06:00'),
  ('show_streetz_morning','Young Joc and the Streetz Morning Take Over','06:00','10:00'),
  ('show_way_up_angela_yee','Way Up with Angela Yee','10:00','15:00'),
  ('show_general_programming_weekday','General Programming','15:00','19:00'),
  ('show_posted_corner','Posted On the Corner','19:00','00:00')
) as b(show_id, title, st, et)
cross join (values (1),(2),(3),(4),(5)) as d(dow);

-- Sunday (day_of_week 0)
insert into public.schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, is_active, station_id) values
  ('stream_main','show_praise_mix','Praise Mix at 6am',0,'06:00','08:00',true,'station_wccg'),
  ('stream_main','show_grace_plus_nothing','Grace Plus Nothing Ministries',0,'08:00','09:00',true,'station_wccg'),
  ('stream_main','show_encouraging_moment','The Encouraging Moment',0,'09:00','10:00',true,'station_wccg'),
  ('stream_main','show_marvin_sapp','The Marvin Sapp Radio Show',0,'10:00','12:00',true,'station_wccg'),
  ('stream_main','show_family_fellowship','Family Fellowship Worship Center',0,'12:00','13:00',true,'station_wccg'),
  ('stream_main','show_progressive_mbc','Progressive Missionary Baptist Church',0,'13:00','14:00',true,'station_wccg'),
  ('stream_main','show_lewis_chapel','Lewis Chapel Baptist Church',0,'14:00','15:00',true,'station_wccg'),
  ('stream_main','show_general_programming_sunday','General Programming',0,'15:00','19:00',true,'station_wccg'),
  ('stream_main','show_gogo_mix','Crank with Shorty Corleone',0,'17:00','18:00',true,'station_wccg'),
  ('stream_main','show_sunday_snacks','Sunday Snacks',0,'19:00','00:00',true,'station_wccg');

-- Saturday (day_of_week 6)
insert into public.schedule_blocks (stream_id, show_id, title, day_of_week, start_time, end_time, is_active, station_id) values
  ('stream_main','show_general_programming_sat_overnight','Overnights — General Programming',6,'00:00','06:00',true,'station_wccg'),
  ('stream_main','show_streetz_weekend_countdown','Yung Joc and the Streetz Weekend Countdown',6,'06:00','09:00',true,'station_wccg'),
  ('stream_main','show_deja_vu','The Deja Vu Show',6,'10:00','15:00',true,'station_wccg'),
  ('stream_main','show_day_party','Day Party Radio: The Weekend Top 50',6,'15:00','19:00',true,'station_wccg'),
  ('stream_main','show_riich_villianz','Riich Villianz Radio',6,'19:00','00:00',true,'station_wccg');

commit;
