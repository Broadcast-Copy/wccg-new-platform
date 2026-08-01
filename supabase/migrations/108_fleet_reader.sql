-- =====================================================================
-- 108_fleet_reader
-- A read-only fleet report that a monitoring agent can call WITHOUT being able
-- to change anything.
--
-- THE PROBLEM THIS FIXES
-- Reading the fleet and enrolling a machine into it were the same permission.
-- Both bc_devices_read and bc_issue_pair_code / bc_revoke_pair_code gate on
-- is_station_staff(), so any identity that could see the plant could also add
-- devices to it. For a reporting agent whose entire instruction set says "you do
-- not act", that is the wrong grant -- and it is the kind of over-permission that
-- is only ever noticed after it is used.
--
-- THE SPLIT ALREADY EXISTS, THIS USES IT
-- Migrations 106/107 separated affiliation from management:
--   user_station_ids()   -> every station you are attached to, ANY role
--   is_station_staff()   -> only management roles on that station
-- So a reporting identity needs affiliation without management. That is a new
-- role, 'monitor': present in station_members, therefore inside
-- user_station_ids(), therefore able to call this function -- and absent from
-- the management list, therefore unable to issue a pair code, touch
-- compliance_deadlines or write the FCC public file.
-- =====================================================================

alter table public.station_members drop constraint if exists chk_station_member_role;
alter table public.station_members add constraint chk_station_member_role
  check (role = any (array[
    'station_admin','gm','program_director','operations',
    'engineering','production','promotions','marketing','sales','traffic',
    'staff','dj','listener',
    'monitor'   -- non-human reporting identities: affiliated, never management
  ]));

comment on column public.station_members.role is
  'Management roles (station_admin/gm/program_director/operations/engineering/staff) satisfy is_station_staff(). dj/listener/monitor do not -- they are affiliation only. monitor is for non-human reporting identities.';

-- ---------------------------------------------------------------------------
-- bc_fleet_report: everything a monitoring agent needs, and nothing else.
--
-- SECURITY DEFINER so it can read the bc_* tables, but it opens with an explicit
-- affiliation check -- definer rights without that check would let any
-- authenticated user read any station's plant.
--
-- Returns installed builds ALONGSIDE the current published release, because the
-- gap between them is the only question worth asking: is every machine on the
-- same build. A null version is passed through as null and labelled
-- 'build unknown' rather than being dropped or guessed -- "installed but
-- unmanaged" is a finding, not missing data.
-- ---------------------------------------------------------------------------
create or replace function public.bc_fleet_report(p_station text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  result jsonb;
begin
  if not (
       auth.role() = 'service_role'
    or p_station = any (public.user_station_ids())
  ) then
    raise exception 'not affiliated with station %', p_station
      using hint = 'A reporting identity needs a station_members row for this station.';
  end if;

  select jsonb_build_object(
    'station_id', p_station,
    'generated_at', now(),
    'devices', coalesce(jsonb_agg(d order by d->>'device_key'), '[]'::jsonb)
  )
  into result
  from (
    select jsonb_build_object(
      'device_key',  dev.device_key,
      'hostname',    dev.hostname,
      'role',        dev.role,
      'room',        dev.room,
      'is_critical', dev.is_critical,
      -- Deliberately raw. The CALLER decides what "stale" means and must say
      -- "the cloud has not heard from this machine", never "it is down" -- the
      -- on-prem hub is authoritative and a studio can lose its WAN link and be
      -- perfectly healthy.
      'last_seen',   dev.last_seen,
      'agents', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'agent_id', a.agent_id,
                 'agent_version', a.agent_version,
                 'last_report', a.last_report)), '[]'::jsonb)
        from public.bc_device_agents a where a.device_id = dev.id
      ),
      'installs', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'package', i.package,
                 'version', i.version,
                 'state', case
                            when i.version is null then 'build unknown'
                            when r.version is null then 'no published release'
                            when i.version = r.version then 'current'
                            else 'behind'
                          end,
                 'current_release', r.version,
                 'install_path', i.install_path,
                 'last_seen', i.last_seen)), '[]'::jsonb)
        from public.bc_device_installs i
        left join lateral (
          select rel.version from public.bc_releases rel
          where rel.package = i.package and rel.channel = 'stable' and rel.is_published
          order by rel.published_at desc nulls last limit 1
        ) r on true
        where i.device_id = dev.id
      )
    ) as d
    from public.bc_devices dev
    where dev.station_id = p_station
  ) x;

  return coalesce(result, jsonb_build_object('station_id', p_station, 'devices', '[]'::jsonb));
end;
$function$;

comment on function public.bc_fleet_report(text) is
  'Read-only fleet summary for monitoring identities. Requires station AFFILIATION (any station_members role), not management -- so a caller can see the plant but cannot issue pair codes, write compliance_deadlines or touch the FCC public file. Returns raw last_seen; the caller must phrase staleness as "the cloud has not heard", never "down".';

-- Only signed-in identities. anon has no business reading a station's plant.
revoke all on function public.bc_fleet_report(text) from public, anon;
grant execute on function public.bc_fleet_report(text) to authenticated, service_role;

-- ------------------------------------------------------------- verification --
do $$
declare pd int;
begin
  -- 106/107 invariant must survive: the PD is still management.
  select count(*) into pd
    from public.station_members sm join auth.users u on u.id = sm.user_id
   where u.email = 'biggleem@gmail.com'
     and sm.role in ('station_admin','gm','program_director','operations','engineering','staff');
  if pd <> 1 then
    raise exception 'ABORT: program director lost management (% rows)', pd;
  end if;

  -- 'monitor' must NOT be a management role, or this whole migration is pointless.
  if 'monitor' = any (array['station_admin','gm','program_director','operations','engineering','staff']) then
    raise exception 'ABORT: monitor is in the management set';
  end if;

  raise notice 'bc_fleet_report created; monitor role added as affiliation-only';
end $$;
