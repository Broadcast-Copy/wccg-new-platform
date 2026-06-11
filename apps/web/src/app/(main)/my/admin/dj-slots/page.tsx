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
 * A "This week at a glance" grid up top shows the whole broadcast week —
 * Mon→Sun columns, one chip per slot with the DJ + upload-status dot; clicking
 * a chip scrolls to that slot's row. The "Folder" link opens the DJ's mixshow
 * folder in the media manager (same tab).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Check,
  FileAudio,
  FolderOpen,
  Loader2,
  RefreshCw,
  UploadCloud,
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

/**
 * Inline per-file upload, right in the slot row — staff drop a DJ's file
 * without leaving the assignments page (RLS: staff-on-behalf, migration 050).
 * Browser → Supabase Storage at <slug>/<week>/<code>.<ext>, then upsert the
 * dj_drops row as 'uploaded' (the studio-sync watcher ships it to disk and
 * flips it to 'published' within 5 minutes).
 */
function InlineUpload({
  slot,
  code,
  present,
  week,
  busy,
  onBusy,
  onDone,
}: {
  slot: Slot;
  code: string;
  present: boolean;
  week: string;
  busy: boolean;
  onBusy: (key: string | null) => void;
  onDone: (ok: boolean, message?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const key = `${slot.id}|${code}`;
  if (!slot.dj_id || !slot.dj?.slug) return null;

  const upload = async (file: File) => {
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|flac|m4a|ogg)$/i.test(file.name);
    if (!isAudio) { onDone(false, `"${file.name}" is not an audio file.`); return; }
    if (file.size > 200 * 1024 * 1024) { onDone(false, `"${file.name}" is over the 200 MB limit.`); return; }
    onBusy(key);
    try {
      const ext = (file.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)?.[1] ?? "mp3").toLowerCase();
      const storagePath = `${slot.dj!.slug}/${week}/${code}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("dj-drops")
        .upload(storagePath, file, { upsert: true, contentType: file.type || `audio/${ext}` });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
      const { error: rowErr } = await supabase.from("dj_drops").upsert(
        {
          dj_id: slot.dj_id,
          slot_id: slot.id,
          file_code: code,
          week_of: week,
          status: "uploaded",
          source: "web",
          storage_path: storagePath,
          size_bytes: file.size,
          format: ext,
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slot_id,file_code,week_of" },
      );
      if (rowErr) throw new Error(rowErr.message);
      onDone(true);
    } catch (e) {
      onDone(false, (e as Error).message);
    } finally {
      onBusy(null);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void upload(f);
          e.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={present ? `Replace ${code} for this week` : `Upload ${code} for this week`}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-50 ${
          present
            ? "border-border text-muted-foreground hover:border-[#7401df]/50 hover:text-[#7401df]"
            : "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#0f9e88] hover:bg-[#74ddc7]/20 dark:text-[#74ddc7]"
        }`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
        {busy ? "Uploading…" : present ? "Replace" : "Upload"}
      </button>
    </>
  );
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

// Broadcast week order for the glance grid: Monday first, Sunday last.
const GLANCE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Week-at-a-glance schedule: one column per day (Mon→Sun) for the selected
 * week, each scheduled slot as a clickable chip — DJ name, air time, and a
 * dot showing this week's upload status (teal = all files in, amber = some
 * missing, hollow = nothing yet, gray italic = unassigned). Today's column is
 * highlighted; clicking a chip scrolls to that slot's row in the table below.
 */
function WeekGlance({
  slots,
  dropByKey,
  weekOf,
  onJump,
}: {
  slots: Slot[];
  dropByKey: Map<string, Drop>;
  weekOf: string;
  onJump: (slotId: string) => void;
}) {
  const weekIso = weekOf ? isoMonday(new Date(`${weekOf}T00:00:00`)) : isoMonday(new Date());
  const monday = new Date(`${weekIso}T00:00:00`);
  const todayKey = new Date().toDateString();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmtCol = (d: Date) => d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  const rangeLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <section className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-foreground">
          <Calendar className="h-4 w-4 text-[#74ddc7]" /> This week at a glance
          <span className="font-medium normal-case tracking-normal text-muted-foreground">· {rangeLabel}</span>
        </h2>
        <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#74ddc7]" /> All files in</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Missing files</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-muted-foreground/50" /> Nothing yet</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {GLANCE_DAY_ORDER.map((day, idx) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + idx);
          const isToday = date.toDateString() === todayKey;
          const daySlots = slots
            .filter((s) => s.day_of_week === day && s.status !== "inactive")
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <div
              key={day}
              className={`rounded-xl border p-2 ${
                isToday ? "border-[#74ddc7]/60 bg-[#74ddc7]/[0.05]" : "border-border bg-background/40"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className={`text-[11px] font-black uppercase tracking-wider ${isToday ? "text-[#74ddc7]" : "text-foreground"}`}>
                  {DAYS[day]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isToday ? "Today" : fmtCol(date)}
                </span>
              </div>
              <div className="space-y-1.5">
                {daySlots.length === 0 && (
                  <p className="px-1 py-2 text-center text-[11px] text-muted-foreground/50">—</p>
                )}
                {daySlots.map((s) => {
                  const total = s.file_codes.length;
                  const done = s.file_codes.filter((c) => {
                    const d = dropByKey.get(`${s.id}|${c}`);
                    return d && UPLOADED_STATUSES.has(d.status);
                  }).length;
                  const dot =
                    total > 0 && done === total
                      ? "bg-[#74ddc7]"
                      : done > 0
                        ? "bg-amber-400"
                        : "border border-muted-foreground/50";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onJump(s.id)}
                      title={`${DAYS_LONG[s.day_of_week]} ${fmt12hFull(s.start_time)}–${fmt12hFull(s.end_time)} · ${
                        s.dj?.display_name ?? "Unassigned"
                      } · ${done}/${total} uploaded${s.status === "tentative" ? " · tentative" : ""}`}
                      className={`w-full rounded-lg border border-border bg-card px-2 py-1.5 text-left transition-colors hover:border-[#74ddc7]/50 ${
                        s.status === "tentative" ? "opacity-60" : ""
                      }`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {fmt12h(s.start_time)}–{fmt12h(s.end_time)}
                        </span>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                      </span>
                      <span
                        className={`block truncate text-[11px] font-bold ${
                          s.dj ? "text-foreground" : "italic text-amber-500"
                        }`}
                      >
                        {s.dj?.display_name ?? "Unassigned"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminDjSlotsPage() {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ slot: string; ok: boolean } | null>(null);
  const [weekOf, setWeekOf] = useState<string>("");
  // Slot row briefly ring-highlighted after a week-glance chip jump.
  const [jumpSlot, setJumpSlot] = useState<string | null>(null);
  // "slotId|code" of the inline upload currently in flight.
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  // The ISO Monday the page is showing (same formula load() uses for drops).
  const currentWeek = weekOf ? isoMonday(new Date(`${weekOf}T00:00:00`)) : isoMonday(new Date());

  const jumpToSlot = useCallback((slotId: string) => {
    setJumpSlot(slotId);
    document.getElementById(`slot-row-${slotId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setJumpSlot((cur) => (cur === slotId ? null : cur)), 2200);
  }, []);

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
        <>
        <WeekGlance slots={data.slots} dropByKey={dropByKey} weekOf={weekOf} onJump={jumpToSlot} />
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
                    id={`slot-row-${slot.id}`}
                    className={`border-t border-border align-top transition-colors ${
                      flashOk ? "bg-[#74ddc7]/10" : flashBad ? "bg-red-500/10" : jumpSlot === slot.id ? "bg-[#74ddc7]/[0.07] ring-2 ring-inset ring-[#74ddc7]/50" : ""
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
                                <Link
                                  href={mediaHref}
                                  title="Open this DJ's media folder"
                                  className="group inline-flex items-center gap-1 font-mono transition-colors hover:text-[#7401df]"
                                >
                                  <FileAudio
                                    className={`h-3 w-3 ${uploaded ? "text-[#74ddc7]" : "text-muted-foreground"} group-hover:text-[#7401df]`}
                                  />
                                  <span className="underline-offset-2 group-hover:underline">{code}</span>
                                </Link>
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
                                <InlineUpload
                                  slot={slot}
                                  code={code}
                                  present={uploaded}
                                  week={currentWeek}
                                  busy={uploadKey === `${slot.id}|${code}`}
                                  onBusy={setUploadKey}
                                  onDone={(ok, message) => {
                                    if (ok) {
                                      setFlash({ slot: slot.id, ok: true });
                                      setTimeout(() => setFlash(null), 1500);
                                      load();
                                    } else {
                                      setError(message ?? "Upload failed");
                                    }
                                  }}
                                />
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
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#7401df]/50 hover:text-[#7401df]"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Folder
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
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
