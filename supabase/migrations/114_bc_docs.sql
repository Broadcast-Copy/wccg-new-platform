-- =====================================================================
-- 114_bc_docs
-- Members-only Broadcast Copy documentation (owner 2026-09-27: "make sure
-- there is a documentation page only for logged in users").
--
-- Why a table and not pages: broadcastcopy.ai and platform.broadcastcopy.ai are
-- both STATIC exports. A client-side login check on a static page only hides
-- text -- anyone can fetch the HTML and the JS. So the detailed guides are in
-- no static bundle at all: platform.broadcastcopy.ai/docs reads them from this
-- table after sign-in, and row-level security is what keeps them private.
--
-- Who may read: ANY signed-in account (decided 2026-09-27, Jev 0.57), and only
-- published rows. Anonymous has no policy and no table privilege -- not even a
-- count. Tightening to organization members later is one policy change, e.g.
--   using (is_published and cardinality(public.user_org_ids()) > 0)
--
-- PLATFORM-GLOBAL product content, like bc_changelog (096) and bc_features
-- (097): no station_id, deliberately no tenant_isolation policy. Writes are
-- platform-admin / service-role only, the bc_changelog pattern, except that
-- the admin policy is scoped `to authenticated` so anon has no policy here at
-- all (Jev 0.98). Control-plane table: listed in supabase/TENANCY.md and
-- dropped from new station databases by station/..._strip_control_plane.sql.
--
-- The CONTENT is not in this file (it holds no guide text) and not in this
-- public repository: see supabase/seeds/README.md.
--
-- `video` is an optional public clip for a guide: a bare file name (no path,
-- no scheme), resolved by the dashboard against a public media base
-- (NEXT_PUBLIC_DOCS_MEDIA_BASE, default the `marketing` storage bucket's
-- clips/docs/ folder). The check below keeps it a file name, so a row can
-- never point the reader at an arbitrary URL.
-- =====================================================================

begin;

create table if not exists public.bc_docs (
  id           text primary key default ('doc_' || gen_random_uuid()::text),
  slug         text not null unique,
  section      text not null,
  title        text not null,
  summary      text not null default '',
  body_md      text not null,
  video        text,
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- /docs?d=<slug>: lower-case words joined by single hyphens, nothing else.
  constraint bc_docs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  constraint bc_docs_section_present check (length(btrim(section)) > 0),
  constraint bc_docs_title_present check (length(btrim(title)) > 0),
  constraint bc_docs_video_filename check (
    video is null or video ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(mp4|webm)$'
  )
);

create index if not exists idx_bc_docs_sort on public.bc_docs (sort_order);

drop trigger if exists set_updated_at_bc_docs on public.bc_docs;
create trigger set_updated_at_bc_docs before update on public.bc_docs
  for each row execute function public.update_updated_at_column();

alter table public.bc_docs enable row level security;

-- Defence in depth: RLS already denies anon (it has no policy below), and
-- this takes away the table privilege too, so an anon request is refused
-- before RLS is even consulted. Signed-in accounts may only read; writes go
-- through the admin / service policies.
revoke all on table public.bc_docs from anon;
revoke all on table public.bc_docs from authenticated;
grant select on table public.bc_docs to authenticated;
grant insert, update, delete on table public.bc_docs to authenticated;
grant all on table public.bc_docs to service_role;

-- Members: any signed-in account reads PUBLISHED guides. No anon policy.
drop policy if exists bc_docs_member_read on public.bc_docs;
create policy bc_docs_member_read on public.bc_docs
  for select to authenticated
  using (is_published = true);

-- Platform admins write (and can read drafts). Signed-in only.
drop policy if exists bc_docs_admin_write on public.bc_docs;
create policy bc_docs_admin_write on public.bc_docs
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- The service role (seeding, tooling), as on every bc_* table.
drop policy if exists bc_docs_service on public.bc_docs;
create policy bc_docs_service on public.bc_docs
  for all to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
