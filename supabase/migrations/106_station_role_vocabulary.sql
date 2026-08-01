-- =====================================================================
-- 106_station_role_vocabulary
-- Step 0 of the tenancy work: give station roles a real vocabulary, and make
-- is_station_staff() mean "management of this station" instead of "affiliated
-- with this station at all".
--
-- WHY
-- Every one of the 34 station_members rows is role='dj', and the Program
-- Director's entire admin capability rests on a SINGLE row in user_roles
-- (role_admin) -- a table with exactly that one row in it and no other purpose.
-- Every other signal says Kalim Hasan is an ordinary listener who happens to be
-- a DJ. Anyone tidying up what looks like a vestigial table silently strips the
-- only administrator on the platform: no error, EAS and points and CMS just
-- quietly become read-only, and the cause is very hard to find from the symptom.
--
-- This records the PD role where it reads as deliberate, and stops
-- is_station_staff() treating all 33 other DJs as station management.
--
-- DELIBERATELY NOT REMOVING the user_roles role_admin row. It still feeds
-- is_staff(), which is a DIFFERENT function on a different table (profiles /
-- user_roles) and is what actually gates eas_alerts, points_rules and cms.
-- Removing it here would be a swap, not an addition, and would take the PD's
-- access away in the same breath as granting it. Add now, verify in production,
-- remove in a later migration if ever.
--
-- WHAT THIS CHANGES FOR DJs -- read before applying.
-- Narrowing is_station_staff() is a REMOVAL for the 33 non-PD DJs. It is the
-- point of the change, and every case is one they should not have had:
--   * bc_devices / bc_device_agents / bc_device_installs / bc_device_peripherals
--     / bc_pair_codes reads -- the machine plant. Not a DJ's business.
--   * compliance_deadlines -- FCC compliance. Management.
--   * public_file_documents writes -- the FCC public file. Management.
--   * bc_issue_pair_code / bc_revoke_pair_code -- device enrolment. Management.
-- DJs do NOT lose ordinary access: can_access_station() also passes on the
-- station being active+public, so tenant_isolation still admits them. That
-- is_public clause is itself wrong for writes and is removed in a later step --
-- which is exactly why this one has to land first.
-- =====================================================================

-- --------------------------------------------------------------- vocabulary --
-- 'listener' is added now although nothing uses it yet: the 13 public signups
-- get enrolled with it in the next step, and widening a CHECK twice for one
-- piece of work is churn. station_admin and staff are kept as-is so nothing
-- existing has to move.
alter table public.station_members drop constraint if exists chk_station_member_role;
alter table public.station_members add constraint chk_station_member_role
  check (role = any (array['station_admin','program_director','staff','dj','listener']));

-- ------------------------------------------------------------ the PD's role --
update public.station_members sm
   set role = 'program_director'
  from auth.users u
 where u.id = sm.user_id
   and u.email = 'biggleem@gmail.com'
   and sm.station_id = 'station_wccg';

-- ------------------------------------------------------- management, not all --
-- Was: is_platform_admin() or p_station = any(user_station_ids())
-- user_station_ids() is plain AFFILIATION and stays that way -- a later step
-- uses it for can_write_station(), where "any member of this station may write
-- their own rows" is the correct rule. Privilege is a different question and
-- now asks a different one.
create or replace function public.is_station_staff(p_station text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public.is_platform_admin()
      -- management of the station itself
      or exists (
        select 1 from public.station_members sm
        where sm.user_id = auth.uid()
          and sm.station_id = p_station
          and sm.role in ('station_admin','program_director','staff')
      )
      -- management of the OWNING ORG. Carried over from user_station_ids()
      -- unchanged; dropping it would lock an org owner out of their own station.
      or exists (
        select 1
        from public.stations s
        join public.organization_members om on om.org_id = s.org_id
        where s.id = p_station
          and om.user_id = auth.uid()
          and om.role in ('owner','gm','om')
      );
$function$;

-- ------------------------------------------------------------- verification --
-- auth.uid() is null in a migration, so is_station_staff() cannot be evaluated
-- for a specific person here. Assert the DATA the new predicate depends on
-- instead, and fail the whole migration rather than half-apply it -- a silent
-- partial apply here means an administrator-less platform.
do $$
declare
  pd_rows   int;
  dj_rows   int;
  bad_roles int;
begin
  select count(*) into pd_rows
    from public.station_members sm
    join auth.users u on u.id = sm.user_id
   where u.email = 'biggleem@gmail.com'
     and sm.station_id = 'station_wccg'
     and sm.role in ('station_admin','program_director','staff');

  if pd_rows <> 1 then
    raise exception
      'ABORT: program director biggleem@gmail.com has % management rows on station_wccg, expected 1. The platform would have no station administrator.', pd_rows;
  end if;

  select count(*) into dj_rows
    from public.station_members where station_id='station_wccg' and role='dj';
  raise notice 'station_wccg: 1 program_director, % dj', dj_rows;

  select count(*) into bad_roles
    from public.station_members
   where role not in ('station_admin','program_director','staff','dj','listener');
  if bad_roles > 0 then
    raise exception 'ABORT: % station_members rows hold a role outside the vocabulary', bad_roles;
  end if;
end $$;

comment on function public.is_station_staff(text) is
  'MANAGEMENT of a station (station_admin/program_director/staff, or owner/gm/om of the owning org). NOT mere affiliation -- use user_station_ids() for that. Distinct from is_staff(), which reads profiles.user_type/user_roles and gates EAS, points and CMS.';
