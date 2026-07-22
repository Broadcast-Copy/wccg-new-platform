-- =====================================================================
-- 099_org_invites
-- Teammate invites for the control plane. An org owner/gm creates an invite;
-- the invitee opens a shareable /accept?token=… link and joins the org.
--
-- All access is through SECURITY DEFINER RPCs (below) — the table itself is
-- locked to service_role via RLS, so tokens can't be enumerated with the anon
-- key. Email delivery is intentionally NOT wired: Resend is unverified on this
-- account (see 095), so the owner copies the invite link and sends it. Add
-- email here once a Resend domain is verified.
-- =====================================================================

begin;

create table if not exists public.bc_org_invites (
  id          text primary key default ('inv_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  org_id      text not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'staff',
  token       text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status      text not null default 'pending',
  invited_by  uuid,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  constraint bc_org_invites_role_valid  check (role in ('gm', 'om', 'billing', 'staff')),
  constraint bc_org_invites_status_valid check (status in ('pending', 'accepted', 'revoked')),
  constraint bc_org_invites_email_shape check (position('@' in email) > 1)
);
create index if not exists idx_bc_org_invites_org on public.bc_org_invites (org_id, status);

alter table public.bc_org_invites enable row level security;
drop policy if exists bc_org_invites_service on public.bc_org_invites;
create policy bc_org_invites_service on public.bc_org_invites
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 1. Create an invite (owner/gm only) --------------------------------------
create or replace function public.bc_invite_member(p_org_id text, p_email text, p_role text default 'staff')
returns public.bc_org_invites
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare inv public.bc_org_invites; v_uid uuid := (select auth.uid());
begin
  if not (public.is_platform_admin() or exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = v_uid and role in ('owner', 'gm')
  )) then
    raise exception 'not authorized to invite to this organization' using errcode = '42501';
  end if;
  if coalesce(btrim(p_email), '') = '' or position('@' in p_email) < 2 then
    raise exception 'a valid email is required';
  end if;
  insert into public.bc_org_invites (org_id, email, role, invited_by)
  values (p_org_id, lower(btrim(p_email)), coalesce(nullif(btrim(p_role), ''), 'staff'), v_uid)
  returning * into inv;
  return inv;
end;
$$;

-- 2. List an org's pending invites (any member) ----------------------------
create or replace function public.bc_list_invites(p_org_id text)
returns setof public.bc_org_invites
language sql security definer stable set search_path = pg_catalog, public
as $$
  select * from public.bc_org_invites
  where org_id = p_org_id
    and status = 'pending'
    and (p_org_id = any(public.user_org_ids()) or public.is_platform_admin())
  order by created_at desc;
$$;

-- 3. Revoke an invite (owner/gm only) --------------------------------------
create or replace function public.bc_revoke_invite(p_invite_id text)
returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_org text;
begin
  select org_id into v_org from public.bc_org_invites where id = p_invite_id;
  if v_org is null then raise exception 'invite not found'; end if;
  if not (public.is_platform_admin() or exists (
    select 1 from public.organization_members
    where org_id = v_org and user_id = (select auth.uid()) and role in ('owner', 'gm')
  )) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.bc_org_invites set status = 'revoked' where id = p_invite_id and status = 'pending';
end;
$$;

-- 4. Preview an invite by token (public — powers the /accept page) ---------
create or replace function public.bc_invite_preview(p_token text)
returns table (org_name text, role text, email text, status text, valid boolean)
language sql security definer stable set search_path = pg_catalog, public
as $$
  select o.name, i.role, i.email, i.status,
         (i.status = 'pending' and i.expires_at > now()) as valid
  from public.bc_org_invites i
  join public.organizations o on o.id = i.org_id
  where i.token = p_token;
$$;

-- 5. Accept an invite (authenticated; email must match) --------------------
create or replace function public.bc_accept_invite(p_token text)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare inv public.bc_org_invites; v_uid uuid := (select auth.uid()); v_email text;
begin
  if v_uid is null then raise exception 'must be signed in' using errcode = '42501'; end if;
  select * into inv from public.bc_org_invites where token = p_token;
  if inv.id is null then raise exception 'invite not found'; end if;
  if inv.status <> 'pending' then raise exception 'this invite is no longer valid'; end if;
  if inv.expires_at <= now() then raise exception 'this invite has expired'; end if;

  select lower(email) into v_email from public.profiles where id = v_uid;
  if v_email is null or v_email <> lower(inv.email) then
    raise exception 'this invite is for %. Sign in with that email to accept.', inv.email using errcode = '42501';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (inv.org_id, v_uid, inv.role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  update public.bc_org_invites set status = 'accepted', accepted_at = now() where id = inv.id;
  return inv.org_id;
end;
$$;

revoke execute on function public.bc_invite_member(text, text, text) from public, anon;
revoke execute on function public.bc_list_invites(text)             from public, anon;
revoke execute on function public.bc_revoke_invite(text)            from public, anon;
revoke execute on function public.bc_accept_invite(text)            from public, anon;
grant execute on function public.bc_invite_member(text, text, text) to authenticated;
grant execute on function public.bc_list_invites(text)              to authenticated;
grant execute on function public.bc_revoke_invite(text)             to authenticated;
grant execute on function public.bc_accept_invite(text)             to authenticated;
-- preview is intentionally callable pre-login (anon) so /accept can render.
grant execute on function public.bc_invite_preview(text)            to anon, authenticated;

commit;
