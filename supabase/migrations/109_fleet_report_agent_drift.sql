-- =====================================================================
-- 109_fleet_report_agent_drift
-- bc_fleet_report now reports drift at BOTH levels, not just installs.
--
-- WHY: with only install-level drift, the six machines still running the old
-- agent were INVISIBLE. They report no installs at all -- the old agent has no
-- install discovery -- so they had an empty list and nothing to compare. The
-- absence read as "nothing to see" when it actually meant "this machine cannot
-- be tracked at all".
--
-- The signal was there the whole time: bc_device_agents.agent_version is null
-- for them. This surfaces it as 'agent too old to report', which is the
-- actionable finding -- that agent needs updating before anything else about
-- the machine can be trusted.
--
-- Also adds agent_current_release at the top level, so a caller can see what
-- the comparison is against without a second query.
--
-- studio-agent 2.1.0 was published to bc_releases alongside this, deliberately
-- with a NULL url: the agent package carries the shared fleet token in
-- agent-config.json and therefore cannot go in a public bucket. It is
-- distributed on the LAN from D:\_AirSuite-Agent (share Prod_Audio_D). A public
-- URL becomes possible once tokens are per-station rather than shared.
-- =====================================================================

create or replace function public.bc_fleet_report(p_station text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  result jsonb;
  agent_current text;
begin
  if not (
       auth.role() = 'service_role'
    or p_station = any (public.user_station_ids())
  ) then
    raise exception 'not affiliated with station %', p_station
      using hint = 'A reporting identity needs a station_members row for this station.';
  end if;

  select rel.version into agent_current
  from public.bc_releases rel
  where rel.package = 'studio-agent' and rel.channel = 'stable' and rel.is_published
  order by rel.published_at desc nulls last limit 1;

  select jsonb_build_object(
    'station_id', p_station,
    'generated_at', now(),
    'agent_current_release', agent_current,
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
      'last_seen',   dev.last_seen,
      'agents', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'agent_id', a.agent_id,
                 'agent_version', a.agent_version,
                 'last_report', a.last_report,
                 -- A null agent_version is NOT missing data. It means the agent
                 -- predates version reporting entirely, so that machine reports
                 -- no installs either and is invisible to build tracking. That
                 -- is the actionable finding: the agent needs updating before
                 -- anything else about the machine can be trusted.
                 'state', case
                            when a.agent_version is null then 'agent too old to report'
                            when agent_current is null then 'no published release'
                            when a.agent_version = agent_current then 'current'
                            else 'behind'
                          end)), '[]'::jsonb)
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
  'Read-only fleet summary for monitoring identities. Requires station AFFILIATION (any station_members role), not management -- a caller can see the plant but cannot issue pair codes, write compliance_deadlines or touch the FCC public file. Reports drift at BOTH levels: agent_version vs the published studio-agent release, and each install vs its published release. A null agent_version means "agent too old to report", which is why that machine also shows no installs. Returns raw last_seen; the caller must phrase staleness as "the cloud has not heard", never "down".';
