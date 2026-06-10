-- Live migration export: version 20260331014943, name "nice_to_haves"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

-- A/B test variants for ad creatives
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dsp_campaigns(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL DEFAULT 'A',
  creative JSONB NOT NULL DEFAULT '{}',
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follow campaign access" ON ab_test_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM dsp_campaigns WHERE dsp_campaigns.id = ab_test_variants.campaign_id AND dsp_campaigns.advertiser_id = auth.uid())
);

-- Referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  uses INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own codes" ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own codes" ON referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read codes for validation" ON referral_codes FOR SELECT USING (true);

-- Referral signups tracking
CREATE TABLE IF NOT EXISTS referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  code TEXT NOT NULL,
  points_awarded INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);
ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON referral_signups FOR SELECT USING (auth.uid() = referrer_id);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Email campaign templates
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  segment_id UUID REFERENCES audience_segments(id),
  status TEXT DEFAULT 'draft',
  sent_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage email campaigns" ON email_campaigns FOR ALL USING (true);

-- Carrier tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_test_campaign ON ab_test_variants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
