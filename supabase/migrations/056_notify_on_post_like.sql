-- =====================================================================
-- 056_notify_on_post_like
-- Notification producer: when someone likes a hub post, notify the post's
-- author (never self). Writes to `notifications` via SECURITY DEFINER (the
-- table has no INSERT policy — only producers write to it). Idempotent.
-- =====================================================================

create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_id uuid;
  liker_name text;
begin
  select user_id into author_id from public.hub_posts where id = NEW.post_id;
  if author_id is null or author_id = NEW.user_id then
    return NEW; -- post gone, or self-like → no notification
  end if;
  select display_name into liker_name from public.profiles where id = NEW.user_id;
  insert into public.notifications (user_id, type, title, link)
  values (
    author_id,
    'LIKE',
    coalesce(liker_name, 'Someone') || ' liked your post',
    '/listeners'
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_post_like on public.hub_post_likes;
create trigger trg_notify_on_post_like
  after insert on public.hub_post_likes
  for each row execute function public.notify_on_post_like();
