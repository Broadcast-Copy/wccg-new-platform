-- =====================================================================
-- 089_tenancy_constraints
-- Locks in tenancy: station_id/org_id -> NOT NULL + validated FK.
-- Driven dynamically off the columns 087/088 created, so it can never
-- drift from them. Control-plane tables (their own station_id/org_id are
-- already constrained in 085) are excluded.
--
-- DEFERRED to Phase 1 (needs matching app/edge changes, so out of scope
-- for a zero-behavior-change Phase 0):
--   * per-station UNIQUE surgery (streams/shows/hosts/djs/events.slug,
--     dj_slots(day,start), sermons, site/cms slugs, referral codes, ...)
--     -> recompose as (station_id, <key>) alongside ON CONFLICT updates.
--   * composite-PK loyalty tables keyed on user_id only (birthday_club,
--     user_milestones, user_bounties_claimed) -> add station_id to PK.
-- These only matter once a 2nd tenant exists; single-tenant WCCG is
-- unaffected.
-- =====================================================================

begin;

-- station_id -> NOT NULL + FK(stations)
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'station_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('station_domains','station_members','station_entitlements')
  loop
    execute format('alter table public.%I alter column station_id set not null', t);
    if not exists (select 1 from pg_constraint where conname = 'fk_' || t || '_station') then
      execute format(
        'alter table public.%I add constraint %I foreign key (station_id) '
        || 'references public.stations(id) on delete restrict not valid',
        t, 'fk_' || t || '_station');
      execute format('alter table public.%I validate constraint %I', t, 'fk_' || t || '_station');
    end if;
  end loop;
end $$;

-- org_id -> NOT NULL + FK(organizations)
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'org_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('stations','organization_members')
  loop
    execute format('alter table public.%I alter column org_id set not null', t);
    if not exists (select 1 from pg_constraint where conname = 'fk_' || t || '_org') then
      execute format(
        'alter table public.%I add constraint %I foreign key (org_id) '
        || 'references public.organizations(id) on delete restrict not valid',
        t, 'fk_' || t || '_org');
      execute format('alter table public.%I validate constraint %I', t, 'fk_' || t || '_org');
    end if;
  end loop;
end $$;

commit;
