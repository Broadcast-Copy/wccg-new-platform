-- dj_mixes are now attributed by dj_id (the /djs/[slug] profile key). host_id
-- becomes optional so a mix needn't borrow an arbitrary host to satisfy a
-- NOT NULL constraint.
alter table public.dj_mixes alter column host_id drop not null;
