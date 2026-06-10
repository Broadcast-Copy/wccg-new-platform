-- Live migration export: version 20260329011518, name "orders_payouts_shipping_fees_verification"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via dashboard/MCP before the numbered repo lineage existed. Do not re-apply.

-- Orders system
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  tracking_number TEXT,
  payment_intent_id TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own orders" ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Vendors view orders for their products" ON orders FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Buyers can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors can update order status" ON orders FOR UPDATE USING (auth.uid() = vendor_id);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES vendor_products(id),
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order item access follows order" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.buyer_id = auth.uid() OR orders.vendor_id = auth.uid()))
);

-- Vendor payouts
CREATE TABLE IF NOT EXISTS vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT DEFAULT 'bank_transfer',
  bank_details JSONB,
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors view own payouts" ON vendor_payouts FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can request payouts" ON vendor_payouts FOR INSERT WITH CHECK (auth.uid() = vendor_id);

-- Shipping settings per vendor
CREATE TABLE IF NOT EXISTS vendor_shipping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flat_rate DECIMAL(10,2) DEFAULT 5.99,
  free_shipping_threshold DECIMAL(10,2) DEFAULT 50.00,
  local_pickup BOOLEAN DEFAULT true,
  ships_nationwide BOOLEAN DEFAULT false,
  processing_days INT DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id)
);
ALTER TABLE vendor_shipping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors manage own shipping" ON vendor_shipping FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Public can view shipping" ON vendor_shipping FOR SELECT USING (true);

-- Platform fee configuration (admin-managed)
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  fee_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view fees" ON platform_fees FOR SELECT USING (true);

-- Seed default fees
INSERT INTO platform_fees (category, fee_percent, description) VALUES
  ('products', 8.00, 'Physical and digital products'),
  ('bookings', 5.00, 'Service bookings and appointments'),
  ('events', 3.00, 'Event tickets'),
  ('gift_cards', 0.00, 'Gift card purchases (no fee)')
ON CONFLICT (category) DO NOTHING;

-- Vendor verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vendor_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vendor_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vendor_application_status TEXT DEFAULT 'none';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id, status);
