-- WCCG 104.5 FM — User Types, Employee Structure & Campaign Permissions
-- Run in Supabase SQL Editor after 009_super_admin_impersonation.sql

-- ============================================================================
-- 1. EXTEND PROFILES TABLE
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'listener';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS artist_name TEXT;

-- Add check constraints
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_user_type
    CHECK (user_type IN ('listener', 'creator', 'employee'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_department
    CHECK (department IS NULL OR department IN ('on_air', 'sales', 'production', 'engineering', 'management', 'promotions'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT chk_creator_type
    CHECK (creator_type IS NULL OR creator_type IN ('podcaster', 'musician', 'dj'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department) WHERE department IS NOT NULL;

-- ============================================================================
-- 2. NEW ROLES (Radio Station Departments)
-- ============================================================================
INSERT INTO roles (id, name, description) VALUES
  ('host', 'HOST', 'On-air talent, DJs, and show hosts'),
  ('sales', 'SALES', 'Sales account executives and managers'),
  ('production', 'PRODUCTION', 'Audio engineers, producers, and production staff'),
  ('engineering', 'ENGINEERING', 'Technical staff — transmitter, streaming, IT'),
  ('management', 'MANAGEMENT', 'General manager, operations manager, business manager'),
  ('promotions', 'PROMOTIONS', 'Events, contests, community outreach, and marketing')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. NEW PERMISSIONS
-- ============================================================================
INSERT INTO permissions (id, name, description) VALUES
  -- Sales permissions
  ('perm_campaigns_create', 'campaigns.create', 'Create ad campaigns'),
  ('perm_campaigns_manage', 'campaigns.manage', 'Manage and edit ad campaigns'),
  ('perm_campaigns_approve', 'campaigns.approve', 'Approve or reject ad campaigns'),
  ('perm_clients_manage', 'clients.manage', 'Manage advertiser client accounts'),
  ('perm_clients_view', 'clients.view', 'View advertiser client accounts'),
  ('perm_reports_view', 'reports.view', 'View analytics and reports'),
  ('perm_reports_export', 'reports.export', 'Export reports and data'),
  -- Production permissions
  ('perm_production_manage', 'production.manage', 'Manage production queue and assets'),
  -- Promotions permissions
  ('perm_promotions_manage', 'promotions.manage', 'Manage promotions, contests, and outreach')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. ROLE → PERMISSION ASSIGNMENTS
-- ============================================================================

-- Sales: campaigns, clients, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'sales', id FROM permissions
WHERE name IN ('campaigns.create', 'campaigns.manage', 'clients.manage', 'clients.view', 'reports.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Management: all permissions (like admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'management', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Production: production + shows
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'production', id FROM permissions
WHERE name IN ('production.manage', 'shows.create', 'shows.update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Promotions: promotions + events
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'promotions', id FROM permissions
WHERE name IN ('promotions.manage', 'events.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Host: show management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'host', id FROM permissions
WHERE name IN ('shows.update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Content Creator: basic show permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'content_creator', id FROM permissions
WHERE name IN ('shows.create', 'shows.update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 5. EMPLOYEE INVITE CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_invite_codes (
  code TEXT PRIMARY KEY,
  department TEXT NOT NULL CHECK (department IN ('on_air', 'sales', 'production', 'engineering', 'management', 'promotions')),
  role_id TEXT NOT NULL REFERENCES roles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_department ON employee_invite_codes(department);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used ON employee_invite_codes(used_by) WHERE used_by IS NOT NULL;

-- RLS policies
ALTER TABLE employee_invite_codes ENABLE ROW LEVEL SECURITY;

-- Admins can read all codes
CREATE POLICY "Admins can manage invite codes" ON employee_invite_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE profile_id = auth.uid()
      AND role_id IN ('super_admin', 'role_admin', 'management')
    )
  );

-- Anyone can check a code (for registration validation)
CREATE POLICY "Anyone can validate invite codes" ON employee_invite_codes
  FOR SELECT USING (used_by IS NULL);

-- ============================================================================
-- 6. SEED INITIAL INVITE CODES (one per department)
-- ============================================================================
INSERT INTO employee_invite_codes (code, department, role_id, expires_at) VALUES
  -- On-Air / Programming
  ('WCCG-AIR-2026', 'on_air', 'host', '2026-12-31 23:59:59+00'),
  ('WCCG-AIR-001', 'on_air', 'host', '2026-12-31 23:59:59+00'),
  ('WCCG-AIR-002', 'on_air', 'host', '2026-12-31 23:59:59+00'),
  -- Sales
  ('WCCG-SALES-2026', 'sales', 'sales', '2026-12-31 23:59:59+00'),
  ('WCCG-SALES-001', 'sales', 'sales', '2026-12-31 23:59:59+00'),
  ('WCCG-SALES-002', 'sales', 'sales', '2026-12-31 23:59:59+00'),
  ('WCCG-SALES-003', 'sales', 'sales', '2026-12-31 23:59:59+00'),
  -- Production
  ('WCCG-PROD-2026', 'production', 'production', '2026-12-31 23:59:59+00'),
  ('WCCG-PROD-001', 'production', 'production', '2026-12-31 23:59:59+00'),
  -- Engineering
  ('WCCG-ENG-2026', 'engineering', 'engineering', '2026-12-31 23:59:59+00'),
  ('WCCG-ENG-001', 'engineering', 'engineering', '2026-12-31 23:59:59+00'),
  -- Management
  ('WCCG-MGT-2026', 'management', 'management', '2026-12-31 23:59:59+00'),
  ('WCCG-MGT-001', 'management', 'management', '2026-12-31 23:59:59+00'),
  -- Promotions
  ('WCCG-PROMO-2026', 'promotions', 'promotions', '2026-12-31 23:59:59+00'),
  ('WCCG-PROMO-001', 'promotions', 'promotions', '2026-12-31 23:59:59+00')
ON CONFLICT (code) DO NOTHING;
