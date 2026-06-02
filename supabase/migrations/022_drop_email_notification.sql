-- ============================================================================
-- Migration 022: Email the admin when a DJ uploads a drop
-- ============================================================================
-- Applied live. Requires the `notify-admin-on-drop` edge function (see
-- supabase/functions/notify-admin-on-drop/index.ts) and a RESEND_API_KEY
-- secret set in Dashboard → Edge Functions → Secrets.
--
-- Flow: DJ uploads → dj_drops INSERT (status=uploaded) → this trigger →
--       pg_net POST → edge function → Resend email to the admin.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_admin_on_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://irjiqbmoohklagdegezz.supabase.co/functions/v1/notify-admin-on-drop',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_drop ON public.dj_drops;
CREATE TRIGGER trg_notify_admin_on_drop
  AFTER INSERT ON public.dj_drops
  FOR EACH ROW
  WHEN (NEW.status = 'uploaded')
  EXECUTE FUNCTION public.notify_admin_on_drop();
