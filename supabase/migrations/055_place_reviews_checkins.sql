-- =====================================================================
-- 055_place_reviews_checkins
-- Re-enable reviews + check-ins on directory (place) profiles. Reviews are
-- public-read / own-write; check-ins are own-read (privacy — we don't expose
-- who-was-where), with a public aggregate count via a SECURITY DEFINER RPC.
-- directory_listings.id is TEXT. Idempotent.
-- =====================================================================

-- ── Reviews ──────────────────────────────────────────────────────────
create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.directory_listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);
create index if not exists place_reviews_place_idx on public.place_reviews (place_id, created_at desc);

alter table public.place_reviews enable row level security;
drop policy if exists "place_reviews_read" on public.place_reviews;
create policy "place_reviews_read" on public.place_reviews for select using (true);
drop policy if exists "place_reviews_insert_own" on public.place_reviews;
create policy "place_reviews_insert_own" on public.place_reviews
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "place_reviews_update_own" on public.place_reviews;
create policy "place_reviews_update_own" on public.place_reviews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "place_reviews_delete_own" on public.place_reviews;
create policy "place_reviews_delete_own" on public.place_reviews
  for delete to authenticated using (auth.uid() = user_id);

-- ── Check-ins ────────────────────────────────────────────────────────
create table if not exists public.place_checkins (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.directory_listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
create index if not exists place_checkins_place_idx on public.place_checkins (place_id);
create index if not exists place_checkins_user_idx on public.place_checkins (user_id, created_at desc);

alter table public.place_checkins enable row level security;
-- Own-read only (don't leak member locations); public count comes from the RPC.
drop policy if exists "place_checkins_read_own" on public.place_checkins;
create policy "place_checkins_read_own" on public.place_checkins
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "place_checkins_insert_own" on public.place_checkins;
create policy "place_checkins_insert_own" on public.place_checkins
  for insert to authenticated with check (auth.uid() = user_id);

-- Public, identity-free check-in count.
create or replace function public.place_checkin_count(p_place_id text)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.place_checkins where place_id = p_place_id;
$$;
grant execute on function public.place_checkin_count(text) to anon, authenticated;
