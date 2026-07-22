-- =====================================================================
-- 098_control_plane_rpcs
-- SECURITY DEFINER RPCs that back the apps/dashboard control plane, for the
-- three actions RLS deliberately does NOT allow via direct table access:
--   1. bc_org_team      — read the FULL member roster (RLS only lets a member
--                         read their own membership row)
--   2. bc_update_station— edit safe station fields (stations write = service_role)
--   3. bc_create_org    — self-serve org creation + owner membership
--                         (organizations/org_members write = service_role)
-- Each function pins search_path and enforces the caller's real authorization
-- INSIDE the function (never trusting the client), mirroring the existing
-- is_platform_admin()/user_org_ids() helper pattern. auth.uid() reflects the
-- CALLER's JWT even under SECURITY DEFINER, so the checks are sound.
-- =====================================================================

begin;

-- 1. Org team roster (read) -------------------------------------------------
create or replace function public.bc_org_team(p_org_id text)
returns table (user_id uuid, role text, display_name text, email text, joined_at timestamptz)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select m.user_id, m.role, p.display_name, p.email, m.created_at
  from public.organization_members m
  left join public.profiles p on p.id = m.user_id
  where m.org_id = p_org_id
    and (p_org_id = any(public.user_org_ids()) or public.is_platform_admin())
  order by
    case m.role when 'owner' then 0 when 'gm' then 1 when 'om' then 2 when 'billing' then 3 else 4 end,
    p.display_name nulls last;
$$;
revoke execute on function public.bc_org_team(text) from public, anon;
grant execute on function public.bc_org_team(text) to authenticated;

-- 2. Edit safe station fields (write) --------------------------------------
create or replace function public.bc_update_station(
  p_station_id text, p_name text, p_market text, p_timezone text
) returns public.stations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r public.stations;
begin
  if not (public.is_platform_admin() or exists (
    select 1
    from public.organization_members om
    join public.stations s on s.org_id = om.org_id
    where s.id = p_station_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner', 'gm', 'om')
  )) then
    raise exception 'not authorized to edit station %', p_station_id using errcode = '42501';
  end if;

  update public.stations set
    name     = coalesce(nullif(btrim(p_name), ''), name),
    market   = coalesce(p_market, market),
    timezone = coalesce(p_timezone, timezone),
    updated_at = now()
  where id = p_station_id
  returning * into r;

  if r.id is null then
    raise exception 'station % not found', p_station_id;
  end if;
  return r;
end;
$$;
revoke execute on function public.bc_update_station(text, text, text, text) from public, anon;
grant execute on function public.bc_update_station(text, text, text, text) to authenticated;

-- 3. Create an organization + owner membership (write) ---------------------
create or replace function public.bc_create_org(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  o public.organizations;
  v_uid uuid := (select auth.uid());
  v_slug text;
begin
  if v_uid is null then
    raise exception 'must be signed in' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'organization name required';
  end if;

  v_slug := btrim(lower(regexp_replace(btrim(p_name), '[^a-z0-9]+', '-', 'gi')), '-');
  if v_slug = '' then v_slug := 'org'; end if;
  if exists (select 1 from public.organizations where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  end if;

  insert into public.organizations (id, name, slug, status)
  values ('org_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), btrim(p_name), v_slug, 'active')
  returning * into o;

  insert into public.organization_members (org_id, user_id, role)
  values (o.id, v_uid, 'owner');

  return o;
end;
$$;
revoke execute on function public.bc_create_org(text) from public, anon;
grant execute on function public.bc_create_org(text) to authenticated;

commit;
