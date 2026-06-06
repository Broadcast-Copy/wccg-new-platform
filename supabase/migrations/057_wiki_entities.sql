-- =====================================================================
-- 057_wiki_entities
-- WCCG wiki: AI-researched encyclopedia entries for artists/topics, with a
-- staff approve queue. Replaces the dead NestJS /wiki endpoints.
--   requested -> researching -> pending_review -> published | rejected
-- Public reads PUBLISHED only; authenticated users can QUEUE a request; staff
-- manage everything; the wiki-research edge function (service role) fills content.
-- Idempotent.
-- =====================================================================

create table if not exists public.wiki_entities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  entity_type text not null default 'artist',
  summary text,
  content text,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'requested'
    check (status in ('requested','researching','pending_review','published','rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists wiki_entities_status_idx on public.wiki_entities (status, updated_at desc);

alter table public.wiki_entities enable row level security;

-- Public can read published entries; staff can read everything.
drop policy if exists "wiki read published" on public.wiki_entities;
create policy "wiki read published" on public.wiki_entities
  for select using (status = 'published' or public.is_staff());

-- Signed-in users can QUEUE a request (status must be 'requested'); staff any.
drop policy if exists "wiki request" on public.wiki_entities;
create policy "wiki request" on public.wiki_entities
  for insert to authenticated with check (status = 'requested' or public.is_staff());

-- Only staff edit/approve/reject or delete.
drop policy if exists "wiki staff update" on public.wiki_entities;
create policy "wiki staff update" on public.wiki_entities
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "wiki staff delete" on public.wiki_entities;
create policy "wiki staff delete" on public.wiki_entities
  for delete to authenticated using (public.is_staff());
