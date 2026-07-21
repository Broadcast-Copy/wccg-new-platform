-- 100: Public now-playing feed per station (Broadcast Copy / AirSuite bridge)
-- Written by the station's on-prem bridge (Studio Control) via edge fn
-- station-nowplaying, sourced from the LIVE playout system (currently DJB's
-- nowplaying.xml — real air, not the AirSuite shadow engine).
-- Public read is deliberate: this powers the station website's Now Playing.

create table if not exists public.station_now_playing (
  station_id text primary key references public.stations(id) on delete cascade,
  updated_at timestamptz not null default now(),
  artist text,
  title text,
  cut text,
  category text,
  started_at timestamptz,
  duration text,
  next_artist text,
  next_title text,
  source text
);

alter table public.station_now_playing enable row level security;

create policy station_now_playing_public_read on public.station_now_playing
  for select using (true);
