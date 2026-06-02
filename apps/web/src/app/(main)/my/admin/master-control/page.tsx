"use client";

/**
 * Master Control Room dashboard — /my/admin/master-control
 *
 * Single-pane operator view. Auto-refreshes every 10s. Shows:
 *   - Now-playing tile with manual override
 *   - Signal status indicator
 *   - System health counters (missing drops, pool pending, slots open)
 *   - Upcoming required tests (RWT/RMT) with one-click "Mark Run"
 *   - Last 30 days EAS count + recent alerts feed
 *   - Sticky operator note
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  Music,
  RefreshCw,
  Save,
  Signal,
  StickyNote,
  TimerReset,
  Tv,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface AlertItem {
  id: string;
  severity: "info" | "warn" | "error";
  kind: string;
  title: string;
  detail: string;
  link?: string;
}

interface DashboardResponse {
  alerts: AlertItem[];
  state: {
    id: number;
    now_playing_title: string | null;
    now_playing_artist: string | null;
    now_playing_album: string | null;
    now_playing_art_url: string | null;
    now_playing_source: string | null;
    now_playing_started_at: string | null;
    current_show_title: string | null;
    current_dj_slug: string | null;
    signal_status: "on_air" | "silent" | "off_air" | "unknown";
    listeners: number | null;
    bitrate_kbps: number | null;
    last_metadata_at: string | null;
    last_audio_at: string | null;
    last_eas_at: string | null;
    operator_note: string | null;
    updated_at: string;
    eas_last_30d: number;
    tests_due_7d: number;
    drops_last_24h: number;
    slots_unassigned: number;
    pool_pending: number;
  } | null;
  recentEas: Array<{
    id: string;
    direction: string;
    same_code: string | null;
    event_label: string;
    severity: string;
    originator: string | null;
    issued_at: string;
    sent_at: string | null;
  }>;
  nextTests: Array<{
    id: string;
    kind: "RWT" | "RMT";
    scheduled_for: string;
    completed_at: string | null;
    notes: string | null;
  }>;
  missingThisWeek: number;
}

const SIGNAL_COLOR: Record<string, string> = {
  on_air: "text-[#74ddc7] bg-[#74ddc7]/15 border-[#74ddc7]/40",
  silent: "text-amber-400 bg-amber-500/15 border-amber-500/40",
  off_air: "text-red-400 bg-red-500/15 border-red-500/40",
  unknown: "text-muted-foreground bg-muted border-border",
};

export default function MasterControlPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [busyTestId, setBusyTestId] = useState<string | null>(null);
  const noteTouched = useRef(false);

  const load = useCallback(async () => {
    try {
      // mcr_dashboard is the mcr_state singleton augmented with the rollup
      // counters (eas_last_30d, tests_due_7d, drops_last_24h, slots_unassigned,
      // pool_pending). RLS lets any authenticated user read it.
      const [stateRes, easRes, testsRes, weekRes] = await Promise.all([
        supabase.from("mcr_dashboard").select("*").maybeSingle(),
        supabase
          .from("eas_alerts")
          .select("id,direction,same_code,event_label,severity,originator,issued_at,sent_at")
          .order("issued_at", { ascending: false })
          .limit(8),
        supabase
          .from("eas_test_schedule")
          .select("id,kind,scheduled_for,completed_at,notes")
          .is("completed_at", null)
          .lte("scheduled_for", new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString())
          .order("scheduled_for", { ascending: true }),
        // Slots expected this week whose drop hasn't landed yet → "missing".
        supabase
          .from("dj_drops_this_week")
          .select("slot_id,drop_status"),
      ]);

      const firstErr =
        stateRes.error || easRes.error || testsRes.error || weekRes.error;
      if (firstErr) {
        setError(firstErr.message);
        setLoading(false);
        return;
      }

      const missingThisWeek = (weekRes.data ?? []).filter(
        (r) => !["uploaded", "validated", "published"].includes(r.drop_status ?? ""),
      ).length;

      const r: DashboardResponse = {
        // No table backs the service-health alert feed (it was computed by the
        // dead API host); render none rather than fabricate.
        alerts: [],
        state: (stateRes.data as DashboardResponse["state"]) ?? null,
        recentEas: (easRes.data ?? []) as DashboardResponse["recentEas"],
        nextTests: (testsRes.data ?? []) as DashboardResponse["nextTests"],
        missingThisWeek,
      };

      setData(r);
      if (!noteTouched.current) setNoteDraft(r.state?.operator_note ?? "");
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const saveNote = async () => {
    setSavingNote(true);
    try {
      // mcr_state is service-role-write under RLS; an authenticated browser
      // session can't mutate it. Attempt the update and report honestly: a
      // zero-row result means RLS silently filtered the write.
      const { data, error } = await supabase
        .from("mcr_state")
        .update({ operator_note: noteDraft || null, updated_at: new Date().toISOString() })
        .eq("id", 1)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error(
          "Couldn't save the note — the operator note is write-protected (service role only). Update mcr_state from the studio worker.",
        );
      }
      noteTouched.current = false;
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingNote(false);
    }
  };

  const completeTest = async (testId: string) => {
    setBusyTestId(testId);
    try {
      // eas_test_schedule is service-role-write under RLS; same honest-failure
      // handling as the operator note above.
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

  const state = data?.state;
  const sig = state?.signal_status ?? "unknown";
  const sigClass = SIGNAL_COLOR[sig] ?? SIGNAL_COLOR.unknown;

  const counters = useMemo(
    () => [
      { label: "Missing drops (week)", value: data?.missingThisWeek ?? 0, link: "/my/admin/dj-drops", icon: Music, alert: (data?.missingThisWeek ?? 0) > 0 },
      { label: "Pool pending", value: state?.pool_pending ?? 0, link: "/my/admin/pool", icon: TimerReset, alert: (state?.pool_pending ?? 0) > 0 },
      { label: "Slots unassigned", value: state?.slots_unassigned ?? 0, link: "/my/admin/dj-slots", icon: Users, alert: (state?.slots_unassigned ?? 0) > 5 },
      { label: "EAS (30d)", value: state?.eas_last_30d ?? 0, link: "/my/admin/eas", icon: Bell, alert: false },
      { label: "Tests due (7d)", value: state?.tests_due_7d ?? 0, link: "/my/admin/eas", icon: AlertTriangle, alert: (state?.tests_due_7d ?? 0) > 0 },
      { label: "Drops (24h)", value: state?.drops_last_24h ?? 0, link: "/my/admin/dj-drops", icon: Music, alert: false },
    ],
    [data, state],
  );

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Master Control
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-refresh 10s • last update: {state?.updated_at ? fmtTime(state.updated_at) : "—"}
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="rounded-full">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Service-health alerts banner */}
      {data && data.alerts.length > 0 && (
        <section className="space-y-2">
          {data.alerts.map((a) => {
            const Icon = a.severity === "error" ? AlertTriangle : a.severity === "warn" ? AlertTriangle : Bell;
            const tone =
              a.severity === "error"
                ? "border-red-500/50 bg-red-500/10 text-red-200"
                : a.severity === "warn"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                  : "border-border bg-card text-foreground";
            const link = a.link ? (
              <Link href={a.link} className="text-xs font-bold uppercase tracking-widest underline-offset-2 hover:underline">
                Fix →
              </Link>
            ) : null;
            return (
              <article
                key={a.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 ${tone}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-bold">{a.title}</p>
                    <p className="mt-0.5 text-sm opacity-90">{a.detail}</p>
                  </div>
                </div>
                {link}
              </article>
            );
          })}
        </section>
      )}

      {/* Signal + Now Playing */}
      <section className="grid gap-4 md:grid-cols-[1fr,1.4fr]">
        <article className={`rounded-2xl border p-5 ${sigClass}`}>
          <div className="flex items-center gap-2">
            <Signal className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Signal</p>
          </div>
          <p className="mt-2 text-3xl font-black">
            {sig === "on_air" ? "ON AIR" : sig === "silent" ? "SILENT" : sig === "off_air" ? "OFF AIR" : "UNKNOWN"}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Listeners</dt>
              <dd className="font-bold">{state?.listeners ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bitrate</dt>
              <dd className="font-bold">{state?.bitrate_kbps ? `${state.bitrate_kbps} kbps` : "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Last metadata</dt>
              <dd className="font-mono text-[11px]">{state?.last_metadata_at ? fmtRelative(state.last_metadata_at) : "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Tv className="h-4 w-4 text-muted-foreground" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Now playing
            </p>
            {state?.now_playing_source && (
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                {state.now_playing_source}
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight">
            {state?.now_playing_title || <span className="text-muted-foreground">— no metadata —</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            {state?.now_playing_artist}
            {state?.now_playing_album && ` · ${state.now_playing_album}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Show: {state?.current_show_title ?? <em>—</em>}</span>
            {state?.current_dj_slug && (
              <Link href={`/djs/${state.current_dj_slug}`} className="text-[#74ddc7] hover:underline">
                /djs/{state.current_dj_slug}
              </Link>
            )}
          </div>
        </article>
      </section>

      {/* Counters */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counters.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.link}
              className={`rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-card/80 ${
                c.alert ? "border-amber-500/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </p>
                <Icon className={`h-3 w-3 ${c.alert ? "text-amber-400" : "text-muted-foreground"}`} />
              </div>
              <p className={`mt-1 text-2xl font-black ${c.alert ? "text-amber-400" : "text-foreground"}`}>
                {c.value}
              </p>
            </Link>
          );
        })}
      </section>

      {/* Upcoming required tests */}
      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Upcoming required tests
        </h2>
        {data && data.nextTests.length === 0 ? (
          <div className="rounded-xl border border-[#74ddc7]/40 bg-[#74ddc7]/10 px-4 py-3 text-sm">
            All caught up — no tests due in the next 7 days.
          </div>
        ) : (
          <div className="space-y-2">
            {data?.nextTests.map((t) => {
              const due = new Date(t.scheduled_for);
              const past = due.getTime() < Date.now();
              return (
                <article
                  key={t.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 ${
                    past ? "border-amber-500/40" : "border-border"
                  }`}
                >
                  <div>
                    <p className="font-bold">
                      <span className="font-mono">{t.kind}</span>{" "}
                      <span className="text-muted-foreground">— {fmtTime(t.scheduled_for)}</span>
                      {past && <span className="ml-2 text-amber-400">OVERDUE</span>}
                    </p>
                    {t.notes && <p className="mt-0.5 text-xs text-muted-foreground">{t.notes}</p>}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={busyTestId === t.id}
                    onClick={() => completeTest(t.id)}
                  >
                    {busyTestId === t.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Mark run
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent EAS */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Recent EAS
          </h2>
          <Link href="/my/admin/eas" className="text-xs text-[#74ddc7] hover:underline">
            Full log →
          </Link>
        </header>
        {data && data.recentEas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No EAS events on record yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data?.recentEas.map((a) => (
              <article
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{a.same_code ?? "—"}</span>
                  <span className="ml-2 font-bold">{a.event_label}</span>
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                      a.severity === "extreme" ? "bg-red-500/20 text-red-300" :
                      a.severity === "severe" ? "bg-amber-500/20 text-amber-300" :
                      a.direction === "test" ? "bg-muted text-muted-foreground" :
                      "bg-[#74ddc7]/15 text-[#74ddc7]"
                    }`}
                  >
                    {a.direction}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{fmtTime(a.issued_at)}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Operator note */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <StickyNote className="h-3 w-3" />
          Operator note
        </h2>
        <textarea
          value={noteDraft}
          onChange={(e) => { noteTouched.current = true; setNoteDraft(e.target.value); }}
          placeholder="Pinned to the dashboard for everyone to see. Hand-offs, known issues, etc."
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={saveNote}
            size="sm"
            disabled={savingNote}
            className="rounded-full"
          >
            {savingNote ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save note
          </Button>
        </div>
      </section>
    </div>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}
