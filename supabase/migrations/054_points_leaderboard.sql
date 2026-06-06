-- =====================================================================
-- 054_points_leaderboard
-- Public points leaderboard. user_points is own-read only (integrity RLS), so a
-- leaderboard needs a SECURITY DEFINER function that exposes ONLY aggregate,
-- non-PII columns (display name, avatar, balance). Replaces the dead NestJS
-- /points/leaderboard endpoint. Idempotent.
-- =====================================================================

create or replace function public.points_leaderboard(p_limit int default 10)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  balance integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by up.balance desc, up.updated_at asc) as rank,
    up.user_id,
    coalesce(pp.display_name, 'Listener') as display_name,
    pp.avatar_url,
    up.balance
  from public.user_points up
  left join public.profiles_public pp on pp.id = up.user_id
  where up.balance > 0
  order by up.balance desc, up.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

grant execute on function public.points_leaderboard(int) to anon, authenticated;
