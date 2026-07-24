-- =====================================================================
-- 101_bc_update_org
-- Let an org OWNER rename their organization. organizations writes are
-- service_role-only under RLS, so this is the controlled path — gated to the
-- caller's real owner membership (matches the bc_* RPC pattern, migrations
-- 098/099). Only the display name is editable; slug/status are platform-managed.
-- =====================================================================

begin;

create or replace function public.bc_update_org(p_org_id text, p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare o public.organizations;
begin
  if not (public.is_platform_admin() or exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = (select auth.uid()) and role = 'owner'
  )) then
    raise exception 'only the organization owner can rename it' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'organization name required';
  end if;

  update public.organizations set name = btrim(p_name), updated_at = now()
  where id = p_org_id
  returning * into o;

  if o.id is null then raise exception 'organization not found'; end if;
  return o;
end;
$$;

revoke execute on function public.bc_update_org(text, text) from public, anon;
grant execute on function public.bc_update_org(text, text) to authenticated;

commit;
