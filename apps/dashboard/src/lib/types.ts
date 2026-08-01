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

export type ComplianceStatus = "upcoming" | "filed" | "waived";

/** An FCC filing deadline for a station (internal ops; migration 104). */
export type ComplianceDeadline = {
  id: string;
  station_id: string;
  title: string;
  category: string | null;
  cadence: string;
  due_date: string;
  status: ComplianceStatus;
  description: string | null;
  filed_at: string | null;
};

/** A Public Inspection File document (migration 103). */
export type PublicFileDoc = {
  id: string;
  station_id: string;
  category: string;
  title: string;
  description: string | null;
  url: string | null;
  period_label: string | null;
  is_published: boolean;
  sort_order: number;
};

/* ------------------------------------------------------------------ fleet --
 * The device layer (migration 105). These mirror the on-prem hub; the hub is
 * authoritative. A stale last_seen means "the cloud has not heard", NOT "the
 * machine is down" — the UI must never conflate the two.
 */

/** One watched process on a device, as its agent reports it. */
export type FleetAgent = {
  id: string;
  agent_id: string;
  agent_version: string | null;
  last_report: string | null;
  /** process name -> running. A false is only a fault if it was meant to run. */
  watch: Record<string, boolean>;
  commands: { id: string; label?: string; confirm?: boolean }[];
};

export type FleetPeripheral = {
  id: string;
  kind: string;
  label: string;
  detail: string | null;
  identifier: string | null;
  present: boolean;
};

export type FleetInstall = {
  id: string;
  package: string;
  version: string | null;
  channel: string | null;
  install_path: string | null;
  installed_at: string | null;
};

/** A computer in a station's plant, with everything hanging off it. */
export type FleetDevice = {
  device_id: string;
  device_key: string;
  hostname: string | null;
  display_name: string | null;
  role: string | null;
  room: string | null;
  lan_ip: string | null;
  aoip_ip: string | null;
  is_critical: boolean;
  last_seen: string | null;
  status: Record<string, unknown> | null;
  agents: FleetAgent[];
  peripherals: FleetPeripheral[];
  installs: FleetInstall[];
};

/** A pairing code — a bearer credential for joining a machine to a station. */
export type PairCode = {
  code: string;
  station_id: string;
  label: string | null;
  expires_at: string;
  claimed_at: string | null;
  claimed_hostname: string | null;
  revoked_at: string | null;
};

/** A downloadable Broadcast Copy artefact (the download manager's catalogue). */
export type Release = {
  id: string;
  package: string;
  version: string;
  channel: string;
  title: string | null;
  notes: string | null;
  url: string | null;
  sha256: string | null;
  size_bytes: number | null;
  min_os: string | null;
};
