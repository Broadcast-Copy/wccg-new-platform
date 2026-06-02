-- =====================================================================
-- 032_rls_for_rebuilt_flows
-- RLS gaps surfaced while rebuilding the dead-apiClient pages to query
-- Supabase directly. Each block unblocks one rebuilt flow. Page-level
-- RequireRole guards remain the UI gate; these are the data backstop.
-- =====================================================================

-- ---- MARKETPLACE ------------------------------------------------------
-- Drift fix: migration 009 defined a public read of active products but it
-- never landed on the live DB, so the shop showed zero products.
drop policy if exists "Active products are public" on public.vendor_products;
create policy "Active products are public"
  on public.vendor_products for select
  using (status = 'active');

-- Buyers can add line items to their own order.
drop policy if exists "Buyers insert own order items" on public.order_items;
create policy "Buyers insert own order items"
  on public.order_items for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.buyer_id = auth.uid()
  ));

-- ---- RECORD POOL ------------------------------------------------------
-- Staff can read pending tracks + moderate (approve/reject).
drop policy if exists "Staff manage record pool tracks" on public.record_pool_tracks;
create policy "Staff manage record pool tracks"
  on public.record_pool_tracks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- A user can log their own downloads.
drop policy if exists "Users log own pool downloads" on public.record_pool_downloads;
create policy "Users log own pool downloads"
  on public.record_pool_downloads for insert to authenticated
  with check (user_id = auth.uid());

-- ---- DJ DROPS ---------------------------------------------------------
-- Staff (incl. production/engineering) can publish drops in-app.
drop policy if exists "Staff update drops" on public.dj_drops;
create policy "Staff update drops"
  on public.dj_drops for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---- EVENTS -----------------------------------------------------------
-- Event creators manage their own tickets.
drop policy if exists "Creators manage event tickets" on public.ticket_types;
create policy "Creators manage event tickets"
  on public.ticket_types for all to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = ticket_types.event_id and e.creator_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.events e
    where e.id = ticket_types.event_id and e.creator_id = auth.uid()
  ));

-- Event creators can read + check-in all attendees of their events.
drop policy if exists "Organizers read event registrations" on public.event_registrations;
create policy "Organizers read event registrations"
  on public.event_registrations for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_registrations.event_id and e.creator_id = auth.uid()
  ));

drop policy if exists "Organizers update event registrations" on public.event_registrations;
create policy "Organizers update event registrations"
  on public.event_registrations for update to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_registrations.event_id and e.creator_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.events e
    where e.id = event_registrations.event_id and e.creator_id = auth.uid()
  ));

-- Event creators can add organizer rows for their events.
drop policy if exists "Creators add event organizers" on public.event_organizers;
create policy "Creators add event organizers"
  on public.event_organizers for insert to authenticated
  with check (exists (
    select 1 from public.events e
    where e.id = event_organizers.event_id and e.creator_id = auth.uid()
  ));

-- ---- ADVERTISER PORTAL ------------------------------------------------
-- Advertisers can upload creatives to campaigns on their own account.
drop policy if exists "Advertisers insert own creatives" on public.ad_creatives;
create policy "Advertisers insert own creatives"
  on public.ad_creatives for insert to authenticated
  with check (exists (
    select 1 from public.ad_campaigns c
    join public.advertiser_accounts a on a.id = c.advertiser_id
    where c.id = ad_creatives.campaign_id and a.user_id = auth.uid()
  ));

-- Advertisers can read invoices for their own account.
drop policy if exists "Advertisers read own invoices" on public.ad_invoices;
create policy "Advertisers read own invoices"
  on public.ad_invoices for select to authenticated
  using (exists (
    select 1 from public.advertiser_accounts a
    where a.id = ad_invoices.advertiser_id and a.user_id = auth.uid()
  ));

-- ---- STATION OPS CONSOLES (admin-tier UI; staff data backstop) --------
-- Restream, master-control, and EAS tables were service_role-only, so the
-- admin consoles loaded empty and their actions failed. Grant staff R/W.
drop policy if exists "Staff manage restream destinations" on public.restream_destinations;
create policy "Staff manage restream destinations"
  on public.restream_destinations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage restream events" on public.restream_events;
create policy "Staff manage restream events"
  on public.restream_events for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage mcr state" on public.mcr_state;
create policy "Staff manage mcr state"
  on public.mcr_state for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage eas alerts" on public.eas_alerts;
create policy "Staff manage eas alerts"
  on public.eas_alerts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage eas test schedule" on public.eas_test_schedule;
create policy "Staff manage eas test schedule"
  on public.eas_test_schedule for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
