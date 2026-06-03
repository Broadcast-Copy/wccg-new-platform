-- =====================================================================
-- 040_video_progress_and_program
-- Netflix-style video wall: per-user "continue watching" progress + a
-- program tag for grouping videos into category rows (Angela Yee, Incognito,
-- ABC News, …). listening_sessions already exists; no change needed there.
-- =====================================================================

-- "program" groups videos into rows; falls back to creator_name when null.
alter table public.videos add column if not exists program text;
create index if not exists videos_program_idx on public.videos(program);

-- Continue-watching progress (one row per user+video).
create table if not exists public.video_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  video_id         uuid not null references public.videos(id) on delete cascade,
  position_seconds integer not null default 0,
  duration_seconds integer,
  completed        boolean not null default false,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user_id, video_id)
);
create index if not exists video_progress_user_idx on public.video_progress(user_id, updated_at desc);

alter table public.video_progress enable row level security;

drop policy if exists "video_progress_rw_own" on public.video_progress;
create policy "video_progress_rw_own" on public.video_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
