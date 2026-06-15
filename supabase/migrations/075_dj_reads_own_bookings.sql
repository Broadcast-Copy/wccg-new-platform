-- 075: let a DJ read the booking requests addressed to them (read-only).
-- Additive to 073's "staff read bookings" — RLS policies are OR'd, so a DJ who
-- is also staff still sees everything. A plain DJ sees only their own bookings;
-- the public still has no SELECT at all (contact details stay private).
-- Uses (select auth.uid()) for the initplan optimization (see migration 067).

create policy "dj reads own bookings" on public.dj_bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.djs d
      where d.id = public.dj_bookings.dj_id
        and d.user_id = (select auth.uid())
    )
  );
