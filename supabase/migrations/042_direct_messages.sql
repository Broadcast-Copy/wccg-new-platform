-- =====================================================================
-- 042_direct_messages
-- Member-to-member direct messages (listeners <-> creators/vendors, etc.).
-- =====================================================================
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  hub_type     text,
  body         text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_read_own" on public.messages;
create policy "messages_read_own" on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages_send" on public.messages;
create policy "messages_send" on public.messages for insert to authenticated
  with check (auth.uid() = sender_id);

drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read" on public.messages for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
