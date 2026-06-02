-- ============================================================================
-- Migration 025: Public DJ mixshow archive (profile player)
-- ============================================================================
-- Published drops + their files are public-readable so the public DJ profile
-- (/djs/:slug) can list + play them. Mixshows air publicly on the radio.
-- Unpublished drops stay private (DJ/admin/production only). Applied live.

DROP POLICY IF EXISTS "Public reads published drops" ON dj_drops;
CREATE POLICY "Public reads published drops" ON dj_drops
  FOR SELECT USING (status = 'published');

UPDATE storage.buckets SET public = true WHERE id = 'dj-drops';

DROP POLICY IF EXISTS "DJ drops public read" ON storage.objects;
CREATE POLICY "DJ drops public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'dj-drops');
