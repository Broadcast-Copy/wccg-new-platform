import { supabase } from "@/lib/supabase";
import type {
  EngineStatus,
  Entitlement,
  Organization,
  Station,
  StationDomain,
} from "@/lib/types";

/**
 * Control-plane fetchers. Every read runs as the logged-in user, so RLS scopes
 * the result to the caller's own org/stations (migrations 085/090) — no
 * explicit filter needed here. On error we log and return an empty list so the
 * UI shows an empty state rather than throwing.
 */

async function readList<TRow>(
  table: string,
  columns: string,
  order?: { column: string; ascending?: boolean },
): Promise<TRow[]> {
  let query = supabase.from(table).select(columns);
  if (order) query = query.order(order.column, { ascending: order.ascending ?? true });
  const { data, error } = await query;
  if (error) {
    console.error(`[control-plane] failed to read ${table}:`, error.message);
    return [];
  }
  return (data ?? []) as TRow[];
}

export function getMyOrganizations(): Promise<Organization[]> {
  return readList<Organization>(
    "organizations",
    "id, name, slug, status, created_at",
    { column: "name" },
  );
}

export function getMyStations(): Promise<Station[]> {
  return readList<Station>(
    "stations",
    "id, org_id, name, slug, call_sign, band, frequency, market, timezone, status, is_public, branding",
    { column: "call_sign" },
  );
}

export function getMyEntitlements(): Promise<Entitlement[]> {
  return readList<Entitlement>(
    "station_entitlements",
    "id, station_id, plan, status, features, period_end",
  );
}

export function getStationDomains(): Promise<StationDomain[]> {
  return readList<StationDomain>(
    "station_domains",
    "id, station_id, hostname, is_primary, verified_at",
  );
}

/**
 * AirSuite engine status per station, via the member-authorized RPC (mig 100).
 * airsuite_station_status is platform-admin-read-only directly, so this goes
 * through bc_station_engines(), which scopes to the caller's org stations.
 */
export async function getStationEngines(): Promise<EngineStatus[]> {
  const { data, error } = await supabase.rpc("bc_station_engines");
  if (error) {
    console.error("[control-plane] failed to read engines:", error.message);
    return [];
  }
  return (data ?? []) as EngineStatus[];
}
