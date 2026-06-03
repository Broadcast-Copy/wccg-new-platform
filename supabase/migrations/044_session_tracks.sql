-- =====================================================================
-- 044_session_tracks
-- Per-session song log. `listening_sessions` only keeps the last-known
-- track, and the station-wide `song_history` is empty, so to show "what
-- songs you heard this session (and the points each one earned)" we record
-- every song change against the session as the user listens. Points are
-- time-based (1 pt / 90s) and derived per-song from each track's airtime in
-- the listening tracker / UI — we store the play timestamps here.
-- =====================================================================

create table if not exists public.session_tracks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.listening_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default '',
  artist      text not null default '',
  album_art   text,
  played_at   timestamptz not null default now()
);

create index if not exists session_tracks_session_idx on public.session_tracks(session_id, played_at);
create index if not exists session_tracks_user_idx on public.session_tracks(user_id);

alter table public.session_tracks enable row level security;

-- A user can read and write only their own session tracks (the tracker
-- inserts these client-side while signed in).
drop policy if exists "session_tracks_read_own" on public.session_tracks;
create policy "session_tracks_read_own" on public.session_tracks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "session_tracks_insert_own" on public.session_tracks;
create policy "session_tracks_insert_own" on public.session_tracks for insert to authenticated
  with check (auth.uid() = user_id);
