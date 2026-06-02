-- =====================================================================
-- 031_tighten_email_campaigns_and_trigger_grants
-- Follow-ups surfaced by the Supabase security advisor.
-- =====================================================================

-- (1) email_campaigns: the "Admins can manage" policy was ALL to {public}
--     with USING(true) — i.e. ANYONE (incl. anon) could read/write/delete
--     campaigns. Re-gate it to staff (sales/marketing/admin) only.
drop policy if exists "Admins can manage email campaigns" on public.email_campaigns;

create policy "Staff manage email campaigns"
  on public.email_campaigns for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- (2) Trigger functions are executed by their triggers, never by clients.
--     Remove the implicit PUBLIC execute grant so they aren't callable as
--     RPCs (defense-in-depth; flagged 0028/0029 by the advisor).
revoke execute on function public.profiles_guard_privileged() from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.notify_admin_on_drop()      from public, anon, authenticated;
