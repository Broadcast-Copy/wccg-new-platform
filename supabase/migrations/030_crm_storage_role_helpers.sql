-- =====================================================================
-- 030_crm_storage_role_helpers
-- (1) is_staff() helper that tolerates the 'role_' prefix inconsistency
--     in user_roles.role_id AND falls back to profiles.user_type.
-- (2) Re-creates the crm-assets / production-orders buckets (idempotent).
-- (3) FIXES the client-portal storage policies: the prior version checked
--     storage.foldername(c.name) [the client's NAME text] instead of
--     storage.foldername(name) [the uploaded object's path], so clients
--     could never read or upload to their own <client_id>/ folder.
-- =====================================================================

-- ---- staff resolver (prefix-tolerant) ---------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid()
        and replace(ur.role_id, 'role_', '') in
            ('sales','production','engineering','admin','super_admin',
             'management','operations','promotions','traffic','gm')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.user_type in
            ('sales','production','engineering','admin','super_admin',
             'management','operations','promotions','traffic','gm','staff','employee')
    );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated, anon, service_role;

-- ---- buckets (private, 500MB) -----------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('crm-assets',        'crm-assets',        false, 524288000),
  ('production-orders', 'production-orders', false, 524288000)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- ---- storage policies (drop + recreate, corrected) --------------------
drop policy if exists "CRM staff all assets storage"  on storage.objects;
drop policy if exists "Client reads own asset folder" on storage.objects;
drop policy if exists "Client uploads own asset folder" on storage.objects;

-- Staff: full access to both buckets
create policy "CRM staff all assets storage"
  on storage.objects for all
  to authenticated
  using (
    bucket_id in ('crm-assets','production-orders') and public.is_staff()
  )
  with check (
    bucket_id in ('crm-assets','production-orders') and public.is_staff()
  );

-- Client portal: a client may READ files inside their own <client_id>/ folder
create policy "Client reads own asset folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'crm-assets'
    and exists (
      select 1 from public.crm_clients c
      where c.portal_user_id = auth.uid()
        and c.id::text = (storage.foldername(name))[1]
    )
  );

-- Client portal: a client may UPLOAD into their own <client_id>/ folder
create policy "Client uploads own asset folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'crm-assets'
    and exists (
      select 1 from public.crm_clients c
      where c.portal_user_id = auth.uid()
        and c.id::text = (storage.foldername(name))[1]
    )
  );
