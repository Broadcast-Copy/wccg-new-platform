-- =====================================================================
-- 033_redeem_reward_rpc
-- Atomic reward redemption. Earning accrues client-side (localStorage), so
-- this RPC does the parts that MUST be server-side + atomic: validate the
-- reward, decrement limited stock under a row lock, and record the
-- redemption in points_history (+ best-effort user_points decrement).
-- Balance is gated client-side to match the app's earning model.
-- =====================================================================
create or replace function public.redeem_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r   public.reward_catalog%rowtype;
begin
  if uid is null then
    raise exception 'You must be signed in to redeem rewards.';
  end if;

  -- lock the reward row to serialise concurrent redemptions of limited stock
  select * into r from public.reward_catalog where id = p_reward_id for update;
  if not found or coalesce(r.is_active, false) = false then
    raise exception 'This reward is no longer available.';
  end if;
  if r.stock_count is not null and r.stock_count <= 0 then
    raise exception 'This reward is out of stock.';
  end if;

  -- decrement limited stock (null stock = unlimited)
  if r.stock_count is not null then
    update public.reward_catalog
       set stock_count = stock_count - 1, updated_at = now()
     where id = p_reward_id;
  end if;

  -- record the redemption against the user's history
  insert into public.points_history (user_id, amount, reason, description, program)
  values (uid, -r.points_cost, 'redemption', r.name, 'rewards');

  -- best-effort decrement of the server-side balance if a row exists
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
$$;

revoke all on function public.redeem_reward(text) from public, anon;
grant execute on function public.redeem_reward(text) to authenticated;
