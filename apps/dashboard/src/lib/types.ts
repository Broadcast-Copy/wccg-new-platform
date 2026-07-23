/**
 * Control-plane row types — mirror the Phase-0 tables (migrations 085+).
 * Read via RLS as the logged-in member; see src/lib/data.ts.
 */

export type OrgStatus = "active" | "suspended" | "trial" | string;
export type StationStatus = "active" | "suspended" | "pending" | string;

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  created_at: string;
};

export type Station = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  call_sign: string | null;
  band: string | null;
  frequency: string | null;
  market: string | null;
  timezone: string | null;
  status: StationStatus;
  is_public: boolean;
  branding: Record<string, unknown> | null;
};

/** station_entitlements.features is a free-form flag bag, e.g. { crm: true }. */
export type Entitlement = {
  id: string;
  station_id: string;
  plan: string;
  status: string;
  features: Record<string, boolean>;
  period_end: string | null;
};

export type StationDomain = {
  id: string;
  station_id: string;
  hostname: string;
  is_primary: boolean;
  verified_at: string | null;
};

/**
 * AirSuite engine heartbeat for a station (read via the bc_station_engines RPC,
 * migration 100). `status` is the engine's own JSON — shape owned by AirSuite
 * and still evolving, so read it defensively (see src/lib/engine.ts).
 */
export type EngineStatus = {
  station_id: string;
  updated_at: string;
  engine_version: string | null;
  status: Record<string, unknown> | null;
};
