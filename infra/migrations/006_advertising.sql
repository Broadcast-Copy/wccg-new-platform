-- WCCG 104.5 FM — Advertising & Campaigns Schema
-- Run in Supabase SQL Editor after 005_podcasts.sql

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE ad_campaign_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');
CREATE TYPE ad_creative_type AS ENUM ('AUDIO_15S', 'AUDIO_30S', 'AUDIO_60S', 'BANNER_LEADERBOARD', 'BANNER_SIDEBAR', 'SPONSORSHIP');
CREATE TYPE ad_creative_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE ad_placement AS ENUM ('PREROLL', 'MIDROLL', 'POSTROLL', 'BANNER', 'SPONSORSHIP');

-- ============================================================================
-- ADVERTISER ACCOUNTS (extends profiles for advertiser-specific data)
-- ============================================================================
CREATE TABLE advertiser_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_website TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  billing_address TEXT,
  tax_id TEXT,
  notes TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advertiser_accounts_user ON advertiser_accounts(user_id);

-- ============================================================================
-- AD CAMPAIGNS
-- ============================================================================
CREATE TABLE ad_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  advertiser_id TEXT NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status ad_campaign_status NOT NULL DEFAULT 'DRAFT',
  budget_total DECIMAL(10, 2),           -- total campaign budget
  budget_daily DECIMAL(10, 2),           -- daily spend cap
  spent_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_geo TEXT[] DEFAULT '{}',         -- target counties/cities
  target_age_min INTEGER,
  target_age_max INTEGER,
  target_dayparts TEXT[] DEFAULT '{}',    -- e.g. ['morning', 'midday', 'afternoon', 'evening']
  target_streams TEXT[] DEFAULT '{}',     -- target specific stream IDs
  frequency_cap INTEGER,                 -- max impressions per listener per day
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_campaigns_advertiser ON ad_campaigns(advertiser_id);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);

-- ============================================================================
-- AD CREATIVES
-- ============================================================================
CREATE TABLE ad_creatives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  creative_type ad_creative_type NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  duration INTEGER,                      -- seconds (for audio)
  width INTEGER,                         -- pixels (for banners)
  height INTEGER,                        -- pixels (for banners)
  alt_text TEXT,
  click_url TEXT,                        -- destination URL for clicks
  status ad_creative_status NOT NULL DEFAULT 'PENDING',
  review_notes TEXT,                     -- admin feedback on rejection
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_creatives_campaign ON ad_creatives(campaign_id);
CREATE INDEX idx_ad_creatives_status ON ad_creatives(status);

-- ============================================================================
-- AD IMPRESSIONS (high-volume tracking)
-- ============================================================================
CREATE TABLE ad_impressions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  creative_id TEXT NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  stream_id TEXT REFERENCES streams(id),
  listener_id UUID REFERENCES profiles(id),
  placement ad_placement NOT NULL,
  impression_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked BOOLEAN NOT NULL DEFAULT false,
  clicked_at TIMESTAMPTZ,
  ip_hash TEXT,                          -- hashed IP for deduplication
  user_agent TEXT
);

-- Partitioned index for time-range queries
CREATE INDEX idx_ad_impressions_campaign ON ad_impressions(campaign_id, impression_at DESC);
CREATE INDEX idx_ad_impressions_creative ON ad_impressions(creative_id, impression_at DESC);
CREATE INDEX idx_ad_impressions_date ON ad_impressions(impression_at DESC);

-- ============================================================================
-- AD INVOICES
-- ============================================================================
CREATE TABLE ad_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  advertiser_id TEXT NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, PAID, OVERDUE, VOID
  paid_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  pdf_url TEXT,
  line_items JSONB NOT NULL DEFAULT '[]', -- [{ campaign_id, campaign_name, impressions, clicks, amount }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_invoices_advertiser ON ad_invoices(advertiser_id);

-- ============================================================================
-- RATE CARDS
-- ============================================================================
CREATE TABLE ad_rate_cards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  creative_type ad_creative_type NOT NULL,
  rate_per_spot DECIMAL(10, 2),           -- cost per spot (audio)
  rate_cpm DECIMAL(10, 2),                -- cost per 1000 impressions (banners)
  rate_flat DECIMAL(10, 2),               -- flat rate (sponsorships)
  min_commitment_days INTEGER DEFAULT 1,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER set_updated_at_advertiser_accounts
  BEFORE UPDATE ON advertiser_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ad_campaigns
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ad_creatives
  BEFORE UPDATE ON ad_creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ad_invoices
  BEFORE UPDATE ON ad_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ad_rate_cards
  BEFORE UPDATE ON ad_rate_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE advertiser_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own account" ON advertiser_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create advertiser account" ON advertiser_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Advertisers can update own account" ON advertiser_accounts
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own campaigns" ON ad_campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM advertiser_accounts aa WHERE aa.id = advertiser_id AND aa.user_id = auth.uid())
  );
CREATE POLICY "Advertisers create campaigns" ON ad_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM advertiser_accounts aa WHERE aa.id = advertiser_id AND aa.user_id = auth.uid())
  );
CREATE POLICY "Advertisers update own campaigns" ON ad_campaigns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM advertiser_accounts aa WHERE aa.id = advertiser_id AND aa.user_id = auth.uid())
  );

ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own creatives" ON ad_creatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns ac
      JOIN advertiser_accounts aa ON aa.id = ac.advertiser_id
      WHERE ac.id = campaign_id AND aa.user_id = auth.uid()
    )
  );

ALTER TABLE ad_rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rate cards are public" ON ad_rate_cards FOR SELECT USING (is_active = true);
