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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Pause,
  SkipBack,
  SkipForward,
  CheckSquare,
  Square,
  ListMusic,
  Volume2,
  VolumeX,
  X,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// A single track the bottom player can load. `src` may be resolved lazily
// (e.g. a Supabase signed URL) so callers can build a queue of not-yet-signed
// items and only sign on demand.
interface PlayerTrack {
  id: string;
  name: string;
  /** Already-resolved playable URL, if known. */
  src?: string;
  /** Lazily resolve a playable URL (signed) the moment the track is needed. */
  resolve?: () => Promise<string | null>;
}

function fmtClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

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

/**
 * Fixed bottom audio player. Driven by a queue + active index supplied by the
 * parent. Uses one <audio> element; resolves each track's URL lazily (signed
 * URLs are only minted when a track actually plays). Self-contained so both the
 * production view and My Media can reuse the same markup/behaviour.
 */
function AudioPlayerBar({
  queue,
  index,
  onIndexChange,
  onClose,
}: {
  queue: PlayerTrack[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [srcError, setSrcError] = useState<string | null>(null);
  // Token guards against a slow resolve() landing after the user skipped on.
  const loadToken = useRef(0);

  const track = queue[index] as PlayerTrack | undefined;

  // Resolve + load the active track whenever the index/track identity changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    const token = ++loadToken.current;
    setSrcError(null);
    setCurrent(0);
    setDuration(0);

    const apply = (src: string | null) => {
      if (token !== loadToken.current || !audioRef.current) return;
      if (!src) {
        setSrcError("Could not load audio source.");
        setPlaying(false);
        return;
      }
      audioRef.current.src = src;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    if (track.src) {
      apply(track.src);
    } else if (track.resolve) {
      setLoadingSrc(true);
      track.resolve()
        .then((src) => apply(src))
        .catch(() => { if (token === loadToken.current) setSrcError("Could not load audio source."); })
        .finally(() => { if (token === loadToken.current) setLoadingSrc(false); });
    } else {
      setSrcError("No audio source.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, track?.id]);

  const hasPrev = index > 0;
  const hasNext = index < queue.length - 1;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(value)) return;
    el.currentTime = value;
    setCurrent(value);
  };

  if (!track) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => { if (hasNext) onIndexChange(index + 1); else setPlaying(false); }}
        onError={() => { if (!loadingSrc) setSrcError("Could not load audio source."); setPlaying(false); }}
      />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4">
        {/* Now playing */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
            <FileAudio className="h-5 w-5 text-[#74ddc7]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-bold text-foreground">{track.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {srcError ? <span className="text-red-400">{srcError}</span>
                : loadingSrc ? "Resolving signed URL…"
                : queue.length > 1 ? `Track ${index + 1} of ${queue.length}` : "Now playing"}
            </p>
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => hasPrev && onIndexChange(index - 1)}
            disabled={!hasPrev}
            aria-label="Previous track"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            disabled={loadingSrc || !!srcError}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-50"
          >
            {loadingSrc ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={() => hasNext && onIndexChange(index + 1)}
            disabled={!hasNext}
            aria-label="Next track"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Seek */}
        <div className="hidden flex-1 items-center gap-2 sm:flex">
          <span className="w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{fmtClock(current)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(current, duration || 0)}
            step={0.1}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-foreground/[0.12] accent-[#74ddc7]"
          />
          <span className="w-10 font-mono text-[11px] tabular-nums text-muted-foreground">{fmtClock(duration)}</span>
        </div>

        {/* Volume + close */}
        <button
          onClick={() => { const el = audioRef.current; if (el) { el.muted = !muted; setMuted(!muted); } }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground transition-colors sm:flex"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onClose}
          aria-label="Close player"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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

  // Inline player: a queue of tracks + the active index. null index = closed.
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);

  // Multi-select (file level only): selected drop ids + anchor for shift-range.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorCode, setAnchorCode] = useState<string | null>(null);

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

  // Resolve a fresh 1h signed URL for a drop's storage object (lazy, per-play).
  const resolveSignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const supabase = createClient();
    const { data } = await supabase.storage.from("dj-drops").createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? null;
  }, []);

  // Turn an uploaded drop into a lazily-signed player track.
  const trackForDrop = useCallback(
    (code: string, drop: Drop): PlayerTrack => ({
      id: drop.id,
      name: `${code}.${drop.format ?? "mp3"}`,
      resolve: drop.storage_path ? () => resolveSignedUrl(drop.storage_path as string) : undefined,
    }),
    [resolveSignedUrl],
  );

  // Build the play queue from the active slot's uploaded files so prev/next work.
  const buildSlotQueue = useCallback((slot: Slot): { tracks: PlayerTrack[]; byDropId: Map<string, number> } => {
    const tracks: PlayerTrack[] = [];
    const byDropId = new Map<string, number>();
    for (const code of slot.file_codes) {
      const drop = dropByKey.get(`${slot.id}|${code}`);
      if (drop && drop.storage_path && ["uploaded", "validated", "published"].includes(drop.status)) {
        byDropId.set(drop.id, tracks.length);
        tracks.push(trackForDrop(code, drop));
      }
    }
    return { tracks, byDropId };
  }, [dropByKey, trackForDrop]);

  // Play a single drop inside the bottom bar; queue = its whole slot.
  const playDrop = useCallback((slot: Slot, drop: Drop) => {
    if (!drop.storage_path) return;
    const { tracks, byDropId } = buildSlotQueue(slot);
    const start = byDropId.get(drop.id) ?? 0;
    setBusyUrl(drop.id);
    setQueue(tracks);
    setPlayerIndex(start);
    // brief spinner on the row that kicked it off; the bar shows real progress
    setTimeout(() => setBusyUrl(null), 600);
  }, [buildSlotQueue]);

  // "Play all" — load the whole slot queue from the first track.
  const playQueue = useCallback((tracks: PlayerTrack[]) => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    setPlayerIndex(0);
  }, []);

  // Open one or more signed URLs (used by bulk Download in the file view).
  const downloadDrops = useCallback(async (slot: Slot, codes: string[]) => {
    for (const code of codes) {
      const drop = dropByKey.get(`${slot.id}|${code}`);
      if (drop?.storage_path) {
        const url = await resolveSignedUrl(drop.storage_path);
        if (url) window.open(url, "_blank");
      }
    }
  }, [dropByKey, resolveSignedUrl]);

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

  // ── Multi-select over the active slot's UPLOADED file codes ──────────────
  // Only uploaded files are selectable (you can't act on a missing file).
  const selectableCodes = useMemo(() => {
    if (!currentSlot) return [] as string[];
    return currentSlot.file_codes.filter((c) => {
      const d = dropByKey.get(`${currentSlot.id}|${c}`);
      return d && d.storage_path && ["uploaded", "validated", "published"].includes(d.status);
    });
  }, [currentSlot, dropByKey]);

  // Drop ids of the currently-selected codes, in slot order.
  const selectedDrops = useMemo(() => {
    if (!currentSlot) return [] as { code: string; drop: Drop }[];
    return selectableCodes
      .map((code) => ({ code, drop: dropByKey.get(`${currentSlot.id}|${code}`) }))
      .filter((x): x is { code: string; drop: Drop } => !!x.drop && selected.has(x.drop.id));
  }, [currentSlot, selectableCodes, dropByKey, selected]);

  const allSelected = selectableCodes.length > 0 && selectedDrops.length === selectableCodes.length;

  // Clear selection whenever we leave the file view or switch slot/week.
  useEffect(() => {
    setSelected(new Set());
    setAnchorCode(null);
  }, [currentSlot?.id, weekOf]);

  // Toggle a row, honouring shift (range from anchor) + ctrl/cmd (toggle).
  const toggleSelect = useCallback((code: string, e: React.MouseEvent) => {
    if (!currentSlot) return;
    const drop = dropByKey.get(`${currentSlot.id}|${code}`);
    if (!drop) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && anchorCode) {
        const a = selectableCodes.indexOf(anchorCode);
        const b = selectableCodes.indexOf(code);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) {
            const d = dropByKey.get(`${currentSlot.id}|${selectableCodes[i]}`);
            if (d) next.add(d.id);
          }
          return next;
        }
      }
      // ctrl/cmd or plain click → toggle this one
      if (next.has(drop.id)) next.delete(drop.id);
      else next.add(drop.id);
      return next;
    });
    if (!e.shiftKey) setAnchorCode(code);
  }, [currentSlot, dropByKey, anchorCode, selectableCodes]);

  const selectAllOrClear = useCallback(() => {
    if (!currentSlot) return;
    if (allSelected) { setSelected(new Set()); return; }
    const next = new Set<string>();
    for (const code of selectableCodes) {
      const d = dropByKey.get(`${currentSlot.id}|${code}`);
      if (d) next.add(d.id);
    }
    setSelected(next);
  }, [currentSlot, allSelected, selectableCodes, dropByKey]);

  // Bulk: play every selected file as a queue (in slot order).
  const playSelected = useCallback(() => {
    const tracks = selectedDrops.map(({ code, drop }) => trackForDrop(code, drop));
    playQueue(tracks);
  }, [selectedDrops, trackForDrop, playQueue]);

  // Bulk: open signed URLs for every selected file.
  const downloadSelected = useCallback(() => {
    if (!currentSlot) return;
    void downloadDrops(currentSlot, selectedDrops.map((x) => x.code));
  }, [currentSlot, downloadDrops, selectedDrops]);

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
        <div className={`space-y-2 ${playerIndex !== null ? "pb-24" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
            <span>
              {fmtDateLong(dateForDay(weekOf, currentSlot.day_of_week))} · {fmt12h(currentSlot.start_time)}–{fmt12h(currentSlot.end_time)} ·{" "}
              {currentSlot.djs?.display_name ?? "Unassigned"}
            </span>
            {selectableCodes.length > 0 && (
              <button
                onClick={selectAllOrClear}
                className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-[#74ddc7]"
              >
                {allSelected ? <CheckSquare className="h-3.5 w-3.5 text-[#74ddc7]" /> : <Square className="h-3.5 w-3.5" />}
                {allSelected ? "Clear" : "Select all"}
              </button>
            )}
          </div>
          {currentSlot.file_codes.map((code) => {
            const drop = dropByKey.get(`${currentSlot.id}|${code}`);
            const present = drop && drop.storage_path && ["uploaded", "validated", "published"].includes(drop.status);
            const isSelected = !!drop && selected.has(drop.id);
            const isNowPlaying = playerIndex !== null && !!drop && queue[playerIndex]?.id === drop.id;
            return (
              <div
                key={code}
                className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors ${
                  isSelected ? "border-[#74ddc7]/50 bg-[#74ddc7]/[0.04]" : "border-border"
                }`}
              >
                {/* Selection checkbox — only for uploaded (actionable) files */}
                {present && drop ? (
                  <button
                    onClick={(e) => toggleSelect(code, e)}
                    aria-label={isSelected ? "Deselect file" : "Select file"}
                    className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-[#74ddc7]"
                  >
                    {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-[#74ddc7]" /> : <Square className="h-4.5 w-4.5" />}
                  </button>
                ) : (
                  <span className="h-5 w-5 shrink-0" />
                )}
                <FileAudio className={`h-5 w-5 shrink-0 ${present ? "text-[#74ddc7]" : "text-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-2 font-mono text-sm font-bold text-foreground">
                    <span className="truncate">{code}.{drop?.format ?? "mp3"}</span>
                    {isNowPlaying && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#74ddc7]/15 px-2 py-0.5 text-[10px] font-bold text-[#74ddc7]">
                        <Volume2 className="h-3 w-3" /> Playing
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {present ? (
                      <span className="inline-flex items-center gap-1 text-[#74ddc7]"><CheckCircle2 className="h-3 w-3" /> {drop!.status}{drop!.uploaded_at ? ` · ${new Date(drop!.uploaded_at).toLocaleDateString()}` : ""}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground/60"><Circle className="h-3 w-3" /> not uploaded yet</span>
                    )}
                  </p>
                </div>
                {present && drop?.storage_path && (
                  <Button size="sm" variant="outline" className="rounded-full" disabled={busyUrl === drop.id} onClick={() => playDrop(currentSlot, drop)}>
                    {busyUrl === drop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                    Play
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Sticky bulk-action bar (file view, ≥1 selected) */}
      {currentSlot && selectedDrops.length > 0 && (
        <div className={`sticky z-30 ${playerIndex !== null ? "bottom-20" : "bottom-4"}`}>
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#74ddc7]/40 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#74ddc7] px-1.5 text-xs font-bold text-[#0a0a0f]">
                {selectedDrops.length}
              </span>
              selected
              <button onClick={() => setSelected(new Set())} className="ml-1 text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={playSelected} className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/90">
                <ListMusic className="mr-1.5 h-3.5 w-3.5" /> Play all
              </Button>
              <Button size="sm" variant="outline" onClick={downloadSelected} className="rounded-full">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Inline bottom player */}
      {playerIndex !== null && queue.length > 0 && (
        <AudioPlayerBar
          queue={queue}
          index={playerIndex}
          onIndexChange={setPlayerIndex}
          onClose={() => { setPlayerIndex(null); setQueue([]); }}
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
