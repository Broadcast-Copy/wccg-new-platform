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
  Users,
  CalendarDays,
  UploadCloud,
  Radio,
  Disc3,
  Music,
  Podcast,
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
// Path key used for the DJ folder holding slots with no assigned DJ.
const UNASSIGNED_DJ_KEY = "__unassigned__";
const PLAYABLE_STATUSES = ["uploaded", "validated", "published"];

interface DjRef { id: string; slug: string; display_name: string }
/**
 * A leaf audio item from `dj_mixes` — the Off-Air / Digital catalog. Unlike
 * on-air drops these live in the public `dj-mixes` bucket, so `audio_url` is a
 * directly-playable URL (no signing needed before handing it to the player).
 */
interface MixItem {
  id: string;
  dj_id: string | null;
  host_id: string | null;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration: number | null;
  genre: string | null;
  play_count: number | null;
  item_type: string | null;
  is_published: boolean;
  created_at: string;
}
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

/**
 * A single on-air file row. Shared verbatim by the By-Day file view and the
 * By-DJ folder so behaviour/markup match. `subtitle` injects an extra line
 * under the filename (the By-DJ view uses it for the airing's day + time).
 */
function FileRow({
  slot,
  code,
  drop,
  present,
  isSelected,
  isNowPlaying,
  busyUrl,
  rowKey,
  subtitle,
  canUpload,
  uploading,
  onToggleSelect,
  onPlay,
  onUpload,
}: {
  slot: Slot;
  code: string;
  drop: Drop | undefined;
  present: boolean;
  isSelected: boolean;
  isNowPlaying: boolean;
  busyUrl: string | null;
  rowKey: string;
  subtitle?: React.ReactNode;
  /** Whether an Upload/Replace control is shown (slot must route to a DJ). */
  canUpload: boolean;
  /** This row's upload is in flight. */
  uploading: boolean;
  onToggleSelect: (dropId: string, rowKey: string, e: React.MouseEvent) => void;
  onPlay: (slot: Slot, drop: Drop) => void;
  onUpload: (slot: Slot, code: string, file: File) => void;
}) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors ${
        isSelected ? "border-[#74ddc7]/50 bg-[#74ddc7]/[0.04]" : "border-border"
      }`}
    >
      {/* Selection checkbox — only for uploaded (actionable) files */}
      {present && drop ? (
        <button
          onClick={(e) => onToggleSelect(drop.id, rowKey, e)}
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
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        <p className="text-xs text-muted-foreground">
          {present ? (
            <span className="inline-flex items-center gap-1 text-[#74ddc7]"><CheckCircle2 className="h-3 w-3" /> {drop!.status}{drop!.uploaded_at ? ` · ${new Date(drop!.uploaded_at).toLocaleDateString()}` : ""}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground/60"><Circle className="h-3 w-3" /> not uploaded yet</span>
          )}
        </p>
      </div>
      {present && drop?.storage_path && (
        <Button size="sm" variant="outline" className="rounded-full" disabled={busyUrl === drop.id} onClick={() => onPlay(slot, drop)}>
          {busyUrl === drop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
          Play
        </Button>
      )}
      {canUpload && (
        <>
          <input
            ref={uploadInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) onUpload(slot, code, f);
              e.currentTarget.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={uploading}
            onClick={() => uploadInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-1 h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : present ? "Replace" : "Upload"}
          </Button>
        </>
      )}
    </div>
  );
}

export function ProductionMixshows({
  focusSlotId,
  focusDjId,
  selfDjId,
}: {
  focusSlotId?: string;
  focusDjId?: string;
  /**
   * When set, scopes the view to a single DJ viewing their own folder: forces
   * the By-DJ grouping, auto-opens that DJ's folder, and hides the grouping
   * toggle / other DJ folders / the admin "Create new mixshow" button. When
   * null/undefined (admin/production) the full view is shown.
   */
  selfDjId?: string | null;
}) {
  const [weekOf, setWeekOf] = useState(isoMondayOfNow());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [mixes, setMixes] = useState<MixItem[]>([]);
  const [djs, setDjs] = useState<DjRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Top-level category. null = the "My Mixshows" root (two folder cards);
  //   "onair"   → scheduled broadcast drops (the original schedule view, now
  //               nested under a {year} folder)
  //   "digital" → the on-demand dj_mixes catalog (DJ folder → that DJ's mixes)
  const [section, setSection] = useState<"onair" | "digital" | null>(null);
  // On-Air only: have we stepped through the {year} folder into the schedule?
  // (false → show the single year folder card; true → the existing Day/DJ view)
  const [inYear, setInYear] = useState(false);
  // How the folder tree is grouped at the top level.
  //   "day" → Day › Time › files (the original schedule view)
  //   "dj"  → DJ › that DJ's on-air mixes for the week (mirrors D:\WCCG\b-mixshows\<dj>\on-air)
  const [groupBy, setGroupBy] = useState<"day" | "dj">("dj");
  // Navigation path. Meaning depends on groupBy:
  //   day-mode: [] = days, [day] = slots in day, [day, slotId] = files
  //   dj-mode:  [] = DJ folders, [djKey] = that DJ's on-air mixes
  const [path, setPath] = useState<Array<number | string>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  // The "slot.id|code" of the row whose upload is currently in flight.
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

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
      const [{ data: s, error: sErr }, { data: d }, { data: dj }, { data: mx }] = await Promise.all([
        supabase
          .from("dj_slots")
          .select("id,dj_id,day_of_week,start_time,end_time,file_codes,status,notes,djs(slug,display_name)")
          .order("day_of_week")
          .order("start_time"),
        supabase
          .from("dj_drops")
          .select("id,slot_id,file_code,status,storage_path,format,size_bytes,uploaded_at")
          .eq("week_of", weekOf),
        supabase.from("djs").select("id,slug,display_name").eq("is_active", true).order("display_name"),
        // Off-Air / Digital catalog. RLS governs visibility (published, staff, or
        // owning DJ); the dj-mixes bucket is public so audio_url plays directly.
        supabase
          .from("dj_mixes")
          .select("id, dj_id, host_id, title, description, audio_url, cover_image_url, duration, genre, play_count, item_type, is_published, created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (sErr) throw new Error(sErr.message);
      setSlots((s ?? []) as unknown as Slot[]);
      setDrops((d ?? []) as Drop[]);
      setDjs((dj ?? []) as DjRef[]);
      setMixes((mx ?? []) as MixItem[]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [weekOf]);

  useEffect(() => { load(); }, [load]);

  // Deep-link (one-shot): jump straight to a slot or a DJ folder once the
  // schedule has loaded. A self-scoped DJ viewer (selfDjId) wins over all deep
  // links and lands directly in their own By-DJ folder. Otherwise ?dj=<id>
  // wins over ?slot=<id>; ?dj opens the By-DJ grouping at that DJ's on-air
  // folder, ?slot opens the By-Day file view.
  // All deep links / self-scope resolve INTO the On-Air section, through the
  // {year} folder, to the right By-DJ / By-Day target. setState is kept out of
  // the synchronous effect body (react-hooks/set-state-in-effect): a queued
  // microtask applies everything once, behind the focusedRef guard.
  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current) return;
    if (selfDjId) {
      // A DJ viewing their own folder: land them there once, even before slots
      // load (their folder is the only place they go). Done on mount, not
      // gated on slots, so a DJ with no slots yet still lands correctly.
      focusedRef.current = true;
      queueMicrotask(() => { setSection("onair"); setInYear(true); setGroupBy("dj"); setPath([selfDjId]); });
      return;
    }
    if (focusDjId) {
      // The By-DJ folder is seeded for every active DJ (see `djFolders`), so land
      // straight in it as soon as the roster OR schedule has loaded — even if this
      // DJ has no slot this week. (Previously this required a slot, which stranded
      // the admin at the root when they clicked "Media" for a DJ with nothing
      // scheduled this week — the "I get lost" report.)
      if (djs.length === 0 && slots.length === 0) return; // wait for the first load
      focusedRef.current = true;
      queueMicrotask(() => { setSection("onair"); setInYear(true); setGroupBy("dj"); setPath([focusDjId]); });
      return;
    }
    if (slots.length === 0) return;
    if (focusSlotId) {
      const slot = slots.find((s) => s.id === focusSlotId);
      if (!slot) return;
      focusedRef.current = true;
      queueMicrotask(() => { setSection("onair"); setInYear(true); setGroupBy("day"); setPath([slot.day_of_week, slot.id]); });
    }
  }, [selfDjId, focusDjId, focusSlotId, slots, djs]);

  // Drops keyed by slot+code for quick lookup
  const dropByKey = useMemo(() => {
    const m = new Map<string, Drop>();
    for (const d of drops) m.set(`${d.slot_id}|${d.file_code}`, d);
    return m;
  }, [drops]);

  // The On-Air {year} folder label. Mirrors local D:\WCCG\Mixshows\<YYYY>\;
  // derived from the active week (a Monday ISO date) so week-nav within a year
  // stays under the same folder.
  const year = weekOf.slice(0, 4);

  // Resolve a dj_id to a display name from the loaded DJs / scheduled slots,
  // falling back to the id so a folder always has a label.
  const djNameById = useCallback(
    (id: string): string => {
      const fromList = djs.find((d) => d.id === id)?.display_name;
      if (fromList) return fromList;
      const fromSlot = slots.find((s) => s.dj_id === id)?.djs?.display_name;
      return fromSlot ?? id;
    },
    [djs, slots],
  );

  // Days that have slots, in production order
  const daysWithSlots = useMemo(() => {
    const present = new Set(slots.map((s) => s.day_of_week));
    return DAY_ORDER.filter((d) => present.has(d));
  }, [slots]);

  const slotsForDay = (day: number) =>
    slots.filter((s) => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));

  // ── By-DJ grouping ───────────────────────────────────────────────────────
  // A flat on-air mix the player/file-row can render: one file_code from a
  // specific slot. We carry the owning slot so play/download act on it exactly
  // as the By-Day view does.
  interface DjMix { slot: Slot; code: string; drop: Drop | undefined; present: boolean }

  // Group slots → DJ folders. Each folder is keyed by dj_id (or the Unassigned
  // sentinel), ordered with named DJs A→Z first and Unassigned last. Only DJs
  // that actually have a slot get a folder. `fileCount` counts on-air files
  // (uploaded/validated/published drops) across the DJ's slots this week.
  const djFolders = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; slots: Slot[] }>();
    // Seed a folder for every active DJ so admins see the full roster — even
    // DJs with no slots or uploads yet.
    for (const d of djs) {
      groups.set(d.id, { key: d.id, label: d.display_name, slots: [] });
    }
    for (const s of slots) {
      const key = s.dj_id ?? UNASSIGNED_DJ_KEY;
      const existing = groups.get(key);
      if (existing) existing.slots.push(s);
      else groups.set(key, { key, label: key === UNASSIGNED_DJ_KEY ? "Unassigned" : (s.djs?.display_name ?? djNameById(key)), slots: [s] });
    }
    return Array.from(groups.values())
      .map((g) => {
        let fileCount = 0;
        for (const s of g.slots) {
          for (const code of s.file_codes) {
            const d = dropByKey.get(`${s.id}|${code}`);
            if (d && d.storage_path && PLAYABLE_STATUSES.includes(d.status)) fileCount++;
          }
        }
        return { ...g, fileCount };
      })
      .sort((a, b) => {
        if (a.key === UNASSIGNED_DJ_KEY) return 1;
        if (b.key === UNASSIGNED_DJ_KEY) return -1;
        return a.label.localeCompare(b.label);
      });
  }, [djs, slots, dropByKey, djNameById]);

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

  // Upload (or replace) a single file_code for a slot. Mirrors the DJ portal's
  // upload (browser → Supabase Storage → dj_drops upsert). RLS scopes writes:
  // a DJ may only write their own drops; staff may write any. The slot must
  // route to a DJ (dj_id + slug) so the storage path + drop row are valid.
  const handleUpload = useCallback(async (slot: Slot, code: string, file: File) => {
    const slug = slot.djs?.slug;
    if (!slot.dj_id || !slug) return;
    const key = `${slot.id}|${code}`;
    setError(null);

    // Validate: audio only + ≤ 200 MB (mixes are large).
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|flac|m4a|ogg)$/i.test(file.name);
    if (!isAudio) {
      setError(`"${file.name}" is not an audio file. Upload mp3, wav, flac, m4a, or ogg.`);
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)} MB — over the 200 MB limit.`);
      return;
    }

    setUploadingKey(key);
    try {
      const supabase = createClient();
      const ext = (file.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)?.[1] ?? "mp3").toLowerCase();
      const storagePath = `${slug}/${weekOf}/${code}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("dj-drops")
        .upload(storagePath, file, { upsert: true, contentType: file.type || `audio/${ext}` });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

      const { error: rowErr } = await supabase.from("dj_drops").upsert(
        {
          dj_id: slot.dj_id,
          slot_id: slot.id,
          file_code: code,
          week_of: weekOf,
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

      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingKey(null);
    }
  }, [weekOf, load]);

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

  // In day-mode: 0 days, 1 day, 2 slot.  In dj-mode: 0 DJ folders, 1 DJ's mixes.
  const level = path.length;
  const currentDay = groupBy === "day" && level >= 1 ? (path[0] as number) : null;
  const currentSlot = groupBy === "day" && level >= 2 ? slots.find((s) => s.id === path[1]) : null;

  // The DJ folder currently open (dj-mode, level 1).
  const currentDjKey = groupBy === "dj" && level >= 1 ? (path[0] as string) : null;
  const currentDjFolder = useMemo(
    () => (currentDjKey ? djFolders.find((f) => f.key === currentDjKey) ?? null : null),
    [currentDjKey, djFolders],
  );

  // Flat on-air mix list for the open DJ folder: every file_code across that
  // DJ's slots (sorted by day then start time), each tied to its owning slot.
  const djMixes = useMemo<DjMix[]>(() => {
    if (!currentDjFolder) return [];
    const ordered = [...currentDjFolder.slots].sort(
      (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week) || a.start_time.localeCompare(b.start_time),
    );
    const out: DjMix[] = [];
    for (const slot of ordered) {
      for (const code of slot.file_codes) {
        const drop = dropByKey.get(`${slot.id}|${code}`);
        const present = !!drop && !!drop.storage_path && PLAYABLE_STATUSES.includes(drop.status);
        out.push({ slot, code, drop, present });
      }
    }
    return out;
  }, [currentDjFolder, dropByKey]);

  // ── Multi-select over the active view's UPLOADED files ────────────────────
  // Unified selection model: one entry per selectable (on-air) file in the
  // current view, carrying its owning slot so play/download act correctly in
  // both the By-Day file view and the By-DJ folder. Only on-air files are
  // selectable (you can't act on a missing file).
  const selectableItems = useMemo<{ slot: Slot; code: string; drop: Drop }[]>(() => {
    const src = currentSlot
      ? currentSlot.file_codes.map((code) => ({ slot: currentSlot, code }))
      : currentDjFolder
        ? djMixes.map(({ slot, code }) => ({ slot, code }))
        : [];
    return src
      .map(({ slot, code }) => ({ slot, code, drop: dropByKey.get(`${slot.id}|${code}`) }))
      .filter((x): x is { slot: Slot; code: string; drop: Drop } =>
        !!x.drop && !!x.drop.storage_path && PLAYABLE_STATUSES.includes(x.drop.status));
  }, [currentSlot, currentDjFolder, djMixes, dropByKey]);

  // The currently-selected entries, in view order.
  const selectedDrops = useMemo(
    () => selectableItems.filter((x) => selected.has(x.drop.id)),
    [selectableItems, selected],
  );

  const allSelected = selectableItems.length > 0 && selectedDrops.length === selectableItems.length;

  // Clear selection whenever we leave the file/DJ view or switch slot/DJ/week.
  useEffect(() => {
    setSelected(new Set());
    setAnchorCode(null);
  }, [currentSlot?.id, currentDjKey, weekOf]);

  // Toggle a row, honouring shift (range from anchor) + ctrl/cmd (toggle).
  // `key` identifies the row within the current view (slot|code), so the same
  // code under different slots stays distinct in the By-DJ view.
  const toggleSelect = useCallback((dropId: string, key: string, e: React.MouseEvent) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && anchorCode) {
        const a = selectableItems.findIndex((x) => `${x.slot.id}|${x.code}` === anchorCode);
        const b = selectableItems.findIndex((x) => `${x.slot.id}|${x.code}` === key);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(selectableItems[i].drop.id);
          return next;
        }
      }
      // ctrl/cmd or plain click → toggle this one
      if (next.has(dropId)) next.delete(dropId);
      else next.add(dropId);
      return next;
    });
    if (!e.shiftKey) setAnchorCode(key);
  }, [anchorCode, selectableItems]);

  const selectAllOrClear = useCallback(() => {
    if (allSelected) { setSelected(new Set()); return; }
    setSelected(new Set(selectableItems.map((x) => x.drop.id)));
  }, [allSelected, selectableItems]);

  // Bulk: play every selected file as a queue (in view order).
  const playSelected = useCallback(() => {
    const tracks = selectedDrops.map(({ code, drop }) => trackForDrop(code, drop));
    playQueue(tracks);
  }, [selectedDrops, trackForDrop, playQueue]);

  // Bulk: open signed URLs for every selected file. Selected files may span
  // multiple slots (By-DJ view), so resolve each via its own owning slot.
  const downloadSelected = useCallback(() => {
    void (async () => {
      for (const { slot, code } of selectedDrops) await downloadDrops(slot, [code]);
    })();
  }, [downloadDrops, selectedDrops]);

  // Switch the top-level grouping; reset navigation to that grouping's root.
  const setGrouping = useCallback((g: "day" | "dj") => {
    setGroupBy(g);
    setPath([]);
  }, []);

  // ── Self-scoping (a DJ viewing their own folder) ──────────────────────────
  // When selfDjId is set we hide the grouping toggle + create button and only
  // ever surface this DJ's own folder. The focus effect forces By-DJ + opens
  // their folder; this just guarantees the folder grid (the slotless fallback)
  // never leaks other DJs.
  const isSelfScoped = !!selfDjId;
  const visibleDjFolders = useMemo(
    () => (isSelfScoped ? djFolders.filter((f) => f.key === selfDjId) : djFolders),
    [isSelfScoped, djFolders, selfDjId],
  );

  // ── Off-Air / Digital catalog (dj_mixes) ──────────────────────────────────
  // Level 0: one folder per DJ that has mixes (keyed by dj_id, so it lines up
  // with selfDjId / focusDjId and the on-air By-DJ folders). Mixes with no DJ
  // bucket under the Unassigned sentinel. Self-scoped viewers see only their own.
  const digitalFolders = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; mixes: MixItem[] }>();
    // Seed every active DJ so admins get a folder per DJ even with no mixes yet.
    for (const d of djs) {
      groups.set(d.id, { key: d.id, label: d.display_name, mixes: [] });
    }
    for (const m of mixes) {
      const key = m.dj_id ?? UNASSIGNED_DJ_KEY;
      const existing = groups.get(key);
      if (existing) existing.mixes.push(m);
      else groups.set(key, { key, label: key === UNASSIGNED_DJ_KEY ? "Unassigned" : djNameById(key), mixes: [m] });
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === UNASSIGNED_DJ_KEY) return 1;
      if (b.key === UNASSIGNED_DJ_KEY) return -1;
      return a.label.localeCompare(b.label);
    });
  }, [djs, mixes, djNameById]);

  const visibleDigitalFolders = useMemo(
    () => (isSelfScoped ? digitalFolders.filter((f) => f.key === selfDjId) : digitalFolders),
    [isSelfScoped, digitalFolders, selfDjId],
  );

  // The digital DJ folder currently open (digital section, level ≥ 1). Reuses
  // `path` exactly like the on-air By-DJ view: path[0] holds the dj_id.
  const currentDigitalKey = section === "digital" && path.length >= 1 ? (path[0] as string) : null;
  const currentDigitalFolder = useMemo(
    () => (currentDigitalKey ? digitalFolders.find((f) => f.key === currentDigitalKey) ?? null : null),
    [currentDigitalKey, digitalFolders],
  );

  // Build a player queue from a DJ folder's mixes. The dj-mixes bucket is public
  // so audio_url is directly playable — no signed-URL resolve step needed.
  const trackForMix = useCallback(
    (m: MixItem): PlayerTrack => ({ id: m.id, name: m.title, src: m.audio_url }),
    [],
  );

  // Play one mix; queue = its whole DJ folder so prev/next walk that catalog.
  const playMix = useCallback((folderMixes: MixItem[], mix: MixItem) => {
    if (!mix.audio_url) return;
    const tracks = folderMixes.filter((m) => m.audio_url).map(trackForMix);
    const start = Math.max(0, tracks.findIndex((t) => t.id === mix.id));
    setQueue(tracks);
    setPlayerIndex(start);
  }, [trackForMix]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {/* "My Mixshows" home → back to the two category cards. */}
          <button
            onClick={() => { setSection(null); setInYear(false); setPath([]); }}
            className="inline-flex items-center gap-1 font-bold text-foreground hover:text-[#74ddc7]"
          >
            <Home className="h-3.5 w-3.5" /> My Mixshows
          </button>

          {/* Category crumb. */}
          {section !== null && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => { setInYear(false); setPath([]); }}
                className={`font-bold transition-colors ${
                  section === "onair" && !inYear ? "text-[#74ddc7]" : section === "digital" && path.length === 0 ? "text-[#74ddc7]" : "text-foreground hover:text-[#74ddc7]"
                }`}
              >
                {section === "onair" ? "On-Air Mixshows" : "Off-Air / Digital Mixshows"}
              </button>
            </>
          )}

          {/* On-Air: {year} crumb (once inside the year). */}
          {section === "onair" && inYear && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button onClick={() => setPath([])} className={`font-bold transition-colors ${level === 0 ? "text-[#74ddc7]" : "text-foreground hover:text-[#74ddc7]"}`}>
                {year}
              </button>
            </>
          )}

          {section === "onair" && inYear && groupBy === "day" && currentDay !== null && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button onClick={() => setPath([currentDay])} className="font-bold text-foreground hover:text-[#74ddc7]">
                {DAY_NAMES[currentDay]} · {fmtDate(dateForDay(weekOf, currentDay))}
              </button>
            </>
          )}
          {section === "onair" && inYear && groupBy === "day" && currentSlot && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-[#74ddc7]">{fmt12h(currentSlot.start_time)}</span>
            </>
          )}
          {section === "onair" && inYear && groupBy === "dj" && currentDjFolder && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-[#74ddc7]">{currentDjFolder.label}</span>
            </>
          )}

          {/* Digital: open DJ folder crumb. */}
          {section === "digital" && currentDigitalFolder && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-[#74ddc7]">{currentDigitalFolder.label}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* On-Air, inside the {year}: By Day (schedule) vs By DJ (per-DJ on-air
              folder), the week nav, and the admin Create button. These only make
              sense once you're inside the year's schedule. Hidden for a
              self-scoped DJ — they only ever see their own folder. */}
          {section === "onair" && inYear && (
            <>
              {!isSelfScoped && (
                <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs">
                  <button
                    onClick={() => setGrouping("day")}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold transition-colors ${groupBy === "day" ? "bg-[#74ddc7] text-[#0a0a0f]" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> By Day
                  </button>
                  <button
                    onClick={() => setGrouping("dj")}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold transition-colors ${groupBy === "dj" ? "bg-[#7401df] text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Users className="h-3.5 w-3.5" /> By DJ
                  </button>
                </div>
              )}
              {/* Week nav */}
              <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5 text-xs">
                <button onClick={() => setWeekOf((w) => addWeeks(w, -1))} className="rounded-full px-2 py-1 hover:bg-foreground/[0.06]">‹</button>
                <span className="inline-flex items-center gap-1 px-1 font-mono"><Calendar className="h-3 w-3" />{weekOf}</span>
                <button onClick={() => setWeekOf((w) => addWeeks(w, 1))} className="rounded-full px-2 py-1 hover:bg-foreground/[0.06]">›</button>
              </div>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={load} className="rounded-full text-xs">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {/* Admin-only: a self-scoped DJ can't create slots, only drop files. */}
          {section === "onair" && inYear && !isSelfScoped && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-full bg-[#7401df] text-white hover:bg-[#7401df]/90">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create new mixshow
            </Button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {section === null ? (
        /* ── Category root: the two top-level folders ── */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => { setSection("onair"); setInYear(false); setPath([]); }}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-[#74ddc7]/40"
          >
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
              <Folder className="h-8 w-8 text-[#74ddc7]" />
              <Radio className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card p-0.5 text-[#7401df]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground group-hover:text-[#74ddc7]">On-Air Mixshows</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Scheduled broadcast drops</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setSection("digital"); setInYear(false); setPath([]); }}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-[#74ddc7]/40"
          >
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
              <Folder className="h-8 w-8 text-[#74ddc7]" />
              <Disc3 className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card p-0.5 text-[#7401df]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground group-hover:text-[#74ddc7]">Off-Air / Digital Mixshows</p>
              <p className="mt-0.5 text-xs text-muted-foreground">On-demand mixes &amp; podcasts</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      ) : section === "digital" ? (
        /* ── Off-Air / Digital (dj_mixes) ── */
        loading && mixes.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading digital mixes…</div>
        ) : currentDigitalFolder ? (
          /* One DJ's on-demand mixes. */
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${playerIndex !== null ? "pb-24" : ""}`}>
            {currentDigitalFolder.mixes.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                No digital mixes yet.
              </p>
            )}
            {currentDigitalFolder.mixes.map((mix) => {
              const isNowPlaying = playerIndex !== null && queue[playerIndex]?.id === mix.id;
              return (
                <div
                  key={mix.id}
                  className={`group overflow-hidden rounded-2xl border bg-card transition-all ${
                    isNowPlaying ? "border-[#74ddc7]/50" : "border-border hover:border-[#74ddc7]/40"
                  }`}
                >
                  <div className="relative h-32 overflow-hidden">
                    {mix.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mix.cover_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/30 to-[#74ddc7]/15">
                        <Music className="h-10 w-10 text-[#74ddc7]" />
                      </div>
                    )}
                    {mix.item_type === "podcast" && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#7401df] px-2 py-0.5 text-[10px] font-bold text-white">
                        <Podcast className="h-3 w-3" /> Podcast
                      </span>
                    )}
                    {mix.duration != null && mix.duration > 0 && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                        {fmtClock(mix.duration)}
                      </span>
                    )}
                    <button
                      onClick={() => playMix(currentDigitalFolder.mixes, mix)}
                      aria-label={isNowPlaying ? "Now playing" : "Play mix"}
                      className={`absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] shadow-lg transition-all hover:bg-[#74ddc7]/90 ${
                        isNowPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isNowPlaying ? <Volume2 className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="space-y-1 p-3.5">
                    <p className={`truncate text-sm font-bold ${isNowPlaying ? "text-[#74ddc7]" : "text-foreground"}`}>{mix.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {mix.genre && <span className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-medium">{mix.genre}</span>}
                      <span className="inline-flex items-center gap-1"><Play className="h-3 w-3" /> {mix.play_count ?? 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DJ folders for the digital catalog. */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleDigitalFolders.map((folder) => (
              <button key={folder.key} onClick={() => setPath([folder.key])} className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 transition-all hover:border-[#74ddc7]/40">
                <div className="relative">
                  <Folder className="h-9 w-9 text-[#74ddc7]" />
                  <Disc3 className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-card text-[#7401df]" />
                </div>
                <p className="text-center font-bold text-foreground group-hover:text-[#74ddc7]">
                  {folder.key === UNASSIGNED_DJ_KEY ? <span className="italic text-amber-500">Unassigned</span> : folder.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{folder.mixes.length} mix{folder.mixes.length === 1 ? "" : "es"}</p>
              </button>
            ))}
            {visibleDigitalFolders.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                No digital mixes yet.
              </p>
            )}
          </div>
        )
      ) : !inYear ? (
        /* ── On-Air: the {year} folder (mirrors D:\WCCG\Mixshows\<YYYY>\) ── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button onClick={() => { setInYear(true); setPath([]); }} className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 transition-all hover:border-[#74ddc7]/40">
            <div className="relative">
              <Folder className="h-9 w-9 text-[#74ddc7]" />
              <Calendar className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-card text-[#7401df]" />
            </div>
            <p className="font-bold text-foreground group-hover:text-[#74ddc7]">{year}</p>
            <p className="text-[11px] text-muted-foreground">Broadcast schedule</p>
          </button>
        </div>
      ) : loading && slots.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…</div>
      ) : groupBy === "dj" ? (
        currentDjFolder ? (
          /* ── One DJ's on-air mixes (flat, every airing this week) ── */
          <div className={`space-y-2 ${playerIndex !== null ? "pb-24" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserCircle2 className="h-3.5 w-3.5" />
                {currentDjFolder.label} · on-air mixes · week of {weekOf}
              </span>
              {selectableItems.length > 0 && (
                <button
                  onClick={selectAllOrClear}
                  className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-[#74ddc7]"
                >
                  {allSelected ? <CheckSquare className="h-3.5 w-3.5 text-[#74ddc7]" /> : <Square className="h-3.5 w-3.5" />}
                  {allSelected ? "Clear" : "Select all"}
                </button>
              )}
            </div>
            {djMixes.length === 0 && (
              <p className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                No mixshow files for this DJ this week.
              </p>
            )}
            {djMixes.map(({ slot, code, drop, present }) => {
              const rowKey = `${slot.id}|${code}`;
              const isSelected = !!drop && selected.has(drop.id);
              const isNowPlaying = playerIndex !== null && !!drop && queue[playerIndex]?.id === drop.id;
              return (
                <FileRow
                  key={rowKey}
                  slot={slot}
                  code={code}
                  drop={drop}
                  present={present}
                  isSelected={isSelected}
                  isNowPlaying={isNowPlaying}
                  busyUrl={busyUrl}
                  rowKey={rowKey}
                  subtitle={`${DAY_NAMES[slot.day_of_week]} · ${fmt12h(slot.start_time)}–${fmt12h(slot.end_time)}`}
                  canUpload={!!slot.dj_id && !!slot.djs?.slug}
                  uploading={uploadingKey === rowKey}
                  onToggleSelect={toggleSelect}
                  onPlay={playDrop}
                  onUpload={handleUpload}
                />
              );
            })}
          </div>
        ) : (
          /* ── DJ folders ── */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleDjFolders.map((folder) => (
              <button key={folder.key} onClick={() => setPath([folder.key])} className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 transition-all hover:border-[#74ddc7]/40">
                <div className="relative">
                  <Folder className="h-9 w-9 text-[#74ddc7]" />
                  <UserCircle2 className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-card text-[#7401df]" />
                </div>
                <p className="text-center font-bold text-foreground group-hover:text-[#74ddc7]">
                  {folder.key === UNASSIGNED_DJ_KEY ? <span className="italic text-amber-500">Unassigned</span> : folder.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{folder.fileCount} on-air file{folder.fileCount === 1 ? "" : "s"}</p>
              </button>
            ))}
            {visibleDjFolders.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                {isSelfScoped
                  ? "No mixshow slots assigned to you yet. Reach out to production to get scheduled."
                  : "No DJs scheduled yet. Click “Create new mixshow”."}
              </p>
            )}
          </div>
        )
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
            {selectableItems.length > 0 && (
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
            const rowKey = `${currentSlot.id}|${code}`;
            const drop = dropByKey.get(rowKey);
            const present = !!drop && !!drop.storage_path && PLAYABLE_STATUSES.includes(drop.status);
            const isSelected = !!drop && selected.has(drop.id);
            const isNowPlaying = playerIndex !== null && !!drop && queue[playerIndex]?.id === drop.id;
            return (
              <FileRow
                key={code}
                slot={currentSlot}
                code={code}
                drop={drop}
                present={present}
                isSelected={isSelected}
                isNowPlaying={isNowPlaying}
                busyUrl={busyUrl}
                rowKey={rowKey}
                canUpload={!!currentSlot.dj_id && !!currentSlot.djs?.slug}
                uploading={uploadingKey === rowKey}
                onToggleSelect={toggleSelect}
                onPlay={playDrop}
                onUpload={handleUpload}
              />
            );
          })}
        </div>
      ) : null}

      {/* Sticky bulk-action bar (file / DJ view, ≥1 selected) */}
      {selectedDrops.length > 0 && (
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
