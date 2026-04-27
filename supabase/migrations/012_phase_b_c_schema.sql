-- ============================================================================
-- Phase B + C — Places, Marketplace, Living Knowledge schema
-- ============================================================================
-- Owner: WCCG Platform v2 / Phase B (B1, B4) + Phase C (C1)
-- Apply via Supabase SQL Editor. All statements idempotent.

-- ─── B1: Place check-ins, reviews, hours ──────────────────────────────────
-- We extend `directory_listings` rather than building a parallel `places`
-- table — they're the same logical entity.

ALTER TABLE directory_listings
  ADD COLUMN IF NOT EXISTS price_tier SMALLINT,           -- 1..4 ($..$$$$)
  ADD COLUMN IF NOT EXISTS hours_json JSONB,              -- per-day open/close
  ADD COLUMN IF NOT EXISTS wiki_slug TEXT,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2),       -- denorm of reviews
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_in_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

CREATE TABLE IF NOT EXISTS place_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES directory_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat FLOAT,
  lng FLOAT,
  distance_m INTEGER,                                     -- haversine to place
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_place_check_ins_user
  ON place_check_ins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_check_ins_place
  ON place_check_ins(place_id, created_at DESC);

-- One check-in per user per place per calendar day (ET) so geo-spammers can't farm.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_place_check_ins_per_day
  ON place_check_ins(
    user_id,
    place_id,
    ((created_at AT TIME ZONE 'America/New_York')::date)
  );

ALTER TABLE place_check_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own check-ins" ON place_check_ins;
CREATE POLICY "Users insert own check-ins" ON place_check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read own check-ins" ON place_check_ins;
CREATE POLICY "Users read own check-ins" ON place_check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS place_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES directory_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)                              -- one review per user per place
);

CREATE INDEX IF NOT EXISTS idx_place_reviews_place
  ON place_reviews(place_id, created_at DESC);

ALTER TABLE place_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads reviews" ON place_reviews;
CREATE POLICY "Anyone reads reviews" ON place_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own reviews" ON place_reviews;
CREATE POLICY "Users manage own reviews" ON place_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to keep rating_avg / rating_count in sync.
CREATE OR REPLACE FUNCTION refresh_place_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE directory_listings d
  SET
    rating_avg = (SELECT AVG(rating)::NUMERIC(3,2) FROM place_reviews WHERE place_id = d.id),
    rating_count = (SELECT COUNT(*) FROM place_reviews WHERE place_id = d.id)
  WHERE d.id = COALESCE(NEW.place_id, OLD.place_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_place_reviews_rating ON place_reviews;
CREATE TRIGGER trg_place_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON place_reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_place_rating();

-- ─── B4: Marketplace ─────────────────────────────────────────────────────
-- Generalized products with cash + WP pricing, supersedes reward_catalog
-- (reward_catalog stays in place; new flow is products + orders).

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('merch','ticket','experience','deal')),
  vendor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cover_url TEXT,
  cash_price_cents INTEGER,                               -- nullable = no cash purchase
  points_price INTEGER,                                   -- nullable = no points purchase
  stock INTEGER,                                          -- null = unlimited / digital
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','sold_out','archived')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cash_price_cents IS NOT NULL OR points_price IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, kind);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  cash_price_cents INTEGER,
  points_price INTEGER,
  stock INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','fulfilled','cancelled','refunded')),
  total_cash_cents INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  fulfillment_kind TEXT NOT NULL DEFAULT 'digital' CHECK (fulfillment_kind IN ('digital','pickup','ship','redeem_at_place')),
  shipping_json JSONB,
  stripe_session_id TEXT,
  redeem_place_id TEXT REFERENCES directory_listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own orders" ON orders;
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  cash_cents INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL UNIQUE,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  redeemed_at_place_id TEXT REFERENCES directory_listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_qr ON redemptions(qr_code);

-- Add SPEND reason to points_reason so the marketplace can debit the ledger.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'MARKETPLACE_SPEND') THEN
    ALTER TYPE points_reason ADD VALUE 'MARKETPLACE_SPEND';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'PLACE_CHECKIN') THEN
    ALTER TYPE points_reason ADD VALUE 'PLACE_CHECKIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'PLACE_REVIEW') THEN
    ALTER TYPE points_reason ADD VALUE 'PLACE_REVIEW';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'WIKI_DWELL') THEN
    ALTER TYPE points_reason ADD VALUE 'WIKI_DWELL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'points_reason' AND e.enumlabel = 'ARTIST_FAVORITE') THEN
    ALTER TYPE points_reason ADD VALUE 'ARTIST_FAVORITE';
  END IF;
END$$;

-- ─── C1: Living Knowledge ────────────────────────────────────────────────
-- The wiki vault is the source of truth (Markdown files in a Git repo), but
-- we mirror metadata into Postgres for fast lookups, search, and review-queue UX.

CREATE TABLE IF NOT EXISTS wiki_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('artist','host','show','event','place','track','genre','topic')),
  display_name TEXT NOT NULL,
  aliases TEXT[],
  body_md TEXT,                                            -- the Markdown body (mirror of vault file)
  body_html TEXT,                                          -- pre-rendered for fast display
  cover_url TEXT,
  confidence NUMERIC(3,2),
  needs_review BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
  last_researched_at TIMESTAMPTZ,
  vault_path TEXT,                                         -- relative to vault root
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_entities_type ON wiki_entities(type, status);
CREATE INDEX IF NOT EXISTS idx_wiki_entities_status ON wiki_entities(status, last_researched_at);
-- Full-text search on body + display_name.
CREATE INDEX IF NOT EXISTS idx_wiki_entities_fts
  ON wiki_entities USING GIN (to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(body_md,'')));

CREATE TABLE IF NOT EXISTS wiki_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES wiki_entities(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  excerpt TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT,
  agent_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_sources_entity ON wiki_sources(entity_id);

CREATE TABLE IF NOT EXISTS wiki_links (
  source_slug TEXT NOT NULL,
  target_slug TEXT NOT NULL,
  PRIMARY KEY (source_slug, target_slug)
);

CREATE INDEX IF NOT EXISTS idx_wiki_links_target ON wiki_links(target_slug);

CREATE TABLE IF NOT EXISTS wiki_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

ALTER TABLE wiki_watchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own wiki watchers" ON wiki_watchers;
CREATE POLICY "Users manage own wiki watchers" ON wiki_watchers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_slug TEXT NOT NULL,
  trigger TEXT NOT NULL,                                   -- 'now_playing','manual','staleness','seed'
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','rejected')),
  cost_usd NUMERIC(10,4),
  duration_ms INTEGER,
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cache_read_tokens INTEGER,
  cache_creation_tokens INTEGER,
  hallucination_findings INTEGER NOT NULL DEFAULT 0,
  draft_md TEXT,
  draft_confidence NUMERIC(3,2),
  log_url TEXT,                                            -- pointer to long log in object storage
  error TEXT,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status, enqueued_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_slug ON agent_runs(entity_slug, enqueued_at DESC);

-- Job queue for the worker. Worker polls WHERE status='queued' ORDER BY priority,enqueued_at LIMIT 1.
CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_slug TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 5,                    -- 1=highest, 10=lowest
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  -- Idempotency: don't re-enqueue the same trigger for the same entity within the same hour bucket.
  dedupe_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_pickup
  ON agent_jobs(status, next_attempt_at, priority);

COMMENT ON TABLE agent_jobs IS
  'Lightweight queue for the auto-research agent. Workers SELECT … FOR UPDATE SKIP LOCKED on (queued, next_attempt_at <= now()) ORDER BY priority, next_attempt_at.';

-- Public read of published wiki entries.
ALTER TABLE wiki_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads published wiki" ON wiki_entities;
CREATE POLICY "Anyone reads published wiki" ON wiki_entities
  FOR SELECT USING (status = 'published' OR auth.role() = 'service_role');
DROP POLICY IF EXISTS "Anyone reads sources" ON wiki_sources;
ALTER TABLE wiki_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads sources" ON wiki_sources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM wiki_entities w WHERE w.id = entity_id AND w.status = 'published')
    OR auth.role() = 'service_role'
  );
