-- Parental controls for the video wall: a content rating per video + optional
-- warnings. The viewer-side "hide mature" preference is stored client-side.
alter table public.videos add column if not exists rating text not null default 'G'
  check (rating in ('G','PG','PG-13','R','NR'));
alter table public.videos add column if not exists content_warnings text[] not null default '{}'::text[];
comment on column public.videos.rating is 'Content rating for parental controls: G, PG, PG-13, R, NR (not rated).';
