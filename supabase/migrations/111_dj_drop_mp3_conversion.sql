-- 111 — offer to convert a DJ's AIFF upload to MP3 instead of rejecting it.
--
-- DJs export from their DAW and hand us whatever the DAW made. AIFF is the
-- common wrong answer (Logic and Pro Tools default to it), and until now the
-- portal handled it badly in two separate ways:
--
--   * the dj-drops bucket's allowed_mime_types had no aiff entry, so Storage
--     refused the upload with a raw mime-type error, and
--   * the portal's extension regex didn't match .aiff either, so the file was
--     filed as CODE.mp3 -- an AIFF with an mp3 name, which then went to
--     M:\JBMusic and would not play.
--
-- Now the portal offers to convert. The original uploads as-is, convert_to_mp3
-- records that the DJ accepted, and sync-dj-drops.py transcodes with ffmpeg on
-- the production PC before filing to air. Conversion is deliberately NOT done
-- in the browser: an hour of 44.1k/16-bit stereo AIFF decodes to ~1.3 GB of
-- Float32 in memory, which kills the phone half these uploads come from.

alter table public.dj_drops
  add column if not exists convert_to_mp3 boolean not null default false,
  add column if not exists source_format  text,
  add column if not exists converted_at   timestamptz;

comment on column public.dj_drops.convert_to_mp3 is
  'DJ accepted our offer to transcode a non-mp3 upload. sync-dj-drops.py acts on it.';
comment on column public.dj_drops.source_format is
  'Format as uploaded, kept after format is rewritten to mp3, so we can tell what we converted.';
comment on column public.dj_drops.converted_at is
  'When the studio PC finished the ffmpeg transcode. Null means not converted (yet).';

-- Let AIFF through Storage at all. Without these two mime types the upload is
-- rejected before any of the above matters.
update storage.buckets
set allowed_mime_types = (
      select array_agg(distinct m)
      from unnest(
        coalesce(allowed_mime_types, array[]::text[])
        || array['audio/aiff', 'audio/x-aiff', 'audio/aif']
      ) as m
    ),
    -- An hour of 44.1k/16-bit stereo AIFF is ~635 MB and 24-bit/48k is ~1.04 GB,
    -- both over the previous 500 MB cap. Raised so the convert offer is reachable.
    file_size_limit = 1073741824
where id = 'dj-drops';
