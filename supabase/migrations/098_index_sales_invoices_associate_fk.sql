-- 098: cover the sales_invoices.associate_id foreign key (perf linter 0001).
-- Applied to prod via MCP on 2026-06-30; this file keeps the repo in sync.
create index if not exists sales_invoices_associate_id_idx
  on public.sales_invoices (associate_id);
