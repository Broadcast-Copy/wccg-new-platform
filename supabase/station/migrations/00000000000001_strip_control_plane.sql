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
drop function if exists public.bc_update_station(text, text, text, text);

-- The back office (migrations 115-118): admin RPCs, the licence-key functions
-- and the audit writer. bc_update_org/bc_update_station above also write to the
-- audit trail, which is why neither may survive in a station database.
drop function if exists public.bc_admin_licenses();
drop function if exists public.bc_admin_license_activations(text);
drop function if exists public.bc_admin_license_issue(text, text, text[], integer, timestamptz, text, text);
drop function if exists public.bc_admin_license_update(text, jsonb);
drop function if exists public.bc_admin_license_revoke(text, text);
drop function if exists public.bc_admin_license_rotate(text, text);
drop function if exists public.bc_admin_license_release_activation(text);
drop function if exists public.bc_license_validate(text, text, text, text, text);
drop function if exists public.bc_license_generate();
drop function if exists public.bc_license_canonical(text);
drop function if exists public.bc_license_hash(text);
drop function if exists public.bc_license_display(text);
drop function if exists public.bc_license_status(timestamptz, timestamptz);
drop function if exists public.bc_license_clean_packages(text[]);
drop function if exists public.bc_admin_users(text, boolean, integer, integer);
drop function if exists public.bc_admin_grant_super_admin(uuid);
drop function if exists public.bc_admin_revoke_super_admin(uuid);
drop function if exists public.bc_admin_orgs();
drop function if exists public.bc_admin_org_detail(text);
drop function if exists public.bc_admin_set_org_status(text, text);
drop function if exists public.bc_admin_set_station_status(text, text);
drop function if exists public.bc_admin_station_keys();
drop function if exists public.bc_station_is_live(text);
drop function if exists public.bc_require_platform_admin();

-- The last-super-admin guard (117) sits on user_roles, which a station database
-- KEEPS (identity is per-database). The rule belongs to the control plane, so
-- the triggers go and user_roles stays.
drop trigger if exists bc_guard_last_super_admin    on public.user_roles;
drop trigger if exists bc_guard_user_roles_truncate on public.user_roles;
drop function if exists public.bc_guard_last_super_admin();
drop function if exists public.bc_guard_user_roles_truncate();

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
drop table if exists public.bc_docs      cascade;

-- Software licence keys (116). Activations FK to keys, so children first.
drop function if exists public.bc_license_public(public.bc_license_keys);
drop table if exists public.bc_license_activations cascade;
drop table if exists public.bc_license_throttle    cascade;
drop table if exists public.bc_license_keys        cascade;

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

-- The back-office audit trail (115) and the functions that write it. The row
-- triggers that called bc_audit_row_change went with their tables above.
drop table if exists public.bc_admin_audit cascade;
drop function if exists public.bc_audit_row_change() cascade;
drop function if exists public.bc_audit(text, text, text, jsonb, jsonb, text);
drop function if exists public.bc_admin_audit_append_only();

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
                      'bc_changelog','bc_features','bc_docs','bc_leads','bc_org_invites',
                      'organization_members','station_domains','station_entitlements',
                      'platform_fees','airsuite_station_keys','airsuite_station_status',
                      'audit_log','impersonation_log','roles','permissions','role_permissions',
                      'bc_admin_audit','bc_license_keys','bc_license_activations','bc_license_throttle');
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
