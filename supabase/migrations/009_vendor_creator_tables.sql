-- ============================================================================
-- 009: Vendor, Creator, and Admin Tables
-- Productions pipeline, blog posts, vendor products/bookings/events,
-- token transactions, customer tracking, CMS pages, media campaigns
-- ============================================================================

-- Productions (creator → admin review pipeline)
CREATE TABLE IF NOT EXISTS productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'audio',
  status TEXT NOT NULL DEFAULT 'pending_review',
  file_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own productions" ON productions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own productions" ON productions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own productions" ON productions FOR UPDATE USING (auth.uid() = user_id);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT,
  featured_image_url TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own blog posts" ON blog_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Published posts are public" ON blog_posts FOR SELECT USING (status = 'published');

-- Vendor products
CREATE TABLE IF NOT EXISTS vendor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  image_url TEXT,
  inventory INT DEFAULT 0,
  token_eligible BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vendor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own products" ON vendor_products FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Active products are public" ON vendor_products FOR SELECT USING (status = 'active');

-- Vendor bookings (service slots)
CREATE TABLE IF NOT EXISTS vendor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'appointment',
  duration_minutes INT,
  capacity INT DEFAULT 1,
  price DECIMAL(10,2),
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vendor_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own bookings" ON vendor_bookings FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Active bookings are public" ON vendor_bookings FOR SELECT USING (status = 'active');

-- Booking reservations (customer → vendor)
CREATE TABLE IF NOT EXISTS booking_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES vendor_bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE booking_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers view own reservations" ON booking_reservations FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers create reservations" ON booking_reservations FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Vendor events
CREATE TABLE IF NOT EXISTS vendor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  venue TEXT,
  capacity INT,
  tickets_sold INT DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  ticket_type TEXT DEFAULT 'free',
  token_reward INT DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vendor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own events" ON vendor_events FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Events are public" ON vendor_events FOR SELECT USING (true);

-- Token transactions (purchase, distribute, earn)
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'purchase',
  amount INT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id),
  reason TEXT,
  price_paid DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors view own transactions" ON token_transactions FOR ALL USING (auth.uid() = vendor_id);

-- Vendor customers
CREATE TABLE IF NOT EXISTS vendor_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  total_purchases DECIMAL(10,2) DEFAULT 0,
  tokens_received INT DEFAULT 0,
  visit_count INT DEFAULT 1,
  last_visit TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vendor_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own customers" ON vendor_customers FOR ALL USING (auth.uid() = vendor_id);

-- CMS pages (admin web editor)
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  sections JSONB DEFAULT '[]',
  status TEXT DEFAULT 'published',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published pages are public" ON cms_pages FOR SELECT USING (status = 'published');

-- Media campaigns
CREATE TABLE IF NOT EXISTS media_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'active',
  budget DECIMAL(10,2),
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE media_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own campaigns" ON media_campaigns FOR ALL USING (auth.uid() = vendor_id);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_productions_user ON productions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_productions_status ON productions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_user ON blog_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor ON vendor_products(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bookings_vendor ON vendor_bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_events_vendor ON vendor_events(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_token_transactions_vendor ON token_transactions(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_customers_vendor ON vendor_customers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_media_campaigns_vendor ON media_campaigns(vendor_id, status);
