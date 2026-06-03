-- =====================================================================
-- 039_points_integrity_fairness
-- Audit fallout: points_history was massively duplicated (sync re-inserted
-- rows because it keyed on a re-serialized created_at), and user_points.balance
-- was a client-written number unrelated to history (forgeable). This:
--   1. de-dupes points_history,
--   2. makes balance ALWAYS = sum(history) and forbids clients setting it,
--   3. keeps balance in sync on every history change,
--   4. recomputes all balances,
--   5. adds a community-total RPC for the live "points earned" stat.
-- =====================================================================

-- 1) de-dup the corrupted history (keep one row per identical event)
delete from public.points_history a
using public.points_history b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.amount = b.amount
  and coalesce(a.reason,'') = coalesce(b.reason,'')
  and a.created_at = b.created_at
  and coalesce(a.description,'') = coalesce(b.description,'')
  and coalesce(a.program,'') = coalesce(b.program,'');

create index if not exists points_history_user_idx on public.points_history(user_id);
create unique index if not exists user_points_user_uidx on public.user_points(user_id);

-- 2) clients can never set balance directly — it is always sum(history)
create or replace function public.user_points_enforce_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.balance := coalesce((select sum(amount) from public.points_history where user_id = new.user_id), 0);
  end if;
  return new;
end; $$;
drop trigger if exists trg_user_points_enforce on public.user_points;
create trigger trg_user_points_enforce before insert or update on public.user_points
  for each row execute function public.user_points_enforce_balance();

-- 3) keep user_points synced whenever history changes
create or replace function public.points_history_sync_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(new.user_id, old.user_id);
begin
  insert into public.user_points (user_id, balance, updated_at)
  values (uid, coalesce((select sum(amount) from public.points_history where user_id = uid), 0), now())
  on conflict (user_id) do update set updated_at = now();  -- BEFORE trigger recomputes balance
  return null;
end; $$;
drop trigger if exists trg_points_history_sync on public.points_history;
create trigger trg_points_history_sync after insert or update or delete on public.points_history
  for each row execute function public.points_history_sync_balance();

-- 4) backfill + recompute every balance from the (now de-duped) history
insert into public.user_points (user_id, balance)
select ph.user_id, 0 from public.points_history ph
left join public.user_points up on up.user_id = ph.user_id
where up.user_id is null
group by ph.user_id
on conflict (user_id) do nothing;

update public.user_points up
set balance = coalesce((select sum(amount) from public.points_history ph where ph.user_id = up.user_id), 0),
    updated_at = now();

-- 5) community-wide points-awarded total for the live listener stat
create or replace function public.community_points_total()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::bigint from public.points_history where amount > 0;
$$;
revoke all on function public.community_points_total() from public;
grant execute on function public.community_points_total() to anon, authenticated;
