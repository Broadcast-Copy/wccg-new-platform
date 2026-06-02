"use client";

/**
 * Production DJ-Mixshows view for the Media Manager.
 *
 * Renders the LIVE weekly schedule (dj_slots) + uploaded files (dj_drops) as
 * a familiar folder tree:
 *
 *     DJ Mixshows  >  Monday  >  12:00 PM (DJ Ike GDA)  >  DJB_76051.mp3
 *
 * Files auto-populate the moment a DJ uploads (the drop's slot_id + week_of
 * place it in the right time-slot folder). A "Create new mixshow" button adds
 * a slot for any day/time. Production / admin / management roles only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Folder,
  FileAudio,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Circle,
  Download,
  Play,
  X,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Production week order: Mon → Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface DjRef { slug: string; display_name: string }
interface Slot {
  id: string;
  dj_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  file_codes: string[];
  status: string;
  notes: string | null;
  djs: DjRef | null;
}
interface Drop {
  id: string;
  slot_id: string;
  file_code: string;
  status: string;
  storage_path: string | null;
  format: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
}

function isoMondayOfNow(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const offset = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - offset);
  return mon.toISOString().slice(0, 10);
}
function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}
function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${display}:00 ${ampm}` : `${display}:${String(m).padStart(2, "0")} ${ampm}`;
}
/** Calendar date for a given day-of-week within the week starting at weekOf (a Monday). */
function dateForDay(weekOf: string, day: number): Date {
  const monday = new Date(weekOf + "T00:00:00");
  const offsetFromMonday = day === 0 ? 6 : day - 1; // Sun=+6, Mon=+0, …, Sat=+5
  const d = new Date(monday);
  d.setDate(monday.getDate() + offsetFromMonday);
  return d;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function ProductionMixshows() {
  const [weekOf, setWeekOf] = useState(isoMondayOfNow());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [djs, setDjs] = useState<DjRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Navigation path: [] = days, [day] = slots in day, [day, slotId] = files
  const [path, setPath] = useState<Array<number | string>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: s, error: sErr }, { data: d }, { data: dj }] = await Promise.all([
        supabase
          .from("dj_slots")
          .select("id,dj_id,day_of_week,start_time,end_time,file_codes,status,notes,djs(slug,display_name)")
          .order("day_of_week")
          .order("start_time"),
        supabase
          .from("dj_drops")
          .select("id,slot_id,file_code,status,storage_path,format,size_bytes,uploaded_at")
          .eq("week_of", weekOf),
        supabase.from("djs").select("slug,display_name").eq("is_active", true).order("display_name"),
      ]);
      if (sErr) throw new Error(sErr.message);
      setSlots((s ?? []) as unknown as Slot[]);
      setDrops((d ?? []) as Drop[]);
      setDjs((dj ?? []) as DjRef[]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [weekOf]);

  useEffect(() => { load(); }, [load]);

  // Drops keyed by slot+code for quick lookup
  const dropByKey = useMemo(() => {
    const m = new Map<string, Drop>();
    for (const d of drops) m.set(`${d.slot_id}|${d.file_code}`, d);
    return m;
  }, [drops]);

  // Days that have slots, in production order
  const daysWithSlots = useMemo(() => {
    const present = new Set(slots.map((s) => s.day_of_week));
    return DAY_ORDER.filter((d) => present.has(d));
  }, [slots]);

  const slotsForDay = (day: number) =>
    slots.filter((s) => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));

  const play = async (drop: Drop) => {
    if (!drop.storage_path) return;
    setBusyUrl(drop.id);
    try {
      const supabase = createClient();
      const { data } = await supabase.storage.from("dj-drops").createSignedUrl(drop.storage_path, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } finally {
      setBusyUrl(null);
    }
  };

  // Next free DJB codes (max across all slots + 1)
  const nextCodes = useMemo(() => {
    let max = 76050;
    for (const s of slots) for (const c of s.file_codes) {
      const m = c.match(/DJB_(\d+)/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return [`DJB_${max + 1}`, `DJB_${max + 2}`];
  }, [slots]);

  const level = path.length; // 0 days, 1 day, 2 slot
  const currentDay = level >= 1 ? (path[0] as number) : null;
  const currentSlot = level >= 2 ? slots.find((s) => s.id === path[1]) : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setPath([])} className="inline-flex items-center gap-1 font-bold text-foreground hover:text-[#74ddc7]">
            <Home className="h-3.5 w-3.5" /> DJ Mixshows
          </button>
          {currentDay !== null && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button onClick={() => setPath([currentDay])} className="font-bold text-foreground hover:text-[#74ddc7]">
                {DAY_NAMES[currentDay]} · {fmtDate(dateForDay(weekOf, currentDay))}
              </button>
            </>
          )}
          {currentSlot && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-[#74ddc7]">{fmt12h(currentSlot.start_time)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Week nav */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5 text-xs">
            <button onClick={() => setWeekOf((w) => addWeeks(w, -1))} className="rounded-full px-2 py-1 hover:bg-foreground/[0.06]">‹</button>
            <span className="inline-flex items-center gap-1 px-1 font-mono"><Calendar className="h-3 w-3" />{weekOf}</span>
            <button onClick={() => setWeekOf((w) => addWeeks(w, 1))} className="rounded-full px-2 py-1 hover:bg-foreground/[0.06]">›</button>
          </div>
          <Button variant="ghost" size="sm" onClick={load} className="rounded-full text-xs">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-full bg-[#7401df] text-white hover:bg-[#7401df]/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create new mixshow
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading && slots.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…</div>
      ) : level === 0 ? (
        /* ── Days ── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {daysWithSlots.map((day) => {
            const ds = slotsForDay(day);
            return (
              <button key={day} onClick={() => setPath([day])} className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 transition-all hover:border-[#74ddc7]/40">
                <Folder className="h-9 w-9 text-[#74ddc7]" />
                <p className="font-bold text-foreground group-hover:text-[#74ddc7]">{DAY_NAMES[day]}</p>
                <p className="text-[11px] font-medium text-[#74ddc7]/80">{fmtDate(dateForDay(weekOf, day))}</p>
                <p className="text-[11px] text-muted-foreground">{ds.length} mixshow{ds.length === 1 ? "" : "s"}</p>
              </button>
            );
          })}
          {daysWithSlots.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No mixshow slots yet. Click “Create new mixshow”.
            </p>
          )}
        </div>
      ) : level === 1 ? (
        /* ── Time slots in a day ── */
        <div className="space-y-2">
          {slotsForDay(currentDay as number).map((slot) => {
            const uploaded = slot.file_codes.filter((c) => {
              const d = dropByKey.get(`${slot.id}|${c}`);
              return d && ["uploaded", "validated", "published"].includes(d.status);
            }).length;
            const total = slot.file_codes.length;
            const complete = uploaded === total && total > 0;
            return (
              <button key={slot.id} onClick={() => setPath([currentDay as number, slot.id])} className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-[#74ddc7]/40">
                <Folder className="h-6 w-6 shrink-0 text-[#74ddc7]" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground group-hover:text-[#74ddc7]">{fmt12h(slot.start_time)} – {fmt12h(slot.end_time)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCircle2 className="h-3.5 w-3.5" />
                    {slot.djs?.display_name ?? <span className="italic text-amber-500">Unassigned</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${complete ? "bg-[#74ddc7]/15 text-[#74ddc7]" : "bg-amber-500/15 text-amber-500"}`}>
                  {uploaded}/{total} uploaded
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      ) : currentSlot ? (
        /* ── Files in a slot ── */
        <div className="space-y-2">
          <div className="rounded-xl border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
            {fmtDateLong(dateForDay(weekOf, currentSlot.day_of_week))} · {fmt12h(currentSlot.start_time)}–{fmt12h(currentSlot.end_time)} ·{" "}
            {currentSlot.djs?.display_name ?? "Unassigned"}
          </div>
          {currentSlot.file_codes.map((code) => {
            const drop = dropByKey.get(`${currentSlot.id}|${code}`);
            const present = drop && ["uploaded", "validated", "published"].includes(drop.status);
            return (
              <div key={code} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <FileAudio className={`h-5 w-5 shrink-0 ${present ? "text-[#74ddc7]" : "text-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-foreground">{code}.{drop?.format ?? "mp3"}</p>
                  <p className="text-xs text-muted-foreground">
                    {present ? (
                      <span className="inline-flex items-center gap-1 text-[#74ddc7]"><CheckCircle2 className="h-3 w-3" /> {drop!.status}{drop!.uploaded_at ? ` · ${new Date(drop!.uploaded_at).toLocaleDateString()}` : ""}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground/60"><Circle className="h-3 w-3" /> not uploaded yet</span>
                    )}
                  </p>
                </div>
                {present && drop?.storage_path && (
                  <Button size="sm" variant="outline" className="rounded-full" disabled={busyUrl === drop.id} onClick={() => play(drop)}>
                    {busyUrl === drop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                    Play
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {showCreate && (
        <CreateMixshowDialog
          djs={djs}
          defaultCodes={nextCodes}
          defaultDay={currentDay ?? 1}
          weekOf={weekOf}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function CreateMixshowDialog({
  djs,
  defaultCodes,
  defaultDay,
  weekOf,
  onClose,
  onCreated,
}: {
  djs: DjRef[];
  defaultCodes: string[];
  defaultDay: number;
  weekOf: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [day, setDay] = useState(defaultDay);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("14:00");
  const [codes, setCodes] = useState(defaultCodes.join(", "));
  const [djSlug, setDjSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setErr(null);
    const fileCodes = codes.split(/[,\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (fileCodes.length === 0) { setErr("Add at least one file code, e.g. DJB_76051."); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
      setErr("Times must be HH:mm (24h), e.g. 12:00, 17:00."); return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      let djId: string | null = null;
      if (djSlug) {
        const { data: dj } = await supabase.from("djs").select("id").eq("slug", djSlug).maybeSingle();
        djId = dj?.id ?? null;
      }
      const id = `slot_${day}_${start.replace(":", "")}_${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("dj_slots").insert({
        id, dj_id: djId, day_of_week: day, start_time: start, end_time: end,
        file_codes: fileCodes, status: "active",
        notes: `${DAY_NAMES[day]} ${start} — created from Production Media Manager`,
      });
      if (error) throw new Error(error.message);
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-foreground">Create new mixshow</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {err && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Day</label>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {DAY_ORDER.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
            </select>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#74ddc7]">
              <Calendar className="h-3 w-3" /> This week: {fmtDateLong(dateForDay(weekOf, day))}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Start (24h)</label>
              <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="12:00" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">End (24h)</label>
              <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="14:00" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">File codes (comma-separated)</label>
            <input value={codes} onChange={(e) => setCodes(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm" />
            <p className="mt-1 text-[11px] text-muted-foreground">Auto-suggested the next free codes. The assigned DJ uploads these; they appear in this folder.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Assign DJ (optional)</label>
            <select value={djSlug} onChange={(e) => setDjSlug(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Unassigned —</option>
              {djs.map((d) => <option key={d.slug} value={d.slug}>{d.display_name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={busy} className="bg-[#7401df] text-white hover:bg-[#7401df]/90">
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            Create mixshow
          </Button>
        </div>
      </div>
    </div>
  );
}
