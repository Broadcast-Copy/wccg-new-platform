"use client";

/**
 * Admin: DJ drop status — "who's missing this week".
 *
 * Single-pane operations view. Reads the weekly schedule (dj_slots + djs) and
 * this week's uploads (dj_drops) directly from Supabase, then groups the
 * MISSING file codes by day → start time → DJ. A drop counts as satisfied once
 * its status is uploaded/validated/published; anything else (or absent) is
 * "missing".
 *
 * Also surfaces drops that are uploaded but not yet published, each with an
 * in-app Publish button (status -> 'published') so staff no longer depend on
 * the PC-side Python watcher.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Calendar, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const supabase = createClient();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// A drop is considered "satisfied" (not missing) once it reaches one of these.
const UPLOADED_STATUSES = new Set(["uploaded", "validated", "published"]);

interface MissingRow {
  slot_id: string;
  dj_id: string | null;
  dj_name: string;
  dj_slug: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_status: "active" | "tentative" | "inactive";
  file_code: string;
  week_of: string;
  drop_status: string;
}

interface PublishableDrop {
  id: string;
  file_code: string;
  status: string;
  day_of_week: number;
  start_time: string;
  dj_name: string;
}

interface SlotRow {
  id: string;
  dj_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  file_codes: string[];
  status: "active" | "tentative" | "inactive";
  djs: { display_name: string; slug: string } | null;
}

interface DropRow {
  id: string;
  slot_id: string;
  dj_id: string | null;
  file_code: string;
  status: string;
}

// ISO Monday (UTC date string) of the week containing `ref`. Matches the
// dj_drops_this_week view's date_trunc('week', ...) semantics closely enough
// for slot ↔ drop matching by week_of.
function isoMonday(ref: Date): string {
  const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const delta = dow === 0 ? -6 : 1 - dow; // back up to Monday
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function AdminDjDropsPage() {
  const [rows, setRows] = useState<MissingRow[]>([]);
  const [publishable, setPublishable] = useState<PublishableDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [weekOf, setWeekOf] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true);
    const week = weekOf ? isoMonday(new Date(`${weekOf}T00:00:00`)) : isoMonday(new Date());

    (async () => {
      // Scheduled slots (active/tentative) + this week's drops, in parallel.
      const [slotsRes, dropsRes] = await Promise.all([
        supabase
          .from("dj_slots")
          .select("id,dj_id,day_of_week,start_time,end_time,file_codes,status,djs(display_name,slug)")
          .in("status", ["active", "tentative"])
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("dj_drops")
          .select("id,slot_id,dj_id,file_code,status")
          .eq("week_of", week),
      ]);

      if (slotsRes.error) {
        setError(slotsRes.error.message);
        setRows([]);
        setPublishable([]);
        setLoading(false);
        return;
      }
      if (dropsRes.error) {
        setError(dropsRes.error.message);
        setRows([]);
        setPublishable([]);
        setLoading(false);
        return;
      }

      const slots = (slotsRes.data ?? []) as unknown as SlotRow[];
      const drops = (dropsRes.data ?? []) as unknown as DropRow[];

      // Index drops by (slot_id|file_code) for this week.
      const dropByKey = new Map<string, DropRow>();
      for (const d of drops) dropByKey.set(`${d.slot_id}|${d.file_code}`, d);

      // Expand each slot's expected file codes and keep the ones not yet uploaded.
      const missing: MissingRow[] = [];
      for (const s of slots) {
        const djName = s.djs?.display_name ?? "Unassigned";
        const djSlug = s.djs?.slug ?? "";
        for (const code of s.file_codes ?? []) {
          const d = dropByKey.get(`${s.id}|${code}`);
          if (d && UPLOADED_STATUSES.has(d.status)) continue; // satisfied
          missing.push({
            slot_id: s.id,
            dj_id: s.dj_id,
            dj_name: djName,
            dj_slug: djSlug,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            slot_status: s.status,
            file_code: code,
            week_of: week,
            drop_status: d?.status ?? "pending",
          });
        }
      }

      // Drops that are uploaded/validated (not yet published) — ready to publish.
      const slotById = new Map(slots.map((s) => [s.id, s]));
      const ready: PublishableDrop[] = drops
        .filter((d) => d.status === "uploaded" || d.status === "validated")
        .map((d) => {
          const s = slotById.get(d.slot_id);
          return {
            id: d.id,
            file_code: d.file_code,
            status: d.status,
            day_of_week: s?.day_of_week ?? -1,
            start_time: s?.start_time ?? "",
            dj_name: s?.djs?.display_name ?? "Unassigned",
          };
        })
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

      setRows(missing);
      setPublishable(ready);
      setError(null);
      setLoading(false);
    })().catch((e) => {
      setError((e as Error).message);
      setRows([]);
      setPublishable([]);
      setLoading(false);
    });
  }, [weekOf]);

  useEffect(load, [load]);

  const publish = async (dropId: string) => {
    setPublishing(dropId);
    try {
      const { error: updErr } = await supabase
        .from("dj_drops")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", dropId);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(null);
    }
  };

  // Group by (day, start_time, dj)
  const groups = new Map<string, { day: number; time: string; dj: string; codes: string[]; tentative: boolean }>();
  for (const r of rows) {
    const key = `${r.day_of_week}|${r.start_time}|${r.dj_slug}`;
    const g = groups.get(key) ?? {
      day: r.day_of_week,
      time: r.start_time,
      dj: r.dj_name,
      codes: [],
      tentative: r.slot_status === "tentative",
    };
    g.codes.push(r.file_code);
    groups.set(key, g);
  }
  const grouped = Array.from(groups.values()).sort(
    (a, b) => a.day - b.day || a.time.localeCompare(b.time),
  );

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            DJ drops — missing this week
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
          <Button onClick={load} variant="outline" size="sm" className="rounded-full">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Couldn&apos;t load drop status: {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? null : grouped.length === 0 ? (
        <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/10 p-6 text-center">
          <p className="font-bold text-foreground">All slots accounted for. </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every active slot for this week has at least one uploaded drop.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((g) => (
            <article
              key={`${g.day}-${g.time}-${g.dj}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {DAYS[g.day]} {fmtTime(g.time)}
                  </span>
                  {g.tentative && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-500">
                      Tentative
                    </span>
                  )}
                </div>
                <p className="truncate font-bold text-foreground">{g.dj}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Missing: {g.codes.join(", ")}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                {g.codes.length} missing
              </span>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && publishable.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Ready to publish
          </h2>
          {publishable.map((d) => (
            <article
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {d.day_of_week >= 0 ? `${DAYS[d.day_of_week]} ${fmtTime(d.start_time)}` : "Unscheduled"}
                  </span>
                  <span className="rounded-full bg-[#74ddc7]/15 px-2 py-0.5 text-[#74ddc7]">
                    {d.status}
                  </span>
                </div>
                <p className="truncate font-bold text-foreground">{d.dj_name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{d.file_code}</p>
              </div>
              <Button
                onClick={() => publish(d.id)}
                disabled={publishing === d.id}
                size="sm"
                className="rounded-full"
              >
                {publishing === d.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                Publish
              </Button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}${am ? "a" : "p"}`;
}
