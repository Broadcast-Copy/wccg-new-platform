-- 099: AirSuite engine fleet telemetry (Broadcast Copy)
-- Station-scoped heartbeat/status from on-prem AirSuite playout engines.
-- Writes: service role only, via edge fn airsuite-heartbeat which validates a
--         per-station key held in airsuite_station_keys (service-role-only table).
-- Reads: platform admins (fleet view). Station-member read policies arrive with
--        the dashboard control plane.

create table if not exists public.airsuite_station_status (
  station_id text primary key references public.stations(id) on delete cascade,
  updated_at timestamptz not null default now(),
  engine_version text,
  status jsonb not null default '{}'::jsonb
);

alter table public.airsuite_station_status enable row level security;

create policy airsuite_status_admin_read on public.airsuite_station_status
  for select using (public.is_platform_admin());

create table if not exists public.airsuite_station_keys (
  station_id text primary key references public.stations(id) on delete cascade,
  key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.airsuite_station_keys enable row level security;
-- no policies on airsuite_station_keys: service-role access only

insert into public.airsuite_station_keys (station_id)
values ('station_wccg')
on conflict (station_id) do nothing;
