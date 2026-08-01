-- =====================================================================
-- 107_wccg_staff_roles
-- The real WCCG staff taxonomy, per the operator (2026-08-01):
--   DJs, station personnel, engineering, operations, general manager,
--   promotions, marketing, production.
--
-- ALIGNED, NOT INVENTED. is_staff() has carried almost exactly this list since
-- it was written -- sales, production, engineering, admin, super_admin,
-- management, operations, promotions, traffic, gm -- it was simply never
-- populated anywhere (profiles.user_type is 'listener' for all 47 accounts, and
-- user_roles has one row). This migration makes station_members.role speak that
-- same vocabulary instead of adding a competing one. 'marketing' is the only
-- genuinely new value; the operator named it and is_staff() lacks it.
--
-- ENGINEERING IS WHY THIS SHAPE WORKS. "Engineering has access to stations where
-- they are authorized" falls straight out of station_members being keyed
-- (station_id, user_id): one row per station an engineer is authorised on, and
-- no row for the rest. Nothing extra to build, and revocation is deleting a row.
--
-- NO PEOPLE ARE ASSIGNED HERE. Only Kalim Hasan's Program Director role is
-- known (migration 106). Who is engineering, promotions, production etc. is not
-- something to guess at -- a wrong guess here silently grants or denies real
-- access. Vocabulary now; assignment when the operator says who is who.
-- =====================================================================

alter table public.station_members drop constraint if exists chk_station_member_role;
alter table public.station_members add constraint chk_station_member_role
  check (role = any (array[
    -- station leadership
    'station_admin','gm','program_director','operations',
    -- departments
    'engineering','production','promotions','marketing','sales','traffic',
    -- generic / on-air / audience
    'staff','dj','listener'
  ]));

-- ------------------------------------------------------- who is management --
-- Gates the bc_* fleet reads, compliance_deadlines, public_file_documents
-- writes, and pair-code issue/revoke.
--
-- engineering IS included: the fleet -- machines, agents, installed builds,
-- device enrolment -- is precisely their job, and locking engineers out of it
-- would defeat the point of the fleet view.
--
-- promotions / marketing / production / sales / traffic are NOT included. They
-- are staff, but nothing is_station_staff() currently gates is theirs: none of
-- them needs the machine plant, the FCC public file, or to enrol a device. They
-- reach the things they do need through is_staff() and the per-table policies.
-- Widening this to "any employee" would make the function mean 'affiliated'
-- again, which is the exact bug migration 106 fixed.
create or replace function public.is_station_staff(p_station text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public.is_platform_admin()
      or exists (
        select 1 from public.station_members sm
        where sm.user_id = auth.uid()
          and sm.station_id = p_station
          and sm.role in ('station_admin','gm','program_director','operations','engineering','staff')
      )
      or exists (
        select 1
        from public.stations s
        join public.organization_members om on om.org_id = s.org_id
        where s.id = p_station
          and om.user_id = auth.uid()
          and om.role in ('owner','gm','om')
      );
$function$;

comment on function public.is_station_staff(text) is
  'MANAGEMENT of a station: station_admin/gm/program_director/operations/engineering/staff on that station, or owner/gm/om of the owning org. NOT mere affiliation -- use user_station_ids() for that. Engineering is included because the bc_* fleet is its job. Distinct from is_staff(), which reads profiles.user_type/user_roles and gates EAS, points and CMS.';

-- ------------------------------------------------------------- verification --
do $$
declare pd_rows int; bad int;
begin
  -- The Program Director must survive this. An administrator-less platform is
  -- not a state worth risking on a silent partial apply.
  select count(*) into pd_rows
    from public.station_members sm join auth.users u on u.id = sm.user_id
   where u.email = 'biggleem@gmail.com' and sm.station_id = 'station_wccg'
     and sm.role in ('station_admin','gm','program_director','operations','engineering','staff');
  if pd_rows <> 1 then
    raise exception 'ABORT: program director has % management rows, expected 1', pd_rows;
  end if;

  select count(*) into bad from public.station_members
   where role not in ('station_admin','gm','program_director','operations',
                      'engineering','production','promotions','marketing','sales','traffic',
                      'staff','dj','listener');
  if bad > 0 then
    raise exception 'ABORT: % rows hold a role outside the vocabulary', bad;
  end if;
end $$;
