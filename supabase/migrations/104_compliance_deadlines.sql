-- =====================================================================
-- 104_compliance_deadlines
-- FCC compliance pack: internal filing-deadline tracker (license renewal,
-- quarterly issues/programs, EEO, ownership, ...). UNLIKE the public
-- inspection file, deadlines are INTERNAL ops — RLS is station-staff read+write
-- (not public) + the restrictive tenant_isolation backstop. Staff write
-- directly via the authed client (no service-role RPC needed).
--
-- `status` stores upcoming/filed/waived; "overdue" is DERIVED in the UI
-- (due_date < today AND status = 'upcoming'), so no cron is needed to flip it.
-- =====================================================================

begin;

create table if not exists public.compliance_deadlines (
  id          text primary key default ('cd_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  station_id  text not null default 'station_wccg' references public.stations(id) on delete cascade,
  title       text not null,
  category    text,
  cadence     text not null default 'annual',
  due_date    date not null,
  status      text not null default 'upcoming',
  description text,
  filed_at    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint compliance_cadence_valid check (cadence in ('quarterly','annual','biennial','one_time','other')),
  constraint compliance_status_valid  check (status in ('upcoming','filed','waived'))
);
create index if not exists idx_compliance_deadlines_station on public.compliance_deadlines (station_id, due_date);

drop trigger if exists set_updated_at_compliance_deadlines on public.compliance_deadlines;
create trigger set_updated_at_compliance_deadlines before update on public.compliance_deadlines
  for each row execute function public.update_updated_at_column();

alter table public.compliance_deadlines enable row level security;

drop policy if exists compliance_staff_all on public.compliance_deadlines;
create policy compliance_staff_all on public.compliance_deadlines
  for all using (public.is_station_staff(station_id)) with check (public.is_station_staff(station_id));

drop policy if exists compliance_service on public.compliance_deadlines;
create policy compliance_service on public.compliance_deadlines
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists tenant_isolation on public.compliance_deadlines;
create policy tenant_isolation on public.compliance_deadlines as restrictive for all to public
  using (public.can_access_station(station_id))
  with check (public.can_access_station(station_id));

-- Seed WCCG. Quarterly Issues/Programs dates are rule-fixed (Jan/Apr/Jul/Oct 10)
-- and accurate; the EEO / ownership / renewal dates are best-effort TEMPLATES —
-- descriptions tell staff to confirm their station's exact date.
insert into public.compliance_deadlines (station_id, title, category, cadence, due_date, description) values
  ('station_wccg','Quarterly Issues & Programs — 2026 Q3','issues_programs','quarterly','2026-10-10','Place the Q3 (Jul-Sep) issues/programs list in the public file by Oct 10.'),
  ('station_wccg','Quarterly Issues & Programs — 2026 Q4','issues_programs','quarterly','2027-01-10','Place the Q4 (Oct-Dec) issues/programs list in the public file by Jan 10.'),
  ('station_wccg','Quarterly Issues & Programs — 2027 Q1','issues_programs','quarterly','2027-04-10','Place the Q1 (Jan-Mar) issues/programs list in the public file by Apr 10.'),
  ('station_wccg','Annual EEO Public File Report','eeo','annual','2026-12-01','Post the annual EEO public file report. Confirm your station''s exact anniversary date.'),
  ('station_wccg','Biennial Ownership Report','ownership','biennial','2027-01-31','File the biennial ownership report (odd-year cycle). Confirm the current FCC filing window.'),
  ('station_wccg','License Renewal','license_renewal','one_time','2027-12-01','FM license renewal for the NC cycle. Confirm your station''s exact renewal deadline with the FCC.')
on conflict do nothing;

commit;
