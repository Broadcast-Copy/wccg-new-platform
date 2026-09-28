"use client";

import { useId, useMemo, useState } from "react";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Unplug,
  X,
} from "lucide-react";
import {
  issueLicense,
  listActivations,
  listLicenses,
  listOrgs,
  listReleasesAdmin,
  listStationKeys,
  releaseActivation,
  revokeLicense,
  rotateLicense,
  updateLicense,
  type AdminOrg,
  type License,
  type LicensePatch,
  type Result,
  type StationKeyRow,
} from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { cx } from "@/lib/format";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  Chip,
  ConfirmAction,
  EmptyState,
  ErrorBox,
  FIELD,
  InlineError,
  InlineOk,
  KeyReveal,
  LABEL,
  Notice,
  Refreshing,
  SectionHeader,
  Spinner,
  fmtDate,
  fmtDateTime,
  statusTone,
} from "@/components/admin/ui";

/**
 * Software licence keys. Issue, edit, revoke, re-issue, and see which
 * machines activated a key. Nothing here makes station software check a key:
 * keys are recorded and answered for, not enforced (see migration 116).
 */

type Catalog = { orgs: AdminOrg[]; stations: StationKeyRow[]; packages: string[] };

async function loadCatalog(): Promise<Result<Catalog>> {
  const [orgs, stations, releases] = await Promise.all([listOrgs(), listStationKeys(), listReleasesAdmin()]);
  if (!orgs.ok) return orgs;
  if (!stations.ok) return stations;
  const packages = releases.ok ? [...new Set(releases.value.map((r) => r.package))].sort() : [];
  return { ok: true, value: { orgs: orgs.value, stations: stations.value, packages } };
}

type Reveal = { keyText: string; prefix: string; title: string };

/** "a, b ,c" -> ["a","b","c"], or null for "every package". */
function parsePackages(raw: string): string[] | null {
  const list = raw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return list.length > 0 ? list : null;
}

/** A date input's YYYY-MM-DD as the END of that day, local time, in ISO. */
function endOfDayIso(value: string): string | null {
  if (value === "") return null;
  const d = new Date(`${value}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO -> the YYYY-MM-DD a date input shows, local time. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseLimit(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1 || n > 100000) {
    return { ok: false, message: "Machine limit must be a whole number from 1 to 100000, or empty for no limit." };
  }
  return { ok: true, value: n };
}

/* ------------------------------------------------------------ issue form -- */

type FormState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string };

function IssueForm({
  catalog,
  onIssued,
  onCancel,
}: {
  catalog: Catalog;
  onIssued: (reveal: Reveal) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [orgId, setOrgId] = useState("");
  const [stationId, setStationId] = useState("");
  const [state, setState] = useState<FormState>({ status: "idle" });

  const stations = catalog.stations.filter((s) => orgId === "" || s.org_id === orgId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "saving") return;
    const data = new FormData(event.currentTarget);
    if (orgId === "" && stationId === "") {
      setState({ status: "error", message: "Choose an organization or a station." });
      return;
    }
    const limit = parseLimit(String(data.get("limit") ?? ""));
    if (!limit.ok) {
      setState({ status: "error", message: limit.message });
      return;
    }
    setState({ status: "saving" });
    const result = await issueLicense({
      orgId: orgId === "" ? null : orgId,
      stationId: stationId === "" ? null : stationId,
      packages: parsePackages(String(data.get("packages") ?? "")),
      maxActivations: limit.value,
      expiresAt: endOfDayIso(String(data.get("expires") ?? "")),
      label: String(data.get("label") ?? "").trim() || null,
      notes: String(data.get("notes") ?? "").trim() || null,
    });
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "idle" });
    onIssued({ keyText: result.value.key, prefix: result.value.key_prefix, title: "New licence key" });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5" noValidate>
      <h3 className="font-semibold">Issue a licence key</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor={`${id}-org`}>
            Organization
          </label>
          <select
            id={`${id}-org`}
            className={FIELD}
            value={orgId}
            onChange={(event) => {
              setOrgId(event.target.value);
              setStationId("");
            }}
          >
            <option value="">Choose…</option>
            {catalog.orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor={`${id}-station`}>
            Station (optional)
          </label>
          <select
            id={`${id}-station`}
            className={FIELD}
            value={stationId}
            onChange={(event) => setStationId(event.target.value)}
          >
            <option value="">Whole organization</option>
            {stations.map((s) => (
              <option key={s.station_id} value={s.station_id}>
                {s.call_sign ? `${s.call_sign} · ${s.station_name}` : s.station_name}
                {orgId === "" ? ` (${s.org_name})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL} htmlFor={`${id}-packages`}>
            Packages
          </label>
          <input
            id={`${id}-packages`}
            name="packages"
            className={FIELD}
            list={`${id}-known`}
            placeholder="Empty = every package. e.g. airsuite-console, studio-agent"
            aria-describedby={`${id}-packages-hint`}
          />
          <datalist id={`${id}-known`}>
            {catalog.packages.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <p id={`${id}-packages-hint`} className="text-xs text-faint">
            Comma-separated package names{catalog.packages.length > 0 ? ` (published: ${catalog.packages.join(", ")})` : ""}.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor={`${id}-limit`}>
            Machine limit
          </label>
          <input
            id={`${id}-limit`}
            name="limit"
            type="number"
            min={1}
            max={100000}
            inputMode="numeric"
            className={FIELD}
            placeholder="Empty = no limit"
          />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor={`${id}-expires`}>
            Expires (end of day)
          </label>
          <input id={`${id}-expires`} name="expires" type="date" className={FIELD} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL} htmlFor={`${id}-label`}>
            Label
          </label>
          <input id={`${id}-label`} name="label" maxLength={200} className={FIELD} placeholder="e.g. Studio A console" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL} htmlFor={`${id}-notes`}>
            Notes (admins only)
          </label>
          <textarea id={`${id}-notes`} name="notes" rows={2} maxLength={4000} className={FIELD} />
        </div>
      </div>
      {state.status === "error" && <InlineError message={state.message} />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={BTN_PRIMARY} disabled={state.status === "saving"}>
          {state.status === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden />
          )}
          Issue key
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- edit form -- */

function EditForm({ license, onSaved, onCancel }: { license: License; onSaved: () => void; onCancel: () => void }) {
  const id = useId();
  const [state, setState] = useState<FormState | { status: "saved" }>({ status: "idle" });
  const revoked = license.status === "revoked";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "saving") return;
    const data = new FormData(event.currentTarget);
    const patch: LicensePatch = {};

    const label = String(data.get("label") ?? "").trim() || null;
    if (label !== license.label) patch.label = label;
    const notes = String(data.get("notes") ?? "").trim() || null;
    if (notes !== license.notes) patch.notes = notes;

    if (!revoked) {
      const packages = parsePackages(String(data.get("packages") ?? ""));
      if ((packages ?? []).join(",") !== (license.packages ?? []).join(",")) patch.packages = packages;
      const limit = parseLimit(String(data.get("limit") ?? ""));
      if (!limit.ok) {
        setState({ status: "error", message: limit.message });
        return;
      }
      if (limit.value !== license.max_activations) patch.max_activations = limit.value;
      const expires = String(data.get("expires") ?? "");
      if (expires !== toDateInput(license.expires_at)) patch.expires_at = endOfDayIso(expires);
    }

    if (Object.keys(patch).length === 0) {
      setState({ status: "error", message: "Nothing changed." });
      return;
    }
    setState({ status: "saving" });
    const result = await updateLicense(license.id, patch);
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "saved" });
    onSaved();
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 rounded-xl border border-line bg-ink p-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL} htmlFor={`${id}-label`}>
            Label
          </label>
          <input id={`${id}-label`} name="label" maxLength={200} defaultValue={license.label ?? ""} className={FIELD} />
        </div>
        {!revoked && (
          <>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={LABEL} htmlFor={`${id}-packages`}>
                Packages (empty = every package)
              </label>
              <input
                id={`${id}-packages`}
                name="packages"
                defaultValue={(license.packages ?? []).join(", ")}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-limit`}>
                Machine limit (empty = none)
              </label>
              <input
                id={`${id}-limit`}
                name="limit"
                type="number"
                min={1}
                max={100000}
                defaultValue={license.max_activations ?? ""}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor={`${id}-expires`}>
                Expires (empty = never)
              </label>
              <input
                id={`${id}-expires`}
                name="expires"
                type="date"
                defaultValue={toDateInput(license.expires_at)}
                className={FIELD}
              />
            </div>
          </>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL} htmlFor={`${id}-notes`}>
            Notes (admins only)
          </label>
          <textarea
            id={`${id}-notes`}
            name="notes"
            rows={2}
            maxLength={4000}
            defaultValue={license.notes ?? ""}
            className={FIELD}
          />
        </div>
      </div>
      {revoked && <p className="text-xs text-faint">A revoked key keeps its scope; only the label and notes can change.</p>}
      {state.status === "error" && <InlineError message={state.message} />}
      {state.status === "saved" && <InlineOk message="Saved." />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={BTN_PRIMARY} disabled={state.status === "saving"}>
          {state.status === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onCancel}>
          Close
        </button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- activations -- */

function Activations({ license, onChanged }: { license: License; onChanged: () => void }) {
  const { state, reload } = useLoad(() => listActivations(license.id), license.id);

  if (state.status === "loading") return <Spinner label="Loading activations" />;
  if (state.status === "error") {
    return <ErrorBox title="Could not load activations." message={state.message} onRetry={reload} />;
  }
  const rows = state.value;
  if (rows.length === 0) {
    return (
      <p className="w-full rounded-xl border border-dashed border-line px-4 py-4 text-sm text-dim">
        No machine has activated this key yet.
      </p>
    );
  }

  return (
    <ul className="w-full space-y-2" aria-label={`Activations of ${license.key_prefix}`}>
      {rows.map((a) => (
        <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-ink px-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
              <Monitor className="h-4 w-4 text-faint" aria-hidden />
              {a.hostname ?? "Unnamed machine"}
              {a.released_at ? <Chip tone="muted">seat released</Chip> : <Chip tone="ok">holding a seat</Chip>}
            </p>
            <p className="mt-0.5 font-mono text-xs break-all text-faint">{a.fingerprint}</p>
            <p className="mt-1 text-dim">
              {a.package}
              {a.version ? ` ${a.version}` : ""} · first {fmtDateTime(a.first_seen)} · last {fmtDateTime(a.last_seen)} ·{" "}
              {a.check_count} check{a.check_count === 1 ? "" : "s"}
            </p>
          </div>
          {!a.released_at && (
            <div className="flex flex-wrap gap-2">
              <ConfirmAction
                label="Release seat"
                icon={Unplug}
                title={`Release ${a.hostname ?? "this machine"}'s seat?`}
                body={
                  <p>
                    Frees the machine&rsquo;s seat on this key (every package on that machine). Nothing is sent to the
                    machine; if it checks in again it takes a seat again, if one is free.
                  </p>
                }
                confirmLabel="Yes, release the seat"
                onConfirm={() => releaseActivation(a.id)}
                onDone={() => {
                  reload();
                  onChanged();
                }}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------- one licence -- */

type Panel = "none" | "edit" | "activations";

function LicenseCard({
  license,
  replacedByPrefix,
  onChanged,
  onRevealed,
}: {
  license: License;
  replacedByPrefix: string | null;
  onChanged: () => void;
  onRevealed: (reveal: Reveal) => void;
}) {
  const [panel, setPanel] = useState<Panel>("none");
  const licensee = license.station_name
    ? `${license.org_name} · ${license.station_call_sign ?? license.station_name}`
    : `${license.org_name} (whole organization)`;

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? "none" : next));
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-fg">{license.key_prefix}…</span>
            <Chip tone={statusTone(license.status)}>{license.status}</Chip>
            {license.label && <span className="text-sm text-dim">{license.label}</span>}
          </p>
          <p className="mt-0.5 text-sm break-words text-dim">{licensee}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Packages</dt>
          <dd className="break-words text-fg">{license.packages ? license.packages.join(", ") : "Every package"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Machines</dt>
          <dd className="text-fg">
            {license.machines}
            {license.max_activations !== null ? ` of ${license.max_activations}` : " (no limit)"}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Expires</dt>
          <dd className="text-fg">{license.expires_at ? fmtDate(license.expires_at) : "Never"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Issued</dt>
          <dd className="break-words text-fg">
            {fmtDate(license.created_at)}
            {license.issued_by_email ? ` by ${license.issued_by_email}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Last check</dt>
          <dd className="text-fg">{fmtDateTime(license.last_validated_at)}</dd>
        </div>
        {license.status === "revoked" && (
          <div>
            <dt className="text-xs tracking-wide text-faint uppercase">Revoked</dt>
            <dd className="break-words text-fg">
              {fmtDate(license.revoked_at)}
              {license.revoke_reason ? `: ${license.revoke_reason}` : ""}
            </dd>
          </div>
        )}
      </dl>
      {replacedByPrefix && (
        <p className="mt-2 text-xs text-faint">
          Re-issued as <span className="font-mono">{replacedByPrefix}…</span>
        </p>
      )}
      {license.notes && <p className="mt-2 text-sm whitespace-pre-line text-dim">{license.notes}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_SECONDARY}
          aria-expanded={panel === "activations"}
          onClick={() => toggle("activations")}
        >
          <Monitor className="h-4 w-4" aria-hidden />
          Activations
          {panel === "activations" ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button type="button" className={BTN_SECONDARY} aria-expanded={panel === "edit"} onClick={() => toggle("edit")}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        {license.replaced_by_id === null && license.status !== "expired" && (
          <ConfirmAction
            label="Re-issue"
            icon={RefreshCw}
            tone="neutral"
            title={`Re-issue ${license.key_prefix}…?`}
            body={
              <>
                <p>A new key is issued with the same licensee and scope{license.status === "active" ? ", and this key is revoked in the same step" : ""}.</p>
                <p>Machines keep working only once the new key is entered on them. The new key is shown once.</p>
              </>
            }
            confirmLabel="Yes, re-issue"
            reason={
              license.status === "active"
                ? { label: "Reason", required: false, placeholder: "e.g. key shared by mistake" }
                : undefined
            }
            onConfirm={async (reason) => {
              const result = await rotateLicense(license.id, reason === "" ? null : reason);
              if (result.ok) {
                onRevealed({
                  keyText: result.value.key,
                  prefix: result.value.key_prefix,
                  title: `Re-issued key (replaces ${license.key_prefix}…)`,
                });
              }
              return result;
            }}
            onDone={onChanged}
          />
        )}
        {license.status !== "revoked" && (
          <ConfirmAction
            label="Revoke"
            icon={Ban}
            title={`Revoke ${license.key_prefix}…?`}
            body={
              <>
                <p>From now on this key validates as revoked. This cannot be undone; re-issue a new key instead.</p>
                <p>No station software enforces keys yet, so nothing stops running because of this.</p>
              </>
            }
            confirmLabel="Yes, revoke it"
            reason={{ label: "Reason", required: true, placeholder: "e.g. contract ended" }}
            onConfirm={(reason) => revokeLicense(license.id, reason)}
            onDone={onChanged}
          />
        )}
      </div>

      {panel === "edit" && (
        <div className="mt-3">
          <EditForm license={license} onSaved={onChanged} onCancel={() => setPanel("none")} />
        </div>
      )}
      {panel === "activations" && (
        <div className="mt-3">
          <Activations license={license} onChanged={onChanged} />
        </div>
      )}
    </li>
  );
}

/* --------------------------------------------------------------- section -- */

const STATUS_FILTERS = ["all", "active", "expired", "revoked"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function KeysSection() {
  const licenses = useLoad(listLicenses);
  const catalog = useLoad(loadCatalog);
  const [issuing, setIssuing] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [orgFilter, setOrgFilter] = useState("");
  const [search, setSearch] = useState("");
  const filterId = useId();

  const licenseState = licenses.state;
  const all = useMemo(() => (licenseState.status === "ready" ? licenseState.value : []), [licenseState]);
  const prefixById = useMemo(() => new Map(all.map((l) => [l.id, l.key_prefix])), [all]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (l) =>
        (status === "all" || l.status === status) &&
        (orgFilter === "" || l.org_id === orgFilter) &&
        (q === "" ||
          [l.key_prefix, l.label, l.org_name, l.station_name, l.station_call_sign, l.notes]
            .filter((v): v is string => typeof v === "string")
            .some((v) => v.toLowerCase().includes(q))),
    );
  }, [all, status, orgFilter, search]);

  const counts = useMemo(() => {
    const c = { active: 0, expired: 0, revoked: 0 };
    for (const l of all) c[l.status] += 1;
    return c;
  }, [all]);

  function afterReveal(next: Reveal) {
    setIssuing(false);
    setReveal(next);
    licenses.reload();
  }

  return (
    <section className="space-y-5" aria-labelledby="keys-heading">
      <SectionHeader
        id="keys-heading"
        icon={KeyRound}
        title="Software keys"
        description="Licence keys for Broadcast Copy software: issued here, shown once, stored only as a hash."
        actions={
          <>
            <Refreshing on={licenses.state.status === "ready" && licenses.state.refreshing} />
            {!issuing && (
              <button type="button" className={BTN_PRIMARY} onClick={() => setIssuing(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Issue a key
              </button>
            )}
          </>
        }
      />
      <Notice>
        Keys are <strong className="text-fg">recorded, not enforced</strong>: no station software checks one yet, so
        revoking or expiring a key cannot take anything off the air. The software can ask{" "}
        <span className="font-mono text-fg">bc_license_validate</span> later.
      </Notice>

      {reveal && (
        <KeyReveal keyText={reveal.keyText} prefix={reveal.prefix} title={reveal.title} onDismiss={() => setReveal(null)} />
      )}

      {issuing &&
        (catalog.state.status === "ready" ? (
          <IssueForm catalog={catalog.state.value} onIssued={afterReveal} onCancel={() => setIssuing(false)} />
        ) : catalog.state.status === "error" ? (
          <ErrorBox title="Could not load organizations." message={catalog.state.message} onRetry={catalog.reload} />
        ) : (
          <Spinner label="Loading organizations" />
        ))}

      <div className="flex flex-wrap items-end gap-3">
        <fieldset className="min-w-0">
          <legend className={LABEL}>Status</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cx(
                  "rounded-full border px-3 py-1 text-sm capitalize transition-colors",
                  status === s ? "border-signal/50 bg-signal/10 text-fg" : "border-line text-dim hover:text-fg",
                )}
              >
                {s}
                {s !== "all" && licenses.state.status === "ready" ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="min-w-[10rem] flex-1 space-y-1.5 sm:max-w-[14rem]">
          <label className={LABEL} htmlFor={`${filterId}-org`}>
            Organization
          </label>
          <select
            id={`${filterId}-org`}
            className={FIELD}
            value={orgFilter}
            onChange={(event) => setOrgFilter(event.target.value)}
          >
            <option value="">All</option>
            {[...new Map(all.map((l) => [l.org_id, l.org_name])).entries()].map(([oid, name]) => (
              <option key={oid} value={oid}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <label className={LABEL} htmlFor={`${filterId}-q`}>
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-faint" aria-hidden />
            <input
              id={`${filterId}-q`}
              type="search"
              className={cx(FIELD, "pl-9")}
              placeholder="Prefix, label, licensee"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        {(status !== "all" || orgFilter !== "" || search !== "") && (
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => {
              setStatus("all");
              setOrgFilter("");
              setSearch("");
            }}
          >
            <X className="h-4 w-4" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {licenses.state.status === "loading" && <Spinner label="Loading keys" />}
      {licenses.state.status === "error" && (
        <ErrorBox title="Could not load keys." message={licenses.state.message} onRetry={licenses.reload} />
      )}
      {licenses.state.status === "ready" &&
        (all.length === 0 ? (
          <EmptyState>No licence keys yet. Issue the first one above.</EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState>No key matches these filters.</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Licence keys">
            {shown.map((l) => (
              <LicenseCard
                key={l.id}
                license={l}
                replacedByPrefix={l.replaced_by_id ? (prefixById.get(l.replaced_by_id) ?? null) : null}
                onChanged={licenses.reload}
                onRevealed={setReveal}
              />
            ))}
          </ul>
        ))}
    </section>
  );
}
