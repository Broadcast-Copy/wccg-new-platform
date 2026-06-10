-- 068_dedupe_policies_indexes
-- Applied live 2026-06-09 via MCP apply_migration (same name).
-- Drops exact-duplicate RLS policies + duplicate indexes created by the dual
-- migration lineage (each pair verified byte-identical against the live DB).

-- follows: legacy trio duplicates follows_read / follows_insert_own / follows_delete_own
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

-- event_registrations: two byte-identical SELECT policies
DROP POLICY IF EXISTS "Users can view own registrations" ON public.event_registrations;

-- studio_projects: two identical ALL policies + a subsumed SELECT; keep one, initplan-safe
DROP POLICY IF EXISTS "Users can manage own studio projects" ON public.studio_projects;
DROP POLICY IF EXISTS "Users can read own studio projects" ON public.studio_projects;
DROP POLICY IF EXISTS "Users manage own projects" ON public.studio_projects;
CREATE POLICY "Users manage own projects" ON public.studio_projects
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- duplicate indexes (identical twin remains in each case)
DROP INDEX IF EXISTS public.follows_follower_idx;   -- twin: idx_follows_follower
DROP INDEX IF EXISTS public.follows_following_idx;  -- twin: idx_follows_following
DROP INDEX IF EXISTS public.user_points_user_uidx;  -- twin: user_points_user_id_key (backs UNIQUE constraint)
