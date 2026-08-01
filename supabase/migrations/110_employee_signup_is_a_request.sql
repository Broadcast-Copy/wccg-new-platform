-- =====================================================================
-- 110_employee_signup_is_a_request
-- An employee signup is a REQUEST, not a grant.
--
-- handle_new_user() granted the requested tier immediately AND marked it
-- 'pending', so the approval queue at /my/admin/access-requests was reviewing
-- access the applicant already had. Measured before the fix: 6 profiles
-- 'pending creator' already typed creator, 2 'pending employee' already typed
-- employee.
--
-- For 'employee' that is a staff tier self-selected on a public form, beside an
-- invite-code box that nothing validates -- the browser calls
-- supabase.auth.signUp() directly and never reaches the API that would check
-- it. The PRIVILEGE consequence was closed separately (is_staff() no longer
-- reads profiles.user_type). This closes the modelling error underneath.
--
-- 'creator' deliberately NOT changed: it self-grants the same way, but it is a
-- user-facing product tier, and making creators wait for approval is the
-- operator's product decision rather than a bug fix.
--
-- Existing rows untouched -- the trigger only fires for new signups.
-- =====================================================================

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_req text := nullif(meta->>'user_type','');
  v_user_type text;
  v_elevated boolean;
begin
  if v_req is null or v_req not in ('listener','creator','vendor','employee') then
    v_req := 'listener';
  end if;
  v_elevated := v_req in ('creator','vendor','employee');

  -- EMPLOYEE and VENDOR stay 'listener' until approved. Only 'creator' is still
  -- granted on signup; see the note above.
  v_user_type := case when v_req = 'creator' then 'creator' else 'listener' end;

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
    -- Kept for the reviewer to check by hand. It is NOT a credential and grants
    -- nothing: the signup path cannot validate it, so treat it as a claim the
    -- applicant is making, not a fact.
    nullif(meta->>'employee_code',''),
    case when v_elevated then 'pending' else 'none' end
  )
  on conflict (id) do nothing;

  return new;
end; $function$;

comment on function public.handle_new_user() is
  'Creates the profile row on signup. user_type is CLIENT-SUPPLIED metadata, so employee and vendor requests stay ''listener'' with access_request_status=''pending'' until a human approves at /my/admin/access-requests. employee_code is recorded for the reviewer but is never validated here -- the browser signs up directly against Supabase Auth and never reaches the API that could check it.';
