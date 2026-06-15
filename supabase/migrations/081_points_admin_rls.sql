-- 081_points_admin_rls.sql
-- PT3: let staff manage the reward catalog + points rules from the admin UI.
-- Both tables already allow public SELECT + service-role writes; add a staff
-- (public.is_staff()) write policy so the Supabase-direct admin page can CRUD.

drop policy if exists reward_catalog_staff_write on public.reward_catalog;
create policy reward_catalog_staff_write on public.reward_catalog
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists points_rules_staff_write on public.points_rules;
create policy points_rules_staff_write on public.points_rules
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
