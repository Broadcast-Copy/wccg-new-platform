-- Live migration export: version 20260513130002, name "018b_rls_followup"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via MCP between repo 018 and 019; no numbered repo file exists. Do not re-apply.

-- Close the remaining RLS / security-advisor gaps surfaced after 018:
--   djs, dj_slots         — public read (used by /djs/:slug pages)
--   dj_ftp_accounts       — service role only (credentials)
--   dj_ftp_log            — service role only (security audit)
--   audit_log             — RLS already enabled, missing policy → service role
--   dj_drops_this_week    — convert SECURITY DEFINER → INVOKER
--   mcr_dashboard         — convert SECURITY DEFINER → INVOKER
--   record_pool_touch_updated_at — pin search_path

ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS djs_read_public ON public.djs;
CREATE POLICY djs_read_public ON public.djs FOR SELECT USING (true);
DROP POLICY IF EXISTS djs_service_write ON public.djs;
CREATE POLICY djs_service_write ON public.djs FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.dj_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dj_slots_read_public ON public.dj_slots;
CREATE POLICY dj_slots_read_public ON public.dj_slots FOR SELECT USING (true);
DROP POLICY IF EXISTS dj_slots_service_write ON public.dj_slots;
CREATE POLICY dj_slots_service_write ON public.dj_slots FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.dj_ftp_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dj_ftp_accounts_service ON public.dj_ftp_accounts;
CREATE POLICY dj_ftp_accounts_service ON public.dj_ftp_accounts
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.dj_ftp_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dj_ftp_log_service ON public.dj_ftp_log;
CREATE POLICY dj_ftp_log_service ON public.dj_ftp_log
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS audit_log_service ON public.audit_log;
CREATE POLICY audit_log_service ON public.audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Views: convert to SECURITY INVOKER so they enforce the caller's RLS.
ALTER VIEW public.dj_drops_this_week SET (security_invoker = on);
ALTER VIEW public.mcr_dashboard       SET (security_invoker = on);

-- Pin search_path on our own functions (warning, not error, but cheap to fix).
ALTER FUNCTION public.record_pool_touch_updated_at() SET search_path = pg_catalog, public;
