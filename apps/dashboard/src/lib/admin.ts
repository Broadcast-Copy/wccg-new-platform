import { supabase } from "@/lib/supabase";

/**
 * The super-admin back office (/admin). Every call here is enforced in the
 * database, not by the page guard:
 *   - bc_admin_* RPCs are SECURITY DEFINER and raise 42501 unless the caller
 *     is_platform_admin() (migrations 116-118);
 *   - content tables (bc_releases, bc_docs, bc_changelog, bc_features,
 *     bc_leads) are written through their existing platform-admin RLS
 *     policies, and every write is recorded by the 115 audit trigger;
 *   - bc_admin_audit is readable by platform admins only and cannot be
 *     changed by anyone.
 * A signed-in account that is not a platform admin gets an error or nothing.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

type PgError = { code?: string; message: string; hint?: string | null } | null;

function fail(error: NonNullable<PgError>): { ok: false; message: string } {
  if (error.code === "42501" && /platform admin only|permission denied/i.test(error.message)) {
    return { ok: false, message: "Your account is not a platform admin." };
  }
  if (!error.hint) return { ok: false, message: error.message };
  const sep = /[.!?]$/.test(error.message.trim()) ? " " : ". ";
  return { ok: false, message: `${error.message.trim()}${sep}${error.hint}` };
}

async function rpc<T>(name: string, params?: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await supabase.rpc(name, params);
  if (error) return fail(error);
  return { ok: true, value: data as T };
}

/* ------------------------------------------------------------------ gate -- */

/** UX only: the database checks the same thing on every call. */
export async function amIPlatformAdmin(): Promise<Result<boolean>> {
  return rpc<boolean>("is_platform_admin");
}

/* --------------------------------------------------------- licence keys -- */

export type LicenseStatus = "active" | "revoked" | "expired";

export type License = {
  id: string;
  org_id: string;
  org_name: string;
  station_id: string | null;
  station_name: string | null;
  station_call_sign: string | null;
  key_prefix: string;
  label: string | null;
  notes: string | null;
  packages: string[] | null;
  max_activations: number | null;
  expires_at: string | null;
  status: LicenseStatus;
  created_at: string;
  issued_by_email: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  replaces_id: string | null;
  replaced_by_id: string | null;
  machines: number;
  last_validated_at: string | null;
};

export type Activation = {
  id: string;
  fingerprint: string;
  hostname: string | null;
  package: string;
  version: string | null;
  first_seen: string;
  last_seen: string;
  check_count: number;
  released_at: string | null;
};

/** The full key: returned by issue/rotate only, never readable again. */
export type IssuedKey = { id: string; key: string; key_prefix: string; replaces_id?: string };

export type IssueInput = {
  orgId: string | null;
  stationId: string | null;
  packages: string[] | null;
  maxActivations: number | null;
  expiresAt: string | null;
  label: string | null;
  notes: string | null;
};

export function listLicenses(): Promise<Result<License[]>> {
  return rpc<License[]>("bc_admin_licenses");
}

export function listActivations(licenseId: string): Promise<Result<Activation[]>> {
  return rpc<Activation[]>("bc_admin_license_activations", { p_license_id: licenseId });
}

export function issueLicense(input: IssueInput): Promise<Result<IssuedKey>> {
  return rpc<IssuedKey>("bc_admin_license_issue", {
    p_org_id: input.orgId,
    p_station_id: input.stationId,
    p_packages: input.packages,
    p_max_activations: input.maxActivations,
    p_expires_at: input.expiresAt,
    p_label: input.label,
    p_notes: input.notes,
  });
}

/** Only the keys present are changed; null means "no limit / every package / never". */
export type LicensePatch = Partial<{
  label: string | null;
  notes: string | null;
  packages: string[] | null;
  max_activations: number | null;
  expires_at: string | null;
}>;

export function updateLicense(id: string, patch: LicensePatch): Promise<Result<unknown>> {
  return rpc("bc_admin_license_update", { p_id: id, p_patch: patch });
}

export function revokeLicense(id: string, reason: string): Promise<Result<unknown>> {
  return rpc("bc_admin_license_revoke", { p_id: id, p_reason: reason });
}

export function rotateLicense(id: string, reason: string | null): Promise<Result<IssuedKey>> {
  return rpc<IssuedKey>("bc_admin_license_rotate", { p_id: id, p_reason: reason });
}

export function releaseActivation(activationId: string): Promise<Result<unknown>> {
  return rpc("bc_admin_license_release_activation", { p_activation_id: activationId });
}

/* ------------------------------------------------- organizations/stations -- */

export type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  station_count: number;
  member_count: number;
  active_licenses: number;
};

export type AdminStation = {
  id: string;
  name: string;
  slug: string;
  call_sign: string | null;
  band: string | null;
  frequency: string | null;
  market: string | null;
  timezone: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  entitlement: {
    plan: string;
    status: string;
    features: Record<string, boolean>;
    period_end: string | null;
  } | null;
  device_key_created_at: string | null;
  engine_seen_at: string | null;
  engine_version: string | null;
};

export type AdminMember = {
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  display_name: string | null;
};

export type OrgDetail = {
  org: { id: string; name: string; slug: string; status: string; created_at: string };
  stations: AdminStation[];
  members: AdminMember[];
  licenses: {
    id: string;
    key_prefix: string;
    label: string | null;
    station_id: string | null;
    status: LicenseStatus;
    expires_at: string | null;
    created_at: string;
    machines: number;
  }[];
  pending_invites: number;
};

export const ORG_STATUSES = ["active", "suspended", "archived"] as const;
export const STATION_STATUSES = ["active", "inactive", "maintenance", "suspended", "pending"] as const;

export function listOrgs(): Promise<Result<AdminOrg[]>> {
  return rpc<AdminOrg[]>("bc_admin_orgs");
}

export function getOrgDetail(orgId: string): Promise<Result<OrgDetail>> {
  return rpc<OrgDetail>("bc_admin_org_detail", { p_org_id: orgId });
}

/** The existing owner/admin rename RPC (migration 101), now audited (118). */
export function renameOrg(orgId: string, name: string): Promise<Result<unknown>> {
  return rpc("bc_update_org", { p_org_id: orgId, p_name: name });
}

/** The existing station edit RPC (migration 098), now audited (118). Name only here. */
export function renameStation(stationId: string, name: string): Promise<Result<unknown>> {
  return rpc("bc_update_station", {
    p_station_id: stationId,
    p_name: name,
    p_market: null,
    p_timezone: null,
  });
}

export function setOrgStatus(orgId: string, status: string): Promise<Result<unknown>> {
  return rpc("bc_admin_set_org_status", { p_org_id: orgId, p_status: status });
}

export function setStationStatus(stationId: string, status: string): Promise<Result<unknown>> {
  return rpc("bc_admin_set_station_status", { p_station_id: stationId, p_status: status });
}

/* --------------------------------------------------------- device keys -- */

export type StationKeyRow = {
  station_id: string;
  station_name: string;
  call_sign: string | null;
  org_id: string;
  org_name: string;
  station_status: string;
  has_key: boolean;
  key_created_at: string | null;
  engine_seen_at: string | null;
  engine_version: string | null;
};

/** Presence and dates only: the key value is never selected by the RPC. */
export function listStationKeys(): Promise<Result<StationKeyRow[]>> {
  return rpc<StationKeyRow[]>("bc_admin_station_keys");
}

/* ------------------------------------------------------- users & roles -- */

export type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  user_type: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_super_admin: boolean;
  org_count: number;
  total_count: number;
};

export const USERS_PAGE = 50;

export function listUsers(
  search: string,
  adminsOnly: boolean,
  offset: number,
): Promise<Result<AdminUser[]>> {
  return rpc<AdminUser[]>("bc_admin_users", {
    p_search: search.trim() === "" ? null : search.trim(),
    p_admins_only: adminsOnly,
    p_limit: USERS_PAGE,
    p_offset: offset,
  });
}

export function grantSuperAdmin(userId: string): Promise<Result<unknown>> {
  return rpc("bc_admin_grant_super_admin", { p_user_id: userId });
}

export function revokeSuperAdmin(userId: string): Promise<Result<unknown>> {
  return rpc("bc_admin_revoke_super_admin", { p_user_id: userId });
}

/* ------------------------------------------------------------ waitlist -- */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  email: string;
  organization: string | null;
  call_sign: string | null;
  band: string | null;
  station_count: number | null;
  market: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
};

const LEAD_COLUMNS =
  "id, created_at, updated_at, name, email, organization, call_sign, band, station_count, market, message, source, status, notes";

export async function listLeads(): Promise<Result<Lead[]>> {
  const { data, error } = await supabase
    .from("bc_leads")
    .select(LEAD_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return { ok: true, value: (data ?? []) as Lead[] };
}

export function saveLead(
  id: string,
  patch: { status: LeadStatus; notes: string | null },
): Promise<Result<null>> {
  return updateOne("bc_leads", id, patch);
}

/* ------------------------------------------------------------ releases -- */

export type AdminRelease = {
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
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listReleasesAdmin(): Promise<Result<AdminRelease[]>> {
  const { data, error } = await supabase
    .from("bc_releases")
    .select(
      "id, package, version, channel, title, notes, url, sha256, size_bytes, min_os, is_published, published_at, created_at, updated_at",
    )
    .order("package", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return { ok: true, value: (data ?? []) as AdminRelease[] };
}

/** One row, or an error that says nothing matched (RLS hides it, or it is gone). */
async function updateOne(table: string, id: string, patch: Record<string, unknown>): Promise<Result<null>> {
  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data || data.length !== 1) return { ok: false, message: "Nothing was saved: the row was not found or not writable." };
  return { ok: true, value: null };
}

export function saveRelease(id: string, patch: { title: string | null; notes: string | null }): Promise<Result<null>> {
  return updateOne("bc_releases", id, patch);
}

export function setReleasePublished(id: string, published: boolean): Promise<Result<null>> {
  return updateOne("bc_releases", id, {
    is_published: published,
    ...(published ? { published_at: new Date().toISOString() } : {}),
  });
}

/* ------------------------------------------------ docs, changelog, features -- */

export type AdminDoc = {
  id: string;
  slug: string;
  section: string;
  title: string;
  summary: string;
  body_md: string;
  video: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

export type AdminChangelog = {
  id: string;
  version: string;
  released_on: string;
  channel: string;
  title: string | null;
  changes: string[];
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

export type AdminFeature = {
  id: string;
  name: string;
  blurb: string;
  icon: string;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

async function readAll<T>(table: string, columns: string, order: string, ascending: boolean): Promise<Result<T[]>> {
  const { data, error } = await supabase.from(table).select(columns).order(order, { ascending });
  if (error) return fail(error);
  return { ok: true, value: (data ?? []) as T[] };
}

export function listDocsAdmin(): Promise<Result<AdminDoc[]>> {
  return readAll<AdminDoc>(
    "bc_docs",
    "id, slug, section, title, summary, body_md, video, sort_order, is_published, updated_at",
    "sort_order",
    true,
  );
}

export function listChangelogAdmin(): Promise<Result<AdminChangelog[]>> {
  return readAll<AdminChangelog>(
    "bc_changelog",
    "id, version, released_on, channel, title, changes, sort_order, is_published, updated_at",
    "sort_order",
    false,
  );
}

export function listFeaturesAdmin(): Promise<Result<AdminFeature[]>> {
  return readAll<AdminFeature>(
    "bc_features",
    "id, name, blurb, icon, sort_order, is_published, updated_at",
    "sort_order",
    true,
  );
}

export function saveDoc(
  id: string,
  patch: Pick<AdminDoc, "title" | "summary" | "section" | "body_md" | "sort_order">,
): Promise<Result<null>> {
  return updateOne("bc_docs", id, patch);
}

export function saveChangelog(
  id: string,
  patch: Pick<AdminChangelog, "title" | "channel" | "released_on" | "changes" | "sort_order">,
): Promise<Result<null>> {
  return updateOne("bc_changelog", id, patch);
}

export function saveFeature(
  id: string,
  patch: Pick<AdminFeature, "name" | "blurb" | "icon" | "sort_order">,
): Promise<Result<null>> {
  return updateOne("bc_features", id, patch);
}

export function setPublished(
  table: "bc_docs" | "bc_changelog" | "bc_features",
  id: string,
  published: boolean,
): Promise<Result<null>> {
  return updateOne(table, id, { is_published: published });
}

/* --------------------------------------------------------------- audit -- */

export type AuditEntry = {
  id: number;
  at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  note: string | null;
};

export const AUDIT_PAGE = 50;

export async function listAudit(
  page: number,
  filter: { action: string; target: string },
): Promise<Result<{ rows: AuditEntry[]; total: number }>> {
  let query = supabase
    .from("bc_admin_audit")
    .select("id, at, actor_id, actor_email, actor_role, action, target_type, target_id, before, after, note", {
      count: "exact",
    })
    .order("at", { ascending: false })
    .order("id", { ascending: false })
    .range(page * AUDIT_PAGE, page * AUDIT_PAGE + AUDIT_PAGE - 1);
  if (filter.action !== "") query = query.like("action", `${filter.action}%`);
  if (filter.target !== "") query = query.eq("target_type", filter.target);
  const { data, error, count } = await query;
  if (error) return fail(error);
  return { ok: true, value: { rows: (data ?? []) as AuditEntry[], total: count ?? 0 } };
}
