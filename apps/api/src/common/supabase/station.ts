/**
 * Active station identifier for service-role writes.
 *
 * Phase 1c: every server-side INSERT/UPSERT into a STATION-SCOPED table sets
 * `station_id` explicitly to this value instead of relying on the temporary
 * `DEFAULT 'station_wccg'` added in migration 087. The DB default stays in
 * place as a backstop.
 *
 * Now per-deployment. Broadcast Copy's tenancy model is SHARED CONTROL PLANE,
 * ISOLATED DATA (decided 2026-08-01): the bc_* fleet/release/billing tables are
 * shared, but each station's content lives in its OWN database. One codebase
 * runs against N databases, so the station id belongs to the deployment, not
 * the source. Note this is per-DEPLOYMENT, not per-request — a single API
 * process serves exactly one station's database.
 *
 * The literal stays as the fallback so WCCG keeps working with no env wired.
 */
export const STATION_ID = process.env.STATION_ID ?? 'station_wccg';
