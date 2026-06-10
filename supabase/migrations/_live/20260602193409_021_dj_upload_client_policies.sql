-- Live migration export: version 20260602193409, name "021_dj_upload_client_policies"
-- Source: supabase_migrations.schema_migrations (project irjiqbmoohklagdegezz)
-- Applied via MCP; the repo never had a 021_*.sql file (the number was skipped locally). Do not re-apply.

-- Client-side DJ upload: let DJs insert their own dj_drops rows + upload to
-- the dj-drops storage bucket directly from the browser (no API server).
-- Plus an admin read-all policy so admins see every drop.

-- dj_drops: DJ can insert a drop for a DJ profile they own
DROP POLICY IF EXISTS "DJs insert own drops" ON dj_drops;
CREATE POLICY "DJs insert own drops" ON dj_drops
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM djs WHERE djs.id = dj_drops.dj_id AND djs.user_id = auth.uid())
  );

-- dj_drops: DJ can update their own drops (e.g. re-upload same week/code)
DROP POLICY IF EXISTS "DJs update own drops" ON dj_drops;
CREATE POLICY "DJs update own drops" ON dj_drops
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM djs WHERE djs.id = dj_drops.dj_id AND djs.user_id = auth.uid())
  );

-- dj_drops: admins read ALL drops (for the admin DJ-drops dashboard)
DROP POLICY IF EXISTS "Admins read all drops" ON dj_drops;
CREATE POLICY "Admins read all drops" ON dj_drops
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur
            WHERE ur.profile_id = auth.uid()
              AND ur.role_id IN ('admin','super_admin','management','role_admin'))
  );

-- storage dj-drops: DJ uploads into their own <slug>/... folder
DROP POLICY IF EXISTS "DJs upload own drops" ON storage.objects;
CREATE POLICY "DJs upload own drops" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dj-drops'
    AND (storage.foldername(name))[1] IN (SELECT slug FROM djs WHERE user_id = auth.uid())
  );

-- storage dj-drops: DJ can read/update/overwrite own folder
DROP POLICY IF EXISTS "DJs read own drops storage" ON storage.objects;
CREATE POLICY "DJs read own drops storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dj-drops'
    AND (storage.foldername(name))[1] IN (SELECT slug FROM djs WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "DJs update own drops storage" ON storage.objects;
CREATE POLICY "DJs update own drops storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dj-drops'
    AND (storage.foldername(name))[1] IN (SELECT slug FROM djs WHERE user_id = auth.uid())
  );

-- storage dj-drops: admins read everything in the bucket
DROP POLICY IF EXISTS "Admins read all drops storage" ON storage.objects;
CREATE POLICY "Admins read all drops storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dj-drops'
    AND EXISTS (SELECT 1 FROM user_roles ur
                WHERE ur.profile_id = auth.uid()
                  AND ur.role_id IN ('admin','super_admin','management','role_admin'))
  );
