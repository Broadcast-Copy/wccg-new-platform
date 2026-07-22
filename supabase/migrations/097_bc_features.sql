-- =====================================================================
-- 097_bc_features
-- The Broadcast Copy feature list shown on broadcastcopy.ai, DB-backed so it
-- updates in real time (edit a row -> the marketing site reflects it with no
-- rebuild). Same shape/rationale as bc_changelog: PLATFORM-GLOBAL (no
-- station_id, no tenant_isolation), public SELECT of published rows, admin +
-- service write. `icon` is a lucide-react icon NAME resolved on the client.
-- =====================================================================

begin;

create table if not exists public.bc_features (
  id           text primary key default ('feat_' || gen_random_uuid()::text),
  name         text not null,
  blurb        text not null,
  icon         text not null default 'Sparkles',
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_bc_features_sort on public.bc_features (sort_order);

drop trigger if exists set_updated_at_bc_features on public.bc_features;
create trigger set_updated_at_bc_features before update on public.bc_features
  for each row execute function public.update_updated_at_column();

alter table public.bc_features enable row level security;

drop policy if exists bc_features_public_read on public.bc_features;
create policy bc_features_public_read on public.bc_features
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists bc_features_admin_write on public.bc_features;
create policy bc_features_admin_write on public.bc_features
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists bc_features_service on public.bc_features;
create policy bc_features_service on public.bc_features
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Seed = the bundled fallback list in apps/marketing/src/content.ts.
insert into public.bc_features (name, icon, sort_order, blurb) values
  ('Streaming & channels','Radio',10,'Multi-stream Icecast, Shoutcast or Centova with restream targets, live now-playing metadata, and a listener player on every channel.'),
  ('Programming & schedule','CalendarClock',20,'Shows, hosts, dayparts and schedule blocks in one grid — which then drives your site, your player and your program guide automatically.'),
  ('DJ operations','Disc3',30,'Drop intake over FTP, mix libraries, record pool, DJ slots and per-DJ portals. The workflow your air staff already knows.'),
  ('Listener loyalty','Trophy',40,'Points, rewards, leaderboards and venue check-ins — server-authoritative, so balances cannot be gamed from a browser console.'),
  ('Master control & EAS','AlertTriangle',50,'Now-playing control, song history and EAS alert logging with an auditable trail your chief engineer can actually defend.'),
  ('FCC compliance','ShieldCheck',60,'Public inspection file, EEO reporting, political file and deadline tracking — structured the way the Commission expects it.'),
  ('Ad sales & traffic','LineChart',70,'Advertisers, campaigns, avails, creative, invoices and A/R — sales and traffic living in the same system as the air product.'),
  ('Community & audience','Users',80,'Groups, chat, events and profiles that turn anonymous listeners into first-party audience data you own outright.'),
  ('Agentic operations','Sparkles',90,'Agents that draft copy, build schedules, produce spots and keep compliance current — the part that replaces the busywork.'),
  ('On-demand','PlayCircle',100,'Podcasts, video and sermon archives with RSS feeds and shareable per-item pages.')
on conflict do nothing;

commit;
