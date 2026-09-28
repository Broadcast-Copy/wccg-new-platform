"use client";

import { useId, useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { AUDIT_PAGE, listAudit, type AuditEntry } from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { cx } from "@/lib/format";
import {
  BTN_SECONDARY,
  Chip,
  EmptyState,
  ErrorBox,
  FIELD,
  LABEL,
  Notice,
  Refreshing,
  SectionHeader,
  Spinner,
  fmtDateTime,
} from "@/components/admin/ui";

/**
 * The append-only trail of admin writes (bc_admin_audit, migration 115).
 * Readable by platform admins; nobody -- not an admin, not the service role --
 * can change or delete an entry.
 */

const ACTION_FILTERS = [
  { value: "", label: "Everything" },
  { value: "license.", label: "Licence keys" },
  { value: "role.", label: "Roles" },
  { value: "org.", label: "Organizations" },
  { value: "station.", label: "Stations" },
  { value: "row.", label: "Content & waitlist rows" },
] as const;

const TARGETS = [
  "",
  "bc_license_keys",
  "bc_license_activations",
  "user",
  "organizations",
  "stations",
  "bc_releases",
  "bc_docs",
  "bc_changelog",
  "bc_features",
  "bc_leads",
  "station_entitlements",
] as const;

/** The top-level fields that differ between before and after. */
function changedFields(entry: AuditEntry): string[] {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const key of keys) {
    if (key === "updated_at") continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out.push(key);
  }
  return out.sort();
}

function short(value: unknown): string {
  if (value === undefined) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

function Entry({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const fields = entry.before && entry.after ? changedFields(entry) : [];
  const detailsId = useId();

  return (
    <li className="rounded-xl border border-line bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <Chip tone={entry.action.includes("revoke") ? "danger" : "muted"}>{entry.action}</Chip>
            <span className="font-mono text-xs break-all text-dim">
              {entry.target_type}
              {entry.target_id ? ` · ${entry.target_id}` : ""}
            </span>
          </p>
          <p className="mt-1 text-dim">
            {entry.actor_email ?? (entry.actor_role === "service_role" ? "service role (tooling)" : entry.actor_role)}
            {" · "}
            {fmtDateTime(entry.at)}
          </p>
          {entry.note && <p className="mt-1 break-words text-fg">“{entry.note}”</p>}
          {fields.length > 0 && <p className="mt-1 break-words text-faint">Changed: {fields.join(", ")}</p>}
        </div>
        {(entry.before || entry.after) && (
          <button
            type="button"
            className={cx(BTN_SECONDARY, "px-2.5 py-1 text-xs")}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Before / after"}
          </button>
        )}
      </div>
      {open && (
        <div id={detailsId} className="mt-3 space-y-2">
          {fields.length > 0 ? (
            <table className="w-full table-fixed text-left text-xs">
              <thead className="text-faint">
                <tr>
                  <th scope="col" className="w-1/4 py-1 pr-2 font-medium">Field</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Before</th>
                  <th scope="col" className="py-1 font-medium">After</th>
                </tr>
              </thead>
              <tbody className="align-top font-mono">
                {fields.map((f) => (
                  <tr key={f} className="border-t border-line">
                    <td className="py-1 pr-2 break-all text-dim">{f}</td>
                    <td className="py-1 pr-2 break-all">{short(entry.before?.[f])}</td>
                    <td className="py-1 break-all">{short(entry.after?.[f])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-ink p-3 text-xs break-all whitespace-pre-wrap">
              {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

export function AuditSection() {
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");
  const [page, setPage] = useState(0);
  const id = useId();
  const { state, reload } = useLoad(() => listAudit(page, { action, target }), `${action}|${target}|${page}`);

  const total = state.status === "ready" ? state.value.total : 0;
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE));

  return (
    <section className="space-y-5" aria-labelledby="audit-heading">
      <SectionHeader
        id="audit-heading"
        icon={ScrollText}
        title="Audit log"
        description="Every admin write: who, when, what, and the record before and after."
        actions={
          <>
            <Refreshing on={state.status === "ready" && state.refreshing} />
            <button type="button" className={BTN_SECONDARY} onClick={reload}>
              Refresh
            </button>
          </>
        }
      />
      <Notice>Append-only: entries cannot be edited or deleted by anyone, including this page.</Notice>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] space-y-1.5">
          <label className={LABEL} htmlFor={`${id}-action`}>
            Action
          </label>
          <select
            id={`${id}-action`}
            className={FIELD}
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] space-y-1.5">
          <label className={LABEL} htmlFor={`${id}-target`}>
            Target
          </label>
          <select
            id={`${id}-target`}
            className={FIELD}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setPage(0);
            }}
          >
            {TARGETS.map((t) => (
              <option key={t} value={t}>
                {t === "" ? "Any" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.status === "loading" && <Spinner label="Loading the audit log" />}
      {state.status === "error" && <ErrorBox title="Could not load the audit log." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (state.value.rows.length === 0 ? (
          <EmptyState>No entries{action || target ? " match these filters" : " yet"}.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-dim" role="status">
              {total} entr{total === 1 ? "y" : "ies"}
              {pages > 1 ? ` · page ${page + 1} of ${pages}` : ""}
            </p>
            <ul className="space-y-2" aria-label="Audit entries">
              {state.value.rows.map((e) => (
                <Entry key={e.id} entry={e} />
              ))}
            </ul>
            {pages > 1 && (
              <nav className="flex items-center gap-2" aria-label="Pages">
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Newer
                </button>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Older
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </nav>
            )}
          </>
        ))}
    </section>
  );
}
