"use client";

/**
 * EAS logbook — /my/admin/eas
 *
 * FCC-grade record of every EAS event (received, originated, or test).
 * Operators can:
 *   - Filter by direction and date range
 *   - Log a new alert manually (received from upstream, or originated locally)
 *   - Mark scheduled RWT/RMT tests as run
 *   - Export to CSV for FCC inspections
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Calendar, CheckCircle2, Download, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Alert {
  id: string;
  direction: "received" | "originated" | "test";
  same_code: string | null;
  event_label: string;
  severity: "minor" | "moderate" | "severe" | "extreme" | "test";
  originator: string | null;
  fips_codes: string[];
  issued_at: string;
  received_at: string | null;
  sent_at: string | null;
  expires_at: string | null;
  message_text: string | null;
  notes: string | null;
  source: string | null;
}

interface TestRow {
  id: string;
  kind: "RWT" | "RMT";
  scheduled_for: string;
  completed_at: string | null;
  notes: string | null;
  alert: { id: string; issued_at: string } | null;
}

const SAME_CODES = [
  { code: "RWT", label: "Required Weekly Test" },
  { code: "RMT", label: "Required Monthly Test" },
  { code: "EAN", label: "Emergency Action Notification" },
  { code: "EAT", label: "Emergency Action Termination" },
  { code: "NPT", label: "National Periodic Test" },
  { code: "TOR", label: "Tornado Warning" },
  { code: "TOA", label: "Tornado Watch" },
  { code: "SVR", label: "Severe Thunderstorm Warning" },
  { code: "FFW", label: "Flash Flood Warning" },
  { code: "FFA", label: "Flash Flood Watch" },
  { code: "WSW", label: "Winter Storm Warning" },
  { code: "BZW", label: "Blizzard Warning" },
  { code: "HUW", label: "Hurricane Warning" },
  { code: "EVI", label: "Evacuation Immediate" },
  { code: "CEM", label: "Civil Emergency Message" },
  { code: "ADR", label: "Administrative Message" },
];

export default function EasLogbookPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyTestId, setBusyTestId] = useState<string | null>(null);

  const [form, setForm] = useState({
    direction: "received" as Alert["direction"],
    sameCode: "",
    eventLabel: "",
    severity: "minor" as Alert["severity"],
    originator: "",
    fipsCodes: "",
    messageText: "",
    receivedAt: "",
    sentAt: "",
    airedForSeconds: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let alertsQuery = supabase
        .from("eas_alerts")
        .select(
          "id,direction,same_code,event_label,severity,originator,fips_codes,issued_at,received_at,sent_at,expires_at,message_text,notes,source",
        )
        .order("issued_at", { ascending: false });
      if (directionFilter) alertsQuery = alertsQuery.eq("direction", directionFilter);
      if (from) alertsQuery = alertsQuery.gte("issued_at", new Date(from).toISOString());
      if (to) alertsQuery = alertsQuery.lte("issued_at", new Date(to + "T23:59:59").toISOString());

      const [a, t] = await Promise.all([
        alertsQuery,
        supabase
          .from("eas_test_schedule")
          .select("id,kind,scheduled_for,completed_at,notes,alert:eas_alerts!eas_test_schedule_alert_id_fkey(id,issued_at)")
          .order("scheduled_for", { ascending: false }),
      ]);

      if (a.error) {
        setError(a.error.message);
        setLoading(false);
        return;
      }
      if (t.error) {
        setError(t.error.message);
        setLoading(false);
        return;
      }
      setAlerts((a.data ?? []) as Alert[]);
      setTests((t.data ?? []) as unknown as TestRow[]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [directionFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const found = SAME_CODES.find((c) => c.code === form.sameCode);
      const eventLabel = form.eventLabel || found?.label || "Custom alert";
      // eas_alerts is service-role-write under RLS (append-only FCC log). An
      // authenticated browser insert is filtered out — surface that honestly.
      const { data, error } = await supabase
        .from("eas_alerts")
        .insert({
          direction: form.direction,
          same_code: form.sameCode || null,
          event_label: eventLabel,
          severity: form.severity,
          originator: form.originator || null,
          fips_codes: form.fipsCodes ? form.fipsCodes.split(/[,\s]+/).filter(Boolean) : [],
          message_text: form.messageText || null,
          received_at: form.receivedAt ? new Date(form.receivedAt).toISOString() : null,
          sent_at: form.sentAt ? new Date(form.sentAt).toISOString() : null,
          aired_for_seconds: form.airedForSeconds ? Number(form.airedForSeconds) : null,
          notes: form.notes || null,
        })
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error(
          "Couldn't save the alert — the EAS logbook is write-protected (service role only). Log it from the studio worker.",
        );
      }
      setShowLogForm(false);
      setForm({ ...form, sameCode: "", eventLabel: "", messageText: "", notes: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const completeTest = async (testId: string) => {
    setBusyTestId(testId);
    try {
      // eas_test_schedule is service-role-write under RLS; a zero-row result
      // means the update was filtered rather than applied.
      const { data, error } = await supabase
        .from("eas_test_schedule")
        .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", testId)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error(
          "Couldn't mark the test run — the EAS test schedule is write-protected (service role only).",
        );
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyTestId(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Direction", "SAME", "Event", "Severity", "Originator", "Issued (UTC)", "Sent (UTC)", "Received (UTC)", "FIPS", "Aired (s)", "Notes"],
      ...alerts.map((a) => [
        a.direction, a.same_code ?? "", a.event_label, a.severity,
        a.originator ?? "", a.issued_at, a.sent_at ?? "", a.received_at ?? "",
        (a.fips_codes ?? []).join(" "), "", (a.notes ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wccg-eas-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingTests = useMemo(() => tests.filter((t) => !t.completed_at), [tests]);

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            EAS logbook
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            FCC-grade record of every Emergency Alert System event. Append-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/my/admin/master-control" className="text-xs text-muted-foreground hover:text-foreground">
            ← MCR
          </Link>
          <Button onClick={exportCsv} variant="outline" size="sm" className="rounded-full">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
          <Button onClick={() => setShowLogForm((v) => !v)} size="sm" className="rounded-full">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log alert
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Log alert form */}
      {showLogForm && (
        <form
          onSubmit={submitLog}
          className="space-y-3 rounded-2xl border border-border bg-card p-5"
        >
          <header className="flex items-center justify-between">
            <h3 className="font-bold">Log a new EAS event</h3>
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Direction"
              value={form.direction}
              onChange={(v) => setForm({ ...form, direction: v as Alert["direction"] })}
              options={[
                { value: "received", label: "Received (from upstream)" },
                { value: "originated", label: "Originated (we sent it)" },
                { value: "test", label: "Test (RWT/RMT)" },
              ]}
            />
            <Select
              label="Severity"
              value={form.severity}
              onChange={(v) => setForm({ ...form, severity: v as Alert["severity"] })}
              options={[
                { value: "minor", label: "Minor" },
                { value: "moderate", label: "Moderate" },
                { value: "severe", label: "Severe" },
                { value: "extreme", label: "Extreme" },
                { value: "test", label: "Test" },
              ]}
            />
            <Select
              label="SAME code"
              value={form.sameCode}
              onChange={(v) => {
                const found = SAME_CODES.find((c) => c.code === v);
                setForm({ ...form, sameCode: v, eventLabel: found?.label ?? form.eventLabel });
              }}
              options={[{ value: "", label: "— pick —" }, ...SAME_CODES.map((c) => ({ value: c.code, label: `${c.code} · ${c.label}` }))]}
            />
            <Input
              label="Event label"
              value={form.eventLabel}
              onChange={(v) => setForm({ ...form, eventLabel: v })}
              placeholder="auto-filled from SAME code"
            />
            <Input label="Originator" value={form.originator} onChange={(v) => setForm({ ...form, originator: v })} placeholder="NWS, EAS, PEP, CIV…" />
            <Input label="FIPS codes (space/comma sep.)" value={form.fipsCodes} onChange={(v) => setForm({ ...form, fipsCodes: v })} placeholder="037051 037067" />
            <Input label="Received at" type="datetime-local" value={form.receivedAt} onChange={(v) => setForm({ ...form, receivedAt: v })} />
            <Input label="Sent at (if we aired it)" type="datetime-local" value={form.sentAt} onChange={(v) => setForm({ ...form, sentAt: v })} />
            <Input label="Aired (seconds)" type="number" value={form.airedForSeconds} onChange={(v) => setForm({ ...form, airedForSeconds: v })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Message text
            </label>
            <textarea
              rows={3}
              value={form.messageText}
              onChange={(e) => setForm({ ...form, messageText: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
              placeholder="Body of the alert as broadcast"
            />
          </div>
          <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Bell className="mr-1.5 h-4 w-4" />}
              Save to logbook
            </Button>
          </div>
        </form>
      )}

      {/* Upcoming required tests */}
      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Upcoming required tests ({pendingTests.length})
        </h2>
        {pendingTests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled tests pending.</p>
        ) : (
          <div className="space-y-1.5">
            {pendingTests.slice(0, 8).map((t) => {
              const past = new Date(t.scheduled_for).getTime() < Date.now();
              return (
                <article
                  key={t.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm ${
                    past ? "border-amber-500/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono font-bold">{t.kind}</span>
                    <span className="text-muted-foreground">{fmtDateTime(t.scheduled_for)}</span>
                    {past && <span className="text-amber-400 font-bold uppercase text-[10px]">overdue</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busyTestId === t.id}
                    onClick={() => completeTest(t.id)}
                  >
                    {busyTestId === t.id ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-3 w-3" />
                    )}
                    Mark run
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2 text-sm">
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="rounded-full border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
        >
          <option value="">All directions</option>
          <option value="received">Received</option>
          <option value="originated">Originated</option>
          <option value="test">Tests only</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-full border border-border bg-background px-3 py-1.5"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-full border border-border bg-background px-3 py-1.5"
        />
        <Button onClick={load} variant="outline" size="sm" className="rounded-full">
          <RefreshCw className="mr-1.5 h-3 w-3" />
          Apply
        </Button>
      </div>

      {/* Alerts table */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No EAS events in this range.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Issued (ET)</th>
                <th className="px-4 py-3 text-left">Dir</th>
                <th className="px-4 py-3 text-left">SAME</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Originator</th>
                <th className="px-4 py-3 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{fmtDateTime(a.issued_at)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        a.direction === "originated" ? "bg-[#74ddc7]/15 text-[#74ddc7]" :
                        a.direction === "test" ? "bg-muted text-muted-foreground" :
                        "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {a.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono">{a.same_code ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{a.event_label}</td>
                  <td className="px-4 py-2 capitalize">{a.severity}</td>
                  <td className="px-4 py-2">{a.originator ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{a.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{alerts.length} events in range.</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York",
  });
}
