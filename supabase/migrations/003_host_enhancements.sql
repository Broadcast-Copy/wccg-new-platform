-- ============================================================================
-- Migration: Host profile enhancements
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add social_links JSONB column for social media links
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Add YouTube channel URL
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS youtube_channel_url TEXT;

-- Add YouTube embed/search URL
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS youtube_embed_url TEXT;

-- Link host to their user profile (for hosts who are also platform users)
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index on profile_id for quick lookup
CREATE INDEX IF NOT EXISTS idx_hosts_profile ON hosts(profile_id) WHERE profile_id IS NOT NULL;
