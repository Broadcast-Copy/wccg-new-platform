-- Live migration export: version 20260328160459, name "super_admin_impersonation"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

-- WCCG 104.5 FM — Super Admin Role & Impersonation Support

-- ============================================================================
-- 1. ADD SUPER_ADMIN ROLE (if not exists)
-- ============================================================================
INSERT INTO roles (id, name, description)
VALUES ('super_admin', 'SUPER_ADMIN', 'Full platform access including user impersonation and system configuration')
ON CONFLICT (id) DO NOTHING;

-- Grant all existing permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'super_admin', p.id FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Add impersonation permission
INSERT INTO permissions (id, name, description)
VALUES ('impersonate_users', 'IMPERSONATE_USERS', 'Can view the platform as any other user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
VALUES ('super_admin', 'impersonate_users')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Also add 'content_creator' role for podcast creators
INSERT INTO roles (id, name, description)
VALUES ('content_creator', 'CONTENT_CREATOR', 'Can create and manage podcasts, upload content')
ON CONFLICT (id) DO NOTHING;

-- Content creator permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'content_creator', p.id FROM permissions p
WHERE p.id IN ('create_shows', 'update_shows')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 2. SET UP biggleem@gmail.com AS SUPER ADMIN
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE email = 'biggleem@gmail.com';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO user_roles (profile_id, role_id)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (profile_id, role_id) DO NOTHING;

    INSERT INTO user_roles (profile_id, role_id)
    VALUES (v_user_id, 'role_admin')
    ON CONFLICT (profile_id, role_id) DO NOTHING;

    RAISE NOTICE 'Super admin role assigned to biggleem@gmail.com (ID: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User biggleem@gmail.com not found in profiles. They need to sign up first.';
  END IF;
END $$;

-- ============================================================================
-- 3. IMPERSONATION AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS impersonation_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL DEFAULT 'start',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON impersonation_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_target ON impersonation_log(target_user_id, created_at DESC);

ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read impersonation logs" ON impersonation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE profile_id = auth.uid()
      AND role_id IN ('super_admin', 'role_admin')
    )
  );

CREATE POLICY "System can insert impersonation logs" ON impersonation_log
  FOR INSERT WITH CHECK (true);
