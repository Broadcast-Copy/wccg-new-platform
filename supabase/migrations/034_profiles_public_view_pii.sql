-- =====================================================================
-- 034_profiles_public_view_pii
-- Stops the email/PII leak: profiles SELECT was USING(true), so any anon
-- visitor could read every user's email. Now:
--   * profiles_public  — a names-only view (no email/real name) for public
--     display (vendor cards, organizers, counts, feeds). Bypasses base RLS
--     so logged-out visitors still see display names + avatars.
--   * base profiles SELECT — restricted to the row owner, staff, and event
--     organizers reading the profiles of people registered to THEIR events
--     (so the manage-event attendee list keeps working). No one else can
--     read emails.
-- =====================================================================

create or replace view public.profiles_public as
  select id, display_name, avatar_url, artist_name, created_at
  from public.profiles;

-- run as owner so it can expose safe columns regardless of base-table RLS
alter view public.profiles_public set (security_invoker = false);

grant select on public.profiles_public to anon, authenticated;

-- lock the base table
drop policy if exists "Profiles are viewable by everyone"          on public.profiles;
drop policy if exists "profiles_select_self_staff_organizer"       on public.profiles;

create policy "profiles_select_self_staff_organizer"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_staff()
    or exists (
      select 1
      from public.event_registrations er
      join public.events e on e.id = er.event_id
      where er.user_id = profiles.id
        and e.creator_id = auth.uid()
    )
  );
