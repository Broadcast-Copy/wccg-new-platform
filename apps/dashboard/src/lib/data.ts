import { supabase } from "@/lib/supabase";
import type {
  ComplianceDeadline,
  EngineStatus,
  Entitlement,
  FleetDevice,
  Organization,
  PairCode,
  PublicFileDoc,
  Release,
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

/** FCC filing deadlines for the caller's stations (RLS: station staff; mig 104). */
export function getComplianceDeadlines(): Promise<ComplianceDeadline[]> {
  return readList<ComplianceDeadline>(
    "compliance_deadlines",
    "id, station_id, title, category, cadence, due_date, status, description, filed_at",
    { column: "due_date" },
  );
}

/**
 * Public Inspection File documents for the caller's stations. Staff see all
 * their docs (published or not) via the is_station_staff policy; mig 103.
 */
export function getStationPublicFileDocs(): Promise<PublicFileDoc[]> {
  return readList<PublicFileDoc>(
    "public_file_documents",
    "id, station_id, category, title, description, url, period_label, is_published, sort_order",
    { column: "sort_order" },
  );
}

/* ------------------------------------------------------------------ fleet -- */

/**
 * Every device in one station's plant, with agents, peripherals and installs.
 * Goes through bc_fleet (migration 105), which is SECURITY INVOKER — RLS is the
 * authority, so passing a station id you do not own returns nothing rather than
 * leaking another tenant's plant.
 */
export async function getFleet(stationId: string): Promise<FleetDevice[]> {
  const { data, error } = await supabase.rpc("bc_fleet", { p_station: stationId });
  if (error) {
    console.error("[control-plane] failed to read fleet:", error.message);
    return [];
  }
  return (data ?? []) as FleetDevice[];
}

/** Pairing codes for the caller's stations (RLS: station staff). */
export function getPairCodes(): Promise<PairCode[]> {
  return readList<PairCode>(
    "bc_pair_codes",
    "code, station_id, label, expires_at, claimed_at, claimed_hostname, revoked_at",
    { column: "expires_at", ascending: false },
  );
}

/** Issue a pairing code. Server generates it, sets expiry, and checks staffing. */
export async function issuePairCode(
  stationId: string,
  label: string | null,
  ttlMinutes = 30,
): Promise<{ code: string; expires_at: string } | null> {
  const { data, error } = await supabase.rpc("bc_issue_pair_code", {
    p_station: stationId,
    p_label: label,
    p_ttl_minutes: ttlMinutes,
  });
  if (error) {
    console.error("[control-plane] failed to issue pair code:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as { code: string; expires_at: string } | null;
}

export async function revokePairCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("bc_revoke_pair_code", { p_code: code });
  if (error) {
    console.error("[control-plane] failed to revoke pair code:", error.message);
    return false;
  }
  return data === true;
}

/** The published download catalogue. */
export function getReleases(): Promise<Release[]> {
  return readList<Release>(
    "bc_releases",
    "id, package, version, channel, title, notes, url, sha256, size_bytes, min_os",
    { column: "package" },
  );
}
