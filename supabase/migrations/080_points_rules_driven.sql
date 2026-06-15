-- 080_points_rules_driven.sql
-- PT2: rules-driven earning.
-- points_rules.trigger_type was an enum (points_trigger_type) whose labels
-- (LISTEN_MINUTES/EVENT_ATTENDANCE/SIGNUP) don't match the client's reason
-- strings, and an enum=text comparison errors at runtime (so the 079 RPC could
-- never match a rule). Convert the column to text so rules can govern ANY reason
-- and the RPC's text comparison works.

alter table public.points_rules alter column trigger_type type text using trigger_type::text;

-- award_points now awards the matching active rule's points_amount (AUTHORITATIVE)
-- so changing a rule changes what users earn with no client code change.
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

  select * into v_rule
    from public.points_rules
   where is_active and trigger_type = p_reason
   order by points_amount desc
   limit 1;

  if v_rule.id is not null then
    v_award := v_rule.points_amount;                 -- rule is authoritative
    if coalesce(v_rule.cooldown_minutes, 0) > 0 then
      select max(created_at) into v_last
        from public.points_history
       where user_id = v_uid and reason = p_reason;
      if v_last is not null
         and v_last > now() - make_interval(mins => v_rule.cooldown_minutes) then
        return v_balance;                            -- cooling down: no-op
      end if;
    end if;
  else
    v_award := least(p_amount, 500);                 -- no rule: client amount, clamped
  end if;

  insert into public.points_history (user_id, amount, reason, description)
  values (v_uid, v_award, p_reason, p_description);

  select balance into v_balance from public.user_points where user_id = v_uid;
  return coalesce(v_balance, v_award);
end;
$$;

revoke all on function public.award_points(int, text, text) from public, anon;
grant execute on function public.award_points(int, text, text) to authenticated;

-- Seed governing rules for the client's fixed-amount event reasons (idempotent).
insert into public.points_rules (name, trigger_type, points_amount, threshold, cooldown_minutes, is_active)
select v.name, v.trigger_type, v.points_amount, v.threshold, v.cooldown_minutes, v.is_active
from (values
  ('Daily listen bounty',   'DAILY_BOUNTY',  25, 1, 1000, true),
  ('Share the player',      'SHARE',          2, 1,    0, true),
  ('Watch a video',         'VIDEO_WATCH',    3, 1,    0, true),
  ('Referral used',         'REFERRAL',       5, 1,    0, true),
  ('Keyword contest entry', 'KEYWORD_ENTRY',  5, 1,    0, true),
  ('Event check-in',        'EVENT_CHECKIN', 10, 1,    0, true)
) as v(name, trigger_type, points_amount, threshold, cooldown_minutes, is_active)
where not exists (select 1 from public.points_rules pr where pr.trigger_type = v.trigger_type);
