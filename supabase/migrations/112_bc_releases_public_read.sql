-- 112: published releases are public metadata.
--
-- bc_releases_read was granted to authenticated only, which nobody noticed
-- because the marketing /download page hardcodes its release info. The native
-- Suite Manager reads the registry with the publishable key (anon role) to
-- show Install/Update states, so published rows need the same public-read
-- treatment bc_changelog and bc_features already have. The artifacts
-- themselves live in a public storage bucket; this exposes nothing the
-- download page doesn't already print.

drop policy if exists bc_releases_read_public on public.bc_releases;
create policy bc_releases_read_public on public.bc_releases
  for select to anon
  using (is_published = true);
