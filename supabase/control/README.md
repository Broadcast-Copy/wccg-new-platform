# control/ — migrations for the SHARED control-plane database

One database, all stations. Fleet, releases, tenant directory, billing.
See ../TENANCY.md for the full table manifest and why provisioning does not
replay ../migrations/.

Rules:
- A migration here NEVER touches a station-content table.
- Applied to exactly one project (the control plane), not per station.
- `../migrations/` is WCCG's frozen applied history. Do not move files into here.
