-- =====================================================================
-- 041_hub_groups
-- Groups within the listener / creator / vendor hubs + group membership,
-- and an optional group_id on hub_posts so the feed can be group-scoped.
-- =====================================================================

create table if not exists public.hub_groups (
  id              uuid primary key default gen_random_uuid(),
  hub_type        text not null check (hub_type in ('listener','creator','vendor')),
  name            text not null,
  description     text,
  cover_image_url text,
  created_by      uuid references public.profiles(id) on delete set null,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists hub_groups_hub_idx on public.hub_groups(hub_type);

create table if not exists public.hub_group_members (
  group_id   uuid not null references public.hub_groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('member','admin')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- optional group scope for hub posts (null = main hub feed)
alter table public.hub_posts add column if not exists group_id uuid references public.hub_groups(id) on delete cascade;
create index if not exists hub_posts_group_idx on public.hub_posts(group_id);

create or replace function public.hub_groups_touch()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_hub_groups_touch on public.hub_groups;
create trigger trg_hub_groups_touch before update on public.hub_groups
  for each row execute function public.hub_groups_touch();

-- ---- RLS --------------------------------------------------------------
alter table public.hub_groups enable row level security;
alter table public.hub_group_members enable row level security;

drop policy if exists "hub_groups_read" on public.hub_groups;
create policy "hub_groups_read" on public.hub_groups for select
  using (is_public or created_by = auth.uid() or public.is_staff());

drop policy if exists "hub_groups_insert" on public.hub_groups;
create policy "hub_groups_insert" on public.hub_groups for insert to authenticated
  with check (created_by = auth.uid() or public.is_staff());

drop policy if exists "hub_groups_modify" on public.hub_groups;
create policy "hub_groups_modify" on public.hub_groups for update to authenticated
  using (created_by = auth.uid() or public.is_staff())
  with check (created_by = auth.uid() or public.is_staff());

drop policy if exists "hub_groups_delete" on public.hub_groups;
create policy "hub_groups_delete" on public.hub_groups for delete to authenticated
  using (created_by = auth.uid() or public.is_staff());

drop policy if exists "hub_group_members_read" on public.hub_group_members;
create policy "hub_group_members_read" on public.hub_group_members for select using (true);

drop policy if exists "hub_group_members_join" on public.hub_group_members;
create policy "hub_group_members_join" on public.hub_group_members for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "hub_group_members_leave" on public.hub_group_members;
create policy "hub_group_members_leave" on public.hub_group_members for delete to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.hub_groups g where g.id = group_id and g.created_by = auth.uid()
  ));
