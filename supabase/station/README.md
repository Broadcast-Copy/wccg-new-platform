# station/ — migrations for EACH station-content database

Applied to every station project, N times. See ../TENANCY.md for the manifest.

Rules:
- A migration here NEVER touches a control-plane table.
- It must be station-agnostic: no 'station_wccg', no WCCG seed data, no
  hardcoded people. Seeding is the provisioning script's job, per station.
- `baseline.sql` is GENERATED (`supabase db dump`), never hand-edited, and is
  what a NEW station starts from. Regenerate it whenever a migration lands here.
