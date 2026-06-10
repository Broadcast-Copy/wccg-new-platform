-- Live migration export: version 20260328190833, name "gift_cards_and_media_enhancements"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

-- Gift Cards
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_amount DECIMAL(10,2) NOT NULL,
  purchaser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT,
  redeemed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  redeemed_at TIMESTAMPTZ
);
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchasers can view own gift cards" ON gift_cards FOR SELECT USING (auth.uid() = purchaser_id);
CREATE POLICY "Redeemers can view redeemed cards" ON gift_cards FOR SELECT USING (auth.uid() = redeemed_by);
CREATE POLICY "Authenticated users can create gift cards" ON gift_cards FOR INSERT WITH CHECK (auth.uid() = purchaser_id);
CREATE POLICY "Redeemers can update cards" ON gift_cards FOR UPDATE USING (auth.uid() = redeemed_by OR auth.uid() = purchaser_id);

-- Gift Card Transactions
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES vendor_products(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors view own transactions" ON gift_card_transactions FOR SELECT USING (auth.uid() = vendor_id);

-- Add gift_card_eligible to products
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS gift_card_eligible BOOLEAN DEFAULT false;

-- Enhance media_campaigns
ALTER TABLE media_campaigns ADD COLUMN IF NOT EXISTS promoted_item_id UUID;
ALTER TABLE media_campaigns ADD COLUMN IF NOT EXISTS promoted_item_type TEXT;
ALTER TABLE media_campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE media_campaigns ADD COLUMN IF NOT EXISTS description TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser ON gift_cards(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_txns_card ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_txns_vendor ON gift_card_transactions(vendor_id);
