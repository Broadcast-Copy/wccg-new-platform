-- =====================================================================
-- 088_tenancy_org_columns
-- Adds org_id to every ORG-SCOPED table (account-level business that
-- spans the stations in an org: CRM, sales, marketplace, advertising/DSP,
-- billing). Same DEFAULT-as-bridge mechanic as 087 (-> 'org_carson').
-- NOT NULL + FK happen in 089.
-- =====================================================================

begin;

do $$
declare
  t text;
  org_tables text[] := array[
    -- CRM / production / projects
    'crm_clients','client_assets','production_orders','production_order_files',
    'projects','project_tasks',
    -- marketplace / commerce
    'orders','order_items','vendor_products','vendor_bookings','vendor_events',
    'vendor_customers','vendor_payouts','vendor_shipping','booking_reservations',
    'gift_cards','gift_card_transactions','token_transactions','product_reviews',
    -- advertising (direct) + media
    'media_campaigns','advertiser_accounts','ad_campaigns','ad_creatives',
    'ad_impressions','ad_invoices','ad_placements','ad_rate_cards',
    'audience_segments','email_campaigns',
    -- programmatic / DSP
    'dsp_advertisers','dsp_campaigns','dsp_channel_budgets','dsp_analytics','ab_test_variants',
    -- sales pipeline
    'sales_products','sales_deals','sales_deal_items','sales_invoices','sales_invoice_items'
  ];
begin
  foreach t in array org_tables loop
    execute format(
      'alter table public.%I add column if not exists org_id text default %L',
      t, 'org_carson'
    );
    execute format(
      'create index if not exists %I on public.%I (org_id)',
      'idx_' || t || '_org_id', t
    );
  end loop;
end $$;

commit;
