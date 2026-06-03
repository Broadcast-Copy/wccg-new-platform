-- =====================================================================
-- 045_media_manager_state
-- Per-user persistence for the Media Manager (/my/mixes). Previously the
-- whole library (folders + files + DJB pattern + FTP config) lived ONLY in
-- browser localStorage under a single global key, so it was lost on a cache
-- clear or a different device and was never tied to the account. Store the
-- manager state as a per-user JSON blob so it survives and syncs.
-- =====================================================================

create table if not exists public.media_manager_state (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.media_manager_state enable row level security;

-- Each user reads/writes only their own library.
drop policy if exists "media_manager_state_select_own" on public.media_manager_state;
create policy "media_manager_state_select_own" on public.media_manager_state for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "media_manager_state_insert_own" on public.media_manager_state;
create policy "media_manager_state_insert_own" on public.media_manager_state for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "media_manager_state_update_own" on public.media_manager_state;
create policy "media_manager_state_update_own" on public.media_manager_state for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
