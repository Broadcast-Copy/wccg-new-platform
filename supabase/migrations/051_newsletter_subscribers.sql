-- =====================================================================
-- 051_newsletter_subscribers
-- Real newsletter signup (replaces the dead NestJS /marketing/newsletter
-- endpoint). Anyone (anon or signed-in) may subscribe; only staff can read the
-- list (it's PII). Idempotent.
-- =====================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  created_at timestamptz not null default now()
);

-- One row per email (case-insensitive); duplicate signups surface as 23505.
create unique index if not exists newsletter_email_lower_key
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "Staff read subscribers" on public.newsletter_subscribers;
create policy "Staff read subscribers" on public.newsletter_subscribers
  for select to authenticated using (public.is_staff());
