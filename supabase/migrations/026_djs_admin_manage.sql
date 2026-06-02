-- ============================================================================
-- Migration 026: Staff manage DJ records (Creator Manager)
-- ============================================================================
-- admin/management/production can create/edit/activate DJs. Applied live.

DROP POLICY IF EXISTS "Staff manage djs" ON djs;
CREATE POLICY "Staff manage djs" ON djs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur
                 WHERE ur.profile_id = auth.uid()
                   AND ur.role_id IN ('production','engineering','admin','super_admin','management','role_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur
                 WHERE ur.profile_id = auth.uid()
                   AND ur.role_id IN ('production','engineering','admin','super_admin','management','role_admin')));
