-- WCCG 104.5 FM — CMS / Admin-Managed Content Schema
-- Run in Supabase SQL Editor after 007_expand_favorites_follows.sql
-- Tables: site_content, site_ad_placements, site_navigation

-- ============================================================================
-- SITE CONTENT BLOCKS
-- Editable content blocks that power the public site (hero text, banners, etc.)
-- ============================================================================
CREATE TABLE site_content (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT UNIQUE NOT NULL,              -- e.g. 'hero_title', 'hero_subtitle', 'cta_banner_text'
  content_type TEXT NOT NULL DEFAULT 'text',  -- 'text', 'richtext', 'image', 'json', 'html'
  title TEXT NOT NULL,                    -- Human-readable name for admin UI
  value TEXT NOT NULL DEFAULT '',         -- The actual content
  metadata JSONB DEFAULT '{}',           -- Extra config (image dimensions, link URLs, etc.)
  page TEXT,                             -- Which page this belongs to ('home', 'discover', etc.)
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_content_slug ON site_content(slug);
CREATE INDEX idx_site_content_page ON site_content(page);

-- ============================================================================
-- SITE AD PLACEMENTS
-- Admin-managed ad slots that display on the public site
-- ============================================================================
CREATE TABLE site_ad_placements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slot TEXT UNIQUE NOT NULL,              -- e.g. 'home_sidebar', 'hero_banner', 'footer_leaderboard'
  title TEXT NOT NULL,
  ad_type TEXT NOT NULL DEFAULT 'image',  -- 'image', 'html', 'video', 'audio_preroll'
  content TEXT,                           -- HTML/embed code
  target_url TEXT,                        -- Click-through URL
  image_url TEXT,                         -- Banner image
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  advertiser_name TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_ad_placements_slot ON site_ad_placements(slot);
CREATE INDEX idx_site_ad_placements_active ON site_ad_placements(is_active) WHERE is_active = true;

-- ============================================================================
-- SITE NAVIGATION
-- Admin-configurable navigation items for header, footer, bottom tabs, mega menu
-- ============================================================================
CREATE TABLE site_navigation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location TEXT NOT NULL,                 -- 'header', 'footer', 'bottom_tabs', 'mega_menu'
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT,                              -- Lucide icon name (e.g. 'Home', 'Radio', 'Compass')
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES site_navigation(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_navigation_location ON site_navigation(location, sort_order);

-- ============================================================================
-- TRIGGERS (auto-update updated_at)
-- ============================================================================
CREATE TRIGGER set_updated_at_site_content
  BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_site_ad_placements
  BEFORE UPDATE ON site_ad_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_site_navigation
  BEFORE UPDATE ON site_navigation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Site Content: public read, admin write
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site content is publicly readable" ON site_content
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert site content" ON site_content
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

CREATE POLICY "Admins can update site content" ON site_content
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

CREATE POLICY "Admins can delete site content" ON site_content
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

-- Ad Placements: public read (active only), admin write
ALTER TABLE site_ad_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active ad placements are publicly readable" ON site_ad_placements
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert ad placements" ON site_ad_placements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

CREATE POLICY "Admins can update ad placements" ON site_ad_placements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

CREATE POLICY "Admins can delete ad placements" ON site_ad_placements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

-- Navigation: public read, admin write
ALTER TABLE site_navigation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Navigation is publicly readable" ON site_navigation
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert navigation" ON site_navigation
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

CREATE POLICY "Admins can update navigation" ON site_navigation
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

CREATE POLICY "Admins can delete navigation" ON site_navigation
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE profile_id = auth.uid() AND role_id IN ('admin', 'super_admin', 'role_admin'))
  );

-- ============================================================================
-- SEED DATA: Default content blocks
-- ============================================================================
INSERT INTO site_content (slug, content_type, title, value, page) VALUES
  ('hero_title', 'text', 'Hero Title', 'WCCG 104.5 FM', 'home'),
  ('hero_subtitle', 'text', 'Hero Subtitle', 'Hip Hop, Sports, Reactions and Podcasts', 'home'),
  ('hero_cta_text', 'text', 'Hero CTA Button Text', 'Listen Live', 'home'),
  ('hero_cta_url', 'text', 'Hero CTA Button URL', '/channels', 'home'),
  ('cta_banner_title', 'text', 'CTA Banner Title', 'Join the WCCG Community', 'home'),
  ('cta_banner_subtitle', 'text', 'CTA Banner Subtitle', 'Get exclusive content, rewards, and more.', 'home'),
  ('ticker_items', 'json', 'News Ticker Items', '["Breaking: New show premieres this Friday","Download the WCCG app today","Contest: Win concert tickets"]', 'global'),
  ('about_station', 'richtext', 'About the Station', 'WCCG 104.5 FM has been serving the Fayetteville and greater NC community with the best in Hip Hop, Sports, Reactions and Podcasts.', 'home'),
  ('discover_heading', 'text', 'Discover Page Heading', 'Discover', 'discover'),
  ('discover_subheading', 'text', 'Discover Page Subheading', 'Explore shows, events, and more from WCCG 104.5 FM', 'discover');

-- Seed: Default ad placement slots
INSERT INTO site_ad_placements (slot, title, ad_type, is_active) VALUES
  ('hero_banner', 'Hero Banner Ad', 'image', false),
  ('home_sidebar', 'Home Sidebar Ad', 'image', false),
  ('home_midpage', 'Home Mid-Page Ad', 'image', false),
  ('discover_top', 'Discover Page Top Ad', 'image', false),
  ('shows_sidebar', 'Shows Sidebar Ad', 'image', false),
  ('events_banner', 'Events Page Banner', 'image', false),
  ('footer_leaderboard', 'Footer Leaderboard', 'image', false),
  ('stream_preroll', 'Stream Pre-Roll Audio', 'audio_preroll', false),
  ('mobile_interstitial', 'Mobile Interstitial', 'image', false);

-- Seed: Default navigation items (matching current site structure)
INSERT INTO site_navigation (location, label, href, icon, sort_order) VALUES
  -- Header
  ('header', 'Home', '/', 'Home', 1),
  ('header', 'Discover', '/discover', 'Compass', 2),
  ('header', 'Streaming', '/channels', 'Radio', 3),
  ('header', 'Support', '/contact', 'HelpCircle', 4),
  -- Bottom Tabs
  ('bottom_tabs', 'Home', '/', 'Home', 1),
  ('bottom_tabs', 'Listen', '/channels', 'Radio', 2),
  ('bottom_tabs', 'Discover', '/discover', 'Compass', 3),
  ('bottom_tabs', 'Shows', '/shows', 'Mic', 4),
  ('bottom_tabs', 'Perks', '/rewards', 'Gift', 5),
  -- Mega Menu (Streaming channels)
  ('mega_menu', 'WCCG 104.5 FM', '/channels', 'Radio', 1),
  ('mega_menu', 'SOUL 104.5 FM', '/channels', 'Radio', 2),
  ('mega_menu', 'HOT 104.5 FM', '/channels', 'Radio', 3),
  ('mega_menu', '104.5 THE VIBE', '/channels', 'Radio', 4),
  -- Footer (key links)
  ('footer', 'Contact Us', '/contact', NULL, 1),
  ('footer', 'FAQ', '/faq', NULL, 2),
  ('footer', 'Careers', '/careers', NULL, 3),
  ('footer', 'Advertise', '/advertise', NULL, 4),
  ('footer', 'Privacy Policy', '/privacy', NULL, 5),
  ('footer', 'Terms of Service', '/terms', NULL, 6);
