-- 083_video_moderation_gate.sql
-- Creator recordings published to the main Watch feed are now moderated.
-- A non-staff creator's attempt to publish a video is routed to a review
-- queue ('pending_review') instead of going live. Station staff and the
-- service role (YouTube reseed edge function) publish immediately.

-- 1) allow the new status value
alter table public.videos drop constraint if exists videos_status_check;
alter table public.videos add constraint videos_status_check
  check (status = any (array['draft','processing','pending_review','published','removed']));

-- 2) BEFORE INSERT/UPDATE trigger. SECURITY INVOKER (default) so current_user
--    reflects the real caller; is_staff() is itself SECURITY DEFINER.
create or replace function public.videos_moderation_gate()
returns trigger
language plpgsql
as $$
begin
  -- Privileged contexts (service_role reseed, postgres, etc.) and station
  -- staff publish immediately; only regular signed-in creators are moderated.
  if current_user not in ('authenticated','anon') or public.is_staff() then
    return new;
  end if;

  -- A regular creator trying to publish (on insert, or transitioning a
  -- draft/pending row to published) is routed to the review queue. Editing an
  -- already-published video is left alone.
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.status := 'pending_review';
    new.published_at := null;
  end if;

  return new;
end; $$;

drop trigger if exists videos_moderation_gate_trg on public.videos;
create trigger videos_moderation_gate_trg
  before insert or update on public.videos
  for each row execute function public.videos_moderation_gate();
