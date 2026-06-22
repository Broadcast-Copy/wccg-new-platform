-- =====================================================================
-- 086_tenancy_seed
-- Seeds tenant #1: Carson Communications -> WCCG 104.5 FM, its primary
-- domain, full flagship entitlements, and backfills org/station members
-- from the existing RBAC (profiles.user_type / is_internal / djs).
-- Runs before the station_id/org_id columns exist (087+), so it only
-- touches the new control-plane tables + reads profiles/djs.
-- =====================================================================

begin;

insert into public.organizations (id, name, slug, status)
values ('org_carson', 'Carson Communications', 'carson-communications', 'active')
on conflict (id) do nothing;

insert into public.stations
  (id, org_id, name, slug, call_sign, band, frequency, market, timezone, status, is_public)
values
  ('station_wccg', 'org_carson', 'WCCG 104.5 FM', 'wccg', 'WCCG', 'FM', '104.5',
   'Fayetteville, NC', 'America/New_York', 'active', true)
on conflict (id) do nothing;

insert into public.station_domains (station_id, hostname, is_primary, verified_at)
values
  ('station_wccg', 'wccg1045fm.com', true, now()),
  ('station_wccg', 'www.wccg1045fm.com', false, now())
on conflict (hostname) do nothing;

insert into public.station_entitlements (station_id, plan, features, status)
values ('station_wccg', 'flagship', jsonb_build_object(
  'loyalty', true, 'social', true, 'crm', true, 'sales', true,
  'record_pool', true, 'djs', true, 'events', true, 'advertising', true,
  'dsp', true, 'eas', true, 'restream', true, 'videos', true,
  'podcasts', true, 'sermons', true, 'shop', true, 'agentic_ai', true
), 'active')
on conflict (station_id) do nothing;

-- existing internal/staff users -> org members
insert into public.organization_members (org_id, user_id, role)
select 'org_carson', p.id,
  case
    when p.user_type in ('super_admin','admin','management') then 'owner'
    when p.user_type = 'gm' then 'gm'
    when p.user_type in ('operations','om') then 'om'
    else 'staff'
  end
from public.profiles p
where p.is_internal = true or p.user_type is not null
on conflict (org_id, user_id) do nothing;

-- existing internal/staff -> station members; DJs (djs.user_id) -> 'dj'
insert into public.station_members (station_id, user_id, role)
select 'station_wccg', p.id,
  case
    when p.user_type in ('super_admin','admin','management','gm') then 'station_admin'
    when exists (select 1 from public.djs d where d.user_id = p.id) then 'dj'
    else 'staff'
  end
from public.profiles p
where p.is_internal = true
   or p.user_type is not null
   or exists (select 1 from public.djs d where d.user_id = p.id)
on conflict (station_id, user_id) do nothing;

commit;
