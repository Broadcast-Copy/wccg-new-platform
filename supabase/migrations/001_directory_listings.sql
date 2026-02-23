-- ============================================================================
-- Migration: directory_listings table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enum for listing status
DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Directory listings table
CREATE TABLE IF NOT EXISTS directory_listings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'NC',
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  lat FLOAT,
  lng FLOAT,
  featured BOOLEAN DEFAULT false,
  status listing_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_directory_listings_category ON directory_listings(category);
CREATE INDEX IF NOT EXISTS idx_directory_listings_county ON directory_listings(county);
CREATE INDEX IF NOT EXISTS idx_directory_listings_status ON directory_listings(status);
CREATE INDEX IF NOT EXISTS idx_directory_listings_owner ON directory_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_directory_listings_featured ON directory_listings(featured) WHERE featured = true;

-- RLS
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;

-- Public can read active listings
CREATE POLICY "Anyone can view active listings"
  ON directory_listings FOR SELECT
  USING (status = 'ACTIVE');

-- Authenticated users can insert their own listings
CREATE POLICY "Users can create listings"
  ON directory_listings FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own listings
CREATE POLICY "Owners can update their listings"
  ON directory_listings FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can delete their own listings
CREATE POLICY "Owners can delete their listings"
  ON directory_listings FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
