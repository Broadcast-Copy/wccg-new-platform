"use client";

import { useId, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  RadioTower,
  Save,
  Search,
  Users,
} from "lucide-react";
import {
  ORG_STATUSES,
  STATION_STATUSES,
  getOrgDetail,
  listOrgs,
  renameOrg,
  renameStation,
  setOrgStatus,
  setStationStatus,
  type AdminOrg,
  type AdminStation,
  type OrgDetail,
  type Result,
} from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { activeFeatures, bandFrequency, cx, prettyFeature } from "@/lib/format";
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
 * Organizations and their stations. Renames reuse the existing RPCs
 * (bc_update_org / bc_update_station, now audited); status changes go through
 * bc_admin_set_*_status, which refuse to take a station that reported on air
 * in the last 7 days -- or its organization -- out of 'active'.
 */

type SaveState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string } | { status: "saved" };

function RenameForm({
  label,
  current,
  save,
  onSaved,
}: {
  label: string;
  current: string;
  save: (name: string) => Promise<Result<unknown>>;
  onSaved: () => void;
}) {
  const id = useId();
  const [state, setState] = useState<SaveState>({ status: "idle" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "saving") return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (name === "" || name === current) {
      setState({ status: "error", message: name === "" ? "A name is required." : "Nothing changed." });
      return;
    }
    setState({ status: "saving" });
    const result = await save(name);
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "saved" });
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <label className={LABEL} htmlFor={id}>
            {label}
          </label>
          <input id={id} name="name" defaultValue={current} maxLength={200} className={FIELD} />
        </div>
        <button type="submit" className={BTN_PRIMARY} disabled={state.status === "saving"}>
          {state.status === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </button>
      </div>
      {state.status === "error" && <InlineError message={state.message} />}
      {state.status === "saved" && <InlineOk message="Saved." />}
    </form>
  );
}

function StatusControl({
  subject,
  current,
  options,
  apply,
  onDone,
  warning,
}: {
  subject: string;
  current: string;
  options: readonly string[];
  apply: (status: string) => Promise<Result<unknown>>;
  onDone: () => void;
  warning: string;
}) {
  const id = useId();
  const [target, setTarget] = useState(current);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <label className={LABEL} htmlFor={id}>
          Status
        </label>
        <select id={id} className={cx(FIELD, "w-auto")} value={target} onChange={(e) => setTarget(e.target.value)}>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <ConfirmAction
        label="Change status"
        tone={target === "active" ? "neutral" : "danger"}
        disabled={target === current}
        disabledReason="Choose a different status first."
        title={`Change ${subject} from “${current}” to “${target}”?`}
        body={<p>{warning}</p>}
        confirmLabel={`Yes, set ${target}`}
        onConfirm={() => apply(target)}
        onDone={onDone}
      />
    </div>
  );
}

function StationBlock({ station, onChanged }: { station: AdminStation; onChanged: () => void }) {
  const features = activeFeatures(station.entitlement?.features);
  const freq = bandFrequency(station.band, station.frequency);

  return (
    <li className="space-y-3 rounded-xl border border-line bg-ink p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RadioTower className="h-4 w-4 text-faint" aria-hidden />
        <span className="font-semibold">{station.call_sign ?? station.name}</span>
        <Chip tone={statusTone(station.status)}>{station.status}</Chip>
        {!station.is_public && <Chip tone="muted">not public</Chip>}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Name</dt>
          <dd className="break-words">{station.name}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Band</dt>
          <dd>{freq ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Market</dt>
          <dd className="break-words">{station.market ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Plan</dt>
          <dd>
            {station.entitlement ? `${station.entitlement.plan} (${station.entitlement.status})` : "No entitlement"}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Device key</dt>
          <dd>{station.device_key_created_at ? `Since ${fmtDate(station.device_key_created_at)}` : "None"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-faint uppercase">Engine last reported</dt>
          <dd>
            {station.engine_seen_at ? fmtDateTime(station.engine_seen_at) : "Never"}
            {station.engine_version ? ` · v${station.engine_version}` : ""}
          </dd>
        </div>
      </dl>
      {features.length > 0 && (
        <p className="text-sm text-dim">
          Features: {features.map(prettyFeature).join(", ")}
        </p>
      )}
      <RenameForm
        label="Station name"
        current={station.name}
        save={(name) => renameStation(station.id, name)}
        onSaved={onChanged}
      />
      <StatusControl
        subject={station.call_sign ?? station.name}
        current={station.status}
        options={STATION_STATUSES}
        apply={(s) => setStationStatus(station.id, s)}
        onDone={onChanged}
        warning="Only an active, public station's website content is readable by listeners. The database refuses to take a station that reported on air in the last 7 days out of active."
      />
    </li>
  );
}

function OrgDetailPanel({ org, onChanged }: { org: AdminOrg; onChanged: () => void }) {
  const { state, reload } = useLoad<OrgDetail>(() => getOrgDetail(org.id), org.id);

  function changed() {
    reload();
    onChanged();
  }

  if (state.status === "loading") return <Spinner label="Loading organization" />;
  if (state.status === "error") {
    return <ErrorBox title="Could not load this organization." message={state.message} onRetry={reload} />;
  }
  const d = state.value;

  return (
    <div className="space-y-5 border-t border-line pt-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <RenameForm label="Organization name" current={d.org.name} save={(name) => renameOrg(d.org.id, name)} onSaved={changed} />
        <StatusControl
          subject={d.org.name}
          current={d.org.status}
          options={ORG_STATUSES}
          apply={(s) => setOrgStatus(d.org.id, s)}
          onDone={changed}
          warning="The database refuses to suspend or archive an organization that owns a station which reported on air in the last 7 days."
        />
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-medium tracking-wider text-faint uppercase">
          <RadioTower className="h-4 w-4" aria-hidden />
          Stations ({d.stations.length})
        </h4>
        {d.stations.length === 0 ? (
          <p className="text-sm text-dim">No stations yet.</p>
        ) : (
          <ul className="space-y-3">
            {d.stations.map((s) => (
              <StationBlock key={s.id} station={s} onChanged={changed} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-medium tracking-wider text-faint uppercase">
          <Users className="h-4 w-4" aria-hidden />
          Members ({d.members.length}){d.pending_invites > 0 ? ` · ${d.pending_invites} pending invite${d.pending_invites === 1 ? "" : "s"}` : ""}
        </h4>
        {d.members.length === 0 ? (
          <p className="text-sm text-dim">No members.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {d.members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="min-w-0 break-words">
                  <span className="text-fg">{m.display_name ?? m.email ?? m.user_id.slice(0, 8)}</span>
                  {m.display_name && m.email && <span className="text-dim"> · {m.email}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Chip tone={m.role === "owner" ? "danger" : "muted"}>{m.role}</Chip>
                  <span className="text-xs text-faint">since {fmtDate(m.joined_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-medium tracking-wider text-faint uppercase">
          <KeyRound className="h-4 w-4" aria-hidden />
          Licence keys ({d.licenses.length})
        </h4>
        {d.licenses.length === 0 ? (
          <p className="text-sm text-dim">No keys issued.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {d.licenses.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-mono text-fg">{l.key_prefix}…</span>
                  {l.label && <span className="text-dim"> · {l.label}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Chip tone={statusTone(l.status)}>{l.status}</Chip>
                  <span className="text-xs text-faint">
                    {l.machines} machine{l.machines === 1 ? "" : "s"}
                    {l.expires_at ? ` · expires ${fmtDate(l.expires_at)}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <a href="/admin?s=keys" className="inline-block text-sm text-signal-ink underline underline-offset-2">
          Manage keys
        </a>
      </div>
    </div>
  );
}

export function OrgsSection() {
  const { state, reload } = useLoad(listOrgs);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchId = useId();

  const orgs = useMemo(() => (state.status === "ready" ? state.value : []), [state]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q === "" ? orgs : orgs.filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
  }, [orgs, search]);

  return (
    <section className="space-y-5" aria-labelledby="orgs-heading">
      <SectionHeader
        id="orgs-heading"
        icon={Building2}
        title="Organizations & stations"
        description="Every tenant on the platform, with its stations, members, plan and licence status."
        actions={<Refreshing on={state.status === "ready" && state.refreshing} />}
      />

      <Notice>
        Station status is not a label: an active, public station is what makes that station&rsquo;s website readable.
        Stations that reported on air in the last 7 days cannot be taken out of active from here.
      </Notice>

      <div className="max-w-sm space-y-1.5">
        <label className={LABEL} htmlFor={searchId}>
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-faint" aria-hidden />
          <input
            id={searchId}
            type="search"
            className={cx(FIELD, "pl-9")}
            placeholder="Name or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {state.status === "loading" && <Spinner label="Loading organizations" />}
      {state.status === "error" && <ErrorBox title="Could not load organizations." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (shown.length === 0 ? (
          <EmptyState>{orgs.length === 0 ? "No organizations yet." : "No organization matches."}</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Organizations">
            {shown.map((o) => {
              const isOpen = open === o.id;
              return (
                <li key={o.id} className="space-y-3 rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold break-words">{o.name}</span>
                        <Chip tone={statusTone(o.status)}>{o.status}</Chip>
                      </p>
                      <p className="mt-0.5 text-sm text-dim">
                        <span className="font-mono">{o.slug}</span> · {o.station_count} station
                        {o.station_count === 1 ? "" : "s"} · {o.member_count} member{o.member_count === 1 ? "" : "s"} ·{" "}
                        {o.active_licenses} active key{o.active_licenses === 1 ? "" : "s"} · since {fmtDate(o.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : o.id)}
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                      {isOpen ? "Close" : "Manage"}
                    </button>
                  </div>
                  {isOpen && <OrgDetailPanel org={o} onChanged={reload} />}
                </li>
              );
            })}
          </ul>
        ))}
    </section>
  );
}
