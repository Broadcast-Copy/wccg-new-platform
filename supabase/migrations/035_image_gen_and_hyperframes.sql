-- =====================================================================
-- 035_image_gen_and_hyperframes
-- Data model for the AI image generator + the Hyperframes studio tool
-- (branded frame/overlay templates, embeddable iframe widgets, and HTML5
-- promo frames).
-- =====================================================================

-- ---- AI generated images ----------------------------------------------
create table if not exists public.generated_images (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  prompt       text not null,
  size         text,
  provider     text default 'openai',
  model        text default 'gpt-image-1',
  storage_path text not null,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.generated_images enable row level security;

drop policy if exists "gen_images_read" on public.generated_images;
create policy "gen_images_read" on public.generated_images for select
  using (is_public or auth.uid() = user_id or public.is_staff());

drop policy if exists "gen_images_insert_own" on public.generated_images;
create policy "gen_images_insert_own" on public.generated_images for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "gen_images_modify_own" on public.generated_images;
create policy "gen_images_modify_own" on public.generated_images for update to authenticated
  using (auth.uid() = user_id or public.is_staff())
  with check (auth.uid() = user_id or public.is_staff());

drop policy if exists "gen_images_delete_own" on public.generated_images;
create policy "gen_images_delete_own" on public.generated_images for delete to authenticated
  using (auth.uid() = user_id or public.is_staff());

-- ---- Hyperframes (frames / overlays / embeds / promo) -----------------
create table if not exists public.hyperframes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  kind         text not null check (kind in ('frame','overlay','embed','promo')),
  name         text not null,
  config       jsonb not null default '{}'::jsonb,
  storage_path text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.hyperframes enable row level security;

drop policy if exists "hyperframes_read" on public.hyperframes;
create policy "hyperframes_read" on public.hyperframes for select
  using (is_public or auth.uid() = user_id or public.is_staff());

drop policy if exists "hyperframes_write_own" on public.hyperframes;
create policy "hyperframes_write_own" on public.hyperframes for all to authenticated
  using (auth.uid() = user_id or public.is_staff())
  with check (auth.uid() = user_id or public.is_staff());

create or replace function public.hyperframes_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_hyperframes_touch on public.hyperframes;
create trigger trg_hyperframes_touch before update on public.hyperframes
  for each row execute function public.hyperframes_touch_updated_at();

-- ---- buckets (public-read creative assets) ----------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('generated-images', 'generated-images', true, 26214400),
  ('hyperframe-assets', 'hyperframe-assets', true, 26214400)
on conflict (id) do nothing;

drop policy if exists "gen_images_public_read" on storage.objects;
create policy "gen_images_public_read" on storage.objects for select
  using (bucket_id in ('generated-images','hyperframe-assets'));

drop policy if exists "creative_assets_owner_write" on storage.objects;
create policy "creative_assets_owner_write" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('generated-images','hyperframe-assets')
    and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "creative_assets_owner_modify" on storage.objects;
create policy "creative_assets_owner_modify" on storage.objects for update to authenticated
  using (
    bucket_id in ('generated-images','hyperframe-assets')
    and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "creative_assets_owner_delete" on storage.objects;
create policy "creative_assets_owner_delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('generated-images','hyperframe-assets')
    and (public.is_staff() or (storage.foldername(name))[1] = auth.uid()::text)
  );
