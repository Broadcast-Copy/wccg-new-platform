-- =====================================================================
-- 100_bc_station_engine_rpc
-- Surface AirSuite engine status to the control plane WITHOUT touching the
-- AirSuite session's tables or their RLS.
--
-- airsuite_station_status is platform-admin-read-only (airsuite_status_admin_read),
-- so a station's own GM/owner can't read it directly. This SECURITY DEFINER RPC
-- returns engine status only for stations in the caller's org (matching the
-- `stations` visibility model: org_id = ANY(user_org_ids())). It never reads
-- airsuite_station_keys (the engine pairing secret stays service-role-only).
--
-- NB: `status` is the engine's own JSON and its shape is owned by AirSuite
-- (still evolving) — consumers must read it defensively.
-- =====================================================================

begin;

create or replace function public.bc_station_engines()
returns table (station_id text, updated_at timestamptz, engine_version text, status jsonb)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select s.station_id, s.updated_at, s.engine_version, s.status
  from public.airsuite_station_status s
  where public.is_platform_admin()
     or exists (
       select 1 from public.stations st
       where st.id = s.station_id and st.org_id = any(public.user_org_ids())
     );
$$;

revoke execute on function public.bc_station_engines() from public, anon;
grant execute on function public.bc_station_engines() to authenticated;

commit;
