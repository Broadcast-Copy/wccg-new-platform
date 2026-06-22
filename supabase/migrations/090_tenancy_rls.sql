-- =====================================================================
-- 090_tenancy_rls
-- Adds a tenant-isolation backstop to every tenant-scoped table.
--
-- Design: ONE RESTRICTIVE policy per table that ANDs a tenant predicate
-- on top of the existing (permissive) policies — so all current
-- owner/staff/public rules keep working unchanged; we only further
-- restrict by tenant.
--
-- Predicate (can_access_station / can_access_org):
--   service_role  OR  caller staffs/owns the tenant  OR  the tenant has
--   an ACTIVE + PUBLIC station.
-- => For the single active+public WCCG this is TRUE for every row and
--    every caller: a no-op (zero behavior change for the flagship).
-- => A private / suspended / inactive tenant's rows become invisible to
--    non-members immediately. The public site still scopes reads with
--    .eq('station_id', <resolved>) at the app layer; RLS is the backstop.
--
-- DEFERRED to the pre-tenant-#2 onboarding phase (needs app testing):
--   tightening sensitive tables (dj_ftp_accounts, eas_*, restream_*,
--   stream_log_*, points_*, listening_*) from the shared "active+public"
--   read to strict per-tenant/owner reads, so two LIVE stations can't see
--   each other's private rows. Irrelevant while WCCG is the only tenant.
-- =====================================================================

begin;

-- ---- predicate helpers (STABLE => evaluated once per statement) -------
create or replace function public.can_access_station(p_station text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.role() = 'service_role'
      or public.is_station_staff(p_station)
      or exists (select 1 from public.stations s
                 where s.id = p_station and s.status = 'active' and s.is_public);
$$;

create or replace function public.can_access_org(p_org text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.role() = 'service_role'
      or public.user_in_org(p_org)
      or exists (select 1 from public.stations s
                 where s.org_id = p_org and s.status = 'active' and s.is_public);
$$;

revoke all on function public.can_access_station(text), public.can_access_org(text) from public;
grant execute on function public.can_access_station(text), public.can_access_org(text)
  to authenticated, anon, service_role;

-- ---- station-scoped tables -------------------------------------------
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'station_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('station_domains','station_members','station_entitlements')
  loop
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format(
      'create policy tenant_isolation on public.%I as restrictive for all to public '
      || 'using (public.can_access_station(station_id)) '
      || 'with check (public.can_access_station(station_id))', t);
  end loop;
end $$;

-- ---- org-scoped tables ------------------------------------------------
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'org_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('stations','organization_members')
  loop
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format(
      'create policy tenant_isolation on public.%I as restrictive for all to public '
      || 'using (public.can_access_org(org_id)) '
      || 'with check (public.can_access_org(org_id))', t);
  end loop;
end $$;

commit;
