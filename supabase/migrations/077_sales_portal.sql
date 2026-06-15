-- 077_sales_portal.sql
-- End-to-end sales data model: products (rate card) + deals + line items.
-- Staff-only (public.is_staff()); no public/anon access. SP1 of the sales-portal PRD.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.sales_products (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('ad_spot','sponsorship','production','dj_event')),
  name        text not null,
  description text,
  unit        text not null default 'unit',
  unit_price  numeric(12,2) not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.sales_products is 'Rate card: sellable products across ad spots, sponsorships, production, DJ/events.';

create table if not exists public.sales_deals (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.crm_clients(id) on delete set null,
  associate_id uuid references auth.users(id) on delete set null,
  title        text not null,
  status       text not null default 'lead' check (status in ('lead','quoted','won','lost','invoiced','paid')),
  notes        text,
  subtotal     numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.sales_deals is 'A sales opportunity: lead -> quoted -> won/lost -> invoiced -> paid.';

create table if not exists public.sales_deal_items (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.sales_deals(id) on delete cascade,
  product_id  uuid references public.sales_products(id) on delete set null,
  description text,
  qty         integer not null default 1,
  unit_price  numeric(12,2) not null default 0,
  line_total  numeric(12,2) not null default 0
);
comment on table public.sales_deal_items is 'Line items on a deal; product_id is a catalog snapshot reference (set null if product removed).';

-- ---------------------------------------------------------------------------
-- Indexes (FK covering + status filters)
-- ---------------------------------------------------------------------------

create index if not exists idx_sales_products_category on public.sales_products (category) where is_active;
create index if not exists idx_sales_deals_status      on public.sales_deals (status);
create index if not exists idx_sales_deals_client      on public.sales_deals (client_id);
create index if not exists idx_sales_deals_associate   on public.sales_deals (associate_id);
create index if not exists idx_sales_deal_items_deal   on public.sales_deal_items (deal_id);
create index if not exists idx_sales_deal_items_product on public.sales_deal_items (product_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for deals
-- ---------------------------------------------------------------------------

create or replace function public.sales_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sales_deals_updated_at on public.sales_deals;
create trigger trg_sales_deals_updated_at
  before update on public.sales_deals
  for each row execute function public.sales_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — staff only (is_staff wrapped in select for initplan perf); anon denied
-- ---------------------------------------------------------------------------

alter table public.sales_products   enable row level security;
alter table public.sales_deals      enable row level security;
alter table public.sales_deal_items enable row level security;

drop policy if exists sales_products_staff_all on public.sales_products;
create policy sales_products_staff_all on public.sales_products
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists sales_deals_staff_all on public.sales_deals;
create policy sales_deals_staff_all on public.sales_deals
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists sales_deal_items_staff_all on public.sales_deal_items;
create policy sales_deal_items_staff_all on public.sales_deal_items
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Seed rate card (only if empty) — 4 products per category
-- ---------------------------------------------------------------------------

insert into public.sales_products (category, name, description, unit, unit_price)
select v.category, v.name, v.description, v.unit, v.unit_price
from (values
  -- Airtime / ad spots
  ('ad_spot',     ':30 Radio Spot - Drive Time',        'Thirty-second spot in AM or PM drive-time rotation.',          'spot',    75),
  ('ad_spot',     ':60 Radio Spot - Drive Time',        'Sixty-second spot in AM or PM drive-time rotation.',           'spot',   120),
  ('ad_spot',     ':30 Radio Spot - Run of Schedule',   'Thirty-second spot, station picks placement (best value).',    'spot',    40),
  ('ad_spot',     'Weekly Spot Package (20x :30)',      'Twenty :30 spots across one week, mixed dayparts.',            'week',   600),
  -- Sponsorships
  ('sponsorship', 'Show Sponsorship - Monthly',         'Billboard mentions + live reads on a daily show, one month.',  'month', 1500),
  ('sponsorship', 'Segment Sponsorship - Monthly',      'Weather, traffic, or news segment sponsor, one month.',        'month',  800),
  ('sponsorship', 'Live Event Sponsorship',             'Title/presenting sponsor of a WCCG live event.',               'event', 2500),
  ('sponsorship', 'Podcast Episode Sponsorship',        'Host-read sponsorship on a podcast episode.',                  'episode', 350),
  -- Production services
  ('production',  ':30 Commercial Production',          'Scriptwriting, voiceover, and mixing for a :30 commercial.',   'spot',   250),
  ('production',  ':60 Commercial Production',          'Scriptwriting, voiceover, and mixing for a :60 commercial.',   'spot',   400),
  ('production',  'Jingle / Imaging Package',           'Custom jingle and station imaging package.',                   'package', 750),
  ('production',  'Voiceover Session',                  'Professional voiceover, per studio hour.',                     'hour',   150),
  -- DJ bookings & events
  ('dj_event',    'DJ Booking - 2 Hour Event',          'Mix Squad DJ for a private or corporate event, two hours.',    'event',  400),
  ('dj_event',    'DJ Booking - 4 Hour Event',          'Mix Squad DJ for a private or corporate event, four hours.',   'event',  700),
  ('dj_event',    'Live Remote Broadcast',              'On-site live remote broadcast from your location.',            'event', 1200),
  ('dj_event',    'MC / Host Services',                 'Professional event MC / host, per hour.',                      'hour',   125)
) as v(category, name, description, unit, unit_price)
where not exists (select 1 from public.sales_products);
