-- ============================================================================
-- Migration 018: RLS Policies for the 15 previously-exposed tables
-- ============================================================================
-- Supabase's advisor flagged these tables as having RLS disabled, meaning
-- the anon/publishable key could read or modify every row.
--
-- We can't just `ENABLE ROW LEVEL SECURITY` — that defaults to "deny all"
-- and blocks legit reads. Instead each table gets a policy matching its
-- actual access pattern:
--
--   PUBLIC READ          → reference / lookup data (roles, permissions,
--                          stream_sources, etc.)
--   AUTHENTICATED READ   → role_permissions (used by client to render
--                          permission-aware UI; we don't expose to anon)
--   OWNER READ           → listening_history (user reads their own only)
--   SERVICE-ROLE ONLY    → ad_impressions, ad_invoices (private financial /
--                          analytics data)
--   SERVICE-ROLE WRITE   → all of the above (no direct client writes)
--
-- Idempotent.

BEGIN;

-- ─── Helper: read-public + service-write pattern ─────────────────────────
-- Lookup tables that anyone (anon or auth'd) should be able to read.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles', 'permissions',
    'stream_sources', 'stream_metadata',
    'show_hosts', 'show_episodes',
    'points_rules', 'reward_catalog',
    'ticket_types', 'event_organizers'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read_public', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
      t || '_read_public', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = %L)',
      t || '_service_write', t, 'service_role'
    );
  END LOOP;
END $$;

-- ─── user_roles + role_permissions (auth-required read; service write) ──
-- These describe who can do what. We expose them to authenticated users so
-- the front-end can render permission-aware UI, but never to anon.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_read_self ON public.user_roles;
CREATE POLICY user_roles_read_self ON public.user_roles
  FOR SELECT USING (auth.uid() = profile_id);
DROP POLICY IF EXISTS user_roles_read_auth ON public.user_roles;
CREATE POLICY user_roles_read_auth ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS user_roles_service_write ON public.user_roles;
CREATE POLICY user_roles_service_write ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_read_auth ON public.role_permissions;
CREATE POLICY role_permissions_read_auth ON public.role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS role_permissions_service_write ON public.role_permissions;
CREATE POLICY role_permissions_service_write ON public.role_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- ─── listening_history (per-user; owner reads own + service) ────────────
-- listening_history has columns we don't fully know — discover the user
-- column dynamically so this works regardless of (user_id vs profile_id).
DO $$
DECLARE user_col text;
BEGIN
  SELECT column_name INTO user_col FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listening_history'
      AND column_name IN ('user_id','profile_id')
    ORDER BY column_name LIMIT 1;
  ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
  EXECUTE 'DROP POLICY IF EXISTS listening_history_read_self ON public.listening_history';
  IF user_col IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY listening_history_read_self ON public.listening_history
         FOR SELECT USING (auth.uid() = %I)',
      user_col
    );
  END IF;
  EXECUTE 'DROP POLICY IF EXISTS listening_history_service_write ON public.listening_history';
  EXECUTE 'CREATE POLICY listening_history_service_write ON public.listening_history
             FOR ALL USING (auth.role() = ''service_role'')';
END $$;

-- ─── ad_impressions + ad_invoices (private; service role only) ──────────
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_impressions_service ON public.ad_impressions;
CREATE POLICY ad_impressions_service ON public.ad_impressions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.ad_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ad_invoices_service ON public.ad_invoices;
CREATE POLICY ad_invoices_service ON public.ad_invoices
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 018b: close gaps surfaced after the first pass ──────────────────────
-- DJ portal tables (created by 013) hadn't been touched. djs + dj_slots are
-- safe to read publicly (used by /djs/:slug). FTP tables are sensitive.

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

-- audit_log already had RLS enabled but no policy — service role only.
DROP POLICY IF EXISTS audit_log_service ON public.audit_log;
CREATE POLICY audit_log_service ON public.audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Convert views from SECURITY DEFINER (default in pg<15) to INVOKER so they
-- respect the caller's RLS. Anon and authenticated roles both have the
-- underlying SELECT policies they need (see above + earlier migrations).
ALTER VIEW public.dj_drops_this_week SET (security_invoker = on);
ALTER VIEW public.mcr_dashboard       SET (security_invoker = on);

-- Pin search_path on functions we own (mitigates schema-shadowing attacks).
ALTER FUNCTION public.record_pool_touch_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_updated_at_column()     SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user()              SET search_path = pg_catalog, public, auth;

COMMIT;

-- ─── Verification (run manually) ────────────────────────────────────────
--   SELECT tablename, count(*) FILTER (WHERE permissive='PERMISSIVE') AS policies
--   FROM pg_policies WHERE schemaname='public'
--     AND tablename IN ('roles','permissions','user_roles','role_permissions',
--                       'stream_sources','stream_metadata','show_hosts',
--                       'show_episodes','listening_history','points_rules',
--                       'reward_catalog','ticket_types','event_organizers',
--                       'ad_impressions','ad_invoices')
--   GROUP BY 1 ORDER BY 1;
