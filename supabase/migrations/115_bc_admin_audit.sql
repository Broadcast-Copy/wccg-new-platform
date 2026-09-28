-- =====================================================================
-- 115_bc_admin_audit
-- The append-only audit trail for the Broadcast Copy back office
-- (platform.broadcastcopy.ai/admin). Owner 2026-09-27: "southarmzglobal@gmail.com
-- is the super admin ... make sure there is a backend where we can manage
-- software keys and all". Every admin write records who, when, what, and the
-- row before and after.
--
-- WHY A NEW TABLE, not the existing public.audit_log (Jev 0.87, new_table):
--   * audit_log belongs to the flagship website's own admin page
--     (apps/web my/admin/audit-log) and is left exactly as it is.
--   * audit_log.actor_id is a foreign key ON DELETE SET NULL. On an append-only
--     table that SET NULL is an UPDATE, which the guard below must refuse, so
--     deleting any admin's profile would start failing. This table keeps the
--     actor as a plain uuid plus an e-mail snapshot instead.
--
-- APPEND-ONLY, for every role:
--   * anon: no privilege at all.  authenticated: SELECT only, and RLS lets only
--     platform admins see rows.  service_role: SELECT + INSERT only.
--   * Triggers refuse UPDATE, DELETE and TRUNCATE whoever asks -- including the
--     service role, which bypasses RLS but not triggers. Only the database
--     owner deliberately disabling the trigger could rewrite history.
--   * Rows are written ONLY by SECURITY DEFINER code (bc_audit below, which no
--     client may execute), so a signed-in user cannot forge an entry.
--
-- HOW WRITES ARE CAUGHT (Jev 0.69, triggers):
--   * Tables admins already write directly through RLS (bc_releases, bc_docs,
--     bc_changelog, bc_features, bc_leads updates, station_entitlements) get an
--     AFTER trigger, so every write is recorded whatever path it came by --
--     the dashboard, a direct API call, or the release script (service role).
--   * Tables with no direct admin write path (licence keys, user_roles,
--     organizations, stations) are audited inside the RPCs that write them
--     (116-118). No trigger is put on a table that also lives in station
--     databases (organizations, stations, profiles, user_roles), because those
--     databases do not carry this audit table.
--
-- CONTROL-PLANE ONLY: listed in supabase/TENANCY.md and dropped from new
-- station databases by station/migrations/00000000000001_strip_control_plane.sql.
-- Nothing here is station-specific.
-- =====================================================================

begin;

create table if not exists public.bc_admin_audit (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  -- auth.uid() of the caller; null for the service role or a migration.
  actor_id     uuid,
  -- Snapshot, so the trail still reads after the account changes or is gone.
  actor_email  text,
  -- The JWT role (authenticated / service_role / anon), or the database user
  -- when there is no request (a migration or the SQL editor).
  actor_role   text not null,
  -- What happened, e.g. 'license.issue', 'role.revoke', 'row.update'.
  action       text not null,
  target_type  text not null,
  target_id    text,
  before       jsonb,
  after        jsonb,
  note         text,
  constraint bc_admin_audit_action_present check (length(btrim(action)) > 0),
  constraint bc_admin_audit_target_present check (length(btrim(target_type)) > 0)
);

create index if not exists idx_bc_admin_audit_at     on public.bc_admin_audit (at desc);
create index if not exists idx_bc_admin_audit_target on public.bc_admin_audit (target_type, target_id, at desc);
create index if not exists idx_bc_admin_audit_actor  on public.bc_admin_audit (actor_id, at desc);

comment on table public.bc_admin_audit is
  'Append-only trail of control-plane admin writes (migration 115). Readable by platform admins; written only by SECURITY DEFINER code; UPDATE/DELETE/TRUNCATE refused by trigger for every role.';

-- ------------------------------------------------------------ append-only --
create or replace function public.bc_admin_audit_append_only()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'bc_admin_audit is append-only: % refused', tg_op
    using errcode = '42501';
end;
$$;
revoke execute on function public.bc_admin_audit_append_only() from public, anon, authenticated;

drop trigger if exists bc_admin_audit_no_rewrite on public.bc_admin_audit;
create trigger bc_admin_audit_no_rewrite
  before update or delete on public.bc_admin_audit
  for each row execute function public.bc_admin_audit_append_only();

drop trigger if exists bc_admin_audit_no_truncate on public.bc_admin_audit;
create trigger bc_admin_audit_no_truncate
  before truncate on public.bc_admin_audit
  for each statement execute function public.bc_admin_audit_append_only();

-- ------------------------------------------------------------------- RLS --
alter table public.bc_admin_audit enable row level security;

revoke all on table public.bc_admin_audit from anon;
revoke all on table public.bc_admin_audit from authenticated;
revoke all on table public.bc_admin_audit from service_role;
grant select on table public.bc_admin_audit to authenticated;
grant select, insert on table public.bc_admin_audit to service_role;

-- Platform admins read the trail. No insert/update/delete policy exists for
-- authenticated, and it holds no such privilege either.
drop policy if exists bc_admin_audit_admin_read on public.bc_admin_audit;
create policy bc_admin_audit_admin_read on public.bc_admin_audit
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists bc_admin_audit_service_read on public.bc_admin_audit;
create policy bc_admin_audit_service_read on public.bc_admin_audit
  for select to service_role
  using (true);

drop policy if exists bc_admin_audit_service_insert on public.bc_admin_audit;
create policy bc_admin_audit_service_insert on public.bc_admin_audit
  for insert to service_role
  with check (true);

-- ------------------------------------------------------------ the writer --
-- The one way a row gets in. SECURITY DEFINER so it can insert on behalf of
-- the admin RPCs and triggers; NOT executable by any client role, so nobody
-- can call it over the API to plant an entry. auth.uid()/auth.role() read the
-- caller's JWT claims, which SECURITY DEFINER does not change.
create or replace function public.bc_audit(
  p_action      text,
  p_target_type text,
  p_target_id   text,
  p_before      jsonb,
  p_after       jsonb,
  p_note        text default null
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  insert into public.bc_admin_audit
    (actor_id, actor_email, actor_role, action, target_type, target_id, before, after, note)
  values (
    v_uid,
    case when v_uid is null then null
         else (select u.email::text from auth.users u where u.id = v_uid) end,
    coalesce(nullif(auth.role(), ''), current_user::text),
    p_action, p_target_type, p_target_id, p_before, p_after,
    nullif(left(btrim(coalesce(p_note, '')), 2000), '')
  );
end;
$$;
revoke execute on function public.bc_audit(text, text, text, jsonb, jsonb, text) from public, anon, authenticated;

-- ------------------------------------------------- row-change audit trigger --
-- Records the full row before and after. A no-op UPDATE (nothing but the
-- updated_at stamp changed) is not recorded. Fails closed: if the audit insert
-- fails, the write it describes fails with it.
create or replace function public.bc_audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before jsonb;
  v_after  jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_before := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_after  := to_jsonb(new); end if;

  if tg_op = 'UPDATE' and (v_before - 'updated_at') = (v_after - 'updated_at') then
    return null;
  end if;

  perform public.bc_audit(
    'row.' || lower(tg_op),
    tg_table_name,
    coalesce(v_after ->> 'id', v_before ->> 'id'),
    v_before,
    v_after
  );
  return null;
end;
$$;
revoke execute on function public.bc_audit_row_change() from public, anon, authenticated;

-- Product content and the release registry: every write, by anyone.
drop trigger if exists bc_audit_bc_releases on public.bc_releases;
create trigger bc_audit_bc_releases
  after insert or update or delete on public.bc_releases
  for each row execute function public.bc_audit_row_change();

drop trigger if exists bc_audit_bc_docs on public.bc_docs;
create trigger bc_audit_bc_docs
  after insert or update or delete on public.bc_docs
  for each row execute function public.bc_audit_row_change();

drop trigger if exists bc_audit_bc_changelog on public.bc_changelog;
create trigger bc_audit_bc_changelog
  after insert or update or delete on public.bc_changelog
  for each row execute function public.bc_audit_row_change();

drop trigger if exists bc_audit_bc_features on public.bc_features;
create trigger bc_audit_bc_features
  after insert or update or delete on public.bc_features
  for each row execute function public.bc_audit_row_change();

-- Entitlements are the paid unit's feature flags: every write, by anyone.
drop trigger if exists bc_audit_station_entitlements on public.station_entitlements;
create trigger bc_audit_station_entitlements
  after insert or update or delete on public.station_entitlements
  for each row execute function public.bc_audit_row_change();

-- The waitlist: UPDATE and DELETE only. INSERTs come from the public form and
-- are not admin writes; the row itself is their record.
drop trigger if exists bc_audit_bc_leads on public.bc_leads;
create trigger bc_audit_bc_leads
  after update or delete on public.bc_leads
  for each row execute function public.bc_audit_row_change();

commit;
