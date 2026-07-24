-- =====================================================================
-- 102_harden_bc_list_invites  (security hardening — from the audit pass)
-- Restrict bc_list_invites to owner/gm, matching bc_invite_member and
-- bc_revoke_invite (migration 099). Previously ANY org member could list an
-- org's pending invites — including their tokens — via the RPC. Tokens are
-- useless without the matching invitee email (bc_accept_invite enforces it),
-- so this is defense-in-depth / least-privilege, not a live vulnerability.
-- =====================================================================

begin;

create or replace function public.bc_list_invites(p_org_id text)
returns setof public.bc_org_invites
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select i.*
  from public.bc_org_invites i
  where i.org_id = p_org_id
    and i.status = 'pending'
    and (
      public.is_platform_admin()
      or exists (
        select 1 from public.organization_members om
        where om.org_id = p_org_id
          and om.user_id = (select auth.uid())
          and om.role in ('owner', 'gm')
      )
    )
  order by i.created_at desc;
$$;

revoke execute on function public.bc_list_invites(text) from public, anon;
grant execute on function public.bc_list_invites(text) to authenticated;

commit;
