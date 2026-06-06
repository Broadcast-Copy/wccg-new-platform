-- ============================================================================
-- Migration 061: Schedule the daily program-video re-seed (Epic D3)
-- ============================================================================
-- Keeps the Watch page current by invoking the `reseed-videos` edge function
-- once a day. That function fetches each program channel's PUBLIC YouTube RSS
-- feed (no API key) and UPSERTs into public.videos keyed on youtube_id —
-- inserting new uploads and refreshing titles/thumbnails. It never deletes.
--
-- See: supabase/functions/reseed-videos/index.ts
--
-- Requires pg_cron + pg_net. Both are available on this project (pg_net is
-- already installed; pg_cron is enabled below). pg_cron lives in the `cron`
-- schema; pg_net in `extensions`.
--
-- NOTE on the Authorization header: the edge function is deployed with
-- verify_jwt=false, but the Supabase API gateway still requires an apikey /
-- Bearer token to ROUTE the request to the function. The anon key is used here
-- (it is a public, publishable key — safe to embed in a server-side cron call).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any prior schedule with the same name so this migration is idempotent.
SELECT cron.unschedule('reseed-videos-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reseed-videos-daily');

-- Run daily at 08:10 UTC (~03:10–04:10 America/New_York). Off the top of the
-- hour to avoid the cron thundering herd.
SELECT cron.schedule(
  'reseed-videos-daily',
  '10 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://irjiqbmoohklagdegezz.supabase.co/functions/v1/reseed-videos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyamlxYm1vb2hrbGFnZGVnZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjU0MzEsImV4cCI6MjA4NTY0MTQzMX0.0-ChQ69cVWQjqbJYrLE5FbO6eBAKr7j8yHbnY4Fag3k',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyamlxYm1vb2hrbGFnZGVnZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjU0MzEsImV4cCI6MjA4NTY0MTQzMX0.0-ChQ69cVWQjqbJYrLE5FbO6eBAKr7j8yHbnY4Fag3k'
    ),
    body    := jsonb_build_object('source', 'pg_cron')
  );
  $$
);
