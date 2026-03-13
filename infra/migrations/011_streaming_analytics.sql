-- ============================================================================
-- 007: Streaming Analytics — Cir.st Log Integration
-- ============================================================================
-- Stores parsed listener session data from the Cir.st streaming log API.
-- Two tables: raw log entries and pre-aggregated daily stats.
-- ============================================================================

-- Raw parsed log entries from Cir.st
CREATE TABLE IF NOT EXISTS public.stream_log_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date        date NOT NULL,
  ip_address      inet NOT NULL,
  timestamp       timestamptz NOT NULL,
  request_path    text,
  status_code     smallint,
  bytes_sent      bigint DEFAULT 0,
  user_agent      text,
  referrer        text,
  duration_secs   integer DEFAULT 0,
  country_code    text,
  state_code      text,
  city            text,
  dma_code        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ip_address, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_stream_log_entries_date
  ON public.stream_log_entries (log_date);
CREATE INDEX IF NOT EXISTS idx_stream_log_entries_timestamp
  ON public.stream_log_entries (timestamp);

-- Pre-aggregated daily stats
CREATE TABLE IF NOT EXISTS public.stream_log_daily_stats (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date              date NOT NULL UNIQUE,
  unique_listeners      integer NOT NULL DEFAULT 0,
  total_requests        integer NOT NULL DEFAULT 0,
  total_listening_secs  bigint NOT NULL DEFAULT 0,
  total_bytes           bigint NOT NULL DEFAULT 0,
  peak_hour             smallint,
  peak_listeners        integer DEFAULT 0,
  top_countries         jsonb DEFAULT '[]',
  top_states            jsonb DEFAULT '[]',
  top_cities            jsonb DEFAULT '[]',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.stream_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_log_daily_stats ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read log entries"
  ON public.stream_log_entries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages log entries"
  ON public.stream_log_entries FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read daily stats"
  ON public.stream_log_daily_stats FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages daily stats"
  ON public.stream_log_daily_stats FOR ALL
  USING (auth.role() = 'service_role');
