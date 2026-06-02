-- =====================================================================
-- 029_security_rls_hardening
-- Closes the verified privilege-escalation hole on public.profiles.
--
-- Before: UPDATE policy was USING (auth.uid()=id) with WITH CHECK = NULL
-- and NO column restriction, so any logged-in user could set their own
-- user_type='super_admin' / has_vendor_access / has_creator_access /
-- vendor_verified. (Confirmed live on project irjiqbmoohklagdegezz.)
--
-- After:
--   * is_admin() helper (SECURITY DEFINER) resolves the *current* actor's
--     real privilege from user_roles + profiles.user_type.
--   * A BEFORE UPDATE trigger freezes privileged columns for non-admins,
--     so a normal user editing their own profile can change name/avatar/
--     bio but can NEVER change role/access/verification/active flags.
--   * Owner UPDATE policy now has a proper WITH CHECK.
--   * Admin UPDATE policy lets real admins edit any profile (incl. roles).
-- =====================================================================

-- ---- privilege resolver (no RLS recursion: SECURITY DEFINER) ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid()
        and ur.role_id in ('role_admin','role_super_admin','role_management')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in ('admin','super_admin','management')
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon, service_role;

-- ---- freeze privileged columns for non-admins -------------------------
create or replace function public.profiles_guard_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (server-side / seeds) and real admins may change anything
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  -- everyone else: privileged columns are immutable (silently reset)
  new.user_type        := old.user_type;
  new.department       := old.department;
  new.employee_code    := old.employee_code;
  new.is_active        := old.is_active;
  new.has_vendor_access  := old.has_vendor_access;
  new.has_creator_access := old.has_creator_access;
  new.vendor_verified    := old.vendor_verified;
  new.vendor_verified_at := old.vendor_verified_at;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileged on public.profiles;
create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row
  execute function public.profiles_guard_privileged();

-- ---- rewrite the UPDATE policies --------------------------------------
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
