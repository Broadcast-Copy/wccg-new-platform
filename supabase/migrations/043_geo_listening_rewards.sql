-- =====================================================================
-- 043_geo_listening_rewards
-- Geo-gamified listening: track distinct cities/states a user listens from,
-- award bonus points for new places, and unlock travel badges. The award
-- logic lives in a SECURITY DEFINER RPC so each place pays out only once.
-- =====================================================================

create table if not exists public.listening_locations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  city              text not null default '',
  state             text not null default '',
  country           text not null default '',
  latitude          double precision,
  longitude         double precision,
  listen_count      int  not null default 1,
  first_listened_at timestamptz not null default now(),
  last_listened_at  timestamptz not null default now(),
  unique (user_id, state, city)
);
create index if not exists listening_locations_user_idx on public.listening_locations(user_id);

create table if not exists public.user_geo_badges (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_key   text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.listening_sessions add column if not exists city text;
alter table public.listening_sessions add column if not exists state text;

alter table public.listening_locations enable row level security;
alter table public.user_geo_badges enable row level security;

drop policy if exists "listening_locations_read_own" on public.listening_locations;
create policy "listening_locations_read_own" on public.listening_locations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_geo_badges_read_own" on public.user_geo_badges;
create policy "user_geo_badges_read_own" on public.user_geo_badges for select to authenticated
  using (auth.uid() = user_id);

-- ---- award RPC --------------------------------------------------------
create or replace function public.record_listening_location(
  p_city text, p_state text, p_country text, p_lat double precision, p_lng double precision
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  v_city     text := coalesce(nullif(trim(p_city), ''), 'Unknown');
  v_state    text := coalesce(nullif(trim(p_state), ''), '');
  v_country  text := coalesce(nullif(trim(p_country), ''), '');
  is_new_city  boolean;
  is_new_state boolean;
  awarded    jsonb := '[]'::jsonb;
  new_badges jsonb := '[]'::jsonb;
  city_count int;
  state_count int;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  is_new_city := not exists (
    select 1 from public.listening_locations where user_id = uid and state = v_state and city = v_city);
  is_new_state := v_state <> '' and not exists (
    select 1 from public.listening_locations where user_id = uid and state = v_state);

  insert into public.listening_locations (user_id, city, state, country, latitude, longitude)
  values (uid, v_city, v_state, v_country, p_lat, p_lng)
  on conflict (user_id, state, city) do update
    set listen_count = public.listening_locations.listen_count + 1,
        last_listened_at = now(),
        latitude = coalesce(excluded.latitude, public.listening_locations.latitude),
        longitude = coalesce(excluded.longitude, public.listening_locations.longitude);

  if is_new_state then
    insert into public.points_history (user_id, amount, reason, description, program)
      values (uid, 50, 'GEO_STATE', 'Listened from a new state: ' || v_state, 'WCCG 104.5 FM');
    awarded := awarded || jsonb_build_object('type', 'state', 'label', v_state, 'points', 50);
  elsif is_new_city then
    insert into public.points_history (user_id, amount, reason, description, program)
      values (uid, 20, 'GEO_CITY', 'Listened from a new city: ' || v_city, 'WCCG 104.5 FM');
    awarded := awarded || jsonb_build_object('type', 'city', 'label', v_city, 'points', 20);
  end if;

  select count(distinct city) into city_count from public.listening_locations where user_id = uid;
  select count(distinct state) into state_count from public.listening_locations where user_id = uid and state <> '';

  if not exists (select 1 from public.user_geo_badges where user_id = uid and badge_key = 'on_the_map') then
    insert into public.user_geo_badges (user_id, badge_key) values (uid, 'on_the_map') on conflict do nothing;
    new_badges := new_badges || to_jsonb('on_the_map'::text);
  end if;
  if state_count >= 2 and not exists (select 1 from public.user_geo_badges where user_id = uid and badge_key = 'across_state_lines') then
    insert into public.user_geo_badges (user_id, badge_key) values (uid, 'across_state_lines') on conflict do nothing;
    new_badges := new_badges || to_jsonb('across_state_lines'::text);
  end if;
  if city_count >= 5 and not exists (select 1 from public.user_geo_badges where user_id = uid and badge_key = 'road_warrior') then
    insert into public.user_geo_badges (user_id, badge_key) values (uid, 'road_warrior') on conflict do nothing;
    new_badges := new_badges || to_jsonb('road_warrior'::text);
  end if;
  if state_count >= 3 and not exists (select 1 from public.user_geo_badges where user_id = uid and badge_key = 'nomad') then
    insert into public.user_geo_badges (user_id, badge_key) values (uid, 'nomad') on conflict do nothing;
    new_badges := new_badges || to_jsonb('nomad'::text);
  end if;

  return jsonb_build_object('awarded', awarded, 'new_badges', new_badges, 'cities', city_count, 'states', state_count);
end; $$;

revoke all on function public.record_listening_location(text, text, text, double precision, double precision) from public, anon;
grant execute on function public.record_listening_location(text, text, text, double precision, double precision) to authenticated;
