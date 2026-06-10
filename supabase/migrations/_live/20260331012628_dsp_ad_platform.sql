-- Live migration export: version 20260331012628, name "dsp_ad_platform"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

-- Audience segments (targetable groups built from listener data)
CREATE TABLE IF NOT EXISTS audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}',
  estimated_size INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active segments" ON audience_segments FOR SELECT USING (is_active = true);

-- Ad placements (inventory — where ads can appear)
CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  placement_type TEXT NOT NULL,
  description TEXT,
  dimensions TEXT,
  pricing_model TEXT DEFAULT 'cpm',
  base_price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view placements" ON ad_placements FOR SELECT USING (true);

-- Seed WCCG ad inventory
INSERT INTO ad_placements (name, channel, placement_type, description, dimensions, pricing_model, base_price) VALUES
  ('Pre-Roll Audio (15s)', 'wccg_onair', 'audio', 'Audio ad before stream starts', '15 seconds', 'cpm', 20.00),
  ('Pre-Roll Audio (30s)', 'wccg_onair', 'audio', 'Audio ad before stream starts', '30 seconds', 'cpm', 25.00),
  ('Mid-Roll Audio (30s)', 'wccg_onair', 'audio', 'Audio ad during show breaks', '30 seconds', 'cpm', 22.00),
  ('Live Read (60s)', 'wccg_onair', 'audio', 'Host reads ad copy during show', '60 seconds', 'flat', 150.00),
  ('Homepage Banner', 'wccg_digital', 'display', 'Top banner on homepage', '728x90', 'cpm', 10.00),
  ('Marketplace Featured', 'wccg_digital', 'display', 'Featured product in marketplace', 'Card', 'cpc', 0.75),
  ('Directory Featured', 'wccg_digital', 'display', 'Featured listing in directory', 'Card', 'monthly', 50.00),
  ('Hub Sponsored Post', 'wccg_digital', 'native', 'Sponsored post in community feeds', 'Post', 'flat', 75.00),
  ('Push Notification', 'wccg_digital', 'push', 'Targeted push to listener devices', 'Text+Link', 'per_send', 0.03),
  ('Event Sponsorship', 'wccg_events', 'sponsorship', 'Logo and mentions at WCCG events', 'Package', 'flat', 500.00),
  ('Newsletter Sponsor', 'wccg_email', 'email', 'Sponsored section in email newsletter', 'HTML Block', 'per_send', 0.02)
ON CONFLICT DO NOTHING;

-- DSP campaigns (unified multi-channel campaigns)
CREATE TABLE IF NOT EXISTS dsp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  objective TEXT DEFAULT 'awareness',
  total_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  target_segment_id UUID REFERENCES audience_segments(id),
  target_locations JSONB DEFAULT '[]',
  target_demographics JSONB DEFAULT '{}',
  target_interests JSONB DEFAULT '[]',
  channels JSONB DEFAULT '{}',
  creatives JSONB DEFAULT '[]',
  platform_markup_percent DECIMAL(5,2) DEFAULT 25.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dsp_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own campaigns" ON dsp_campaigns FOR SELECT USING (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers create campaigns" ON dsp_campaigns FOR INSERT WITH CHECK (auth.uid() = advertiser_id);
CREATE POLICY "Advertisers update own campaigns" ON dsp_campaigns FOR UPDATE USING (auth.uid() = advertiser_id);

-- Channel budgets (how budget is split per platform)
CREATE TABLE IF NOT EXISTS dsp_channel_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dsp_campaigns(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  external_campaign_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dsp_channel_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follow campaign access" ON dsp_channel_budgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM dsp_campaigns WHERE dsp_campaigns.id = dsp_channel_budgets.campaign_id AND dsp_campaigns.advertiser_id = auth.uid())
);

-- Campaign analytics (cross-platform metrics)
CREATE TABLE IF NOT EXISTS dsp_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dsp_campaigns(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  reach INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, channel, date)
);
ALTER TABLE dsp_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follow campaign access" ON dsp_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM dsp_campaigns WHERE dsp_campaigns.id = dsp_analytics.campaign_id AND dsp_campaigns.advertiser_id = auth.uid())
);

-- Advertiser accounts (extended profile for advertisers)
CREATE TABLE IF NOT EXISTS dsp_advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  billing_email TEXT,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  meta_ad_account_id TEXT,
  tiktok_ad_account_id TEXT,
  google_ad_account_id TEXT,
  snapchat_ad_account_id TEXT,
  total_spend DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE dsp_advertisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own account" ON dsp_advertisers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create advertiser account" ON dsp_advertisers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Advertisers update own account" ON dsp_advertisers FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dsp_campaigns_advertiser ON dsp_campaigns(advertiser_id, status);
CREATE INDEX IF NOT EXISTS idx_dsp_analytics_campaign ON dsp_analytics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_dsp_channel_budgets_campaign ON dsp_channel_budgets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audience_segments_active ON audience_segments(is_active);
