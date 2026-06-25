-- Notify a DJ in-app when their uploaded mix has synced to the on-air system.
--
-- scripts/sync-dj-drops.py marks a dj_drops row 'published' once the file is
-- safely on the broadcast PC (D:\WCCG\b-mixshows + M:\JBMusic) and playable on
-- the site — that transition is the "synced" moment. We fire a one-time
-- notification to the uploading DJ (resolved via djs.user_id) into the same
-- notifications table the bell + /my/notifications already read.
create or replace function public.notify_dj_on_drop_published()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_user uuid;
begin
  -- only when a drop transitions INTO published (not on every status write)
  if NEW.status = 'published' and (OLD.status is distinct from 'published') then
    select user_id into v_user from public.djs where id = NEW.dj_id;
    if v_user is not null then
      insert into public.notifications (user_id, type, title, link)
      values (
        v_user,
        'MIX_SYNCED',
        'Your mix ' || coalesce(NEW.file_code, '') || ' is synced and on the air 🎧',
        '/my/dj'
      );
    end if;
  end if;
  return NEW;
end;
$function$;

drop trigger if exists trg_notify_dj_on_drop_published on public.dj_drops;
create trigger trg_notify_dj_on_drop_published
  after update of status on public.dj_drops
  for each row execute function public.notify_dj_on_drop_published();
