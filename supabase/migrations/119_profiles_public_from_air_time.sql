-- =====================================================================
-- 119_profiles_public_from_air_time
-- Sermons and DJ mixes land on the church's / DJ's public profile ONCE THEY
-- AIR (owner 2026-09-28: "sermons and mixes should land in the profile of the
-- entity, once they air, or simultaneously"; Jev 0.91 "from air time").
--
--   * sermon_churches  -- NEW. Church code -> its profile (shows.id) and its
--                         scheduled Sunday start. The codes, shows and slots
--                         already existed (sermon-archive.tsx SERMON_CODES,
--                         shows.time_slot); the times were checked against
--                         the ON-AIR journal for 09-13/09-20/09-27 (actual
--                         starts drift up to ~30 min around the hour).
--   * sermons.airs_at  -- NEW. When it airs = air_date + the church's slot, in
--                         the station's timezone. Set by a trigger, never by a
--                         client; frozen once aired. Backfilled for the archive.
--   * sermons.checksum_sha256 -- NEW. Lets the watcher's re-run skip a sermon
--                         already on the site (studio-sync "sermon" action).
--   * dj_drops.airs_at -- NEW. When the mix airs = week_of (ISO Monday) + the
--                         slot's weekday + start_time, station timezone. Same
--                         trigger rules. Backfilled.
--   * PUBLIC READ now needs airs_at <= now():
--       sermons  "sermons are public" (true)  -> "sermons public from air time"
--       dj_drops "Public reads published drops" (status = 'published')
--                -> status = 'published' AND airs_at <= now()
--     Before this a mix was public the moment Studio Sync filed it (often a day
--     or more before its show) and a sermon from midnight of its Sunday.
--     The DJ's own, production, admin and service-role policies are untouched,
--     so the DJ portal, Studio Sync and the admin pages see exactly what they
--     saw before.
--   * sermons bucket: audio only, 600 MB cap (defence in depth for the
--     secret-gated upload path; existing objects are unaffected), and only
--     staff may LIST it (new objects carry a hash in their name, so nobody can
--     find next Sunday's file before it airs; playback URLs are unaffected).
--
-- Writes to sermons stay service-role only (no client write policy exists);
-- the only writer is the studio-sync edge function's secret-gated "sermon"
-- actions, called by scripts/gmail-watcher.py after the air sync.
-- Proof: supabase/tests/profiles_air_time.test.sql (rollback-only).
-- =====================================================================

begin;

-- ============================================================ churches ==

create table if not exists public.sermon_churches (
  code        text primary key check (code ~ '^[a-z]{3}[0-9]$'),
  show_id     text not null references public.shows(id) on delete restrict,
  air_time    time not null,          -- scheduled Sunday start, station local time
  station_id  text not null default 'station_wccg' references public.stations(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.sermon_churches is
  'Church sermon code (gmail-watcher / RadioSpider file name) -> its public profile (shows.id) and scheduled Sunday start. sermons.airs_at is computed from it.';

insert into public.sermon_churches (code, show_id, air_time) values
  ('gpn1', 'show_grace_plus_nothing', '08:00'),
  ('thm1', 'show_encouraging_moment', '09:00'),
  ('dvp1', 'show_family_fellowship',  '12:00'),
  ('pmb1', 'show_progressive_mbc',    '13:00'),
  ('lcc1', 'show_lewis_chapel',       '14:00')
on conflict (code) do nothing;

drop trigger if exists set_updated_at_sermon_churches on public.sermon_churches;
create trigger set_updated_at_sermon_churches before update on public.sermon_churches
  for each row execute function public.update_updated_at_column();

alter table public.sermon_churches enable row level security;
drop policy if exists sermon_churches_read on public.sermon_churches;
create policy sermon_churches_read on public.sermon_churches for select using (true);
drop policy if exists sermon_churches_service_write on public.sermon_churches;
create policy sermon_churches_service_write on public.sermon_churches for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists tenant_isolation on public.sermon_churches;
create policy tenant_isolation on public.sermon_churches as restrictive for all to public
  using (public.can_access_station(station_id))
  with check (public.can_access_station(station_id));

-- =============================================================== sermons ==

alter table public.sermons add column if not exists airs_at timestamptz;
alter table public.sermons add column if not exists checksum_sha256 text;

comment on column public.sermons.airs_at is
  'When this sermon airs (air_date + sermon_churches.air_time, station timezone). Trigger-set; the public can read the row from this moment on.';

-- Unknown church code -> NULL -> never public (fail closed).
create or replace function public.sermon_airs_at(p_code text, p_air_date date, p_station text)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select (p_air_date + c.air_time) at time zone coalesce(st.timezone, 'America/New_York')
  from public.sermon_churches c
  left join public.stations st on st.id = coalesce(p_station, c.station_id)
  where c.code = p_code;
$$;

create or replace function public.sermons_set_airs_at()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.church_code is distinct from old.church_code
     or new.air_date    is distinct from old.air_date
     or old.airs_at is null
     or old.airs_at > now() then
    new.airs_at := public.sermon_airs_at(new.church_code, new.air_date, new.station_id);
  else
    new.airs_at := old.airs_at;   -- aired: frozen, and never settable by a caller
  end if;
  return new;
end $$;

drop trigger if exists trg_sermons_airs_at on public.sermons;
create trigger trg_sermons_airs_at before insert or update on public.sermons
  for each row execute function public.sermons_set_airs_at();

-- Backfill the archive (the trigger computes the same value).
update public.sermons
   set airs_at = public.sermon_airs_at(church_code, air_date, station_id)
 where airs_at is null;

drop policy if exists "sermons are public" on public.sermons;
drop policy if exists "sermons public from air time" on public.sermons;
create policy "sermons public from air time" on public.sermons
  for select using (airs_at is not null and airs_at <= now());

-- ============================================================== dj_drops ==

alter table public.dj_drops add column if not exists airs_at timestamptz;

comment on column public.dj_drops.airs_at is
  'When this drop airs (week_of + slot weekday + start_time, station timezone). Trigger-set; a published drop is public from this moment on.';

-- week_of is the ISO Monday; dj_slots.day_of_week is 0=Sun..6=Sat, so the
-- offset from Monday is (dow + 6) % 7 (Sun = +6, the Studio Sync convention).
create or replace function public.dj_drop_airs_at(p_slot text, p_week date, p_station text)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select ((p_week + ((s.day_of_week + 6) % 7)) + s.start_time::time)
         at time zone coalesce(st.timezone, 'America/New_York')
  from public.dj_slots s
  left join public.stations st on st.id = coalesce(p_station, s.station_id)
  where s.id = p_slot;
$$;

create or replace function public.dj_drops_set_airs_at()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.week_of is distinct from old.week_of
     or new.slot_id is distinct from old.slot_id
     or old.airs_at is null
     or old.airs_at > now() then
    new.airs_at := public.dj_drop_airs_at(new.slot_id, new.week_of, new.station_id);
  else
    new.airs_at := old.airs_at;   -- aired: frozen, and never settable by a client
  end if;
  return new;
end $$;

drop trigger if exists trg_dj_drops_airs_at on public.dj_drops;
create trigger trg_dj_drops_airs_at before insert or update on public.dj_drops
  for each row execute function public.dj_drops_set_airs_at();

-- Backfill. Touches no status, so trg_notify_dj_on_drop_published stays quiet.
update public.dj_drops
   set airs_at = public.dj_drop_airs_at(slot_id, week_of, station_id)
 where airs_at is null;

drop policy if exists "Public reads published drops" on public.dj_drops;
create policy "Public reads published drops" on public.dj_drops
  for select using (status = 'published' and airs_at is not null and airs_at <= now());

-- ============================================================= functions ==
-- Not RPC endpoints: only the triggers (definer) and the edge function
-- (service role) call them.
revoke execute on function public.sermon_airs_at(text, date, text)   from public, anon, authenticated;
revoke execute on function public.dj_drop_airs_at(text, date, text)  from public, anon, authenticated;
revoke execute on function public.sermons_set_airs_at()               from public, anon, authenticated;
revoke execute on function public.dj_drops_set_airs_at()              from public, anon, authenticated;
grant  execute on function public.sermon_airs_at(text, date, text)   to service_role;
grant  execute on function public.dj_drop_airs_at(text, date, text)  to service_role;

-- ================================================================ bucket ==

-- Listing the sermons bucket: staff only (was: any signed-in account, since 086).
-- Playback uses the public CDN URL, which needs no policy on a public bucket, and
-- the edge function lists as service role; nothing in the app lists it. Without
-- this, a signed-in listener could list next Sunday's object before it airs.
drop policy if exists "sermons bucket public read" on storage.objects;
drop policy if exists "sermons bucket staff list" on storage.objects;
create policy "sermons bucket staff list" on storage.objects for select to authenticated
  using (bucket_id = 'sermons' and public.is_staff());

update storage.buckets
   set file_size_limit = 629145600,
       allowed_mime_types = array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a',
                                  'audio/wav','audio/x-wav','audio/wave']
 where id = 'sermons';

commit;
