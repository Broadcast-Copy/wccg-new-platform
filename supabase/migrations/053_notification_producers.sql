-- =====================================================================
-- 053_notification_producers
-- Make the header notification bell actually fill: create a notification when
-- (a) a member receives a direct message, and (b) a member gains a follower.
-- The `notifications` table already exists (own-read + own-mark-read RLS, no
-- INSERT policy — only these SECURITY DEFINER producers write to it).
-- Idempotent.
-- =====================================================================

-- New direct message → notify the recipient.
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sname text;
begin
  select display_name into sname from public.profiles where id = NEW.sender_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    NEW.recipient_id,
    'MESSAGE',
    coalesce(sname, 'A member') || ' sent you a message',
    left(coalesce(NEW.body, ''), 120),
    '/my/messages?to=' || NEW.sender_id::text
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- New follower (user→user) → notify the followed user.
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fname text;
  funame text;
begin
  select display_name, username into fname, funame
  from public.profiles where id = NEW.follower_id;
  insert into public.notifications (user_id, type, title, link)
  values (
    NEW.following_id,
    'FOLLOW',
    coalesce(fname, 'Someone') || ' started following you',
    case when funame is not null then '/u/' || funame else '/my' end
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();
