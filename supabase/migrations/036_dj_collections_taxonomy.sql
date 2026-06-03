-- =====================================================================
-- 036_dj_collections_taxonomy
-- Content taxonomy for DJ mixshows on /djs/[slug]:
--   podcast → season → episode      (kind podcast/series; child kind=season)
--   mixtape → collection → volume → mixtape/track
-- A self-referencing dj_collections tree holds the hierarchy; dj_mixes are
-- the leaf audio items (each with its own cover art for the player).
-- Front-end uploads (admin / the owning DJ) land in the public dj-mixes bucket.
-- =====================================================================

-- ---- hierarchical collections -----------------------------------------
create table if not exists public.dj_collections (
  id              uuid primary key default gen_random_uuid(),
  dj_id           text references public.djs(id) on delete cascade,
  host_id         text,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  kind            text not null default 'collection'
                  check (kind in ('podcast','series','mixtape','album','collection','season','volume')),
  parent_id       uuid references public.dj_collections(id) on delete cascade,
  title           text not null,
  description     text,
  cover_image_url text,
  position        int not null default 0,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists dj_collections_dj_idx on public.dj_collections(dj_id);
create index if not exists dj_collections_parent_idx on public.dj_collections(parent_id);

create or replace function public.dj_collections_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_dj_collections_touch on public.dj_collections;
create trigger trg_dj_collections_touch before update on public.dj_collections
  for each row execute function public.dj_collections_touch();

-- ---- extend dj_mixes (the leaf items) ---------------------------------
alter table public.dj_mixes add column if not exists dj_id text references public.djs(id) on delete set null;
alter table public.dj_mixes add column if not exists collection_id uuid references public.dj_collections(id) on delete set null;
alter table public.dj_mixes add column if not exists item_type text default 'mix';     -- episode | mixtape | track | mix
alter table public.dj_mixes add column if not exists item_number int;                  -- episode/track/volume number
alter table public.dj_mixes add column if not exists position int default 0;
alter table public.dj_mixes add column if not exists is_published boolean not null default true;
create index if not exists dj_mixes_collection_idx on public.dj_mixes(collection_id);
create index if not exists dj_mixes_dj_idx on public.dj_mixes(dj_id);

-- ---- RLS --------------------------------------------------------------
alter table public.dj_collections enable row level security;
alter table public.dj_mixes enable row level security;

-- helper: does the current user own this dj (djs.user_id = auth.uid())?
create or replace function public.owns_dj(p_dj_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.djs d where d.id = p_dj_id and d.user_id = auth.uid());
$$;
revoke all on function public.owns_dj(text) from public;
grant execute on function public.owns_dj(text) to authenticated, anon, service_role;

drop policy if exists "dj_collections_read" on public.dj_collections;
create policy "dj_collections_read" on public.dj_collections for select
  using (is_public or public.is_staff() or public.owns_dj(dj_id));

drop policy if exists "dj_collections_write" on public.dj_collections;
create policy "dj_collections_write" on public.dj_collections for all to authenticated
  using (public.is_staff() or public.owns_dj(dj_id))
  with check (public.is_staff() or public.owns_dj(dj_id));

drop policy if exists "dj_mixes_read" on public.dj_mixes;
create policy "dj_mixes_read" on public.dj_mixes for select
  using (is_published or public.is_staff() or public.owns_dj(dj_id));

drop policy if exists "dj_mixes_write" on public.dj_mixes;
create policy "dj_mixes_write" on public.dj_mixes for all to authenticated
  using (public.is_staff() or public.owns_dj(dj_id))
  with check (public.is_staff() or public.owns_dj(dj_id));

-- ---- upload bucket (public; audio + cover art) ------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('dj-mixes', 'dj-mixes', true, 524288000)
on conflict (id) do nothing;

drop policy if exists "dj_mixes_public_read" on storage.objects;
create policy "dj_mixes_public_read" on storage.objects for select
  using (bucket_id = 'dj-mixes');

drop policy if exists "dj_mixes_staff_write" on storage.objects;
create policy "dj_mixes_staff_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'dj-mixes' and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists "dj_mixes_staff_modify" on storage.objects;
create policy "dj_mixes_staff_modify" on storage.objects for update to authenticated
  using (bucket_id = 'dj-mixes' and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists "dj_mixes_staff_delete" on storage.objects;
create policy "dj_mixes_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'dj-mixes' and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text));
