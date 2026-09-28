-- =====================================================================
-- 117_bc_admin_users_roles
-- Users & roles for the Broadcast Copy back office (platform admins only):
--   * bc_admin_users            -- list accounts: e-mail, created, last sign-in
--   * bc_admin_grant_super_admin / bc_admin_revoke_super_admin
--   * a guard that the LAST super admin can never be removed
--
-- What "super admin" means: public.is_platform_admin() is true when the
-- caller has a user_roles row whose role_id is 'super_admin' (or the legacy
-- 'role_super_admin'). That function is unchanged here.
--
-- NOTE for whoever grants the role: this database is still ALSO the flagship
-- station's content database, and the flagship's is_staff() counts
-- 'super_admin' too, so a Broadcast Copy super admin is also station staff on
-- the flagship website. Grant it to people you would trust with both.
--
-- No passwords, no account creation, no e-mail changes: this migration only
-- READS auth.users (e-mail, created, confirmed, last sign-in -- never a hash,
-- token or phone) and only writes user_roles.
--
-- THE LAST-SUPER-ADMIN GUARD (Jev 0.96, rpc_and_trigger) is enforced twice:
--   1. inside bc_admin_revoke_super_admin, for a clear error message;
--   2. by a DEFERRED constraint trigger on user_roles that refuses, at commit,
--      any transaction that leaves zero super admins -- whoever runs it: the
--      service role, the SQL editor, or a cascade from deleting that account
--      (auth.users -> profiles -> user_roles). Swapping admins inside one
--      transaction still works because the check runs at commit. Both paths
--      take the same transaction-scoped advisory lock, so two admins revoking
--      each other at the same moment cannot both succeed.
--   A TRUNCATE of user_roles is refused while any super admin exists.
--
-- user_roles also lives in every station database (identity is per-database),
-- so the strip script drops this trigger and its functions from new station
-- databases: the rule belongs to the control plane.
-- =====================================================================

begin;

-- ------------------------------------------------------------- the guard --
create or replace function public.bc_guard_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Only removing (or re-labelling) a super-admin row can reduce the count.
  if replace(old.role_id, 'role_', '') <> 'super_admin' then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and replace(new.role_id, 'role_', '') = 'super_admin'
     and new.profile_id = old.profile_id then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bc:last-super-admin', 0));
  if not exists (select 1 from public.user_roles ur
                 where replace(ur.role_id, 'role_', '') = 'super_admin') then
    raise exception 'refusing to remove the last super admin'
      using errcode = '42501',
            hint = 'Grant super_admin to another account first, then remove this one.';
  end if;
  return null;
end;
$$;
revoke execute on function public.bc_guard_last_super_admin() from public, anon, authenticated;

drop trigger if exists bc_guard_last_super_admin on public.user_roles;
create constraint trigger bc_guard_last_super_admin
  after delete or update on public.user_roles
  deferrable initially deferred
  for each row execute function public.bc_guard_last_super_admin();

create or replace function public.bc_guard_user_roles_truncate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (select 1 from public.user_roles ur
             where replace(ur.role_id, 'role_', '') = 'super_admin') then
    raise exception 'refusing to TRUNCATE user_roles while it holds a super admin'
      using errcode = '42501';
  end if;
  return null;
end;
$$;
revoke execute on function public.bc_guard_user_roles_truncate() from public, anon, authenticated;

drop trigger if exists bc_guard_user_roles_truncate on public.user_roles;
create trigger bc_guard_user_roles_truncate
  before truncate on public.user_roles
  for each statement execute function public.bc_guard_user_roles_truncate();

-- ------------------------------------------------------------- list users --
-- Paged, searchable (e-mail or display name). total_count is the size of the
-- whole filtered set, repeated on every row, for the pager.
create or replace function public.bc_admin_users(
  p_search      text    default null,
  p_admins_only boolean default false,
  p_limit       integer default 50,
  p_offset      integer default 0
) returns table (
  user_id            uuid,
  email              text,
  display_name       text,
  user_type          text,
  created_at         timestamptz,
  last_sign_in_at    timestamptz,
  email_confirmed_at timestamptz,
  is_super_admin     boolean,
  org_count          integer,
  total_count        bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit  integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  perform public.bc_require_platform_admin();
  return query
  with base as (
    select
      u.id                          as uid,
      u.email::text                 as uemail,
      p.display_name                as dname,
      p.user_type                   as utype,
      u.created_at                  as created,
      u.last_sign_in_at             as last_in,
      u.email_confirmed_at          as confirmed,
      exists (select 1 from public.user_roles ur
               where ur.profile_id = u.id
                 and replace(ur.role_id, 'role_', '') = 'super_admin') as is_sa,
      (select count(*)::int from public.organization_members om where om.user_id = u.id) as orgs
    from auth.users u
    left join public.profiles p on p.id = u.id
  )
  select b.uid, b.uemail, b.dname, b.utype, b.created, b.last_in, b.confirmed, b.is_sa, b.orgs,
         count(*) over ()
  from base b
  where (not coalesce(p_admins_only, false) or b.is_sa)
    and (v_search is null
         or b.uemail ilike '%' || v_search || '%'
         or coalesce(b.dname, '') ilike '%' || v_search || '%')
  order by b.is_sa desc, b.created desc
  limit v_limit offset v_offset;
end;
$$;
revoke execute on function public.bc_admin_users(text, boolean, integer, integer) from public, anon;
grant execute on function public.bc_admin_users(text, boolean, integer, integer) to authenticated;

-- ----------------------------------------------------------- grant / revoke --
create or replace function public.bc_admin_grant_super_admin(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text;
begin
  perform public.bc_require_platform_admin();
  select u.email::text into v_email from auth.users u where u.id = p_user_id;
  if not found then
    raise exception 'account not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'that account has no profile yet; it must sign in once first' using errcode = '22023';
  end if;
  if exists (select 1 from public.user_roles ur
             where ur.profile_id = p_user_id and replace(ur.role_id, 'role_', '') = 'super_admin') then
    raise exception 'that account is already a super admin' using errcode = '22023';
  end if;

  insert into public.user_roles (profile_id, role_id) values (p_user_id, 'super_admin');

  perform public.bc_audit('role.grant', 'user', p_user_id::text,
                          jsonb_build_object('email', v_email, 'super_admin', false),
                          jsonb_build_object('email', v_email, 'super_admin', true));
  return jsonb_build_object('user_id', p_user_id, 'super_admin', true);
end;
$$;
revoke execute on function public.bc_admin_grant_super_admin(uuid) from public, anon;
grant execute on function public.bc_admin_grant_super_admin(uuid) to authenticated;

create or replace function public.bc_admin_revoke_super_admin(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email  text;
  v_admins integer;
begin
  perform public.bc_require_platform_admin();
  -- Same lock as the trigger: concurrent revokes are serialised, so the count
  -- below cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended('bc:last-super-admin', 0));

  if not exists (select 1 from public.user_roles ur
                 where ur.profile_id = p_user_id and replace(ur.role_id, 'role_', '') = 'super_admin') then
    raise exception 'that account is not a super admin' using errcode = '22023';
  end if;
  select count(distinct ur.profile_id)::int into v_admins
    from public.user_roles ur
   where replace(ur.role_id, 'role_', '') = 'super_admin';
  if v_admins <= 1 then
    raise exception 'refusing to remove the last super admin'
      using errcode = '42501',
            hint = 'Grant super_admin to another account first, then remove this one.';
  end if;

  select u.email::text into v_email from auth.users u where u.id = p_user_id;
  delete from public.user_roles ur
   where ur.profile_id = p_user_id and replace(ur.role_id, 'role_', '') = 'super_admin';

  perform public.bc_audit('role.revoke', 'user', p_user_id::text,
                          jsonb_build_object('email', v_email, 'super_admin', true),
                          jsonb_build_object('email', v_email, 'super_admin', false));
  return jsonb_build_object('user_id', p_user_id, 'super_admin', false);
end;
$$;
revoke execute on function public.bc_admin_revoke_super_admin(uuid) from public, anon;
grant execute on function public.bc_admin_revoke_super_admin(uuid) to authenticated;

commit;
