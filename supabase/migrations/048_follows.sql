-- =====================================================================
-- 048_follows
-- Social follow graph for the public profiles (/u/<handle>): who follows whom,
-- powering follower/following counts and the Follow button.
-- =====================================================================

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists follows_follower_idx on public.follows(follower_id);

alter table public.follows enable row level security;

-- Follower counts + follow-state are public (standard social graph).
drop policy if exists "follows_read" on public.follows;
create policy "follows_read" on public.follows for select using (true);

-- You may only create/remove your own follows.
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete to authenticated
  using (auth.uid() = follower_id);
