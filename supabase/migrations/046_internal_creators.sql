-- =====================================================================
-- 046_internal_creators
-- Formalize internal vs external creators, and make the station's DJs
-- internal creators (with creator access) while they keep their DJ portal.
--   internal creator = on the station roster (a public.djs row) → is_internal
--   external creator  = self-signup content creator, no djs row
-- =====================================================================

alter table public.profiles add column if not exists is_internal boolean not null default false;

-- Backfill: every roster DJ becomes an internal creator with creator access.
-- The privilege guard freezes has_creator_access for non-admins, so disable it
-- for this server-side backfill only.
alter table public.profiles disable trigger trg_profiles_guard_privileged;
update public.profiles p
set has_creator_access = true,
    is_internal = true
where exists (select 1 from public.djs d where d.user_id = p.id);
alter table public.profiles enable trigger trg_profiles_guard_privileged;

-- is_internal is privileged — users must not self-assign it. Extend the guard
-- (otherwise identical to migration 029's function).
create or replace function public.profiles_guard_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.user_type          := old.user_type;
  new.department         := old.department;
  new.employee_code      := old.employee_code;
  new.is_active          := old.is_active;
  new.has_vendor_access  := old.has_vendor_access;
  new.has_creator_access := old.has_creator_access;
  new.vendor_verified    := old.vendor_verified;
  new.vendor_verified_at := old.vendor_verified_at;
  new.is_internal        := old.is_internal;
  return new;
end;
$$;

-- Helper: is the current user an internal (station) creator?
create or replace function public.is_internal()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_internal from public.profiles where id = auth.uid()), false);
$$;
revoke all on function public.is_internal() from public, anon;
grant execute on function public.is_internal() to authenticated;
