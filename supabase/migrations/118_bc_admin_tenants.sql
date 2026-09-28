-- =====================================================================
-- 118_bc_admin_tenants
-- Organizations, stations, station device keys and the waitlist for the
-- Broadcast Copy back office (platform admins only).
--
--   * bc_admin_orgs / bc_admin_org_detail    -- read: orgs, their stations,
--     members, entitlements, licences, device-key presence, engine last seen
--   * bc_admin_set_org_status / bc_admin_set_station_status
--   * bc_update_org / bc_update_station      -- the EXISTING rename RPCs
--     (098/101), redefined with identical signatures, checks and results plus
--     an audit row, so renaming from the back office (or anywhere) is recorded
--   * bc_admin_station_keys                  -- which stations hold an AirSuite
--     device key and since when. NEVER the key value.
--   * bc_leads gains notes + updated_at; the public form's INSERT privilege is
--     narrowed to the form's own nine columns
--   * airsuite_station_keys loses the table privileges anon/authenticated
--     never needed
--
-- STATUS EDITS ARE GUARDED (Jev 0.87, guarded). A station's status is not a
-- label: 'active' + is_public is what makes a station's public website content
-- readable at all (the restrictive tenant_isolation policy, migration 090). So
-- the database refuses to take a station -- or the organization that owns
-- it -- out of 'active' while its AirSuite engine has reported within the last
-- 7 days. Suspending a live, on-air station has to be done deliberately, by a
-- person, outside this UI. Bringing a station back to 'active' is always
-- allowed.
--
-- DEVICE KEYS: airsuite_station_keys.key is what the flagship's engine uses to
-- authenticate its live heartbeat (airsuite-heartbeat, fleet-ingest,
-- station-nowplaying). Rotating it would cut the station off, so there is no
-- rotate function here at all, and the listing below never selects the key.
-- =====================================================================

begin;

-- ======================================================== organizations ==

create or replace function public.bc_admin_orgs()
returns table (
  id              text,
  name            text,
  slug            text,
  status          text,
  created_at      timestamptz,
  station_count   integer,
  member_count    integer,
  active_licenses integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
#variable_conflict use_column
begin
  perform public.bc_require_platform_admin();
  return query
  select o.id, o.name, o.slug, o.status, o.created_at,
         (select count(*)::int from public.stations s where s.org_id = o.id),
         (select count(*)::int from public.organization_members m where m.org_id = o.id),
         (select count(*)::int from public.bc_license_keys k
           where k.org_id = o.id and public.bc_license_status(k.revoked_at, k.expires_at) = 'active')
  from public.organizations o
  order by o.name;
end;
$$;
revoke execute on function public.bc_admin_orgs() from public, anon;
grant execute on function public.bc_admin_orgs() to authenticated;

-- One organization, everything the back office shows about it, as one JSON
-- document: { org, stations[], members[], licenses[], pending_invites }.
create or replace function public.bc_admin_org_detail(p_org_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  o public.organizations;
begin
  perform public.bc_require_platform_admin();
  select * into o from public.organizations x where x.id = p_org_id;
  if o.id is null then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'org', to_jsonb(o),
    'stations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'slug', s.slug, 'call_sign', s.call_sign,
        'band', s.band, 'frequency', s.frequency, 'market', s.market,
        'timezone', s.timezone, 'status', s.status, 'is_public', s.is_public,
        'created_at', s.created_at,
        'entitlement', (select jsonb_build_object('plan', e.plan, 'status', e.status,
                                                  'features', e.features, 'period_end', e.period_end)
                          from public.station_entitlements e where e.station_id = s.id),
        'device_key_created_at', (select k.created_at from public.airsuite_station_keys k where k.station_id = s.id),
        'engine_seen_at', (select a.updated_at from public.airsuite_station_status a where a.station_id = s.id),
        'engine_version', (select a.engine_version from public.airsuite_station_status a where a.station_id = s.id)
      ) order by s.name)
      from public.stations s where s.org_id = o.id), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'role', m.role, 'joined_at', m.created_at,
        'email', (select u.email::text from auth.users u where u.id = m.user_id),
        'display_name', p.display_name
      ) order by case m.role when 'owner' then 0 when 'gm' then 1 when 'om' then 2 when 'billing' then 3 else 4 end,
                 p.display_name nulls last)
      from public.organization_members m
      left join public.profiles p on p.id = m.user_id
      where m.org_id = o.id), '[]'::jsonb),
    'licenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'key_prefix', k.key_prefix, 'label', k.label, 'station_id', k.station_id,
        'status', public.bc_license_status(k.revoked_at, k.expires_at),
        'expires_at', k.expires_at, 'created_at', k.created_at,
        'machines', (select count(distinct a.fingerprint) from public.bc_license_activations a
                      where a.license_id = k.id and a.released_at is null)
      ) order by k.created_at desc)
      from public.bc_license_keys k where k.org_id = o.id), '[]'::jsonb),
    'pending_invites', (select count(*) from public.bc_org_invites i
                         where i.org_id = o.id and i.status = 'pending' and i.expires_at > now())
  );
end;
$$;
revoke execute on function public.bc_admin_org_detail(text) from public, anon;
grant execute on function public.bc_admin_org_detail(text) to authenticated;

-- True when a station's engine has reported within the live window.
create or replace function public.bc_station_is_live(p_station_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.airsuite_station_status a
                  where a.station_id = p_station_id
                    and a.updated_at > now() - interval '7 days');
$$;
revoke execute on function public.bc_station_is_live(text) from public, anon, authenticated;

create or replace function public.bc_admin_set_org_status(p_org_id text, p_status text)
returns public.organizations
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  o_old public.organizations;
  o     public.organizations;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_live   text;
begin
  perform public.bc_require_platform_admin();
  if v_status not in ('active', 'suspended', 'archived') then
    raise exception 'organization status must be active, suspended or archived' using errcode = '22023';
  end if;
  select * into o_old from public.organizations x where x.id = p_org_id for update;
  if o_old.id is null then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;
  if o_old.status = v_status then
    return o_old;
  end if;
  if v_status <> 'active' then
    select string_agg(coalesce(s.call_sign, s.name), ', ') into v_live
      from public.stations s where s.org_id = p_org_id and public.bc_station_is_live(s.id);
    if v_live is not null then
      raise exception 'refusing: % reported on air in the last 7 days', v_live
        using errcode = '42501',
              hint = 'A live station is never suspended from the back office. Do it deliberately, outside the UI.';
    end if;
  end if;

  update public.organizations set status = v_status, updated_at = now()
   where id = p_org_id returning * into o;
  perform public.bc_audit('org.status', 'organizations', o.id, to_jsonb(o_old), to_jsonb(o));
  return o;
end;
$$;
revoke execute on function public.bc_admin_set_org_status(text, text) from public, anon;
grant execute on function public.bc_admin_set_org_status(text, text) to authenticated;

create or replace function public.bc_admin_set_station_status(p_station_id text, p_status text)
returns public.stations
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  s_old public.stations;
  s     public.stations;
  v_status text := lower(btrim(coalesce(p_status, '')));
begin
  perform public.bc_require_platform_admin();
  if v_status not in ('active', 'inactive', 'maintenance', 'suspended', 'pending') then
    raise exception 'station status must be active, inactive, maintenance, suspended or pending'
      using errcode = '22023';
  end if;
  select * into s_old from public.stations x where x.id = p_station_id for update;
  if s_old.id is null then
    raise exception 'station not found' using errcode = 'P0002';
  end if;
  if s_old.status = v_status then
    return s_old;
  end if;
  if v_status <> 'active' and public.bc_station_is_live(p_station_id) then
    raise exception 'refusing: % reported on air in the last 7 days', coalesce(s_old.call_sign, s_old.name)
      using errcode = '42501',
            hint = 'A live station is never taken out of active from the back office. Do it deliberately, outside the UI.';
  end if;

  update public.stations set status = v_status, updated_at = now()
   where id = p_station_id returning * into s;
  perform public.bc_audit('station.status', 'stations', s.id, to_jsonb(s_old), to_jsonb(s));
  return s;
end;
$$;
revoke execute on function public.bc_admin_set_station_status(text, text) from public, anon;
grant execute on function public.bc_admin_set_station_status(text, text) to authenticated;

-- ------------------------------------------ the existing rename RPCs, audited --
-- Same signature, same authorisation, same result as 101 / 098; the only
-- addition is the audit row (written when something actually changed).

create or replace function public.bc_update_org(p_org_id text, p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  o_old public.organizations;
  o     public.organizations;
begin
  if not (public.is_platform_admin() or exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = (select auth.uid()) and role = 'owner'
  )) then
    raise exception 'only the organization owner can rename it' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'organization name required';
  end if;

  select * into o_old from public.organizations where id = p_org_id;

  update public.organizations set name = btrim(p_name), updated_at = now()
  where id = p_org_id
  returning * into o;

  if o.id is null then raise exception 'organization not found'; end if;
  if o.name is distinct from o_old.name then
    perform public.bc_audit('org.rename', 'organizations', o.id,
                            jsonb_build_object('name', o_old.name), jsonb_build_object('name', o.name));
  end if;
  return o;
end;
$$;
revoke execute on function public.bc_update_org(text, text) from public, anon;
grant execute on function public.bc_update_org(text, text) to authenticated;

create or replace function public.bc_update_station(
  p_station_id text, p_name text, p_market text, p_timezone text
) returns public.stations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r_old public.stations;
  r     public.stations;
begin
  if not (public.is_platform_admin() or exists (
    select 1
    from public.organization_members om
    join public.stations s on s.org_id = om.org_id
    where s.id = p_station_id
      and om.user_id = (select auth.uid())
      and om.role in ('owner', 'gm', 'om')
  )) then
    raise exception 'not authorized to edit station %', p_station_id using errcode = '42501';
  end if;

  select * into r_old from public.stations where id = p_station_id;

  update public.stations set
    name     = coalesce(nullif(btrim(p_name), ''), name),
    market   = coalesce(p_market, market),
    timezone = coalesce(p_timezone, timezone),
    updated_at = now()
  where id = p_station_id
  returning * into r;

  if r.id is null then
    raise exception 'station % not found', p_station_id;
  end if;
  if (r.name, r.market, r.timezone) is distinct from (r_old.name, r_old.market, r_old.timezone) then
    perform public.bc_audit('station.update', 'stations', r.id,
                            jsonb_build_object('name', r_old.name, 'market', r_old.market, 'timezone', r_old.timezone),
                            jsonb_build_object('name', r.name, 'market', r.market, 'timezone', r.timezone));
  end if;
  return r;
end;
$$;
revoke execute on function public.bc_update_station(text, text, text, text) from public, anon;
grant execute on function public.bc_update_station(text, text, text, text) to authenticated;

-- ============================================================ device keys ==

create or replace function public.bc_admin_station_keys()
returns table (
  station_id     text,
  station_name   text,
  call_sign      text,
  org_id         text,
  org_name       text,
  station_status text,
  has_key        boolean,
  key_created_at timestamptz,
  engine_seen_at timestamptz,
  engine_version text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
#variable_conflict use_column
begin
  perform public.bc_require_platform_admin();
  -- k.key is deliberately never selected.
  return query
  select s.id, s.name, s.call_sign, o.id, o.name, s.status,
         k.station_id is not null, k.created_at,
         a.updated_at, a.engine_version
  from public.stations s
  join public.organizations o on o.id = s.org_id
  left join public.airsuite_station_keys k on k.station_id = s.id
  left join public.airsuite_station_status a on a.station_id = s.id
  order by o.name, s.name;
end;
$$;
revoke execute on function public.bc_admin_station_keys() from public, anon;
grant execute on function public.bc_admin_station_keys() to authenticated;

-- Defence in depth (Jev 0.91, revoke): RLS already hides every row (no
-- policy), and only the service-role edge functions read this table. Taking
-- the privileges away means a client request is refused before RLS is even
-- consulted. The service role is untouched, so the live heartbeat is too.
revoke all on table public.airsuite_station_keys from anon, authenticated;

-- ============================================================== waitlist ==

alter table public.bc_leads add column if not exists notes text;
alter table public.bc_leads add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bc_leads_notes_len') then
    alter table public.bc_leads add constraint bc_leads_notes_len
      check (notes is null or length(notes) <= 4000);
  end if;
end $$;

drop trigger if exists set_updated_at_bc_leads on public.bc_leads;
create trigger set_updated_at_bc_leads before update on public.bc_leads
  for each row execute function public.update_updated_at_column();

-- The public forms (broadcastcopy.ai early access, the dashboard's /request)
-- insert exactly these nine columns. Narrowing the privilege to them (Jev
-- 1.00, narrow) means the public cannot set status, notes, id or timestamps.
-- Reads stay admin-only (bc_leads_admin_read); updates stay admin-only
-- (bc_leads_admin_write) and are audited by the 115 trigger.
revoke insert on table public.bc_leads from anon, authenticated;
grant insert (name, email, organization, call_sign, band, station_count, market, message, source)
  on table public.bc_leads to anon, authenticated;
-- anon never needs to read, change or remove a lead.
revoke select, update, delete, truncate, references, trigger on table public.bc_leads from anon;
revoke truncate, references, trigger on table public.bc_leads from authenticated;

commit;
