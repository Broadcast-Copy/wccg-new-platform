/**
 * Active station identifier for service-role writes.
 *
 * Phase 1c: every server-side INSERT/UPSERT into a STATION-SCOPED table sets
 * `station_id` explicitly to this value instead of relying on the temporary
 * `DEFAULT 'station_wccg'` added in migration 087. The DB default stays in
 * place as a backstop; this constant makes the tenancy intent explicit at the
 * write site and gives us a single place to make station resolution dynamic
 * (per-request / per-tenant) in a later phase.
 */
export const STATION_ID = 'station_wccg';
