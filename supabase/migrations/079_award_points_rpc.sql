-- 079_award_points_rpc.sql
-- PT1: server-authoritative earning. The client historically wrote points only
-- to localStorage (the old /points/sync endpoint is gone), so server balances
-- never reflected earnings. This SECURITY DEFINER RPC is the missing earn path:
-- it inserts a points_history row for the caller; the existing
-- points_history_sync_balance trigger recomputes user_points.balance = sum(amount).
--
-- Anti-forgery: when an active points_rules row matches the reason
-- (trigger_type = p_reason) the award is capped at that rule's points_amount and
-- a per-reason cooldown is enforced. Reasons without a governing rule are clamped
-- to a sane per-call ceiling (PT2 will add rules to govern the remaining reasons).

create or replace function public.award_points(p_amount int, p_reason text, p_description text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_rule    public.points_rules%rowtype;
  v_award   int;
  v_last    timestamptz;
  v_balance int;
begin
  if v_uid is null then
    raise exception 'You must be signed in to earn points.';
  end if;

  select balance into v_balance from public.user_points where user_id = v_uid;
  v_balance := coalesce(v_balance, 0);

  if p_amount is null or p_amount <= 0 or p_reason is null or btrim(p_reason) = '' then
    return v_balance;
  end if;

  -- Governing rule for this reason (if any). Highest cap wins on ties.
  select * into v_rule
    from public.points_rules
   where is_active and trigger_type = p_reason
   order by points_amount desc
   limit 1;

  if v_rule.id is not null then
    v_award := least(p_amount, v_rule.points_amount);           -- cap at rule
    if coalesce(v_rule.cooldown_minutes, 0) > 0 then            -- enforce cooldown
      select max(created_at) into v_last
        from public.points_history
       where user_id = v_uid and reason = p_reason;
      if v_last is not null
         and v_last > now() - make_interval(mins => v_rule.cooldown_minutes) then
        return v_balance;                                       -- cooling down: no-op
      end if;
    end if;
  else
    v_award := least(p_amount, 500);                            -- no rule: sanity clamp
  end if;

  insert into public.points_history (user_id, amount, reason, description)
  values (v_uid, v_award, p_reason, p_description);

  select balance into v_balance from public.user_points where user_id = v_uid;
  return coalesce(v_balance, v_award);
end;
$$;

revoke all on function public.award_points(int, text, text) from public, anon;
grant execute on function public.award_points(int, text, text) to authenticated;
