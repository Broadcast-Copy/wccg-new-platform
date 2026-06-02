-- ============================================================================
-- Migration 024: Production-tier access for the DJ Mixshows view
-- ============================================================================
-- Lets the Production Media Manager (DJ Mixshows folder view) read every drop
-- and manage the weekly slot schedule. Applied live to irjiqbmoohklagdegezz.
--
-- Production tier = production, engineering, admin, super_admin, management,
-- role_admin.

-- dj_drops: production-tier reads all
DROP POLICY IF EXISTS "Production reads all drops" ON dj_drops;
CREATE POLICY "Production reads all drops" ON dj_drops
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur
                 WHERE ur.profile_id = auth.uid()
                   AND ur.role_id IN ('production','engineering','admin','super_admin','management','role_admin')));

-- dj_slots: production-tier manages (create/update/delete mixshow slots)
DROP POLICY IF EXISTS "Production manages slots" ON dj_slots;
CREATE POLICY "Production manages slots" ON dj_slots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur
                 WHERE ur.profile_id = auth.uid()
                   AND ur.role_id IN ('production','engineering','admin','super_admin','management','role_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur
                 WHERE ur.profile_id = auth.uid()
                   AND ur.role_id IN ('production','engineering','admin','super_admin','management','role_admin')));

-- dj-drops storage: production-tier reads all (to play/download mixes)
DROP POLICY IF EXISTS "Production reads drops storage" ON storage.objects;
CREATE POLICY "Production reads drops storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dj-drops'
         AND EXISTS (SELECT 1 FROM user_roles ur
                     WHERE ur.profile_id = auth.uid()
                       AND ur.role_id IN ('production','engineering','admin','super_admin','management','role_admin')));
