-- 072: Sermon archive — weekly church broadcast recordings served on each
-- church's show page. Files live in the public `sermons` storage bucket as
-- <church_code>/<YYYY-MM-DD>.<ext>; rows here are the browse index.
-- Codes: gpn1 Grace Plus Nothing, thm1 Encouraging Moment, dvp1 Family
-- Fellowship, pmb1 Progressive MBC, lcc1 Lewis Chapel.

insert into storage.buckets (id, name, public)
values ('sermons', 'sermons', true)
on conflict (id) do nothing;

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  church_code text not null,
  air_date date not null,
  storage_path text not null,
  format text not null default 'mp3',
  size_bytes bigint,
  created_at timestamptz not null default now(),
  unique (church_code, air_date)
);

alter table public.sermons enable row level security;

-- Public read; writes happen only via service role (no client policies).
create policy "sermons are public" on public.sermons
  for select using (true);

create index if not exists sermons_church_air_idx
  on public.sermons (church_code, air_date desc);

create policy "sermons bucket public read" on storage.objects
  for select using (bucket_id = 'sermons');
