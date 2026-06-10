-- Live migration export: version 20260328213951, name "hub_posts_and_likes"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

-- Hub posts (social feed for Creator/Vendor/Listener hubs)
CREATE TABLE IF NOT EXISTS hub_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hub_type TEXT NOT NULL CHECK (hub_type IN ('creator', 'vendor', 'listener')),
  content TEXT NOT NULL,
  media_url TEXT,
  link_url TEXT,
  link_title TEXT,
  post_type TEXT NOT NULL DEFAULT 'update',
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hub_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view hub posts" ON hub_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON hub_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON hub_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON hub_posts FOR DELETE USING (auth.uid() = user_id);

-- Hub post likes
CREATE TABLE IF NOT EXISTS hub_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES hub_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE hub_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON hub_post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON hub_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own" ON hub_post_likes FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hub_posts_hub_type ON hub_posts(hub_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_posts_user ON hub_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_hub_post_likes_post ON hub_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_hub_post_likes_user ON hub_post_likes(user_id);
