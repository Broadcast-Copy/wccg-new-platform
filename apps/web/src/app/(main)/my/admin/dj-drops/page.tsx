"use client";

/**
 * Admin: DJ drop status — "who's missing this week".
 *
 * Single-pane operations view. Loads /djs/admin/missing and groups by
 * day → start time → DJ → file codes that haven't been uploaded yet.
 */

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MissingRow {
  slot_id: string;
  dj_id: string;
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

export default function AdminDjDropsPage() {
  const [rows, setRows] = useState<MissingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOf, setWeekOf] = useState<string>("");

  const load = () => {
    setLoading(true);
    apiClient<MissingRow[]>(`/djs/admin/missing${weekOf ? `?weekOf=${weekOf}` : ""}`)
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(load, [weekOf]);

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

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
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
    </div>
  );
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}${am ? "a" : "p"}`;
}
