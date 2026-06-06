-- =====================================================================
-- 052_entity_follows
-- Polymorphic follow store for hosts / shows / users (replaces the dead
-- NestJS /follows endpoints used by the social FollowButton + FollowerCount on
-- /hosts/[hostId] and /shows/[showId]). hosts.id and shows.id are TEXT, so
-- target_id is text (a user target stores the profile uuid as text).
--
-- (User→user social follows on /u/[username] keep using the separate `follows`
-- table; this table covers host/show and any future entity follows.)
-- Idempotent.
-- =====================================================================

create table if not exists public.entity_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('host','show','user')),
  target_id text not null,
  created_at timestamptz not null default now(),
  unique (follower_id, target_type, target_id)
);

create index if not exists entity_follows_target_idx
  on public.entity_follows (target_type, target_id);

alter table public.entity_follows enable row level security;

-- Public read so follower counts are visible to everyone (incl. logged-out).
drop policy if exists "entity_follows_read" on public.entity_follows;
create policy "entity_follows_read" on public.entity_follows
  for select using (true);

-- Each user manages only their own follows.
drop policy if exists "entity_follows_insert_own" on public.entity_follows;
create policy "entity_follows_insert_own" on public.entity_follows
  for insert to authenticated with check (auth.uid() = follower_id);

drop policy if exists "entity_follows_delete_own" on public.entity_follows;
create policy "entity_follows_delete_own" on public.entity_follows
  for delete to authenticated using (auth.uid() = follower_id);
