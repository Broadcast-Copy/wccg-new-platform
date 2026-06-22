-- =====================================================================
-- 085_tenancy_control_plane
-- Broadcast Copy — Phase 0: multi-tenant foundation (control plane).
--
-- Adds the organizations -> stations hierarchy, membership, domains,
-- entitlements, and the tenant-aware RLS helper functions that later
-- migrations (087-090) build on. WCCG is seeded as tenant #1 in 086.
-- NO existing table is modified here, so this migration is inert until
-- the column/RLS migrations run — safe to apply and verify on its own.
-- =====================================================================

begin;

-- ---- organizations (account = data-isolation boundary) --------------
create table if not exists public.organizations (
  id          text primary key default ('org_' || gen_random_uuid()::text),
  name        text not null,
  slug        text not null unique,
  status      text not null default 'active',     -- active|suspended|archived
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- stations (FCC FM/AM = billing unit + content scope) ------------
create table if not exists public.stations (
  id          text primary key default ('station_' || gen_random_uuid()::text),
  org_id      text not null references public.organizations(id) on delete restrict,
  name        text not null,
  slug        text not null unique,               -- subdomain key (globally unique)
  call_sign   text,
  band        text,                               -- FM|AM|private
  frequency   text,
  market      text,
  timezone    text not null default 'America/New_York',
  status      text not null default 'active',      -- active|inactive|maintenance
  is_public   boolean not null default true,       -- visible on the public web
  branding    jsonb not null default '{}'::jsonb,  -- logo/colors/etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_stations_org on public.stations(org_id);
create index if not exists idx_stations_public on public.stations(status, is_public);

-- ---- station_domains (hostname -> station, for Phase-3 routing) -----
create table if not exists public.station_domains (
  id          text primary key default ('dom_' || gen_random_uuid()::text),
  station_id  text not null references public.stations(id) on delete cascade,
  hostname    text not null unique,
  is_primary  boolean not null default false,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_station_domains_station on public.station_domains(station_id);
create unique index if not exists uq_station_domains_primary
  on public.station_domains(station_id) where is_primary;

-- ---- organization_members (user <-> org, org-level roles) ----------
create table if not exists public.organization_members (
  org_id     text not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null,                        -- owner|gm|om|billing|staff
  created_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint chk_org_member_role check (role in ('owner','gm','om','billing','staff'))
);
create index if not exists idx_org_members_user on public.organization_members(user_id);

-- ---- station_members (user <-> station, station-level roles) --------
create table if not exists public.station_members (
  station_id text not null references public.stations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null,                        -- station_admin|staff|dj
  created_at timestamptz not null default now(),
  primary key (station_id, user_id),
  constraint chk_station_member_role check (role in ('station_admin','staff','dj'))
);
create index if not exists idx_station_members_user on public.station_members(user_id);

-- ---- station_entitlements (per-station plan + feature flags) --------
create table if not exists public.station_entitlements (
  id           text primary key default ('ent_' || gen_random_uuid()::text),
  station_id   text not null unique references public.stations(id) on delete cascade,
  plan         text not null default 'flagship',   -- flagship|starter|pro|enterprise
  features     jsonb not null default '{}'::jsonb,  -- {"crm":true,"loyalty":true,...}
  period_start timestamptz not null default now(),
  period_end   timestamptz,
  status       text not null default 'active',      -- active|past_due|canceled
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---- updated_at triggers (reuse existing helper) -------------------
drop trigger if exists set_updated_at_organizations on public.organizations;
create trigger set_updated_at_organizations before update on public.organizations
  for each row execute function public.update_updated_at_column();
drop trigger if exists set_updated_at_stations on public.stations;
create trigger set_updated_at_stations before update on public.stations
  for each row execute function public.update_updated_at_column();
drop trigger if exists set_updated_at_station_entitlements on public.station_entitlements;
create trigger set_updated_at_station_entitlements before update on public.station_entitlements
  for each row execute function public.update_updated_at_column();

-- =====================================================================
-- Tenant-aware RLS helpers (SECURITY DEFINER + STABLE).
--   SECURITY DEFINER => read membership tables WITHOUT re-triggering RLS
--                       (prevents recursive-policy errors).
--   STABLE           => Postgres evaluates them once per statement, not
--                       once per row (critical for points_history ~210k).
-- Mirrors the existing public.is_admin() / is_staff() convention.
-- =====================================================================
create or replace function public.user_org_ids()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(org_id), '{}')
  from public.organization_members
  where user_id = auth.uid();
$$;

create or replace function public.user_station_ids()
returns text[] language sql stable security definer set search_path = public as $$
  -- direct station membership UNION every station of an org the caller
  -- runs (owner/gm/om expand across all stations in their org)
  select coalesce(array_agg(distinct sid), '{}') from (
    select station_id as sid from public.station_members where user_id = auth.uid()
    union
    select s.id
    from public.stations s
    join public.organization_members om on om.org_id = s.org_id
    where om.user_id = auth.uid() and om.role in ('owner','gm','om')
  ) x;
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  -- Broadcast Copy super-admin / support bypass
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.user_type = 'super_admin'
  );
$$;

create or replace function public.is_station_staff(p_station text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or p_station = any (public.user_station_ids());
$$;

create or replace function public.user_in_org(p_org text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or p_org = any (public.user_org_ids());
$$;

revoke all on function
  public.user_org_ids(), public.user_station_ids(),
  public.is_platform_admin(), public.is_station_staff(text), public.user_in_org(text)
from public;
grant execute on function
  public.user_org_ids(), public.user_station_ids(),
  public.is_platform_admin(), public.is_station_staff(text), public.user_in_org(text)
to authenticated, anon, service_role;

-- =====================================================================
-- RLS on the control-plane tables themselves.
-- Membership tables use a DIRECT auth.uid() check (NO helper calls) so
-- they never recurse through user_*_ids(). All writes are service_role /
-- platform-admin in Phase 0 (the control-plane UI arrives in Phase 2).
-- =====================================================================
alter table public.organizations        enable row level security;
alter table public.stations             enable row level security;
alter table public.station_domains      enable row level security;
alter table public.organization_members enable row level security;
alter table public.station_members      enable row level security;
alter table public.station_entitlements enable row level security;

-- organizations: members (or platform admin) read; service writes
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations for select to authenticated
  using (id = any (public.user_org_ids()) or public.is_platform_admin());
drop policy if exists organizations_service_write on public.organizations;
create policy organizations_service_write on public.organizations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- stations: anon may read active+public (needed for hostname->station
-- resolution on the public site); org members read all of their org's
drop policy if exists stations_read_public on public.stations;
create policy stations_read_public on public.stations for select
  using (status = 'active' and is_public);
drop policy if exists stations_read_member on public.stations;
create policy stations_read_member on public.stations for select to authenticated
  using (org_id = any (public.user_org_ids()) or public.is_platform_admin());
drop policy if exists stations_service_write on public.stations;
create policy stations_service_write on public.stations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- station_domains: public read (routing resolution is not secret)
drop policy if exists station_domains_read on public.station_domains;
create policy station_domains_read on public.station_domains for select using (true);
drop policy if exists station_domains_service_write on public.station_domains;
create policy station_domains_service_write on public.station_domains for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- organization_members: self-read only (direct uid => no recursion)
drop policy if exists org_members_read_self on public.organization_members;
create policy org_members_read_self on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());
drop policy if exists org_members_service_write on public.organization_members;
create policy org_members_service_write on public.organization_members for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- station_members: self-read only (direct uid => no recursion)
drop policy if exists station_members_read_self on public.station_members;
create policy station_members_read_self on public.station_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());
drop policy if exists station_members_service_write on public.station_members;
create policy station_members_service_write on public.station_members for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- station_entitlements: station's org members read; service (billing) writes
drop policy if exists station_entitlements_read on public.station_entitlements;
create policy station_entitlements_read on public.station_entitlements for select to authenticated
  using (station_id = any (public.user_station_ids()) or public.is_platform_admin());
drop policy if exists station_entitlements_service_write on public.station_entitlements;
create policy station_entitlements_service_write on public.station_entitlements for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

commit;
