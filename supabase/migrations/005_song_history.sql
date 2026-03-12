-- ============================================================================
-- Song History — Full station playlist log
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Table: stores every song that plays on the station
CREATE TABLE IF NOT EXISTS public.song_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  artist      text NOT NULL,
  album_art   text,                          -- URL to album art image
  stream_id   text NOT NULL DEFAULT 'WCCG',  -- station/stream identifier
  played_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by played_at (most recent first)
CREATE INDEX IF NOT EXISTS idx_song_history_played_at
  ON public.song_history (played_at DESC);

-- Index for stream_id + played_at (filter by station)
CREATE INDEX IF NOT EXISTS idx_song_history_stream_played
  ON public.song_history (stream_id, played_at DESC);

-- Enable RLS
ALTER TABLE public.song_history ENABLE ROW LEVEL SECURITY;

-- Public read access — anyone can see what songs played
CREATE POLICY "Song history is publicly readable"
  ON public.song_history
  FOR SELECT
  USING (true);

-- Only service_role can insert (the polling edge function)
CREATE POLICY "Only service role can insert songs"
  ON public.song_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE public.song_history IS 'Full station playlist log — every song that plays on the station';
