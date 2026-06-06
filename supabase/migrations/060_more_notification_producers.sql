-- =====================================================================
-- 060_more_notification_producers  (Epic F1)
-- More notification producers, mirroring 053/056. The `notifications` table
-- has NO INSERT policy — only these SECURITY DEFINER trigger functions write
-- to it. Idempotent (create or replace + drop trigger if exists).
--
-- Columns written (must match `notifications` exactly): user_id, type, title,
-- body, link. Never notify the actor about their own social action.
--
-- Producers added here:
--   1. Points milestone reached  (user_milestones)
--   2. New published video from a followed creator  (videos x follows)
--
-- NOT added (documented for the future):
--   * Time-based event reminders (events / event_registrations). These fire on
--     a schedule, not on a row event, so they need pg_cron + a scheduled job
--     rather than an AFTER trigger. Deferred until pg_cron is wired up.
--   * Followed-creator notifications keyed off `entity_follows`: that table's
--     target_id is free-text (target_type/target_id) with no clean FK to a
--     content creator, so we use the user->user `follows` table instead (see
--     producer 2). dj_mixes has uploader_id but no user<-follower linkage was
--     used here for the same reason — only the clean `follows` join is wired.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Points milestone reached.
-- `user_milestones` is one row per user (PK user_id) whose `unlocked_ids`
-- (text[]) grows as milestones are earned. So we fire on INSERT *and* UPDATE
-- and emit one notification per newly-added milestone id (the array delta).
-- There is no milestone-definition table in the DB, so the human-readable
-- name is the milestone id itself. This is a system award to the user about
-- their own progress, so notifying the owning user is correct (no self-guard).
-- ---------------------------------------------------------------------
create or replace function public.notify_on_milestone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m text;
begin
  for m in
    select x
    from unnest(NEW.unlocked_ids) as x
    where TG_OP = 'INSERT'
       or x <> all (coalesce(OLD.unlocked_ids, array[]::text[]))
  loop
    insert into public.notifications (user_id, type, title, link)
    values (
      NEW.user_id,
      'MILESTONE',
      'You reached ' || m || '!',
      '/my/points'
    );
  end loop;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_milestone on public.user_milestones;
create trigger trg_notify_on_milestone
  after insert or update on public.user_milestones
  for each row execute function public.notify_on_milestone();


-- ---------------------------------------------------------------------
-- 2. New published content from a followed creator.
-- A video is "published" when status = 'published'. Notify every user who
-- follows the creator (videos.user_id) via the user->user `follows` table
-- (follows.following_id = creator, follows.follower_id = the follower).
-- Fires when a video is inserted already-published, or transitions into the
-- published state on update. Never notify the creator about their own upload
-- (follower_id <> NEW.user_id).
-- ---------------------------------------------------------------------
create or replace function public.notify_followers_on_video_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cname text;
begin
  -- only act on the transition into published
  if NEW.status is distinct from 'published' then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.status is not distinct from 'published' then
    return NEW; -- was already published; nothing new
  end if;

  select coalesce(NEW.creator_name, display_name) into cname
  from public.profiles where id = NEW.user_id;
  cname := coalesce(cname, NEW.creator_name, 'A creator');

  insert into public.notifications (user_id, type, title, body, link)
  select
    f.follower_id,
    'NEW_VIDEO',
    cname || ' published a new video',
    left(NEW.title, 120),
    '/videos/' || NEW.id::text
  from public.follows f
  where f.following_id = NEW.user_id
    and f.follower_id <> NEW.user_id;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_followers_on_video_published on public.videos;
create trigger trg_notify_followers_on_video_published
  after insert or update on public.videos
  for each row execute function public.notify_followers_on_video_published();
