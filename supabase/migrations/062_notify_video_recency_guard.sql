-- =====================================================================
-- 062_notify_video_recency_guard
-- Refines producer #2 from migration 060 (notify_followers_on_video_published).
-- The scheduled re-seed (reseed-videos edge function, Epic D3) bulk-inserts
-- already-`published` rows for the back catalogue, each carrying its ORIGINAL
-- YouTube publish date. Without a guard, the first re-seed would fire a follower
-- notification for every old video. Add a recency gate: only genuinely fresh
-- content (published within the last 2 days) notifies followers. Studio-publish
-- sets published_at=now() so real new uploads still notify; old re-seeded rows
-- (and rows with no date) are skipped. Idempotent (create or replace).
-- =====================================================================

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

  -- Recency gate: skip back-catalogue / bulk re-seeds. Only fresh content
  -- (published within the last 2 days) generates follower notifications.
  if NEW.published_at is null or NEW.published_at < now() - interval '2 days' then
    return NEW;
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
