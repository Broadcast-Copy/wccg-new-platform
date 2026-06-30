-- 097: harden the rewards economy + close a mutable search_path warning.
-- Applied to prod via MCP on 2026-06-30; this file keeps the repo in sync.
--   (a) redeem_reward now rejects redemptions the user can't afford (it claimed
--       to "enforce the real spend" but never checked balance).
--   (b) videos_moderation_gate gets a fixed search_path (security linter 0011).

create or replace function public.redeem_reward(p_reward_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  r   public.reward_catalog%rowtype;
  v_balance int;
begin
  if uid is null then
    raise exception 'You must be signed in to redeem rewards.';
  end if;

  select * into r from public.reward_catalog where id = p_reward_id for update;
  if not found or coalesce(r.is_active, false) = false then
    raise exception 'This reward is no longer available.';
  end if;
  if r.stock_count is not null and r.stock_count <= 0 then
    raise exception 'This reward is out of stock.';
  end if;

  -- Affordability: never let a user redeem beyond their server-side balance.
  select coalesce(balance, 0) into v_balance from public.user_points where user_id = uid;
  v_balance := coalesce(v_balance, 0);
  if v_balance < r.points_cost then
    raise exception 'Not enough points to redeem this reward.';
  end if;

  if r.stock_count is not null then
    update public.reward_catalog
       set stock_count = stock_count - 1, updated_at = now()
     where id = p_reward_id;
  end if;

  insert into public.points_history (user_id, amount, reason, description, program)
  values (uid, -r.points_cost, 'redemption', r.name, 'rewards');

  update public.user_points
     set balance = greatest(0, balance - r.points_cost), updated_at = now()
   where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'reward_id', r.id,
    'name', r.name,
    'points_cost', r.points_cost,
    'stock_left', r.stock_count - 1
  );
end;
$function$;

create or replace function public.videos_moderation_gate()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if current_user not in ('authenticated','anon') or public.is_staff() then
    return new;
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.status := 'pending_review';
    new.published_at := null;
  end if;

  return new;
end; $function$;
