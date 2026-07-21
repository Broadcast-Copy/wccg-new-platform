-- =====================================================================
-- 095_bc_lead_notification
-- Email the Broadcast Copy team the moment an early-access lead arrives.
--
-- Flow: broadcastcopy.ai form -> bc_leads INSERT (anon, via RLS) -> this
--       trigger -> pg_net POST -> notify-bc-lead edge fn -> Resend email.
--
-- net.http_post queues asynchronously, so a slow or failing notification can
-- never block (or roll back) the lead insert itself — losing the email is bad,
-- losing the lead is worse. Same pattern as 022_drop_email_notification.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_bc_lead()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  perform net.http_post(
    url     := 'https://irjiqbmoohklagdegezz.supabase.co/functions/v1/notify-bc-lead',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('record', row_to_json(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_bc_lead on public.bc_leads;
create trigger trg_notify_bc_lead
  after insert on public.bc_leads
  for each row
  execute function public.notify_bc_lead();

-- Trigger functions are invoked by their trigger, never by clients. Drop the
-- implicit PUBLIC execute grant so this can't be called as an RPC to spray
-- requests at the edge function (defense-in-depth; matches migration 031).
revoke execute on function public.notify_bc_lead() from public, anon, authenticated;
