-- =====================================================================
-- 050_staff_drop_on_behalf
-- Let staff/admins drop mix files on behalf of any DJ, so uploads can happen
-- right inside the production mixshow folder. DJs already upload their own via
-- "DJs insert own drops" (dj_drops) and "DJs upload own drops" (storage).
-- =====================================================================

drop policy if exists "Staff insert any drop" on public.dj_drops;
create policy "Staff insert any drop" on public.dj_drops for insert to authenticated
  with check (public.is_staff());

drop policy if exists "Staff upload any drop storage" on storage.objects;
create policy "Staff upload any drop storage" on storage.objects for insert to authenticated
  with check (bucket_id = 'dj-drops' and public.is_staff());

drop policy if exists "Staff update any drop storage" on storage.objects;
create policy "Staff update any drop storage" on storage.objects for update to authenticated
  using (bucket_id = 'dj-drops' and public.is_staff())
  with check (bucket_id = 'dj-drops' and public.is_staff());
