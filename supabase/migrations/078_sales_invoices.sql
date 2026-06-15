-- 078_sales_invoices.sql
-- Invoices generated from won deals (SP4). Staff manage; portal clients read their own.
-- Line items are SNAPSHOTTED into sales_invoice_items so an invoice is immutable
-- even if the underlying deal is later edited.

create sequence if not exists public.sales_invoice_seq start 1001;

create table if not exists public.sales_invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null unique
                 default ('INV-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.sales_invoice_seq')::text, 4, '0')),
  deal_id        uuid references public.sales_deals(id) on delete set null,
  client_id      uuid references public.crm_clients(id) on delete set null,
  associate_id   uuid references auth.users(id) on delete set null,
  title          text,
  issue_date     date not null default current_date,
  due_date       date,
  status         text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  subtotal       numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.sales_invoices is 'Invoices generated from won deals; line items snapshotted into sales_invoice_items.';

create table if not exists public.sales_invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.sales_invoices(id) on delete cascade,
  description text,
  qty         integer not null default 1,
  unit_price  numeric(12,2) not null default 0,
  line_total  numeric(12,2) not null default 0
);

create index if not exists idx_sales_invoices_status      on public.sales_invoices (status);
create index if not exists idx_sales_invoices_client      on public.sales_invoices (client_id);
create index if not exists idx_sales_invoices_deal        on public.sales_invoices (deal_id);
create index if not exists idx_sales_invoice_items_invoice on public.sales_invoice_items (invoice_id);

drop trigger if exists trg_sales_invoices_updated_at on public.sales_invoices;
create trigger trg_sales_invoices_updated_at
  before update on public.sales_invoices
  for each row execute function public.sales_set_updated_at();

grant usage on sequence public.sales_invoice_seq to authenticated;

alter table public.sales_invoices      enable row level security;
alter table public.sales_invoice_items enable row level security;

-- Staff: full access
drop policy if exists sales_invoices_staff_all on public.sales_invoices;
create policy sales_invoices_staff_all on public.sales_invoices
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists sales_invoice_items_staff_all on public.sales_invoice_items;
create policy sales_invoice_items_staff_all on public.sales_invoice_items
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

-- Portal clients: read-only access to their OWN invoices (crm_clients.portal_user_id)
drop policy if exists sales_invoices_client_read on public.sales_invoices;
create policy sales_invoices_client_read on public.sales_invoices
  for select to authenticated
  using (exists (
    select 1 from public.crm_clients c
    where c.id = sales_invoices.client_id
      and c.portal_user_id = (select auth.uid())
  ));

drop policy if exists sales_invoice_items_client_read on public.sales_invoice_items;
create policy sales_invoice_items_client_read on public.sales_invoice_items
  for select to authenticated
  using (exists (
    select 1 from public.sales_invoices i
    join public.crm_clients c on c.id = i.client_id
    where i.id = sales_invoice_items.invoice_id
      and c.portal_user_id = (select auth.uid())
  ));
