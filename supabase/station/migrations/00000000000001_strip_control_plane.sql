-- =====================================================================
-- station/00000000000001_strip_control_plane
--
-- Runs immediately after 00000000000000_baseline.sql when provisioning a NEW
-- station database. The baseline is a full dump of the public schema, so it
-- arrives carrying the control-plane tables too; this removes them, leaving a
-- database that holds exactly one station's content and nothing about any other.
--
-- Why strip rather than filter the dump: `supabase db dump --exclude` applies
-- only to DATA-ONLY dumps, so a schema dump cannot be filtered on the way out.
-- Dropping named tables afterwards is deterministic; parsing pg_dump output is
-- not.
--
-- NOT DROPPED, and this is the important part:
--   * `stations`       -- 92 content tables have a foreign key to it. A station
--                         database keeps this table and holds exactly ONE row:
--                         itself.
--   * `organizations`  -- 42 inbound FKs including from `stations` itself. One
--                         row: the owning org.
--   * `profiles`, `user_roles` -- identity is per-database (each Supabase
--                         project has its own auth.users), so every database
--                         needs its own copy.
-- Dropping either of the first two would break 134 foreign keys. See
-- supabase/TENANCY.md.
-- =====================================================================

-- --------------------------------------------------------------------- guard --
-- This migration is destructive and belongs ONLY in a fresh station database.
-- Run against the control plane (or against WCCG's current combined database,
-- which is still both) it would delete the entire fleet, every release record
-- and the tenant directory.
--
-- The test is data, not a name: a control-plane database has devices in it, a
-- newly provisioned station database has none. Checking for rows beats checking
-- for a project ref, which is easy to get wrong and easy to fake.
do $$
declare n int;
begin
  if to_regclass('public.bc_devices') is null then
    raise notice 'bc_devices absent - already stripped, or a baseline that never had it. Continuing.';
    return;
  end if;
  execute 'select count(*) from public.bc_devices' into n;
  if n > 0 then
    raise exception using
      message = format('REFUSING TO RUN: bc_devices holds %s rows, so this is a CONTROL-PLANE database, not a fresh station.', n),
      hint    = 'This migration drops the fleet, releases and tenant directory. It belongs only in a newly provisioned station database. If you are re-provisioning, empty bc_devices deliberately first.';
  end if;
end $$;

-- ------------------------------------------------------- control-plane RPCs --
-- These read or write control-plane tables and have no meaning inside a single
-- station's database. Dropped before their tables so nothing is left pointing
-- at something that no longer exists.
drop function if exists public.bc_fleet(text);
drop function if exists public.bc_issue_pair_code(text, text, integer);
drop function if exists public.bc_revoke_pair_code(text);
drop function if exists public.bc_station_engines();
drop function if exists public.bc_create_org(text);
drop function if exists public.bc_update_org(text, text);
drop function if exists public.bc_org_team(text);
drop function if exists public.bc_invite_member(text, text, text);
drop function if exists public.bc_list_invites(text);
drop function if exists public.bc_revoke_invite(text);
drop function if exists public.bc_invite_preview(text);
drop function if exists public.bc_accept_invite(text);

-- ----------------------------------------------------------- fleet & product --
-- bc_device_agents / bc_device_installs / bc_device_peripherals / bc_pair_codes
-- all have a foreign key to bc_devices, so children go first and bc_devices last.
drop table if exists public.bc_device_agents      cascade;
drop table if exists public.bc_device_installs    cascade;
drop table if exists public.bc_device_peripherals cascade;
drop table if exists public.bc_pair_codes         cascade;
drop table if exists public.bc_devices            cascade;

drop table if exists public.bc_releases  cascade;
drop table if exists public.bc_changelog cascade;
drop table if exists public.bc_features  cascade;

-- ------------------------------------------------ BC sales & tenant directory --
drop table if exists public.bc_leads             cascade;
drop table if exists public.bc_org_invites       cascade;
drop table if exists public.organization_members cascade;
drop table if exists public.station_domains      cascade;
drop table if exists public.station_entitlements cascade;
drop table if exists public.platform_fees        cascade;

-- ------------------------------------------------------- station credentials --
-- The per-station key and status live with the platform that issues them, not
-- with the station being described.
drop table if exists public.airsuite_station_keys   cascade;
drop table if exists public.airsuite_station_status cascade;

-- ------------------------------------------------------------ platform audit --
drop table if exists public.audit_log         cascade;
drop table if exists public.impersonation_log cascade;

-- ---------------------------------------------------------------- dead RBAC --
-- 94 rows of fully populated role/permission tables that NOTHING reads: no RLS
-- policy, no database function, no application code (verified 2026-08-01). Left
-- out of new stations rather than propagated. `user_roles` is deliberately kept
-- -- it IS live, is_staff() reads it.
drop table if exists public.role_permissions cascade;
drop table if exists public.permissions      cascade;
drop table if exists public.roles            cascade;

-- ------------------------------------------------------------- verification --
do $$
declare leftover text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into leftover
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname in ('bc_devices','bc_device_agents','bc_device_installs',
                      'bc_device_peripherals','bc_pair_codes','bc_releases',
                      'bc_changelog','bc_features','bc_leads','bc_org_invites',
                      'organization_members','station_domains','station_entitlements',
                      'platform_fees','airsuite_station_keys','airsuite_station_status',
                      'audit_log','impersonation_log','roles','permissions','role_permissions');
  if leftover is not null then
    raise exception 'control-plane tables survived the strip: %', leftover;
  end if;

  -- The two that MUST survive. Losing these means 134 broken foreign keys.
  if to_regclass('public.stations') is null then
    raise exception 'ABORT: stations was dropped. 92 content tables reference it.';
  end if;
  if to_regclass('public.organizations') is null then
    raise exception 'ABORT: organizations was dropped. 42 tables reference it, including stations.';
  end if;

  raise notice 'control plane stripped; stations and organizations intact';
end $$;
