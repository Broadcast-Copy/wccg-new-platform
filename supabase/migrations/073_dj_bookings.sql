-- 073: DJ booking requests. The public submits a request from a DJ's profile
-- (Booking tab); station staff review them in the admin console. Replaces the
-- legacy WordPress multi-step booking form.
create table if not exists public.dj_bookings (
  id uuid primary key default gen_random_uuid(),
  dj_id text not null references public.djs(id) on delete cascade,
  event_name text not null,
  event_date date,
  event_time text,
  duration text,
  venue_name text,
  city text,
  state text,
  location_type text,
  music_type text,
  needs_host boolean not null default false,
  needs_sound boolean not null default false,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  message text,
  status text not null default 'pending'
    check (status in ('pending','reviewing','confirmed','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dj_bookings enable row level security;

-- Anyone may SUBMIT a request, but only as a fresh 'pending' row (they can't
-- forge a confirmed booking). No public read — contact details stay private.
create policy "anyone can request a booking" on public.dj_bookings
  for insert to anon, authenticated with check (status = 'pending');

-- Station staff review + manage.
create policy "staff read bookings" on public.dj_bookings
  for select to authenticated using (public.is_staff());
create policy "staff update bookings" on public.dj_bookings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create index if not exists dj_bookings_dj_status_idx
  on public.dj_bookings (dj_id, status, created_at desc);
create index if not exists dj_bookings_status_created_idx
  on public.dj_bookings (status, created_at desc);
