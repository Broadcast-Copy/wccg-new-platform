/**
 * Active station identifier for service-role writes from background workers.
 *
 * Phase 1c: worker INSERT/UPSERT calls into STATION-SCOPED tables (dj_drops,
 * dj_ftp_log, ...) set `station_id` explicitly to this value instead of
 * relying on the temporary `DEFAULT 'station_wccg'` added in migration 087.
 * The DB default stays as a backstop; this constant centralises the value so
 * it can be made dynamic (per-tenant) later.
 */
export const STATION_ID = 'station_wccg';
