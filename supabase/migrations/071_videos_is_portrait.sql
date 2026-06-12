-- 071: Orientation flag for the Watch wall.
-- Phone/Shorts-style portrait videos are excluded from the public wall (they
-- pillarbox badly in 16:9 cards). null = not probed yet, true = portrait
-- (hidden), false = wide (shown). Set by the reseed-videos edge function via
-- YouTube oEmbed dimensions (insert-time probe + ?backfill=1 mode).
alter table public.videos add column if not exists is_portrait boolean;
comment on column public.videos.is_portrait is
  'Portrait/Shorts-style video (oEmbed height > width). Hidden from the public wall. null = unknown.';
