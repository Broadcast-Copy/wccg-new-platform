-- 070_weekly_leaderboard_rpc
-- Applied live 2026-06-09 via MCP apply_migration (same name).
-- Weekly points leaderboard for the rewards arcade. Mirrors points_leaderboard
-- (SECURITY DEFINER is required: points_history RLS is own-rows-only, so the
-- ranking must be computed server-side). Week = since Monday 00:00 Eastern.
CREATE OR REPLACE FUNCTION public.points_leaderboard_weekly(p_limit integer DEFAULT 10)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, avatar_url text, points integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with week_start as (
    select date_trunc('week', (now() at time zone 'America/New_York'))::timestamp as ts
  ),
  totals as (
    select ph.user_id, sum(ph.amount)::integer as points
    from public.points_history ph, week_start w
    where (ph.created_at at time zone 'America/New_York') >= w.ts
      and ph.amount > 0
    group by ph.user_id
  )
  select
    row_number() over (order by t.points desc) as rank,
    t.user_id,
    coalesce(pp.display_name, 'Listener') as display_name,
    pp.avatar_url,
    t.points
  from totals t
  left join public.profiles_public pp on pp.id = t.user_id
  where t.points > 0
  order by t.points desc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$function$;

REVOKE EXECUTE ON FUNCTION public.points_leaderboard_weekly(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.points_leaderboard_weekly(integer) TO anon, authenticated;
