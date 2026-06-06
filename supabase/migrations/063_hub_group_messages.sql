-- =====================================================================
-- 063_hub_group_messages
-- Group chat for the listener / creator / vendor hub groups (Epic C3).
-- Each hub_groups row gets its own message stream. Distinct from the 1:1
-- `messages` table and the live-show `chat_messages` table — this is the
-- per-group chat backing store, read via Supabase-direct + Realtime.
-- =====================================================================

create table if not exists public.hub_group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.hub_groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- Primary access pattern: newest-N (or chronological) messages for one group.
create index if not exists hub_group_messages_group_created_idx
  on public.hub_group_messages(group_id, created_at);

-- ---- RLS --------------------------------------------------------------
-- Mirrors the house style (041_hub_groups / 042_direct_messages): named
-- policies, drop-if-exists for idempotency, writes scoped to `authenticated`,
-- and is_staff() for moderation. RLS is the real backstop — the UI only gates
-- the composer for convenience.
alter table public.hub_group_messages enable row level security;

-- SELECT: anyone may read a public group's chat; otherwise only members.
drop policy if exists "hub_group_messages_read" on public.hub_group_messages;
create policy "hub_group_messages_read" on public.hub_group_messages for select
  using (
    exists (
      select 1 from public.hub_groups g
      where g.id = group_id and g.is_public
    )
    or exists (
      select 1 from public.hub_group_members m
      where m.group_id = hub_group_messages.group_id
        and m.user_id = auth.uid()
    )
    or public.is_staff()
  );

-- INSERT: only your own messages, and only into a group you belong to.
drop policy if exists "hub_group_messages_insert" on public.hub_group_messages;
create policy "hub_group_messages_insert" on public.hub_group_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.hub_group_members m
      where m.group_id = hub_group_messages.group_id
        and m.user_id = auth.uid()
    )
  );

-- No UPDATE policy → messages are immutable once posted.

-- DELETE: author may delete their own; the group owner or staff may moderate.
drop policy if exists "hub_group_messages_delete" on public.hub_group_messages;
create policy "hub_group_messages_delete" on public.hub_group_messages for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.hub_groups g
      where g.id = hub_group_messages.group_id
        and g.created_by = auth.uid()
    )
  );

-- ---- Realtime ---------------------------------------------------------
-- Add the table to the supabase_realtime publication so postgres_changes
-- INSERT events stream to subscribed clients. Guarded so re-running the
-- migration is a no-op (and a no-op if the publication is FOR ALL TABLES).
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime' and puballtables
  ) and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'hub_group_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.hub_group_messages';
  end if;
end $$;
