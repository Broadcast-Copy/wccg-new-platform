-- =====================================================================
-- 091_content_schema_extension
-- Phase 1a: extend shows/hosts to hold the fields that currently live ONLY
-- in the hardcoded apps/web/src/data/*.ts files, and add a check_in_locations
-- table, so the DB can become the single source of truth for WCCG content
-- (prerequisite for de-hardcoding the app in Phase 1b).
--
-- Additive + idempotent (IF NOT EXISTS / IF NOT EXISTS table). Does NOT touch
-- the live app — the site keeps reading the TS files until Phase 1b. Mirrors
-- the Phase-0 tenancy conventions (station_id default, RLS, tenant_isolation).
-- =====================================================================

begin;

-- ---- shows: fields from ShowData (apps/web/src/data/shows.ts) ----
-- (host linkage already exists via the show_hosts join table)
alter table public.shows add column if not exists stream_id        text;        -- 'stream_wccg' | 'stream_mixsquad' (reconciled to streams.id at backfill)
alter table public.shows add column if not exists time_slot        text;        -- "6:00 AM - 10:00 AM"
alter table public.shows add column if not exists days             text;        -- "Monday - Friday"
alter table public.shows add column if not exists segments         jsonb not null default '[]'::jsonb;  -- ["Date Dilemma", ...]
alter table public.shows add column if not exists podcast_rss      text;
alter table public.shows add column if not exists youtube          jsonb;       -- {channelName, channelId, searchQuery, extraChannelIds}
alter table public.shows add column if not exists gradient         text;        -- tailwind gradient string
alter table public.shows add column if not exists hero_image_class text;
alter table public.shows add column if not exists is_syndicated    boolean not null default false;
alter table public.shows add column if not exists sort_order       integer;

-- ---- hosts: fields from HostData (apps/web/src/data/hosts.ts) ----
-- (bio, social_links jsonb, youtube_channel_url, avatar_url already exist)
alter table public.hosts add column if not exists youtube_channel_id text;
alter table public.hosts add column if not exists category           text;      -- main|gospel|sunday|weekend|mixsquad
alter table public.hosts add column if not exists role               text;      -- "Host" | "DJ" | ...
alter table public.hosts add column if not exists is_syndicated      boolean not null default false;

-- ---- check_in_locations: new station-scoped table (was check-in-locations.ts) ----
create table if not exists public.check_in_locations (
  id          text primary key default ('loc_' || gen_random_uuid()::text),
  station_id  text not null default 'station_wccg' references public.stations(id) on delete restrict,
  name        text not null,
  address     text,
  lat         double precision,
  lng         double precision,
  points      integer not null default 0,
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_check_in_locations_station_id on public.check_in_locations(station_id);

drop trigger if exists set_updated_at_check_in_locations on public.check_in_locations;
create trigger set_updated_at_check_in_locations before update on public.check_in_locations
  for each row execute function public.update_updated_at_column();

alter table public.check_in_locations enable row level security;
drop policy if exists check_in_locations_read on public.check_in_locations;
create policy check_in_locations_read on public.check_in_locations for select using (true);
drop policy if exists check_in_locations_service_write on public.check_in_locations;
create policy check_in_locations_service_write on public.check_in_locations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists tenant_isolation on public.check_in_locations;
create policy tenant_isolation on public.check_in_locations as restrictive for all to public
  using (public.can_access_station(station_id))
  with check (public.can_access_station(station_id));

commit;
