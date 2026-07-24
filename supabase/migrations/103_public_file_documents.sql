-- =====================================================================
-- 103_public_file_documents
-- FCC compliance pack (v1): the station's Public Inspection File as structured,
-- categorized, per-station DB records — instead of a static "go to the FCC
-- site" stub. Station-scoped (station_id), so it's multi-tenant from day one.
--
-- RLS: PUBLIC read of published rows (the public inspection file is, by law,
-- public) + the standard restrictive tenant_isolation backstop (so private/
-- suspended stations aren't exposed) + station-staff / service write.
-- =====================================================================

begin;

create table if not exists public.public_file_documents (
  id             text primary key default ('pf_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  station_id     text not null default 'station_wccg' references public.stations(id) on delete cascade,
  category       text not null,
  title          text not null,
  description    text,
  url            text,
  period_label   text,
  effective_date date,
  sort_order     integer not null default 0,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint public_file_category_valid check (category in (
    'authorizations','applications','contour_maps','ownership',
    'political','eeo','issues_programs','public_and_broadcasting'
  ))
);
create index if not exists idx_public_file_station on public.public_file_documents (station_id, category, sort_order);

drop trigger if exists set_updated_at_public_file on public.public_file_documents;
create trigger set_updated_at_public_file before update on public.public_file_documents
  for each row execute function public.update_updated_at_column();

alter table public.public_file_documents enable row level security;

drop policy if exists public_file_read on public.public_file_documents;
create policy public_file_read on public.public_file_documents
  for select using (is_published = true);

drop policy if exists public_file_staff_write on public.public_file_documents;
create policy public_file_staff_write on public.public_file_documents
  for all using (public.is_station_staff(station_id)) with check (public.is_station_staff(station_id));

drop policy if exists public_file_service on public.public_file_documents;
create policy public_file_service on public.public_file_documents
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists tenant_isolation on public.public_file_documents;
create policy tenant_isolation on public.public_file_documents as restrictive for all to public
  using (public.can_access_station(station_id))
  with check (public.can_access_station(station_id));

-- Seed WCCG's public-file structure. Entries point at the authoritative FCC
-- online file today; real hosted docs can replace the URLs later.
insert into public.public_file_documents (station_id, category, title, description, url, period_label, sort_order) values
  ('station_wccg','authorizations','FCC License — WCCG(FM)','Current broadcast license authorization for WCCG 104.5 FM.','https://publicfiles.fcc.gov/fm-profile/wccg','Current',10),
  ('station_wccg','applications','License Renewal & Applications','Applications filed with the FCC and related materials.','https://publicfiles.fcc.gov/fm-profile/wccg','Current',20),
  ('station_wccg','contour_maps','Coverage Contour Map','Predicted coverage contour for WCCG 104.5 FM.','https://publicfiles.fcc.gov/fm-profile/wccg','Current',30),
  ('station_wccg','ownership','Biennial Ownership Report','Ownership report filed with the FCC.','https://publicfiles.fcc.gov/fm-profile/wccg','2025',40),
  ('station_wccg','political','Political File','Records of requests for political advertising time (47 CFR 73.1943).','https://publicfiles.fcc.gov/fm-profile/wccg','Current',50),
  ('station_wccg','eeo','Annual EEO Public File Report','Equal Employment Opportunity public file report.','https://publicfiles.fcc.gov/fm-profile/wccg','2025-2026',60),
  ('station_wccg','issues_programs','Quarterly Issues & Programs — 2026 Q2','Programming addressing community issues, Apr-Jun 2026.','https://publicfiles.fcc.gov/fm-profile/wccg','2026 Q2',70),
  ('station_wccg','issues_programs','Quarterly Issues & Programs — 2026 Q1','Programming addressing community issues, Jan-Mar 2026.','https://publicfiles.fcc.gov/fm-profile/wccg','2026 Q1',71),
  ('station_wccg','public_and_broadcasting','The Public and Broadcasting','The FCC manual describing a broadcaster obligations to the public.','https://www.fcc.gov/media/radio/public-and-broadcasting','Reference',80)
on conflict do nothing;

commit;
