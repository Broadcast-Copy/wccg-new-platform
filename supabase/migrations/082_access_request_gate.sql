-- 082_access_request_gate.sql
-- Waitlist/approval gate for elevated roles (creator/vendor/employee).
-- New signups choosing an elevated role are recorded as a PENDING request and
-- do NOT receive the access flag (has_creator_access / has_vendor_access /
-- is_internal) until an admin approves them in /my/admin/access-requests.
-- handle_new_user now persists the role + metadata the signup wizard collects
-- (previously dropped entirely).
--
-- NOTE: profiles.user_type is constrained to ('listener','creator','employee')
-- — 'vendor' is NOT allowed there — so the user's selected role is stored in a
-- new `requested_role` column; vendor access stays on the vendor_* flags.

alter table public.profiles
  add column if not exists requested_role text,
  add column if not exists access_request_status text not null default 'none';

alter table public.profiles drop constraint if exists chk_requested_role;
alter table public.profiles
  add constraint chk_requested_role
  check (requested_role is null or requested_role in ('listener','creator','vendor','employee'));

alter table public.profiles drop constraint if exists chk_access_request_status;
alter table public.profiles
  add constraint chk_access_request_status
  check (access_request_status in ('none','pending','approved','denied'));

create index if not exists profiles_access_request_pending_idx
  on public.profiles (created_at)
  where access_request_status = 'pending';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','auth'
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_req text := nullif(meta->>'user_type','');
  v_user_type text;
  v_elevated boolean;
begin
  -- the signup wizard offers listener/creator/vendor/employee
  if v_req is null or v_req not in ('listener','creator','vendor','employee') then
    v_req := 'listener';
  end if;
  v_elevated := v_req in ('creator','vendor','employee');

  -- user_type is constrained to listener/creator/employee; vendors stay
  -- 'listener' here and are tracked via requested_role + the vendor_* flags.
  v_user_type := case when v_req in ('creator','employee') then v_req else 'listener' end;

  insert into public.profiles (
    id, email, display_name, user_type, requested_role,
    creator_type, artist_name, employee_code, access_request_status
  ) values (
    new.id,
    new.email,
    coalesce(nullif(meta->>'display_name',''), split_part(new.email,'@',1)),
    v_user_type,
    v_req,
    nullif(meta->>'creator_type',''),
    nullif(meta->>'artist_name',''),
    nullif(meta->>'employee_code',''),
    case when v_elevated then 'pending' else 'none' end
  )
  on conflict (id) do nothing;

  return new;
end; $$;
