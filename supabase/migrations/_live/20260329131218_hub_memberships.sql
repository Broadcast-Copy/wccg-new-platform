-- Live migration export: version 20260329131218, name "hub_memberships"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

CREATE TABLE IF NOT EXISTS hub_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hub_type TEXT NOT NULL CHECK (hub_type IN ('creator', 'vendor', 'listener')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, hub_type)
);
ALTER TABLE hub_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view memberships" ON hub_memberships FOR SELECT USING (true);
CREATE POLICY "Users can join hubs" ON hub_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave hubs" ON hub_memberships FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_hub_memberships_user ON hub_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_hub_memberships_hub ON hub_memberships(hub_type);

-- Add vendor/creator access flags for admin control
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_vendor_access BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_creator_access BOOLEAN DEFAULT false;
