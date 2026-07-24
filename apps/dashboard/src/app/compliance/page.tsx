"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Check, Clock, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { getComplianceDeadlines, getMyStations } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { ComplianceDeadline } from "@/lib/types";
import { cx } from "@/lib/format";
import { PublicFileDocs } from "./public-file-docs";

/**
 * FCC filing-deadline tracker. Reads compliance_deadlines as the logged-in
 * member (RLS: station staff, migration 104). "Overdue" is derived from
 * due_date vs today; staff can mark an item filed (RLS-permitted UPDATE).
 */

type Row = ComplianceDeadline & { stationName: string };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: Row[] };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(iso: string): number {
  const d = new Date(`${iso}T12:00:00`).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.round((d - Date.now()) / 86_400_000);
}

function Compliance() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [deadlines, stations] = await Promise.all([
        getComplianceDeadlines(),
        getMyStations(),
      ]);
      if (cancelled) return;
      const nameById = new Map(
        stations.map((s) => [s.id, s.call_sign ?? s.name] as const),
      );
      const rows: Row[] = deadlines.map((d) => ({
        ...d,
        stationName: nameById.get(d.station_id) ?? d.station_id,
      }));
      setState({ status: "ready", rows });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markFiled(id: string) {
    setActing(id);
    const filedAt = new Date().toISOString();
    const { error } = await supabase
      .from("compliance_deadlines")
      .update({ status: "filed", filed_at: filedAt })
      .eq("id", id);
    if (!error) {
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              rows: prev.rows.map((r) =>
                r.id === id ? { ...r, status: "filed", filed_at: filedAt } : r,
              ),
            }
          : prev,
      );
    }
    setActing(null);
  }

  if (state.status === "loading") {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Could not load compliance deadlines.</p>
          <p className="text-amber/80">{state.message}</p>
        </div>
      </div>
    );
  }

  const rows = [...state.rows].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const today = todayISO();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-elevated text-dim">
          <CalendarClock className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
          <p className="text-sm text-dim">FCC filing deadlines for your stations.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-dim">No deadlines tracked yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const filed = row.status === "filed";
            const overdue = !filed && row.due_date < today;
            const dleft = daysUntil(row.due_date);
            return (
              <li
                key={row.id}
                className={cx(
                  "rounded-xl border bg-surface p-4",
                  overdue ? "border-signal/40" : "border-line",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{row.title}</span>
                      <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-faint capitalize">
                        {row.cadence.replace("_", " ")}
                      </span>
                      <span className="text-xs text-faint">{row.stationName}</span>
                    </div>
                    {row.description && (
                      <p className="mt-1 text-sm text-dim">{row.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {filed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok">
                        <Check className="h-3.5 w-3.5" aria-hidden /> Filed
                      </span>
                    ) : overdue ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/15 px-2.5 py-0.5 text-xs font-medium text-signal-soft">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-2.5 py-0.5 text-xs font-medium text-amber">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {dleft <= 0 ? "Due today" : `${dleft}d left`}
                      </span>
                    )}
                    <span className="text-xs text-faint">{fmtDate(row.due_date)}</span>
                    {!filed && (
                      <button
                        type="button"
                        onClick={() => markFiled(row.id)}
                        disabled={acting === row.id}
                        className="inline-flex items-center gap-1 text-xs text-dim transition-colors hover:text-fg disabled:opacity-60"
                      >
                        {acting === row.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        ) : (
                          <Check className="h-3 w-3" aria-hidden />
                        )}
                        Mark filed
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-12">
          <Compliance />
          <PublicFileDocs />
        </div>
      </AppShell>
    </AuthGuard>
  );
}
