-- 085_launch_hardening.sql
-- Pre-launch hardening from the security advisor (safe subset).

-- 1) The booking-notification trigger fn should not be a callable RPC (anon
-- could POST to /rpc/notify_on_booking and spam the notify endpoint). The
-- trigger still fires on booking inserts regardless of EXECUTE grants.
revoke execute on function public.notify_on_booking() from anon, authenticated, public;

-- 2) Pin the sales updated-at trigger fn search_path (was role-mutable).
alter function public.sales_set_updated_at() set search_path = '';

-- 3) Tighten the wide-open public newsletter insert (was WITH CHECK (true)) so
-- it only accepts something shaped like an email address.
drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (email is not null and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
