-- =====================================================================
-- 096_bc_changelog
-- The Broadcast Copy product changelog — single source of truth, shown in
-- real time on broadcastcopy.ai AND wccg1045fm.com/changelog.
--
-- Founding principle: every update to the flagship (wccg1045fm.com) is a
-- Broadcast Copy changelog entry. So this is PLATFORM-GLOBAL (no station_id,
-- deliberately NO tenant_isolation policy — same rationale as bc_leads).
--
-- "Version controlled" = each row is a semantic version (unique), ordered by
-- sort_order. "Real time" = public SELECT of published rows, so the static
-- marketing site + the app read it with the anon key and never need a rebuild
-- to show a new release. Writes are platform-admin / service-role only.
-- =====================================================================

begin;

create table if not exists public.bc_changelog (
  id           text primary key default ('cl_' || gen_random_uuid()::text),
  version      text not null unique,
  released_on  date not null,
  channel      text not null default 'beta',
  title        text,
  changes      jsonb not null default '[]'::jsonb,
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint bc_changelog_channel_valid check (channel in ('alpha', 'beta', 'stable')),
  constraint bc_changelog_changes_is_array check (jsonb_typeof(changes) = 'array')
);

create index if not exists idx_bc_changelog_sort on public.bc_changelog (sort_order desc);

drop trigger if exists set_updated_at_bc_changelog on public.bc_changelog;
create trigger set_updated_at_bc_changelog before update on public.bc_changelog
  for each row execute function public.update_updated_at_column();

alter table public.bc_changelog enable row level security;

-- Public (anon) may read PUBLISHED entries only — this is what makes the
-- marketing site + app "real time" without a redeploy.
drop policy if exists bc_changelog_public_read on public.bc_changelog;
create policy bc_changelog_public_read on public.bc_changelog
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists bc_changelog_admin_write on public.bc_changelog;
create policy bc_changelog_admin_write on public.bc_changelog
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists bc_changelog_service on public.bc_changelog;
create policy bc_changelog_service on public.bc_changelog
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---- Seed: the real version history (idempotent on version) ----------------
insert into public.bc_changelog (version, released_on, channel, title, sort_order, changes) values
  ('0.1.0-beta','2026-03-28','beta','Initial platform launch',10, jsonb_build_array(
    'Initial platform launch — 190+ pages',
    'Streaming: 5 channels, show schedule, host profiles with social links',
    '19 Supabase migrations applied — full database schema',
    'File upload system with Supabase Storage (audio, images, media buckets)',
    'Points & rewards system with listener points tracking',
    'Community directory with 72 local business listings and interactive map',
    'Advertiser self-service portal with campaigns, creatives, billing, performance',
    'Sports hub with Duke basketball and football coverage')),
  ('0.2.0-beta','2026-03-28','beta','Hubs + marketplace',20, jsonb_build_array(
    'Creator Hub, Vendor Hub, Listener Hub — social feeds with posts, likes, YouTube embeds',
    'Public marketplace with hero slider, hot categories, products from wccg1045fm.com',
    'Universal gift card system with vendor opt-in',
    'Vendor marketing portal — 5-step campaign wizard',
    'Public vendor storefront with inline booking',
    'Favorites expanded: Streams, Shows, Places, Products, Events')),
  ('0.3.0-beta','2026-03-29','beta','E-commerce + admin tools',30, jsonb_build_array(
    'E-commerce: checkout, order system, order tracking for buyers and vendors',
    'Vendor payouts/withdrawals with balance tracking',
    'Onboarding wizard — 3-step welcome flow',
    'Admin: user management, platform fee configuration, moderation queue, audit log',
    'Changelog page with version timeline')),
  ('0.4.0-beta','2026-03-29','beta','Vendor reviews + PWA',40, jsonb_build_array(
    'Product reviews with star ratings and vendor analytics dashboard',
    'Bulk gift card admin tool',
    'Become a Vendor application form',
    'PWA manifest — install WCCG as an app on mobile')),
  ('0.5.0-beta','2026-03-30','beta','WCCG DSP — ad buying',50, jsonb_build_array(
    'WCCG DSP: full demand-side platform for ad buying',
    '6-step unified campaign builder',
    'Cross-platform analytics dashboard with per-channel breakdowns',
    'Audience segment builder and ad inventory manager',
    'API stubs for Meta, TikTok, Google, Snapchat')),
  ('0.6.0-beta','2026-03-31','beta','Notifications + campaigns',60, jsonb_build_array(
    'Push notification manager for admin',
    'Referral program with QR codes',
    'Podcast RSS generator with iTunes-compatible XML',
    'A/B testing for ad creatives with auto-winner detection',
    'Invoice PDF generation and email campaign builder')),
  ('0.7.0-beta','2026-03-31','beta','Studio + meetings',70, jsonb_build_array(
    'Studio projects now save to Supabase — persist across devices',
    'Zoom-style meeting room with video grid, controls, chat, lobby',
    'Video overlay system with presets and animated text',
    'Studio Manager: manage all 7 station studios')),
  ('0.8.0-beta','2026-04-02','beta','Hub API + tests',80, jsonb_build_array(
    'NestJS Hub API: posts, likes, membership, stats',
    '167 unit tests across 16 API modules',
    'Dynamic hero ticker rotating blog posts + news',
    'Switched to webpack builds — fixed client navigation crash',
    'GitHub Actions auto-deploy on push to main')),
  ('0.9.0-beta','2026-06-17','beta','Multi-tenant foundation',90, jsonb_build_array(
    'Two-level tenancy: organizations to stations, with per-station entitlements',
    'station_id added to 81 tables and org_id to 39, backfilled with zero downtime',
    'Restrictive tenant-isolation RLS across 121 tables — data separation enforced in the database, not just the app',
    'WCCG 104.5 seeded as flagship tenant #1 with zero behavior change for listeners',
    'Platform-admin and station-staff role model')),
  ('0.10.0-beta','2026-06-24','beta','Database-driven content + relaunch',100, jsonb_build_array(
    'All station content (27 shows, 44 hosts, weekly schedule, check-in locations) moved from hardcoded files into the database',
    'The site now reads content from Supabase at build time, with a bundled fallback',
    'station_id wired into every service-role writer (48 insert sites)',
    '167 API tests green; multi-tenant build verified end to end and deployed to production')),
  ('0.11.0-beta','2026-07-22','beta','broadcastcopy.ai + AirSuite fleet',110, jsonb_build_array(
    'broadcastcopy.ai marketing site: features, pricing at $49.99/mo per station, early access',
    'Early-access lead capture with real-time email alerts to the team',
    'AirSuite fleet telemetry and live now-playing surfaced in the Broadcast Copy admin',
    'Live on-air proof on the marketing site — the real flagship playout, straight from the engine',
    'Version-controlled changelog (this page), updated in real time'))
on conflict (version) do nothing;

commit;
