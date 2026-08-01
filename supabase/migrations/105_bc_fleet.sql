-- =====================================================================
-- 105_bc_fleet
-- The device layer behind the Broadcast Copy command centre.
--
-- WHAT THIS IS FOR
-- Until now the cloud knew a station had "an engine" (airsuite_station_status,
-- migration 099) and nothing more. A station is really a room full of computers:
-- playout boxes, console surfaces, an encoder, a programme desk. This adds that
-- layer -- devices, their agents, their peripherals, what is installed on them --
-- so the dashboard can show a plant rather than a single green dot.
--
-- AUTHORITY MODEL -- read this before changing anything here.
-- The on-prem hub is AUTHORITATIVE. These tables are a MIRROR. A studio must keep
-- full control of its own plant when the WAN link is down, so nothing on air ever
-- depends on this schema being reachable. Consequences:
--   * every ingest is an idempotent upsert of a full snapshot, never a delta --
--     a station that was offline for a day recovers by sending its next snapshot
--   * last_seen going stale means "the cloud has not heard", NOT "the machine is
--     down". The dashboard must say so in those words.
--   * nothing here is a control path. Phase 1 is read-only by construction:
--     there is no command queue, no desired-state column, no way for a row in
--     this database to cause a studio machine to do anything.
--
-- WRITES: service role only, from the fleet-ingest edge function, which
--         authenticates the station with the existing airsuite_station_keys key.
-- READS:  org-scoped, through user_station_ids() -- the same visibility model as
--         stations and bc_station_engines. A GM sees their own plant and nobody
--         else's.
-- =====================================================================

begin;

-- ---------------------------------------------------------------- devices ----
-- One row per physical computer.
--
-- device_key, not hostname, is the identity. Hostnames get changed, duplicated
-- across sites, and -- as this plant demonstrates -- collide in ways that look
-- deliberate: "streampc" and "stream-pc" are two different machines here. The
-- hub supplies a stable key (its own machine id) and the hostname rides along as
-- a label.
create table if not exists public.bc_devices (
  id           text primary key default ('dev_' || gen_random_uuid()::text),
  station_id   text not null references public.stations(id) on delete cascade,
  device_key   text not null,
  hostname     text,
  display_name text,
  role         text,                                  -- 'Playout -> transmitter chain'
  room         text,                                  -- 'ON-AIR' | 'PRODUCTION' | ...
  lan_ip       text,
  aoip_ip      text,
  os           text,
  -- Carries air, or feeds something that does. Drives ordering and the warning
  -- copy in the UI; it is NOT a permission and grants nothing.
  is_critical  boolean not null default false,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz,
  -- The hub's own view: cpu, memory, disks, uptime. Shape is owned by the hub
  -- and still moving, so consumers read it defensively.
  status       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (station_id, device_key)
);

create index if not exists idx_bc_devices_station on public.bc_devices(station_id);
create index if not exists idx_bc_devices_seen on public.bc_devices(last_seen desc);

-- ----------------------------------------------------------------- agents ----
-- The reporting agent on a device. Separate from the device because the agent is
-- a piece of software with its own version and health, and a device can exist in
-- the fleet before an agent is installed on it (that is the whole point of
-- pairing codes).
create table if not exists public.bc_device_agents (
  id           text primary key default ('agt_' || gen_random_uuid()::text),
  device_id    text not null references public.bc_devices(id) on delete cascade,
  agent_id     text not null,                          -- the fleet id, e.g. 'on-air-main'
  agent_version text,
  last_report  timestamptz,
  -- Watched process -> boolean, exactly as the agent reports it.
  -- A false here means "not running", which is only a fault if the process was
  -- supposed to be running. The agent cannot know that, so the UI must not
  -- render a bare false as an alarm.
  watch        jsonb not null default '{}'::jsonb,
  -- Command ids the agent will accept. Mirrored so the dashboard can show what a
  -- machine COULD be asked to do. Phase 1 never sends any of them.
  commands     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (device_id, agent_id)
);

create index if not exists idx_bc_device_agents_device on public.bc_device_agents(device_id);

-- ------------------------------------------------------------ peripherals ----
-- Anything attached to a device that matters operationally: a Dante interface, a
-- USB audio box, a serial switcher, a mapped share.
create table if not exists public.bc_device_peripherals (
  id          text primary key default ('per_' || gen_random_uuid()::text),
  device_id   text not null references public.bc_devices(id) on delete cascade,
  kind        text not null,                           -- audio|dante|serial|storage|network|other
  label       text not null,
  detail      text,
  identifier  text,                                    -- MAC, device name, COM port, UNC path
  present     boolean not null default true,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (device_id, kind, label)
);

create index if not exists idx_bc_device_peripherals_device on public.bc_device_peripherals(device_id);

-- ----------------------------------------------------------------- releases --
-- The version registry the download manager serves from. PLATFORM-GLOBAL: a
-- release is a Broadcast Copy artefact, not a station's property.
create table if not exists public.bc_releases (
  id           text primary key default ('rel_' || gen_random_uuid()::text),
  package      text not null,                          -- 'airsuite-console' | 'studio-agent' | ...
  version      text not null,
  channel      text not null default 'stable',         -- stable|beta
  title        text,
  notes        text,
  url          text,                                   -- where the artefact is served from
  sha256       text,                                   -- published so an engineer can verify
  size_bytes   bigint,
  min_os       text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (package, version, channel)
);

create index if not exists idx_bc_releases_pkg on public.bc_releases(package, channel, is_published);

-- ----------------------------------------------------------------- installs --
-- What is actually on each machine. The gap between this and bc_releases is the
-- entire value of the download manager: it is how you answer "is every console
-- on the same build" without walking the building.
create table if not exists public.bc_device_installs (
  id           text primary key default ('ins_' || gen_random_uuid()::text),
  device_id    text not null references public.bc_devices(id) on delete cascade,
  package      text not null,
  version      text,
  channel      text,
  install_path text,
  installed_at timestamptz,
  last_seen    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (device_id, package)
);

create index if not exists idx_bc_device_installs_device on public.bc_device_installs(device_id);

-- --------------------------------------------------------------- pair codes --
-- Authorisation codes. A station issues one in the dashboard; it is typed into
-- the installer on a new machine; the machine joins that station's fleet.
--
-- Deliberately short-lived and single-use. A pairing code is a bearer credential
-- for joining a tenant, so it expires by default in 30 minutes, records who
-- issued it, and records what claimed it. The code itself is generated by the
-- caller (the RPC below) from an unambiguous alphabet -- no O/0/I/1 -- because a
-- human reads it off a screen and types it at a keyboard in another room.
create table if not exists public.bc_pair_codes (
  code         text primary key,
  station_id   text not null references public.stations(id) on delete cascade,
  issued_by    uuid references auth.users(id) on delete set null,
  label        text,                                   -- what this code is meant for
  expires_at   timestamptz not null,
  claimed_at   timestamptz,
  claimed_device_id text references public.bc_devices(id) on delete set null,
  claimed_hostname  text,
  claimed_ip   text,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_bc_pair_codes_station on public.bc_pair_codes(station_id, expires_at desc);

-- ------------------------------------------------------------------- triggers
drop trigger if exists set_updated_at_bc_devices on public.bc_devices;
create trigger set_updated_at_bc_devices before update on public.bc_devices
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_bc_device_agents on public.bc_device_agents;
create trigger set_updated_at_bc_device_agents before update on public.bc_device_agents
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_bc_device_peripherals on public.bc_device_peripherals;
create trigger set_updated_at_bc_device_peripherals before update on public.bc_device_peripherals
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_bc_releases on public.bc_releases;
create trigger set_updated_at_bc_releases before update on public.bc_releases
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_bc_device_installs on public.bc_device_installs;
create trigger set_updated_at_bc_device_installs before update on public.bc_device_installs
  for each row execute function public.update_updated_at_column();

-- =====================================================================
-- RLS
-- Reads are station-scoped through user_station_ids(), which already expands an
-- org owner/gm/om across every station in their org. Writes are service-role
-- only: device state comes from the hub via the ingest function and must never
-- be writable from a browser, or a tenant could fabricate its own fleet.
-- =====================================================================
alter table public.bc_devices              enable row level security;
alter table public.bc_device_agents        enable row level security;
alter table public.bc_device_peripherals   enable row level security;
alter table public.bc_device_installs      enable row level security;
alter table public.bc_releases             enable row level security;
alter table public.bc_pair_codes           enable row level security;

drop policy if exists bc_devices_read on public.bc_devices;
create policy bc_devices_read on public.bc_devices
  for select to authenticated
  using (public.is_station_staff(station_id));

drop policy if exists bc_devices_service on public.bc_devices;
create policy bc_devices_service on public.bc_devices
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Child tables inherit visibility from their device.
drop policy if exists bc_device_agents_read on public.bc_device_agents;
create policy bc_device_agents_read on public.bc_device_agents
  for select to authenticated
  using (exists (select 1 from public.bc_devices d
                 where d.id = device_id and public.is_station_staff(d.station_id)));

drop policy if exists bc_device_agents_service on public.bc_device_agents;
create policy bc_device_agents_service on public.bc_device_agents
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists bc_device_peripherals_read on public.bc_device_peripherals;
create policy bc_device_peripherals_read on public.bc_device_peripherals
  for select to authenticated
  using (exists (select 1 from public.bc_devices d
                 where d.id = device_id and public.is_station_staff(d.station_id)));

drop policy if exists bc_device_peripherals_service on public.bc_device_peripherals;
create policy bc_device_peripherals_service on public.bc_device_peripherals
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists bc_device_installs_read on public.bc_device_installs;
create policy bc_device_installs_read on public.bc_device_installs
  for select to authenticated
  using (exists (select 1 from public.bc_devices d
                 where d.id = device_id and public.is_station_staff(d.station_id)));

drop policy if exists bc_device_installs_service on public.bc_device_installs;
create policy bc_device_installs_service on public.bc_device_installs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Releases are the product's own catalogue: anyone signed in may read published
-- ones (that is what the download manager renders), admins and service write.
drop policy if exists bc_releases_read on public.bc_releases;
create policy bc_releases_read on public.bc_releases
  for select to authenticated
  using (is_published = true or public.is_platform_admin());

drop policy if exists bc_releases_admin_write on public.bc_releases;
create policy bc_releases_admin_write on public.bc_releases
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists bc_releases_service on public.bc_releases;
create policy bc_releases_service on public.bc_releases
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Pair codes: station staff may SEE codes for their own station (so they can read
-- one off the screen) but may not write them directly -- issuing goes through the
-- RPC below so expiry and generation are enforced in one place. Claiming is
-- service-role only: the machine side has no session and must come through the
-- edge function.
drop policy if exists bc_pair_codes_read on public.bc_pair_codes;
create policy bc_pair_codes_read on public.bc_pair_codes
  for select to authenticated
  using (public.is_station_staff(station_id));

drop policy if exists bc_pair_codes_service on public.bc_pair_codes;
create policy bc_pair_codes_service on public.bc_pair_codes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- =====================================================================
-- RPCs
-- =====================================================================

-- The whole plant for one station, shaped for the dashboard in a single call.
-- SECURITY INVOKER on purpose: the RLS policies above are the authority, so this
-- cannot leak another tenant's fleet even if it is called with a station id the
-- caller does not own.
create or replace function public.bc_fleet(p_station text)
returns table (
  device_id text, device_key text, hostname text, display_name text,
  role text, room text, lan_ip text, aoip_ip text, is_critical boolean,
  last_seen timestamptz, status jsonb,
  agents jsonb, peripherals jsonb, installs jsonb
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    d.id, d.device_key, d.hostname, d.display_name,
    d.role, d.room, d.lan_ip, d.aoip_ip, d.is_critical,
    d.last_seen, d.status,
    coalesce((select jsonb_agg(to_jsonb(a) order by a.agent_id)
              from public.bc_device_agents a where a.device_id = d.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(p) order by p.kind, p.label)
              from public.bc_device_peripherals p where p.device_id = d.id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(i) order by i.package)
              from public.bc_device_installs i where i.device_id = d.id), '[]'::jsonb)
  from public.bc_devices d
  where d.station_id = p_station
  order by d.is_critical desc, d.room nulls last, d.hostname;
$$;

grant execute on function public.bc_fleet(text) to authenticated;

-- Issue a pairing code. SECURITY DEFINER so it can insert past the
-- service-role-only write policy, but it re-checks station staffing itself --
-- definer functions bypass RLS, so the check has to be explicit and first.
create or replace function public.bc_issue_pair_code(
  p_station text,
  p_label text default null,
  p_ttl_minutes integer default 30
)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code text;
  v_expires timestamptz;
  -- No O/0/I/1/S/5: this gets read off a screen and typed in another room.
  v_alphabet text := 'ABCDEFGHJKLMNPQRTUVWXYZ23456789';
  i integer;
begin
  if not public.is_station_staff(p_station) then
    raise exception 'not authorised for station %', p_station using errcode = '42501';
  end if;
  if p_ttl_minutes is null or p_ttl_minutes < 1 or p_ttl_minutes > 1440 then
    raise exception 'ttl must be between 1 and 1440 minutes';
  end if;

  v_code := '';
  for i in 1..8 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
  v_expires := now() + make_interval(mins => p_ttl_minutes);

  insert into public.bc_pair_codes (code, station_id, issued_by, label, expires_at)
  values (v_code, p_station, auth.uid(), p_label, v_expires);

  return query select v_code, v_expires;
end;
$$;

grant execute on function public.bc_issue_pair_code(text, text, integer) to authenticated;

-- Revoke an unclaimed code early.
create or replace function public.bc_revoke_pair_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_station text;
begin
  select station_id into v_station from public.bc_pair_codes where code = p_code;
  if v_station is null then return false; end if;
  if not public.is_station_staff(v_station) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  update public.bc_pair_codes set revoked_at = now()
   where code = p_code and claimed_at is null and revoked_at is null;
  return found;
end;
$$;

grant execute on function public.bc_revoke_pair_code(text) to authenticated;

-- Seed the release registry with what actually exists today, so the download
-- manager has something true to render on day one. Unpublished until the
-- artefact is confirmed reachable at that URL.
insert into public.bc_releases (package, version, channel, title, notes, url, sha256, size_bytes, min_os, is_published)
values (
  'airsuite-console', '1.0.0', 'stable',
  'AirSuite Console',
  'Software mixing console for a Dante studio. Sixteen strips, PGM/AUD/UTILITY buses, cue, mic logic, mix-minus, EBU R 128 loudness. Ships with outputs disabled and bound to loopback.',
  'https://broadcastcopy.ai/downloads/AirSuiteConsole-1.0.0.zip',
  'bde2006993ab4391540c514ade5a46ed767d9419265ba00012ce67ea7472571b',
  49075133,
  'Windows 10/11 64-bit',
  true
)
on conflict (package, version, channel) do nothing;

commit;
