"use client";

/**
 * Admin: assign DJs to weekly mix-show slots.
 *
 * Shows every slot in the schedule with a dropdown to pick (or clear) the
 * assigned DJ. Calls PATCH /djs/admin/slots/:id.
 */

import { useCallback, useEffect, useState } from "react";
import { Calendar, Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Dj {
  id: string;
  slug: string;
  display_name: string;
  is_active: boolean;
}

interface Slot {
  id: string;
  dj_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  file_codes: string[];
  status: "active" | "tentative" | "inactive";
  notes: string | null;
  dj: Dj | null;
}

interface SlotsResponse {
  slots: Slot[];
  djs: Dj[];
}

export default function AdminDjSlotsPage() {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ slot: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiClient<SlotsResponse>("/djs/admin/slots")
      .then((r) => {
        setData(r);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const assign = async (slotId: string, djId: string) => {
    setSaving(slotId);
    try {
      await apiClient(`/djs/admin/slots/${slotId}`, {
        method: "PATCH",
        body: JSON.stringify({ djId: djId || null }),
      });
      // Update local state without reloading
      setData((prev) => {
        if (!prev) return prev;
        const dj = djId ? prev.djs.find((d) => d.id === djId) ?? null : null;
        return {
          ...prev,
          slots: prev.slots.map((s) =>
            s.id === slotId ? { ...s, dj_id: djId || null, dj } : s,
          ),
        };
      });
      setFlash({ slot: slotId, ok: true });
      setTimeout(() => setFlash(null), 1500);
    } catch (e) {
      setFlash({ slot: slotId, ok: false });
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            DJ slot assignments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign a DJ to each weekly mix-show slot, or leave unassigned for an open rotation.
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

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Day</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">DJB Codes</th>
                <th className="px-4 py-3 text-left">Assigned DJ</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.slots.map((slot) => {
                const flashOk = flash?.slot === slot.id && flash.ok;
                const flashBad = flash?.slot === slot.id && !flash.ok;
                return (
                  <tr
                    key={slot.id}
                    className={`border-t border-border transition-colors ${
                      flashOk ? "bg-[#74ddc7]/10" : flashBad ? "bg-red-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {DAYS[slot.day_of_week]}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {fmt12h(slot.start_time)} – {fmt12h(slot.end_time)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {slot.file_codes.join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={slot.dj_id ?? ""}
                          disabled={saving === slot.id}
                          onChange={(e) => assign(slot.id, e.target.value)}
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                        >
                          <option value="">— unassigned —</option>
                          {data.djs.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.display_name}
                            </option>
                          ))}
                        </select>
                        {saving === slot.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                        {flashOk && <Check className="h-3.5 w-3.5 text-[#74ddc7]" />}
                        {flashBad && <X className="h-3.5 w-3.5 text-red-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                          slot.status === "active"
                            ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                            : slot.status === "tentative"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <p className="text-xs text-muted-foreground">
          {data.slots.length} slots • {data.slots.filter((s) => !s.dj_id).length} unassigned •{" "}
          {data.djs.length} DJs available
        </p>
      )}
    </div>
  );
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "p" : "a";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${String(m).padStart(2, "0")}${ampm}`;
}
