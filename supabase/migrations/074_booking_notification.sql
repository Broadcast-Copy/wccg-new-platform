-- ============================================================================
-- Migration 074: Email the station when a new DJ booking request arrives
-- ============================================================================
-- Applied live. Requires the `notify-booking` edge function (see
-- supabase/functions/notify-booking/index.ts) and a RESEND_API_KEY secret
-- (Dashboard → Edge Functions → Secrets — already set for notify-admin-on-drop).
--
-- Flow: public submits a request → dj_bookings INSERT (status=pending) → this
--       trigger → pg_net POST → edge function → Resend email to the station.
-- INSERT-only with WHEN(status='pending'): status changes (UPDATE) never email.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://irjiqbmoohklagdegezz.supabase.co/functions/v1/notify-booking',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_booking ON public.dj_bookings;
CREATE TRIGGER trg_notify_on_booking
  AFTER INSERT ON public.dj_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_on_booking();
