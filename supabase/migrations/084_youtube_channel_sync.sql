-- 084_youtube_channel_sync.sql
-- Lets a creator link their YouTube channel; the reseed-videos edge function
-- pulls their public uploads onto their WCCG profile (visibility='unlisted',
-- source='youtube_sync') — shown on the profile, kept out of the curated main
-- Watch feed unless separately published through moderation.

alter table public.profiles
  add column if not exists youtube_channel_url text,
  add column if not exists youtube_channel_id text;

alter table public.videos
  add column if not exists source text not null default 'upload';

alter table public.videos drop constraint if exists videos_source_check;
alter table public.videos
  add constraint videos_source_check
  check (source in ('upload','reseed','youtube_sync'));

create index if not exists videos_user_source_idx
  on public.videos (user_id, source);
