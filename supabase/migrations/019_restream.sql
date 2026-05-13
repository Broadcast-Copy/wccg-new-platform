-- ============================================================================
-- Migration 019: Restream Fan-out
-- ============================================================================
-- PRD Phase D — simulcast the WCCG 104.5 live audio to YouTube Live, Twitch,
-- and Discord (voice or stage channel). Per-destination toggle + stream key,
-- health monitoring, restart on failure.
--
-- The actual ffmpeg subprocess management lives in
-- apps/workers/src/restream/. This schema is the registry + status.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS restream_destinations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,                       -- "YouTube Live", "Twitch (main)", "Discord — General VC"
  platform      TEXT NOT NULL CHECK (platform IN
                  ('youtube','twitch','facebook','discord','rtmp_custom')),

  -- For RTMP-based destinations (YouTube/Twitch/Facebook + custom):
  rtmp_url      TEXT,                                -- e.g. rtmp://a.rtmp.youtube.com/live2
  stream_key    TEXT,                                -- secret; client never reads back the full value
  -- For Discord:
  discord_guild_id   TEXT,
  discord_channel_id TEXT,
  discord_bot_token  TEXT,                           -- secret

  -- Output options
  video_mode    TEXT NOT NULL DEFAULT 'static'       -- 'static' = single image background, 'waveform','none' (audio-only platforms)
                CHECK (video_mode IN ('static','waveform','none')),
  background_url TEXT,                               -- image URL for static video mode
  video_bitrate_kbps INT DEFAULT 2500,
  audio_bitrate_kbps INT DEFAULT 128,

  -- Lifecycle
  enabled       BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'idle'
                CHECK (status IN ('idle','starting','live','reconnecting','failed','stopped')),
  status_message TEXT,
  last_active_at TIMESTAMPTZ,
  last_error_at  TIMESTAMPTZ,
  last_error_msg TEXT,
  consecutive_failures INT NOT NULL DEFAULT 0,

  -- Source (defaults to station's primary Icecast mount)
  source_url    TEXT,                                -- e.g. http://stream.wccg1045fm.com:8000/wccg
  source_format TEXT DEFAULT 'mp3',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restream_destinations_enabled ON restream_destinations(enabled);
CREATE INDEX IF NOT EXISTS idx_restream_destinations_status  ON restream_destinations(status);

-- Heartbeat / event log — append-only, used by the dashboard for sparklines
-- and for diagnosing "why did Twitch keep dropping?"
CREATE TABLE IF NOT EXISTS restream_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES restream_destinations(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,                     -- 'start','stop','heartbeat','error','reconnect'
  status         TEXT,                              -- snapshot of destination status at event time
  message        TEXT,
  bitrate_kbps   INT,
  fps            NUMERIC(5,2),
  bytes_out      BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restream_events_dest_time
  ON restream_events(destination_id, created_at DESC);

ALTER TABLE restream_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restream_events       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restream_destinations_service ON restream_destinations;
CREATE POLICY restream_destinations_service ON restream_destinations
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS restream_events_service ON restream_events;
CREATE POLICY restream_events_service ON restream_events
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
