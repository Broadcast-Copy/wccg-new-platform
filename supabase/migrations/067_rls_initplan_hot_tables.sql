-- 067_rls_initplan_hot_tables
-- Applied live 2026-06-09 via MCP apply_migration (same name).
-- Rewrites 50 RLS policies on 19 hot/populated tables so auth.uid()/auth.role() are
-- evaluated once per statement (InitPlan) instead of per row (advisor lint 0003).
-- Every rewrite preserves roles/cmd/qual/with_check exactly (verified vs pg_policies).
-- Run as ONE migration (single transaction = no policy-coverage gap).

-- ===== points_history (209,177 rows) =====
DROP POLICY "Users can read own points history" ON public.points_history;
CREATE POLICY "Users can read own points history" ON public.points_history
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can insert own points history" ON public.points_history;
CREATE POLICY "Users can insert own points history" ON public.points_history
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY "Service role manages points history" ON public.points_history;
CREATE POLICY "Service role manages points history" ON public.points_history
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ===== user_points =====
DROP POLICY "Users can read own points" ON public.user_points;
CREATE POLICY "Users can read own points" ON public.user_points
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can upsert own points" ON public.user_points;
CREATE POLICY "Users can upsert own points" ON public.user_points
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can update own points" ON public.user_points;
CREATE POLICY "Users can update own points" ON public.user_points
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Service role manages points" ON public.user_points;
CREATE POLICY "Service role manages points" ON public.user_points
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- ===== listening_sessions =====
DROP POLICY "Users can read own listening sessions" ON public.listening_sessions;
CREATE POLICY "Users can read own listening sessions" ON public.listening_sessions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can insert own listening sessions" ON public.listening_sessions;
CREATE POLICY "Users can insert own listening sessions" ON public.listening_sessions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can update own listening sessions" ON public.listening_sessions;
CREATE POLICY "Users can update own listening sessions" ON public.listening_sessions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ===== dj_drops (188 rows) =====
DROP POLICY "DJs read own drops" ON public.dj_drops;
CREATE POLICY "DJs read own drops" ON public.dj_drops
  FOR SELECT USING (
    (EXISTS (SELECT 1 FROM public.djs
             WHERE djs.id = dj_drops.dj_id AND djs.user_id = (SELECT auth.uid())))
    OR ((SELECT auth.role()) = 'service_role')
  );
DROP POLICY "DJs insert own drops" ON public.dj_drops;
CREATE POLICY "DJs insert own drops" ON public.dj_drops
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.djs
            WHERE djs.id = dj_drops.dj_id AND djs.user_id = (SELECT auth.uid()))
  );
DROP POLICY "DJs update own drops" ON public.dj_drops;
CREATE POLICY "DJs update own drops" ON public.dj_drops
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.djs
            WHERE djs.id = dj_drops.dj_id AND djs.user_id = (SELECT auth.uid()))
  );
DROP POLICY "Admins read all drops" ON public.dj_drops;
CREATE POLICY "Admins read all drops" ON public.dj_drops
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['admin','super_admin','management','role_admin']))
  );
DROP POLICY "Admins update all drops" ON public.dj_drops;
CREATE POLICY "Admins update all drops" ON public.dj_drops
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['admin','super_admin','management','role_admin']))
  );
DROP POLICY "Production reads all drops" ON public.dj_drops;
CREATE POLICY "Production reads all drops" ON public.dj_drops
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['production','engineering','admin','super_admin','management','role_admin']))
  );

-- ===== videos (177 rows) =====
DROP POLICY "Creators read own videos" ON public.videos;
CREATE POLICY "Creators read own videos" ON public.videos
  FOR SELECT USING (user_id = (SELECT auth.uid()));
DROP POLICY "Creators insert own videos" ON public.videos;
CREATE POLICY "Creators insert own videos" ON public.videos
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY "Creators update own videos" ON public.videos;
CREATE POLICY "Creators update own videos" ON public.videos
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY "Creators delete own videos" ON public.videos;
CREATE POLICY "Creators delete own videos" ON public.videos
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY "Admins manage videos" ON public.videos;
CREATE POLICY "Admins manage videos" ON public.videos
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['admin','super_admin','management','role_admin']))
  );

-- ===== video_progress =====
DROP POLICY "video_progress_rw_own" ON public.video_progress;
CREATE POLICY "video_progress_rw_own" ON public.video_progress
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ===== profiles (34 rows, read on every authenticated page) =====
DROP POLICY "profiles_select_self_staff_organizer" ON public.profiles;
CREATE POLICY "profiles_select_self_staff_organizer" ON public.profiles
  FOR SELECT USING (
    ((SELECT auth.uid()) = id)
    OR is_staff()
    OR (EXISTS (
      SELECT 1 FROM public.event_registrations er
      JOIN public.events e ON e.id = er.event_id
      WHERE er.user_id = profiles.id AND e.creator_id = (SELECT auth.uid())
    ))
  );
DROP POLICY "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ===== notifications =====
DROP POLICY "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can mark own as read" ON public.notifications;
CREATE POLICY "Users can mark own as read" ON public.notifications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ===== messages =====
DROP POLICY "messages_read_own" ON public.messages;
CREATE POLICY "messages_read_own" ON public.messages
  FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = sender_id) OR ((SELECT auth.uid()) = recipient_id));
DROP POLICY "messages_send" ON public.messages;
CREATE POLICY "messages_send" ON public.messages
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = sender_id);
DROP POLICY "messages_mark_read" ON public.messages;
CREATE POLICY "messages_mark_read" ON public.messages
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = recipient_id)
  WITH CHECK ((SELECT auth.uid()) = recipient_id);

-- ===== favorites =====
DROP POLICY "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can create favorites" ON public.favorites;
CREATE POLICY "Users can create favorites" ON public.favorites
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ===== user_favorites =====
DROP POLICY "Users can read own favorites" ON public.user_favorites;
CREATE POLICY "Users can read own favorites" ON public.user_favorites
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can manage own favorites" ON public.user_favorites;
CREATE POLICY "Users can manage own favorites" ON public.user_favorites
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY "Users can delete own favorites" ON public.user_favorites;
CREATE POLICY "Users can delete own favorites" ON public.user_favorites
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ===== follows (the kept policy pair; the 3 legacy duplicates are dropped in the consolidation finding) =====
DROP POLICY "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = follower_id);
DROP POLICY "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = follower_id);

-- ===== content_plays =====
DROP POLICY "Users view own plays" ON public.content_plays;
CREATE POLICY "Users view own plays" ON public.content_plays
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- ===== directory_listings (72 rows) =====
DROP POLICY "Users can create listings" ON public.directory_listings;
CREATE POLICY "Users can create listings" ON public.directory_listings
  FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));
DROP POLICY "Owners can update their listings" ON public.directory_listings;
CREATE POLICY "Owners can update their listings" ON public.directory_listings
  FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid()));
DROP POLICY "Owners can delete their listings" ON public.directory_listings;
CREATE POLICY "Owners can delete their listings" ON public.directory_listings
  FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

-- ===== djs (34 rows) =====
DROP POLICY "djs_service_write" ON public.djs;
CREATE POLICY "djs_service_write" ON public.djs
  FOR ALL USING ((SELECT auth.role()) = 'service_role');
DROP POLICY "Staff manage djs" ON public.djs;
CREATE POLICY "Staff manage djs" ON public.djs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['production','engineering','admin','super_admin','management','role_admin']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['production','engineering','admin','super_admin','management','role_admin']))
  );

-- ===== dj_slots (26 rows) =====
DROP POLICY "dj_slots_service_write" ON public.dj_slots;
CREATE POLICY "dj_slots_service_write" ON public.dj_slots
  FOR ALL USING ((SELECT auth.role()) = 'service_role');
DROP POLICY "Production manages slots" ON public.dj_slots;
CREATE POLICY "Production manages slots" ON public.dj_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['production','engineering','admin','super_admin','management','role_admin']))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = (SELECT auth.uid())
              AND ur.role_id = ANY (ARRAY['production','engineering','admin','super_admin','management','role_admin']))
  );

-- ===== vendor_products (20 rows) =====
DROP POLICY "Vendors manage own products" ON public.vendor_products;
CREATE POLICY "Vendors manage own products" ON public.vendor_products
  FOR ALL USING ((SELECT auth.uid()) = vendor_id);

-- ===== site_navigation (19 rows) =====
DROP POLICY "Admins can insert navigation" ON public.site_navigation;
CREATE POLICY "Admins can insert navigation" ON public.site_navigation
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles
            WHERE user_roles.profile_id = (SELECT auth.uid())
              AND user_roles.role_id = ANY (ARRAY['admin','super_admin','role_admin']))
  );
DROP POLICY "Admins can update navigation" ON public.site_navigation;
CREATE POLICY "Admins can update navigation" ON public.site_navigation
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles
            WHERE user_roles.profile_id = (SELECT auth.uid())
              AND user_roles.role_id = ANY (ARRAY['admin','super_admin','role_admin']))
  );
DROP POLICY "Admins can delete navigation" ON public.site_navigation;
CREATE POLICY "Admins can delete navigation" ON public.site_navigation
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles
            WHERE user_roles.profile_id = (SELECT auth.uid())
              AND user_roles.role_id = ANY (ARRAY['admin','super_admin','role_admin']))
  );

-- ===== employee_invite_codes (15 rows) =====
DROP POLICY "Admins can manage invite codes" ON public.employee_invite_codes;
CREATE POLICY "Admins can manage invite codes" ON public.employee_invite_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles
            WHERE user_roles.profile_id = (SELECT auth.uid())
              AND user_roles.role_id = ANY (ARRAY['super_admin','role_admin','management']))
  );

