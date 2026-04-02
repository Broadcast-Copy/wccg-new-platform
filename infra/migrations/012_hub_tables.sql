-- ============================================================
-- Migration 012: Hub tables (memberships, posts, likes)
-- ============================================================

-- hub_memberships
CREATE TABLE IF NOT EXISTS public.hub_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hub_type TEXT NOT NULL CHECK (hub_type IN ('creator', 'vendor', 'listener')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, hub_type)
);

-- hub_posts
CREATE TABLE IF NOT EXISTS public.hub_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_type TEXT NOT NULL CHECK (hub_type IN ('creator', 'vendor', 'listener')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  link_url TEXT,
  link_title TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- hub_post_likes
CREATE TABLE IF NOT EXISTS public.hub_post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.hub_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hub_posts_hub_type ON public.hub_posts(hub_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_posts_user ON public.hub_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_hub_post_likes_post ON public.hub_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_hub_memberships_user ON public.hub_memberships(user_id);

-- RLS
ALTER TABLE public.hub_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_post_likes ENABLE ROW LEVEL SECURITY;

-- hub_memberships policies
CREATE POLICY "Anyone can read hub memberships" ON public.hub_memberships FOR SELECT USING (true);
CREATE POLICY "Users manage own memberships" ON public.hub_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own memberships" ON public.hub_memberships FOR DELETE USING (auth.uid() = user_id);

-- hub_posts policies
CREATE POLICY "Anyone can read hub posts" ON public.hub_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users create posts" ON public.hub_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.hub_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.hub_posts FOR DELETE USING (auth.uid() = user_id);

-- hub_post_likes policies
CREATE POLICY "Anyone can read likes" ON public.hub_post_likes FOR SELECT USING (true);
CREATE POLICY "Users create own likes" ON public.hub_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.hub_post_likes FOR DELETE USING (auth.uid() = user_id);
