-- 076: Post-media — let users attach images / videos / PDFs to hub feed posts.
-- Files live in the public `post-media` bucket as <uid>/<...>; hub_posts rows
-- reference them via media_paths[] + media_type. Legacy media_url/link_url stay.

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Public read (feed media is visible to anyone who can see the post).
drop policy if exists "post-media public read" on storage.objects;
create policy "post-media public read" on storage.objects
  for select using (bucket_id = 'post-media');

-- Authenticated users may write/replace/delete ONLY within their own <uid>/ folder.
drop policy if exists "post-media owner insert" on storage.objects;
create policy "post-media owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "post-media owner update" on storage.objects;
create policy "post-media owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "post-media owner delete" on storage.objects;
create policy "post-media owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- hub_posts: support direct file attachments alongside the legacy media_url/link_url.
alter table public.hub_posts
  add column if not exists media_type text
    check (media_type in ('image', 'video', 'pdf'));
alter table public.hub_posts
  add column if not exists media_paths text[];
