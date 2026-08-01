/**
 * Active station identifier for service-role writes from background workers.
 *
 * Phase 1c: worker INSERT/UPSERT calls into STATION-SCOPED tables (dj_drops,
 * dj_ftp_log, ...) set `station_id` explicitly to this value instead of
 * relying on the temporary `DEFAULT 'station_wccg'` added in migration 087.
 * The DB default stays as a backstop.
 *
 * Now per-deployment. Broadcast Copy's tenancy model is SHARED CONTROL PLANE,
 * ISOLATED DATA (decided 2026-08-01): the bc_* fleet/release/billing tables are
 * shared, but each station's content lives in its OWN database. One codebase
 * therefore runs against N databases, and the station id is a property of the
 * deployment, not of the source. Hardcoding it is the thing that breaks the
 * second station.
 *
 * The literal stays as the fallback so WCCG keeps working with no env wired.
 */
export const STATION_ID = process.env.STATION_ID ?? 'station_wccg';
