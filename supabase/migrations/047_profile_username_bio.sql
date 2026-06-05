-- =====================================================================
-- 047_profile_username_bio
-- Public social profiles: every user gets a handle (username) + bio, and the
-- PII-safe profiles_public view exposes the fields a public profile needs
-- (handle, bio, role/affiliation flags for badges). Powers /u/<username>.
-- =====================================================================

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;

-- Backfill a handle from display_name (slugified), de-duplicated.
with cleaned as (
  select id,
    nullif(trim(both '-' from regexp_replace(lower(coalesce(nullif(display_name,''),'user')), '[^a-z0-9]+', '-', 'g')), '') as slug
  from public.profiles
  where username is null
),
numbered as (
  select id, coalesce(slug,'user') as slug,
    row_number() over (partition by coalesce(slug,'user') order by id) as rn
  from cleaned
)
update public.profiles p
set username = case when n.rn = 1 then n.slug else n.slug || n.rn::text end
from numbered n
where p.id = n.id;

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- Expand the public projection (append-only keeps CREATE OR REPLACE valid).
create or replace view public.profiles_public as
  select id, display_name, avatar_url, artist_name, created_at,
         username, bio, is_internal, has_creator_access, has_vendor_access, user_type, creator_type
  from public.profiles;

grant select on public.profiles_public to anon, authenticated;
