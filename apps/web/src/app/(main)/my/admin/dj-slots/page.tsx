"use client";

/**
 * Admin: DJ slot assignments + weekly upload status (the DJ admin view).
 *
 * One page for the whole DJ admin workflow: every weekly mix-show slot, the DJ
 * assigned to it (editable dropdown), and — for the selected week — the files
 * each DJ has uploaded (DJB code, status, upload date/time, file type), plus a
 * "Nudge" button that DMs the DJ to remind them to upload their mix.
 *
 * Reads dj_slots (+ embedded djs incl. user_id for messaging), the active DJ
 * roster, and this week's dj_drops directly from Supabase (production-tier RLS
 * lets admins read every DJ's drops). Assignment writes dj_slots.dj_id.
 *
 * The "Media" link opens the media manager in a NEW TAB so this admin page
 * stays put (you don't lose your place when managing a folder).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  FileAudio,
  FolderOpen,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageButton } from "@/components/messaging/message-button";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const TEAL = "#74ddc7";
const AMBER = "#f59e0b";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const UPLOADED_STATUSES = new Set(["uploaded", "validated", "published"]);

interface Dj {
  id: string;
  slug: string;
  display_name: string;
  is_active: boolean;
  user_id?: string | null;
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

interface Drop {
  id: string;
  slot_id: string;
  file_code: string;
  status: string;
  format: string | null;
  storage_path: string | null;
  source: string | null;
  uploaded_at: string | null;
  created_at: string;
}

interface SlotsResponse {
  slots: Slot[];
  djs: Dj[];
}

// Raw row shape from `dj_slots` with embedded `djs`.
interface SlotQueryRow {
  id: string;
  dj_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  file_codes: string[];
  status: "active" | "tentative" | "inactive";
  notes: string | null;
  djs: {
    id: string;
    slug: string;
    display_name: string;
    is_active: boolean;
    user_id: string | null;
  } | null;
}

// ISO Monday (UTC date string) of the week containing `ref`.
function isoMonday(ref: Date): string {
  const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()));
  const dow = d.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "p" : "a";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${String(m).padStart(2, "0")}${ampm}`;
}

function fmt12hFull(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function extOf(path: string | null): string | null {
  if (!path) return null;
  const m = path.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

function statusMeta(status: string): { label: string; cls: string } {
  switch (status) {
    case "published":
      return { label: "Published", cls: "bg-[#74ddc7]/15 text-[#0f9e88] dark:text-[#74ddc7]" };
    case "validated":
      return { label: "Validated", cls: "bg-sky-500/15 text-sky-500" };
    case "uploaded":
      return { label: "Uploaded", cls: "bg-blue-500/15 text-blue-500" };
    case "rejected":
      return { label: "Rejected", cls: "bg-red-500/15 text-red-500" };
    default:
      return { label: "Awaiting", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  }
}

export default function AdminDjSlotsPage() {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ slot: string; ok: boolean } | null>(null);
  const [weekOf, setWeekOf] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true);
    const week = weekOf ? isoMonday(new Date(`${weekOf}T00:00:00`)) : isoMonday(new Date());
    (async () => {
      const [slotsRes, djsRes, dropsRes] = await Promise.all([
        supabase
          .from("dj_slots")
          .select(
            "id,dj_id,day_of_week,start_time,end_time,file_codes,status,notes,djs(id,slug,display_name,is_active,user_id)",
          )
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("djs")
          .select("id,slug,display_name,is_active,user_id")
          .eq("is_active", true)
          .order("display_name", { ascending: true }),
        supabase
          .from("dj_drops")
          .select("id,slot_id,file_code,status,format,storage_path,source,uploaded_at,created_at")
          .eq("week_of", week),
      ]);

      if (slotsRes.error) {
        setError(slotsRes.error.message);
        setData(null);
        setLoading(false);
        return;
      }
      if (djsRes.error) {
        setError(djsRes.error.message);
        setData(null);
        setLoading(false);
        return;
      }

      const slots: Slot[] = ((slotsRes.data ?? []) as unknown as SlotQueryRow[]).map((r) => ({
        id: r.id,
        dj_id: r.dj_id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        file_codes: r.file_codes ?? [],
        status: r.status,
        notes: r.notes,
        dj: r.djs
          ? {
              id: r.djs.id,
              slug: r.djs.slug,
              display_name: r.djs.display_name,
              is_active: r.djs.is_active,
              user_id: r.djs.user_id,
            }
          : null,
      }));

      setData({ slots, djs: (djsRes.data ?? []) as Dj[] });
      setDrops((dropsRes.data ?? []) as unknown as Drop[]);
      setError(null);
      setLoading(false);
    })().catch((e) => {
      setError((e as Error).message);
      setData(null);
      setLoading(false);
    });
  }, [weekOf]);

  useEffect(load, [load]);

  const dropByKey = useMemo(() => {
    const m = new Map<string, Drop>();
    for (const d of drops) m.set(`${d.slot_id}|${d.file_code}`, d);
    return m;
  }, [drops]);

  const assign = async (slotId: string, djId: string) => {
    setSaving(slotId);
    try {
      const { error: updErr } = await supabase
        .from("dj_slots")
        .update({ dj_id: djId || null })
        .eq("id", slotId);
      if (updErr) throw new Error(updErr.message);
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
            Assign a DJ to each slot and see what they&apos;ve uploaded this week — nudge anyone who&apos;s missing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/my/admin/dj-drops"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Drops dashboard
          </Link>
          <input
            type="date"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            title="Show uploads for the week containing this date"
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
          {error}
        </div>
      )}

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-card/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Day</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Assigned DJ</th>
                <th className="px-4 py-3 text-left">Slot</th>
                <th className="px-4 py-3 text-left">Uploads (this week)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.slots.map((slot) => {
                const flashOk = flash?.slot === slot.id && flash.ok;
                const flashBad = flash?.slot === slot.id && !flash.ok;
                const codes = slot.file_codes;
                const missing = codes.filter((code) => {
                  const d = dropByKey.get(`${slot.id}|${code}`);
                  return !(d && UPLOADED_STATUSES.has(d.status));
                });
                const done = codes.length - missing.length;
                const nudge =
                  `Hi ${slot.dj?.display_name ?? "there"} — friendly reminder to upload your mix for the ` +
                  `${DAYS_LONG[slot.day_of_week]} ${fmt12hFull(slot.start_time)}–${fmt12hFull(slot.end_time)} slot.` +
                  (missing.length ? ` We're still missing: ${missing.join(", ")}.` : "") +
                  " You can drop it from your DJ portal under My Mixshows. Thanks! 🎧";
                const mediaHref = slot.dj_id
                  ? `/my/mixes?view=mixshows&dj=${slot.dj_id}`
                  : `/my/mixes?view=mixshows&slot=${slot.id}`;
                return (
                  <tr
                    key={slot.id}
                    className={`border-t border-border align-top transition-colors ${
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
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                            slot.status === "active"
                              ? "bg-[#74ddc7]/15 text-[#0f9e88] dark:text-[#74ddc7]"
                              : slot.status === "tentative"
                                ? "bg-amber-500/15 text-amber-500"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {slot.status}
                        </span>
                        {codes.length > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              missing.length === 0 ? "text-[#0f9e88] dark:text-[#74ddc7]" : "text-amber-500"
                            }`}
                          >
                            {missing.length === 0 ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {done}/{codes.length} uploaded
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {codes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No file codes</span>
                      ) : (
                        <div className="space-y-1.5">
                          {codes.map((code) => {
                            const drop = dropByKey.get(`${slot.id}|${code}`);
                            const meta = statusMeta(drop?.status ?? "pending");
                            const uploaded = !!drop && UPLOADED_STATUSES.has(drop.status);
                            const ft = drop ? drop.format ?? extOf(drop.storage_path) : null;
                            return (
                              <div
                                key={code}
                                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
                              >
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <FileAudio
                                    className={`h-3 w-3 ${uploaded ? "text-[#74ddc7]" : "text-muted-foreground"}`}
                                  />
                                  {code}
                                </span>
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.cls}`}
                                >
                                  {meta.label}
                                </span>
                                {drop && (
                                  <span className="text-muted-foreground">
                                    {fmtDateTime(drop.uploaded_at ?? drop.created_at)}
                                  </span>
                                )}
                                {ft && (
                                  <span className="font-mono uppercase text-muted-foreground">{ft}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        {slot.dj?.user_id && (
                          <MessageButton
                            variant="button"
                            recipientId={slot.dj.user_id}
                            recipientName={slot.dj.display_name}
                            prefill={nudge}
                            label={missing.length > 0 ? "Nudge" : "Message"}
                            accentColor={missing.length > 0 ? AMBER : TEAL}
                          />
                        )}
                        <Link
                          href={mediaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#7401df]/50 hover:text-[#7401df]"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Media
                        </Link>
                      </div>
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
          {data.djs.length} DJs available • Media opens in a new tab
        </p>
      )}
    </div>
  );
}
