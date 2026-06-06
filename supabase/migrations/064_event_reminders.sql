-- =====================================================================
-- 064_event_reminders  (Epic F1 — completes the deferred time-based reminder)
-- Migration 060 documented that time-based event reminders were deferred
-- "until pg_cron is wired up". pg_cron (D3) is now installed, so this adds the
-- final notification producer: a reminder for every attendee of an event that
-- starts within the next 24 hours.
--
-- Unlike the AFTER-trigger producers in 053/056/060, this one fires on a
-- SCHEDULE (there is no row event when "the event is now 24h away"), so it is a
-- plain SECURITY DEFINER function invoked hourly by pg_cron. pg_cron can call an
-- in-DB function directly (`select public.notify_event_reminders();`) — no
-- pg_net/HTTP hop is needed (that is only for reaching edge functions, cf. 061).
--
-- The `notifications` table has NO INSERT policy — only SECURITY DEFINER
-- producers write to it. Columns written (must match `notifications` exactly):
--   user_id, type, title, body, link.
--
-- Idempotent: create or replace + unschedule-if-exists before scheduling.
--
-- Confirmed against the live schema (irjiqbmoohklagdegezz):
--   * events.status  is enum event_status      → published value is 'PUBLISHED'
--   * events.visibility is enum event_visibility → public value is 'PUBLIC'
--   * event_registrations.status is enum registration_status:
--       CONFIRMED / CHECKED_IN  = active (going / attended)
--       CANCELLED               = not going
--     so "active registration" == status <> 'CANCELLED'.
--   * events.id is TEXT and is what the event detail route resolves by:
--     apps/web/.../events/[eventId]/event-detail-client.tsx does
--     `.eq("id", eventId)` — the route param is the event id, NOT the slug.
--     Almost every link in the app uses `/events/${event.id}`. So the correct,
--     non-404 reminder link is `/events/<id>`, and the per-(user,event) dedup
--     key is that same link. (The task brief sketched `/events/<slug>`, but the
--     slug route does not exist in this codebase; using `e.id` keeps the link
--     working AND preserves the exact "never double-remind" dedup semantics.)
-- =====================================================================

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- notify_event_reminders(): one EVENT_REMINDER per active registration of an
-- event starting in the next 24h, for PUBLISHED + PUBLIC events, deduped so a
-- given user is reminded at most once per event. Set-based INSERT ... SELECT.
-- ---------------------------------------------------------------------
create or replace function public.notify_event_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select
    r.user_id,
    'EVENT_REMINDER',
    'Reminder: ' || e.title || ' is coming up',
    'Starts ' || to_char(e.start_date at time zone e.timezone,
                         'FMDay, FMMon FMDD at FMHH12:MI AM') || ' (' || e.timezone || ')',
    '/events/' || e.id
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  where e.status = 'PUBLISHED'
    and e.visibility = 'PUBLIC'
    and r.status <> 'CANCELLED'                       -- CONFIRMED or CHECKED_IN
    and e.start_date >  now()
    and e.start_date <= now() + interval '24 hours'
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = r.user_id
        and n.type = 'EVENT_REMINDER'
        and n.link = '/events/' || e.id              -- already reminded for this event
    );
end;
$$;

-- ---------------------------------------------------------------------
-- Schedule hourly. Off-the-hour avoidance is unnecessary here (in-DB call, no
-- external fan-out), so run at minute 0. Unschedule any prior job of the same
-- name first so re-running this migration does not create a duplicate (mirrors
-- the idempotent pattern in 061).
-- ---------------------------------------------------------------------
select cron.unschedule('event-reminders-hourly')
where exists (select 1 from cron.job where jobname = 'event-reminders-hourly');

select cron.schedule(
  'event-reminders-hourly',
  '0 * * * *',
  $$ select public.notify_event_reminders(); $$
);
