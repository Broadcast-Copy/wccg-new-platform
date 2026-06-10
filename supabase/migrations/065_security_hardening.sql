-- 065_security_hardening
-- Applied live 2026-06-09 via MCP apply_migration (same name).
-- From the platform audit: every item independently verified against live pg_catalog.

-- 1) impersonation_log: the INSERT policy WITH CHECK (true) for PUBLIC let any client
--    (including anon) forge audit rows. Only service_role (RLS-bypassing) ever wrote here.
DROP POLICY "System can insert impersonation logs" ON public.impersonation_log;
CREATE POLICY "Admins log own impersonation actions" ON public.impersonation_log
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = (SELECT auth.uid()));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.impersonation_log FROM anon;

-- 2) Internal SECURITY DEFINER trigger/cron functions: not callable via PostgREST RPC.
--    Trigger firing does not check the invoker's EXECUTE; pg_cron runs as postgres (owner).
REVOKE EXECUTE ON FUNCTION public.notify_event_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_followers_on_video_published() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_milestone() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_post_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.points_history_sync_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_points_enforce_balance() FROM PUBLIC, anon, authenticated;

-- 3) Pin search_path on the three flagged trigger functions (advisor lint 0011).
ALTER FUNCTION public.hyperframes_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.dj_collections_touch() SET search_path = public, pg_temp;
ALTER FUNCTION public.hub_groups_touch() SET search_path = public, pg_temp;

-- 4) content_plays: plays may be anonymous, but can no longer be attributed to OTHER users.
DROP POLICY "Anyone can record a play" ON public.content_plays;
CREATE POLICY "Anyone can record a play" ON public.content_plays
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

-- 5) newsletter_subscribers: cheap email sanity check (dup abuse already blocked by unique index).
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_email_format_check
  CHECK (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') NOT VALID;
ALTER TABLE public.newsletter_subscribers VALIDATE CONSTRAINT newsletter_email_format_check;

-- 6) profiles_public SECURITY DEFINER view: deliberate and reviewed (advisor lint 0010).
COMMENT ON VIEW public.profiles_public IS
  'SECURITY DEFINER by design: exposes ONLY non-PII profile columns publicly while profiles RLS stays self/staff-only. Columns audited 2026-06-09 (no email/phone). Advisor lint 0010 = accepted risk.';
