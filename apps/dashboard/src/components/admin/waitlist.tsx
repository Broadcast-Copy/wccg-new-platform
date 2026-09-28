"use client";

import { useId, useMemo, useState } from "react";
import { Download, Inbox, Loader2, Save } from "lucide-react";
import { LEAD_STATUSES, listLeads, saveLead, type Lead, type LeadStatus } from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { cx } from "@/lib/format";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  Chip,
  EmptyState,
  ErrorBox,
  FIELD,
  InlineError,
  InlineOk,
  LABEL,
  Refreshing,
  SectionHeader,
  Spinner,
  fmtDateTime,
  statusTone,
} from "@/components/admin/ui";

/**
 * The waitlist / early-access inquiries (bc_leads, migration 094). Read and
 * updated through the existing platform-admin RLS policies; every update is
 * recorded by the 115 audit trigger. CSV export happens in the browser from
 * the rows already loaded -- nothing is uploaded anywhere.
 */

const CSV_COLUMNS: (keyof Lead)[] = [
  "created_at",
  "status",
  "name",
  "email",
  "organization",
  "call_sign",
  "band",
  "station_count",
  "market",
  "source",
  "message",
  "notes",
];

/**
 * One CSV cell. Quotes everything, doubles quotes, and defuses spreadsheet
 * formula injection: a public form fills these fields, so a value starting
 * with = + - @ (or a tab / carriage return) gets a leading apostrophe.
 */
function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(leads: Lead[]) {
  const lines = [CSV_COLUMNS.join(","), ...leads.map((lead) => CSV_COLUMNS.map((c) => csvCell(lead[c])).join(","))];
  const blob = new Blob([`﻿${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `broadcast-copy-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type SaveState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string } | { status: "saved" };

function LeadCard({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const id = useId();
  const [state, setState] = useState<SaveState>({ status: "idle" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "saving") return;
    const data = new FormData(event.currentTarget);
    const status = String(data.get("status") ?? lead.status) as LeadStatus;
    const notes = String(data.get("notes") ?? "").trim() || null;
    if (status === lead.status && notes === lead.notes) {
      setState({ status: "error", message: "Nothing changed." });
      return;
    }
    setState({ status: "saving" });
    const result = await saveLead(lead.id, { status, notes });
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "saved" });
    onSaved();
  }

  const station = [lead.call_sign, lead.band, lead.market].filter((v): v is string => Boolean(v)).join(" · ");

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{lead.name ?? lead.email}</span>
            <Chip tone={statusTone(lead.status)}>{lead.status}</Chip>
            {lead.source && <Chip tone="muted">{lead.source}</Chip>}
          </p>
          <p className="mt-0.5 break-all text-dim">
            <a href={`mailto:${lead.email}`} className="underline underline-offset-2 hover:text-fg">
              {lead.email}
            </a>
          </p>
          <p className="mt-1 text-dim">
            {[lead.organization, station, lead.station_count ? `${lead.station_count} station${lead.station_count === 1 ? "" : "s"}` : null]
              .filter((v): v is string => Boolean(v))
              .join(" · ") || "No station details"}
          </p>
        </div>
        <span className="text-xs text-faint">{fmtDateTime(lead.created_at)}</span>
      </div>
      {lead.message && (
        <p className="mt-3 rounded-lg border border-line bg-ink px-3 py-2 text-sm whitespace-pre-line break-words text-dim">
          {lead.message}
        </p>
      )}
      <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor={`${id}-status`}>
              Status
            </label>
            <select id={`${id}-status`} name="status" defaultValue={lead.status} className={FIELD}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor={`${id}-notes`}>
              Notes (admins only)
            </label>
            <textarea
              id={`${id}-notes`}
              name="notes"
              rows={2}
              maxLength={4000}
              defaultValue={lead.notes ?? ""}
              className={FIELD}
            />
          </div>
        </div>
        {state.status === "error" && <InlineError message={state.message} />}
        {state.status === "saved" && <InlineOk message="Saved." />}
        <button type="submit" className={BTN_PRIMARY} disabled={state.status === "saving"}>
          {state.status === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </button>
      </form>
    </li>
  );
}

export function WaitlistSection() {
  const { state, reload } = useLoad(listLeads);
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");

  const leads = useMemo(() => (state.status === "ready" ? state.value : []), [state]);
  const shown = useMemo(() => (filter === "all" ? leads : leads.filter((l) => l.status === filter)), [leads, filter]);

  return (
    <section className="space-y-5" aria-labelledby="waitlist-heading">
      <SectionHeader
        id="waitlist-heading"
        icon={Inbox}
        title="Waitlist & inquiries"
        description="Early-access requests from broadcastcopy.ai and the dashboard's station request form."
        actions={
          <>
            <Refreshing on={state.status === "ready" && state.refreshing} />
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={shown.length === 0}
              onClick={() => downloadCsv(shown)}
            >
              <Download className="h-4 w-4" aria-hidden />
              Export CSV{filter === "all" ? "" : ` (${filter})`}
            </button>
          </>
        }
      />

      <fieldset>
        <legend className={LABEL}>Status</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(["all", ...LEAD_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
              className={cx(
                "rounded-full border px-3 py-1 text-sm capitalize transition-colors",
                filter === s ? "border-signal/50 bg-signal/10 text-fg" : "border-line text-dim hover:text-fg",
              )}
            >
              {s}
              {s !== "all" && state.status === "ready" ? ` (${leads.filter((l) => l.status === s).length})` : ""}
            </button>
          ))}
        </div>
      </fieldset>

      {state.status === "loading" && <Spinner label="Loading the waitlist" />}
      {state.status === "error" && <ErrorBox title="Could not load the waitlist." message={state.message} onRetry={reload} />}
      {state.status === "ready" &&
        (shown.length === 0 ? (
          <EmptyState>{leads.length === 0 ? "Nobody has joined the waitlist yet." : "No inquiry has this status."}</EmptyState>
        ) : (
          <ul className="space-y-3" aria-label="Inquiries">
            {shown.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onSaved={reload} />
            ))}
          </ul>
        ))}
    </section>
  );
}
