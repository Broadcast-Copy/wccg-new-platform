-- 096: Private, owner-only recordings of LiveKit Podcast Studio sessions (room egress).
-- Applied to prod via MCP on 2026-06-30; this file keeps the repo migration history in sync.

create table if not exists public.studio_recordings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  room text not null,
  title text not null default 'Studio Session',
  egress_id text unique,
  status text not null default 'recording', -- recording | processing | ready | failed
  storage_path text,
  duration_seconds integer,
  size_bytes bigint,
  format text,
  error text,
  station_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_recordings_owner_idx on public.studio_recordings (owner_id, created_at desc);
create index if not exists studio_recordings_egress_idx on public.studio_recordings (egress_id);

alter table public.studio_recordings enable row level security;

drop policy if exists "owner reads own recordings" on public.studio_recordings;
create policy "owner reads own recordings" on public.studio_recordings
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "owner inserts own recordings" on public.studio_recordings;
create policy "owner inserts own recordings" on public.studio_recordings
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "owner updates own recordings" on public.studio_recordings;
create policy "owner updates own recordings" on public.studio_recordings
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "owner deletes own recordings" on public.studio_recordings;
create policy "owner deletes own recordings" on public.studio_recordings
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Private bucket for the recorded files (egress uploads here via S3 keys; owners read via signed URLs).
insert into storage.buckets (id, name, public)
values ('studio-recordings', 'studio-recordings', false)
on conflict (id) do nothing;

drop policy if exists "owner reads own studio recording files" on storage.objects;
create policy "owner reads own studio recording files" on storage.objects
  for select to authenticated
  using (bucket_id = 'studio-recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "owner deletes own studio recording files" on storage.objects;
create policy "owner deletes own studio recording files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'studio-recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
