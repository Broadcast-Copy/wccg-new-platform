-- WCCG 104.5 FM — Super Admin Role & Impersonation Support
-- Run in Supabase SQL Editor after 008_cms_admin_content.sql

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
-- First ensure profile exists (in case they haven't logged in yet)
-- The auth.users entry must exist first (user must sign up).
-- This inserts the role assignment. If the user hasn't signed up yet,
-- run this after they first log in.

-- Check if user exists and assign super_admin role
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find user by email in profiles table
  SELECT id INTO v_user_id FROM profiles WHERE email = 'biggleem@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Assign super_admin role
    INSERT INTO user_roles (profile_id, role_id)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (profile_id, role_id) DO NOTHING;

    -- Also assign admin role for backward compatibility
    INSERT INTO user_roles (profile_id, role_id)
    VALUES (v_user_id, 'role_admin')
    ON CONFLICT (profile_id, role_id) DO NOTHING;

    RAISE NOTICE 'Super admin role assigned to biggleem@gmail.com (ID: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User biggleem@gmail.com not found in profiles. They need to sign up first, then re-run:';
    RAISE NOTICE 'INSERT INTO user_roles (profile_id, role_id) SELECT id, ''super_admin'' FROM profiles WHERE email = ''biggleem@gmail.com'' ON CONFLICT DO NOTHING;';
  END IF;
END $$;

-- ============================================================================
-- 3. IMPERSONATION AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS impersonation_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL DEFAULT 'start', -- 'start' or 'end'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON impersonation_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_target ON impersonation_log(target_user_id, created_at DESC);

-- RLS: only super_admins can read impersonation logs
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
