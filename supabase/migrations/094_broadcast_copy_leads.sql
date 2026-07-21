-- =====================================================================
-- 094_broadcast_copy_leads
-- Lead capture for the broadcastcopy.ai marketing site (apps/marketing).
--
-- NOTE ON TENANCY: this table is intentionally PLATFORM-GLOBAL, not
-- station-scoped. A lead is a prospect for Broadcast Copy the company, so it
-- has no station_id/org_id and deliberately gets NO tenant_isolation policy
-- (unlike the ~121 station-scoped tables from migration 090).
--
-- SECURITY: the public signup form runs on a static site with the anon
-- publishable key, so anon must be able to INSERT — but leads are
-- commercially sensitive, so anon must NOT be able to SELECT them back.
-- Read is restricted to platform admins and service_role.
-- =====================================================================

begin;

create table if not exists public.bc_leads (
  id            text primary key default ('lead_' || gen_random_uuid()::text),
  created_at    timestamptz not null default now(),
  name          text,
  email         text not null,
  organization  text,
  call_sign     text,
  band          text,
  station_count integer,
  market        text,
  message       text,
  source        text,
  status        text not null default 'new',
  constraint bc_leads_email_shape check (position('@' in email) > 1),
  constraint bc_leads_status_valid
    check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  constraint bc_leads_station_count_sane
    check (station_count is null or (station_count > 0 and station_count < 10000))
);

create index if not exists idx_bc_leads_created_at on public.bc_leads (created_at desc);
create index if not exists idx_bc_leads_status on public.bc_leads (status);

alter table public.bc_leads enable row level security;

-- Public signup form: INSERT only, never SELECT.
drop policy if exists bc_leads_public_insert on public.bc_leads;
create policy bc_leads_public_insert on public.bc_leads
  for insert to anon, authenticated
  with check (true);

-- Only Broadcast Copy platform admins can read the pipeline.
drop policy if exists bc_leads_admin_read on public.bc_leads;
create policy bc_leads_admin_read on public.bc_leads
  for select
  using (public.is_platform_admin());

drop policy if exists bc_leads_admin_write on public.bc_leads;
create policy bc_leads_admin_write on public.bc_leads
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists bc_leads_service_all on public.bc_leads;
create policy bc_leads_service_all on public.bc_leads
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
