"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { createClient } from "@/lib/supabase/client";
import { ProductionMixshows } from "@/components/studio/production-mixshows";
import Link from "next/link";
import {
  FolderOpen,
  FolderPlus,
  CalendarPlus,
  Upload,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  Folder,
  FileAudio,
  MoreHorizontal,
  Trash2,
  Pencil,
  Move,
  Copy,
  Scissors,
  ClipboardPaste,
  Clock,
  HardDrive,
  CloudUpload,
  X,
  Check,
  Home,
  Search,
  Mic,
  Wrench,
  ArrowLeftRight,
  Tag,
  Server,
  RefreshCw,
  Download,
  ChevronDown,
  AlertCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaCategory = "mix" | "commercial" | "promo" | "voiceover" | "music_bed" | "jingle" | "liner" | "other";
type AudioFormat = "wav" | "mp3" | "m4a" | "webm" | "ogg";

interface MediaFile {
  id: string;
  name: string;
  type: "file";
  category: MediaCategory;
  format: AudioFormat;
  duration?: number;
  size: number;
  folderId: string | null;
  djbName?: string;
  /** Optional playable source. Demo/seed files have none → Play shows a toast. */
  url?: string;
  createdAt: string;
  updatedAt: string;
}

/** A track the bottom audio player can load. */
interface PlayerTrack {
  id: string;
  name: string;
  src: string;
}

interface MediaFolder {
  id: string;
  name: string;
  type: "folder";
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DJBPattern {
  prefix: string;
  separator: string;
  includeCartNumber: boolean;
  nextCartNumber: number;
  targetFormat: AudioFormat;
}

interface FTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "error" | "pending";
}

interface MediaManagerState {
  files: MediaFile[];
  folders: MediaFolder[];
  djbPattern: DJBPattern;
  ftpConfig?: FTPConfig;
}

// Old mix type for migration
interface LegacyMix {
  id: string;
  title: string;
  genre: string;
  duration: number;
  playCount: number;
  status: string;
  createdAt: string;
  fileSize?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "wccg_media_manager";
const LEGACY_KEY = "wccg_dj_mixes";

// Custom MIME marking our internal file drag payload (a JSON array of file ids),
// so folder/breadcrumb drop targets only react to in-app file drags.
const DRAG_FILE_MIME = "application/x-wccg-media-files";

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  mix: "Mix",
  commercial: "Commercial",
  promo: "Promo",
  voiceover: "Voiceover",
  music_bed: "Music Bed",
  jingle: "Jingle",
  liner: "Liner",
  other: "Other",
};

const CATEGORY_COLORS: Record<MediaCategory, string> = {
  mix: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  commercial: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  promo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  voiceover: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  music_bed: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  jingle: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  liner: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  other: "bg-foreground/[0.06] text-muted-foreground border-border",
};

const FORMAT_COLORS: Record<string, string> = {
  wav: "bg-blue-500/10 text-blue-400",
  mp3: "bg-emerald-500/10 text-emerald-400",
  m4a: "bg-purple-500/10 text-purple-400",
  webm: "bg-amber-500/10 text-amber-400",
  ogg: "bg-red-500/10 text-red-400",
};

const CATEGORIES: MediaCategory[] = ["mix", "commercial", "promo", "voiceover", "music_bed", "jingle", "liner", "other"];

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const now = new Date().toISOString();

// Station-asset folders only. On-air DJ mixes are NOT seeded here — they live
// in the dedicated "DJ Mixshows" view (the live schedule, backed by dj_drops),
// the single home for mixes. A look-alike "DJ Mixes" folder used to be seeded
// here too, which spawned a confusing empty parallel tree; it was removed so
// the library is unambiguously for commercials, promos, voiceovers, and beds.
const SEED_FOLDERS: MediaFolder[] = [
  { id: "mf2", name: "Commercials", type: "folder", parentId: null, createdAt: "2026-02-05T10:00:00Z", updatedAt: now },
  { id: "mf3", name: "Promos", type: "folder", parentId: null, createdAt: "2026-02-10T10:00:00Z", updatedAt: now },
  { id: "mf4", name: "Voiceovers", type: "folder", parentId: null, createdAt: "2026-02-15T10:00:00Z", updatedAt: now },
  { id: "mf5", name: "Music Beds", type: "folder", parentId: null, createdAt: "2026-02-20T10:00:00Z", updatedAt: now },
];

const SEED_FILES: MediaFile[] = [
  { id: "fl3", name: "Spring Auto Sale 30s.wav", type: "file", category: "commercial", format: "wav", duration: 30, size: 4_800_000, folderId: "mf2", createdAt: "2026-03-01T10:00:00Z", updatedAt: now },
  { id: "fl4", name: "Health Fair Spot 15s.wav", type: "file", category: "commercial", format: "wav", duration: 15, size: 2_400_000, folderId: "mf2", createdAt: "2026-03-03T14:00:00Z", updatedAt: now },
  { id: "fl5", name: "Weekend Events Promo.mp3", type: "file", category: "promo", format: "mp3", duration: 22, size: 3_600_000, folderId: "mf3", createdAt: "2026-03-02T09:00:00Z", updatedAt: now },
  // A couple of seed files carry a real public sample URL so the inline player
  // is demonstrable; the rest are url-less (Play → "No audio source" toast).
  { id: "fl6", name: "WCCG Station ID.wav", type: "file", category: "jingle", format: "wav", duration: 8, size: 1_200_000, folderId: null, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", createdAt: "2026-01-15T10:00:00Z", updatedAt: now },
  { id: "fl7", name: "Smooth Jazz Bed.wav", type: "file", category: "music_bed", format: "wav", duration: 60, size: 12_000_000, folderId: "mf5", createdAt: "2026-02-25T16:00:00Z", updatedAt: now },
  { id: "fl8", name: "Morning Show Intro VO.mp3", type: "file", category: "voiceover", format: "mp3", duration: 12, size: 1_800_000, folderId: "mf4", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", createdAt: "2026-02-18T08:00:00Z", updatedAt: now },
];

const DEFAULT_DJB: DJBPattern = {
  prefix: "DJB",
  separator: "_",
  includeCartNumber: true,
  nextCartNumber: 1001,
  targetFormat: "wav",
};

function seedState(): MediaManagerState {
  return { files: SEED_FILES, folders: SEED_FOLDERS, djbPattern: DEFAULT_DJB };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Folder tree operations (pure; operate on folders[] + files[]) ─────────

/** All folder ids nested under rootId (DFS pre-order, parents before children). */
function descendantFolderIds(folders: MediaFolder[], rootId: string): string[] {
  const out: string[] = [];
  const walk = (parentId: string) => {
    for (const f of folders) {
      if (f.parentId === parentId) {
        out.push(f.id);
        walk(f.id);
      }
    }
  };
  walk(rootId);
  return out;
}

/** True if maybeAncestor is rootId or any ancestor of it — used to block moving a folder into itself/its own subtree. */
function isSelfOrDescendant(folders: MediaFolder[], rootId: string, maybeDescendantId: string | null): boolean {
  if (maybeDescendantId === null) return false;
  if (maybeDescendantId === rootId) return true;
  return descendantFolderIds(folders, rootId).includes(maybeDescendantId);
}

/** Remove a folder + every nested folder + every file inside any of them. */
function deleteFolderDeep(
  folders: MediaFolder[],
  files: MediaFile[],
  rootId: string,
): { folders: MediaFolder[]; files: MediaFile[] } {
  const doomed = new Set<string>([rootId, ...descendantFolderIds(folders, rootId)]);
  return {
    folders: folders.filter((f) => !doomed.has(f.id)),
    files: files.filter((f) => !(f.folderId && doomed.has(f.folderId))),
  };
}

/** Deep-clone a folder subtree (+ its files) under newParentId, with fresh ids. */
function cloneFolderTree(
  folders: MediaFolder[],
  files: MediaFile[],
  rootId: string,
  newParentId: string | null,
  rootName: string,
): { folders: MediaFolder[]; files: MediaFile[] } {
  const ts = new Date().toISOString();
  const idMap = new Map<string, string>();
  const newFolders: MediaFolder[] = [];

  const root = folders.find((f) => f.id === rootId);
  if (!root) return { folders: [], files: [] };

  const newRootId = generateId();
  idMap.set(rootId, newRootId);
  newFolders.push({ ...root, id: newRootId, name: rootName, parentId: newParentId, createdAt: ts, updatedAt: ts });

  for (const childId of descendantFolderIds(folders, rootId)) {
    const child = folders.find((f) => f.id === childId)!;
    const nid = generateId();
    idMap.set(childId, nid);
    newFolders.push({
      ...child,
      id: nid,
      parentId: child.parentId ? idMap.get(child.parentId) ?? newParentId : newParentId,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const oldIds = new Set([rootId, ...descendantFolderIds(folders, rootId)]);
  const newFiles: MediaFile[] = files
    .filter((f) => f.folderId && oldIds.has(f.folderId))
    .map((f) => ({ ...f, id: generateId(), folderId: idMap.get(f.folderId as string)!, createdAt: ts, updatedAt: ts }));

  return { folders: newFolders, files: newFiles };
}

/** Ensure a name is unique among siblings under parentId by appending " copy"/" (n)". */
function uniqueFolderName(folders: MediaFolder[], parentId: string | null, base: string): string {
  const siblings = new Set(folders.filter((f) => f.parentId === parentId).map((f) => f.name));
  if (!siblings.has(base)) return base;
  let candidate = `${base} copy`;
  let n = 2;
  while (siblings.has(candidate)) candidate = `${base} copy ${n++}`;
  return candidate;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(1)} KB`;
}

/** mm:ss clock for the player's current/total time. */
function fmtClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFormat(filename: string): AudioFormat {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "wav" || ext === "mp3" || ext === "m4a" || ext === "webm" || ext === "ogg") return ext;
  return "mp3";
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

// ---------------------------------------------------------------------------
// Persistence — per-user, DB-backed
//
// The library used to live ONLY in browser localStorage under a single global
// key, so folders/files were lost on a cache clear or a different device and
// weren't tied to the account. It's now stored per-user in Supabase
// (media_manager_state), with localStorage kept only as a fast cache / offline
// fallback and as a one-time recovery source for libraries built before this.
// ---------------------------------------------------------------------------

function userStorageKey(userId: string | null): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

/** Read a cached/legacy library from localStorage: the per-user key, then the
 *  old global key, then the even-older dj_mixes migration. Null if none. */
function loadLocalState(userId: string | null): MediaManagerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(userStorageKey(userId)) ||
      (userId ? localStorage.getItem(STORAGE_KEY) : null);
    if (raw) return JSON.parse(raw) as MediaManagerState;

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const mixes: LegacyMix[] = JSON.parse(legacy);
      const migratedFiles: MediaFile[] = mixes.map((m) => ({
        id: m.id,
        name: `${m.title}.mp3`,
        type: "file" as const,
        category: "mix" as MediaCategory,
        format: "mp3" as AudioFormat,
        duration: m.duration,
        size: m.fileSize ?? 0,
        folderId: null,
        createdAt: m.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      return {
        files: [...migratedFiles, ...SEED_FILES.filter((sf) => !migratedFiles.find((mf) => mf.id === sf.id))],
        folders: SEED_FOLDERS,
        djbPattern: DEFAULT_DJB,
      };
    }
  } catch { /* ignore */ }
  return null;
}

function persistLocalState(userId: string | null, state: MediaManagerState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(userStorageKey(userId), JSON.stringify(state)); } catch { /* ignore */ }
}

/** Untouched seed library (no real edits)? Lets us avoid a pristine seed row in
 *  the DB clobbering genuine edits still sitting in this browser's localStorage. */
function isPristineSeed(s: MediaManagerState): boolean {
  const seedIds = new Set(SEED_FOLDERS.map((f) => f.id));
  return (
    s.folders.length === SEED_FOLDERS.length &&
    s.folders.every((f) => seedIds.has(f.id)) &&
    s.files.length === SEED_FILES.length
  );
}

/**
 * Load the signed-in user's library. The DB is the source of truth; on first
 * use we migrate any local/legacy library into the DB (recovering work made
 * before DB persistence), and if the DB only holds a pristine seed we still
 * prefer real local edits. Falls back to local cache/seed when signed out or
 * the DB is unreachable.
 */
async function loadStateForUser(userId: string | null): Promise<MediaManagerState> {
  if (!userId) return loadLocalState(null) ?? seedState();

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from("media_manager_state")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();

    const local = loadLocalState(userId);

    if (data?.state) {
      const dbState = data.state as MediaManagerState;
      // Recover: the DB only has the seed but this device has real edits.
      if (local && isPristineSeed(dbState) && !isPristineSeed(local)) {
        await supabase.from("media_manager_state").upsert(
          { user_id: userId, state: local, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
        persistLocalState(userId, local);
        return local;
      }
      persistLocalState(userId, dbState);
      return dbState;
    }

    // No DB row yet → seed it from local edits (recovery) or the default seed.
    const initial = local ?? seedState();
    await supabase.from("media_manager_state").upsert(
      { user_id: userId, state: initial, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    persistLocalState(userId, initial);
    return initial;
  } catch {
    return loadLocalState(userId) ?? seedState();
  }
}

let _mmSaveTimer: ReturnType<typeof setTimeout> | null = null;
/** Persist on change: localStorage immediately (cache), DB debounced (per user). */
function persistStateForUser(userId: string | null, state: MediaManagerState) {
  persistLocalState(userId, state);
  if (!userId) return;
  if (_mmSaveTimer) clearTimeout(_mmSaveTimer);
  _mmSaveTimer = setTimeout(() => {
    createClient()
      .from("media_manager_state")
      .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .then(() => {}, () => {});
  }, 700);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BreadcrumbNav({
  path,
  onNavigate,
  onDropRoot,
  rootDropActive,
  onRootDragOver,
  onRootDragLeave,
}: {
  path: { id: string; name: string }[];
  onNavigate: (index: number) => void;
  onDropRoot?: (e: React.DragEvent) => void;
  rootDropActive?: boolean;
  onRootDragOver?: (e: React.DragEvent) => void;
  onRootDragLeave?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide">
      <button
        onClick={() => onNavigate(-1)}
        onDragOver={onRootDragOver}
        onDragLeave={onRootDragLeave}
        onDrop={onDropRoot}
        className={`flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors shrink-0 ${
          rootDropActive
            ? "bg-[#74ddc7]/15 text-[#74ddc7] ring-1 ring-[#74ddc7]/40"
            : "text-muted-foreground hover:text-[#74ddc7]"
        }`}
      >
        <Home className="h-3.5 w-3.5" />
        <span className="font-medium">My Media</span>
      </button>
      {path.map((crumb, i) => (
        <div key={crumb.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3.5 w-3.5 text-foreground/20" />
          <button
            onClick={() => onNavigate(i)}
            className={`font-medium transition-colors ${
              i === path.length - 1 ? "text-foreground" : "text-muted-foreground hover:text-[#74ddc7]"
            }`}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Fixed bottom audio player. Driven by a queue + active index from the parent.
 * One <audio> element; play/pause, seek with current/total time, prev/next
 * through the queue, mute, and the now-playing name.
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
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const track = queue[index] as PlayerTrack | undefined;
  const hasPrev = index > 0;
  const hasNext = index < queue.length - 1;

  // Load + autoplay the active track when the index/track changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    setCurrent(0);
    setDuration(0);
    el.src = track.src;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, track?.id]);

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
      />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4">
        {/* Now playing */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
            <FileAudio className="h-5 w-5 text-[#74ddc7]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{track.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {queue.length > 1 ? `Track ${index + 1} of ${queue.length}` : "Now playing"}
            </p>
          </div>
        </div>

        {/* Transport */}
        <div className="flex shrink-0 items-center gap-1">
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
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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

        {/* Mute + close */}
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

const FOLDER_MENU: { key: string; icon: typeof Pencil; label: string; danger?: boolean }[] = [
  { key: "open", icon: FolderOpen, label: "Open" },
  { key: "rename", icon: Pencil, label: "Rename" },
  { key: "copy", icon: Copy, label: "Copy" },
  { key: "cut", icon: Scissors, label: "Cut (move)" },
  { key: "delete", icon: Trash2, label: "Delete", danger: true },
];

function FolderMenu({
  folder,
  onAction,
  align = "right",
}: {
  folder: MediaFolder;
  onAction: (action: string, folder: MediaFolder) => void;
  align?: "right" | "center";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Folder actions"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-foreground/[0.08] hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className={`absolute ${align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"} top-full mt-1 z-20 w-40 rounded-xl border border-border bg-card p-1.5 shadow-2xl`}>
            {FOLDER_MENU.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(item.key, folder); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                  item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FolderCard({
  folder,
  onClick,
  onAction,
  itemCount,
  viewMode,
  onDropFiles,
}: {
  folder: MediaFolder;
  onClick: () => void;
  onAction: (action: string, folder: MediaFolder) => void;
  itemCount: number;
  viewMode: "grid" | "list";
  /** Called when file(s) are dropped onto this folder (drag-to-move target). */
  onDropFiles: (folderId: string) => void;
}) {
  const [dropActive, setDropActive] = useState(false);

  // Shared DnD handlers — folders accept the app's internal file drag payload.
  const dndProps = {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_FILE_MIME)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropActive(true);
      }
    },
    onDragLeave: () => setDropActive(false),
    onDrop: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_FILE_MIME)) {
        e.preventDefault();
        setDropActive(false);
        onDropFiles(folder.id);
      }
    },
  };

  if (viewMode === "list") {
    return (
      <div
        {...dndProps}
        className={`group flex items-center gap-4 w-full rounded-xl border bg-card p-3 sm:p-4 transition-all ${
          dropActive ? "border-[#74ddc7] ring-2 ring-[#74ddc7]/30 bg-[#74ddc7]/[0.04]" : "border-border hover:border-input"
        }`}
      >
        <button onClick={onClick} className="flex flex-1 items-center gap-4 min-w-0 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
            <Folder className="h-5 w-5 text-[#74ddc7]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">{folder.name}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{dropActive ? "Drop to move here" : `${itemCount} items`}</p>
          </div>
          <div className="hidden sm:block text-xs text-muted-foreground/60">{formatDate(folder.createdAt)}</div>
        </button>
        <FolderMenu folder={folder} onAction={onAction} />
      </div>
    );
  }

  return (
    <div
      {...dndProps}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 transition-all text-center ${
        dropActive ? "border-[#74ddc7] ring-2 ring-[#74ddc7]/30 bg-[#74ddc7]/[0.04]" : "border-border hover:border-input"
      }`}
    >
      <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <FolderMenu folder={folder} onAction={onAction} />
      </div>
      <button onClick={onClick} className="flex flex-col items-center gap-3 w-full">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border transition-colors ${dropActive ? "border-[#74ddc7]/50" : "border-border group-hover:border-[#74ddc7]/20"}`}>
          <Folder className="h-8 w-8 text-[#74ddc7]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate max-w-[140px]">{folder.name}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">{dropActive ? "Drop to move here" : `${itemCount} items`}</p>
        </div>
      </button>
    </div>
  );
}

function FileCard({
  file,
  viewMode,
  onAction,
  selected,
  onToggleSelect,
  onDragStartFile,
  onDragEndFile,
  onPlay,
  isPlaying,
}: {
  file: MediaFile;
  viewMode: "grid" | "list";
  onAction: (action: string, file: MediaFile) => void;
  selected: boolean;
  onToggleSelect: (file: MediaFile, e: React.MouseEvent) => void;
  onDragStartFile: (file: MediaFile, e: React.DragEvent) => void;
  onDragEndFile: () => void;
  onPlay: (file: MediaFile) => void;
  isPlaying: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { key: "play", icon: Play, label: "Play" },
    { key: "rename", icon: Pencil, label: "Rename" },
    { key: "copy", icon: Copy, label: "Copy" },
    { key: "cut", icon: Scissors, label: "Cut (move)" },
    { key: "move", icon: Move, label: "Move to..." },
    { key: "convert", icon: ArrowLeftRight, label: "Convert Format" },
    { key: "djb", icon: Tag, label: "DJB Rename" },
    { key: "download", icon: Download, label: "Download" },
    { key: "delete", icon: Trash2, label: "Delete", danger: true },
  ];

  // Drag payload is set by the parent (so it can include the whole selection).
  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => onDragStartFile(file, e),
    onDragEnd: onDragEndFile,
  };

  if (viewMode === "list") {
    return (
      <div
        {...dragProps}
        className={`group flex items-center gap-3 w-full rounded-xl border bg-card p-3 sm:p-4 transition-all ${
          selected ? "border-[#74ddc7]/60 ring-1 ring-[#74ddc7]/30 bg-[#74ddc7]/[0.04]" : "border-border hover:border-input"
        }`}
      >
        {/* Selection checkbox */}
        <button
          onClick={(e) => onToggleSelect(file, e)}
          aria-label={selected ? "Deselect file" : "Select file"}
          className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-[#74ddc7]"
        >
          {selected ? <CheckSquare className="h-4.5 w-4.5 text-[#74ddc7]" /> : <Square className="h-4.5 w-4.5" />}
        </button>
        {/* Drag handle + Play */}
        <button
          onClick={() => onPlay(file)}
          aria-label="Play file"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-[#7401df]/10 to-[#74ddc7]/5 text-muted-foreground transition-colors hover:border-[#74ddc7]/40 hover:text-[#74ddc7]"
        >
          {isPlaying ? <Volume2 className="h-5 w-5 text-[#74ddc7]" /> : <Play className="h-4.5 w-4.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isPlaying ? "text-[#74ddc7]" : "text-foreground"}`}>{file.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[file.category]}`}>
              {CATEGORY_LABELS[file.category]}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${FORMAT_COLORS[file.format] || "bg-foreground/[0.06] text-muted-foreground"}`}>
              {file.format}
            </span>
            {file.duration !== undefined && (
              <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(file.duration)}
              </span>
            )}
            {file.size > 0 && (
              <span className="hidden sm:block text-xs text-muted-foreground/60">{formatFileSize(file.size)}</span>
            )}
            {file.djbName && (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">DJB</span>
            )}
          </div>
        </div>
        <div className="hidden sm:block text-xs text-muted-foreground/60 shrink-0">{formatDate(file.createdAt)}</div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-border bg-card p-1.5 shadow-2xl max-h-64 overflow-y-auto">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setMenuOpen(false); onAction(item.key, file); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                      item.danger
                        ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                        : "text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div
      {...dragProps}
      className={`group relative overflow-hidden rounded-2xl border bg-card transition-all ${
        selected ? "border-[#74ddc7]/60 ring-1 ring-[#74ddc7]/30" : "border-border hover:border-input"
      }`}
    >
      <div className="relative h-20 overflow-hidden bg-gradient-to-br from-[#7401df]/10 to-[#74ddc7]/5 flex items-center justify-center">
        <FileAudio className="h-8 w-8 text-foreground/10" />
        {file.duration !== undefined && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {formatDuration(file.duration)}
          </div>
        )}
        <div className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${FORMAT_COLORS[file.format] || "bg-foreground/[0.06] text-muted-foreground"}`}>
          {file.format}
        </div>
        {/* Selection checkbox (always visible when selected; else on hover) */}
        <button
          onClick={(e) => onToggleSelect(file, e)}
          aria-label={selected ? "Deselect file" : "Select file"}
          className={`absolute top-2 right-9 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm transition-all hover:bg-black/70 ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {selected ? <CheckSquare className="h-4 w-4 text-[#74ddc7]" /> : <Square className="h-4 w-4" />}
        </button>
        {/* Play overlay button (center, on hover) */}
        <button
          onClick={() => onPlay(file)}
          aria-label="Play file"
          className={`absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] shadow-lg transition-all hover:bg-[#74ddc7]/90 ${
            isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isPlaying ? <Volume2 className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5" />}
        </button>
        {/* Menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/70 hover:bg-black/70 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-border bg-card p-1.5 shadow-2xl max-h-64 overflow-y-auto">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setMenuOpen(false); onAction(item.key, file); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                      item.danger
                        ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                        : "text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="p-3.5 space-y-1.5">
        <p className={`text-sm font-semibold truncate ${isPlaying ? "text-[#74ddc7]" : "text-foreground"}`}>{file.name}</p>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[file.category]}`}>
            {CATEGORY_LABELS[file.category]}
          </span>
          {file.size > 0 && <span className="text-[11px] text-muted-foreground/60">{formatFileSize(file.size)}</span>}
        </div>
      </div>
    </div>
  );
}

function UploadDropzone({
  onClose,
  onUpload,
  currentFolderId: _currentFolderId,
}: {
  onClose: () => void;
  onUpload: (files: { name: string; size: number; category: MediaCategory }[]) => void;
  currentFolderId: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<MediaCategory>("other");
  const [uploading, setUploading] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/x-m4a", "audio/mp4", "audio/ogg", "audio/webm"].includes(f.type) ||
      /\.(mp3|wav|m4a|ogg|webm)$/i.test(f.name)
    );
    setQueuedFiles((prev) => [...prev, ...dropped]);
  }, []);

  return (
    <div className="rounded-2xl border-2 border-dashed border-input bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Upload Audio Files</h3>
        <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category picker */}
      <div>
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MediaCategory)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {/* Drop area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-8 transition-colors cursor-pointer ${
          dragOver ? "border-[#74ddc7] bg-[#74ddc7]/10" : "border-border hover:border-foreground/20 hover:bg-foreground/[0.02]"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".mp3,.wav,.m4a,.ogg,.webm";
          input.multiple = true;
          input.onchange = (e) => {
            const selected = Array.from((e.target as HTMLInputElement).files ?? []);
            setQueuedFiles((prev) => [...prev, ...selected]);
          };
          input.click();
        }}
      >
        <CloudUpload className="h-10 w-10 text-foreground/20 mb-3" />
        <p className="text-sm font-medium text-foreground/60">Drag & drop audio files here</p>
        <p className="text-xs text-muted-foreground/70 mt-1">or click to browse &mdash; .mp3, .wav, .m4a, .ogg, .webm</p>
      </div>

      {/* Queued files */}
      {queuedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {queuedFiles.length} file{queuedFiles.length !== 1 ? "s" : ""} ready
          </p>
          {queuedFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-foreground/[0.04] px-3 py-2">
              <FileAudio className="h-4 w-4 text-[#74ddc7] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground/70">{formatFileSize(file.size)}</p>
              </div>
              <button onClick={() => setQueuedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground/70 hover:text-red-400 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            disabled={uploading || complete}
            onClick={() => {
              setUploading(true);
              setTimeout(() => {
                onUpload(queuedFiles.map((f) => ({ name: f.name, size: f.size, category })));
                setUploading(false);
                setComplete(true);
                setTimeout(() => { setQueuedFiles([]); setComplete(false); onClose(); }, 800);
              }, 1200);
            }}
            className="w-full rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] text-white font-bold hover:opacity-90"
          >
            {complete ? (
              <><Check className="mr-2 h-4 w-4" /> Upload complete!</>
            ) : uploading ? (
              <><CloudUpload className="mr-2 h-4 w-4 animate-pulse" /> Uploading...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Upload {queuedFiles.length} File{queuedFiles.length !== 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function NewFolderInput({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#74ddc7]/30 bg-[#74ddc7]/5 p-3">
      <Folder className="h-5 w-5 text-[#74ddc7] shrink-0" />
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSubmit(name.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder="Folder name..."
        className="flex-1 h-8 text-sm bg-transparent border-0 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <button onClick={() => name.trim() && onSubmit(name.trim())} className="h-7 w-7 flex items-center justify-center rounded-full text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onCancel} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function ConverterModal({
  file,
  onClose,
  onConvert,
}: {
  file: MediaFile;
  onClose: () => void;
  onConvert: (file: MediaFile, targetFormat: AudioFormat) => void;
}) {
  const targetFormat: AudioFormat = file.format === "wav" ? "mp3" : "wav";
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-[#74ddc7]" /> Convert Format
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Source</span>
            <span className="font-medium text-foreground">{file.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Format</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${FORMAT_COLORS[file.format]}`}>{file.format}</span>
          </div>
          <div className="border-t border-border my-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Convert To</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${FORMAT_COLORS[targetFormat]}`}>{targetFormat}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Output</span>
            <span className="font-medium text-foreground">{stripExtension(file.name)}.{targetFormat}</span>
          </div>
        </div>

        {converting && !done && (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] animate-pulse" style={{ width: "70%" }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">Converting...</p>
          </div>
        )}

        {done && (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400">
            <Check className="h-4 w-4" /> Conversion complete!
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            disabled={converting || done}
            onClick={() => {
              setConverting(true);
              setTimeout(() => {
                setDone(true);
                onConvert(file, targetFormat);
                setTimeout(onClose, 800);
              }, 1500);
            }}
            className="flex-1 bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90 font-bold"
          >
            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
            Convert to {targetFormat.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DJBRenameModal({
  file,
  pattern,
  onClose,
  onApply,
}: {
  file: MediaFile;
  pattern: DJBPattern;
  onClose: () => void;
  onApply: (file: MediaFile, newName: string, cartNumber: number) => void;
}) {
  const [cartNumber, setCartNumber] = useState(pattern.nextCartNumber);
  const [title, setTitle] = useState(stripExtension(file.name));

  const preview = useMemo(() => {
    const parts = [pattern.prefix];
    if (pattern.includeCartNumber) parts.push(String(cartNumber).padStart(4, "0"));
    parts.push(title.replace(/\s+/g, pattern.separator));
    return parts.join(pattern.separator) + "." + pattern.targetFormat;
  }, [pattern, cartNumber, title]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-400" /> DJB Rename
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Original File</label>
            <p className="text-sm text-foreground font-medium">{file.name}</p>
          </div>

          {pattern.includeCartNumber && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Cart Number</label>
              <input
                type="number"
                value={cartNumber}
                onChange={(e) => setCartNumber(Number(e.target.value) || 0)}
                className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
            />
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <label className="text-[11px] font-medium text-amber-400 uppercase tracking-wider mb-1 block">Preview</label>
            <p className="text-sm font-mono font-bold text-foreground break-all">{preview}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => onApply(file, preview, cartNumber)}
            className="flex-1 bg-amber-500 text-[#0a0a0f] hover:bg-amber-500/90 font-bold"
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            Apply Rename
          </Button>
        </div>
      </div>
    </div>
  );
}

function FTPSettingsModal({
  config,
  onClose,
  onSave,
}: {
  config: FTPConfig | undefined;
  onClose: () => void;
  onSave: (config: FTPConfig) => void;
}) {
  const [host, setHost] = useState(config?.host || "");
  const [port, setPort] = useState(config?.port || 21);
  const [username, setUsername] = useState(config?.username || "");
  const [password, setPassword] = useState(config?.password || "");
  const [remotePath, setRemotePath] = useState(config?.remotePath || "/");
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-400" /> FTP Settings
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">Configure FTP connection to sync files with the station file server.</p>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Host</label>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="ftp.wccg.com" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Port</label>
              <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 21)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Remote Path</label>
            <input type="text" value={remotePath} onChange={(e) => setRemotePath(e.target.value)} placeholder="/" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50" />
          </div>
        </div>

        {config?.lastSyncAt && (
          <p className="text-xs text-muted-foreground">
            Last sync: {formatDate(config.lastSyncAt)} &mdash;{" "}
            <span className={config.lastSyncStatus === "success" ? "text-emerald-400" : "text-red-400"}>
              {config.lastSyncStatus}
            </span>
          </p>
        )}

        {saved && (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400">
            <Check className="h-4 w-4" /> Configuration saved!
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!host || testing}
            onClick={() => {
              setTesting(true);
              setTimeout(() => { setTesting(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 1500);
            }}
            className="flex-1"
          >
            {testing ? <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Testing...</> : "Test Connection"}
          </Button>
          <Button
            disabled={!host || !username}
            onClick={() => {
              onSave({ host, port, username, password, remotePath, lastSyncAt: config?.lastSyncAt, lastSyncStatus: config?.lastSyncStatus });
              setSaved(true);
              setTimeout(() => { setSaved(false); onClose(); }, 800);
            }}
            className="flex-1 bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/90 font-bold"
          >
            <Server className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function MoveToFolderModal({
  file,
  folders,
  onClose,
  onMove,
}: {
  file: MediaFile;
  folders: MediaFolder[];
  onClose: () => void;
  onMove: (fileId: string, folderId: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Move className="h-4 w-4 text-[#74ddc7]" /> Move to Folder
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground truncate">Moving: {file.name}</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onMove(file.id, null); onClose(); }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              file.folderId === null ? "bg-[#74ddc7]/10 text-[#74ddc7]" : "text-foreground hover:bg-foreground/[0.04]"
            }`}
          >
            <Home className="h-4 w-4" /> Root (My Media)
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => { onMove(file.id, f.id); onClose(); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                file.folderId === f.id ? "bg-[#74ddc7]/10 text-[#74ddc7]" : "text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              <Folder className="h-4 w-4" /> {f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Bulk variant of MoveToFolderModal — moves N selected files at once. */
function MoveManyToFolderModal({
  count,
  folders,
  onClose,
  onMove,
}: {
  count: number;
  folders: MediaFolder[];
  onClose: () => void;
  onMove: (folderId: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Move className="h-4 w-4 text-[#74ddc7]" /> Move {count} File{count !== 1 ? "s" : ""}
          </h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Choose a destination for the selected file{count !== 1 ? "s" : ""}.</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <button
            onClick={() => { onMove(null); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/[0.04]"
          >
            <Home className="h-4 w-4" /> Root (My Media)
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => { onMove(f.id); onClose(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              <Folder className="h-4 w-4" /> {f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const emptySubscribe = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export default function MediaManagerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isManagement, isProduction, isAdmin, isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  // Production-tier users can switch the manager to the live DJ-mixshow
  // schedule view (Day > Time > files), backed by dj_slots / dj_drops.
  const canSeeProduction = isProduction || isManagement || isAdmin || isSuperAdmin;
  const [managerMode, setManagerMode] = useState<"media" | "mixshows">("media");
  const [focusSlotId, setFocusSlotId] = useState<string | undefined>(undefined);
  const [focusDjId, setFocusDjId] = useState<string | undefined>(undefined);

  // The viewer's own DJ id (if their account is linked to a DJ profile). A DJ
  // who isn't production/admin gets a self-scoped mixshow folder: they land in
  // their own folder and can drop files, but never see other DJs.
  const [viewerDjId, setViewerDjId] = useState<string | null>(null);
  // Only self-scope a DJ to their own folder once roles have RESOLVED. While
  // useUserRoles is still loading, canSeeProduction is transiently false, which
  // would briefly flip an admin/production user into "DJ viewer" and pass their
  // own DJ id as selfDjId — ProductionMixshows' one-shot focus then locks onto
  // that folder and the ?dj=<id> deep-link is ignored (admin clicking "Folder"
  // for another DJ landed on their OWN folder). Gating on !rolesLoading keeps
  // selfDjId undefined for staff so the deep-link wins.
  const isDjViewer = !!viewerDjId && !canSeeProduction && !rolesLoading;
  // Tracks whether managerMode has been seeded yet (by a deep-link or the
  // DJ-viewer default) so async DJ resolution can't stomp a manual choice.
  const modeSeededRef = useRef(false);

  // Resolve the viewer's DJ id once auth settles, and default a self-scoped DJ
  // viewer into their mixshow folder. All setState happens inside the async
  // callback behind the `active` guard (never synchronously in the effect
  // body) so we satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void (async () => {
      if (!user) {
        if (active) setViewerDjId(null);
        return;
      }
      const { data } = await createClient()
        .from("djs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const djId = (data?.id as string | undefined) ?? null;
      setViewerDjId(djId);
      // Staff/admin land in the Media Manager FILES (the asset library) — its
      // home is the files, and DJ Mixshows is a folder there (see the On-Air
      // card), NOT the default view. Only a DJ-only viewer (a DJ who isn't
      // staff) defaults into their own mixshow folder. A deep-link or a manual
      // toggle (which set modeSeededRef) still wins.
      if (djId && !canSeeProduction && !modeSeededRef.current) {
        modeSeededRef.current = true;
        setManagerMode("mixshows");
      }
    })();
    return () => { active = false; };
  }, [authLoading, user, canSeeProduction]);

  // Deep-link from the DJ-slots admin:
  //   ?view=mixshows&slot=<id> opens the production view on that slot's files.
  //   ?view=mixshows&dj=<id>   opens that DJ's By-DJ on-air folder.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const slot = params.get("slot") || undefined;
      const dj = params.get("dj") || undefined;
      if (params.get("view") === "mixshows" || slot || dj) {
        modeSeededRef.current = true;
        setManagerMode("mixshows");
      }
      if (slot) setFocusSlotId(slot);
      if (dj) setFocusDjId(dj);
    });
    return () => { active = false; };
  }, []);

  const mounted = useSyncExternalStore(emptySubscribe, getHydratedSnapshot, getServerSnapshot);
  const [state, setState] = useState<MediaManagerState>(seedState());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | "all">("all");
  const [showUploader, setShowUploader] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [showTools, setShowTools] = useState(false);

  // Modal state
  const [convertFile, setConvertFile] = useState<MediaFile | null>(null);
  const [djbFile, setDjbFile] = useState<MediaFile | null>(null);
  const [moveFile, setMoveFile] = useState<MediaFile | null>(null);
  const [showFTP, setShowFTP] = useState(false);
  const [syncingFolder, setSyncingFolder] = useState(false);
  const [clipboard, setClipboard] = useState<
    { kind: "folder" | "file"; id: string; op: "copy" | "cut"; name: string } | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);

  // Multi-select (files in the current folder)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [anchorFileId, setAnchorFileId] = useState<string | null>(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  // Drag-to-move: ids being dragged (the dragged file, plus any selection).
  const draggingFileIds = useRef<string[]>([]);
  const [rootDropActive, setRootDropActive] = useState(false);

  // Inline audio player
  const [playerQueue, setPlayerQueue] = useState<PlayerTrack[]>([]);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);

  // Lightweight toast (e.g. "No audio source (demo file)")
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Load the user's library — DB-backed + per-user, so it survives cache clears
  // and syncs across devices. Falls back to the local cache/seed when signed
  // out or offline. Re-runs once auth resolves / the signed-in user changes.
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void (async () => {
      const loaded = await loadStateForUser(user?.id ?? null);
      if (active) setState(loaded);
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  // Persist on change — localStorage immediately, DB debounced (per user).
  const updateState = useCallback(
    (updater: (prev: MediaManagerState) => MediaManagerState) => {
      setState((prev) => {
        const next = updater(prev);
        persistStateForUser(user?.id ?? null, next);
        return next;
      });
    },
    [user?.id],
  );

  // ---------------------------------------------------------------------------
  // Current folder context
  // ---------------------------------------------------------------------------

  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;

  const currentFolders = useMemo(() => {
    return state.folders.filter((f) => f.parentId === currentFolderId);
  }, [state.folders, currentFolderId]);

  const currentFiles = useMemo(() => {
    let files = state.files.filter((f) => f.folderId === currentFolderId);
    if (categoryFilter !== "all") files = files.filter((f) => f.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      files = files.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    }
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.files, currentFolderId, categoryFilter, searchQuery]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery) return currentFolders;
    const q = searchQuery.toLowerCase();
    return currentFolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [currentFolders, searchQuery]);

  // Stats
  const totalFiles = state.files.length;
  const totalStorage = 5 * 1024 * 1024 * 1024;
  const usedStorage = state.files.reduce((sum, f) => sum + f.size, 0);
  const usagePercent = Math.round((usedStorage / totalStorage) * 100);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<MediaCategory, number>> = {};
    state.files.forEach((f) => { counts[f.category] = (counts[f.category] || 0) + 1; });
    return counts;
  }, [state.files]);

  // Item count per folder
  const folderItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.folders.forEach((f) => { counts[f.id] = 0; });
    state.files.forEach((f) => { if (f.folderId) counts[f.folderId] = (counts[f.folderId] || 0) + 1; });
    state.folders.forEach((f) => { if (f.parentId) counts[f.parentId] = (counts[f.parentId] || 0) + 1; });
    return counts;
  }, [state.files, state.folders]);

  // ---------------------------------------------------------------------------
  // Multi-select + drag + player derived state / handlers
  // ---------------------------------------------------------------------------

  // The file id currently loaded in the player (for now-playing highlight).
  const playingFileId = playerIndex !== null ? playerQueue[playerIndex]?.id ?? null : null;

  // Selection restricted to what's actually visible in the current folder.
  const visibleSelectedIds = useMemo(
    () => currentFiles.filter((f) => selectedFileIds.has(f.id)),
    [currentFiles, selectedFileIds],
  );
  const allVisibleSelected = currentFiles.length > 0 && visibleSelectedIds.length === currentFiles.length;

  // Toggle a file's selection, honouring shift (range) + ctrl/cmd (toggle).
  const toggleSelectFile = useCallback((file: MediaFile, e: React.MouseEvent) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && anchorFileId) {
        const a = currentFiles.findIndex((f) => f.id === anchorFileId);
        const b = currentFiles.findIndex((f) => f.id === file.id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(currentFiles[i].id);
          return next;
        }
      }
      if (next.has(file.id)) next.delete(file.id);
      else next.add(file.id);
      return next;
    });
    if (!e.shiftKey) setAnchorFileId(file.id);
  }, [anchorFileId, currentFiles]);

  const selectAllOrClear = useCallback(() => {
    if (allVisibleSelected) { setSelectedFileIds(new Set()); return; }
    setSelectedFileIds(new Set(currentFiles.map((f) => f.id)));
  }, [allVisibleSelected, currentFiles]);

  const clearSelection = useCallback(() => { setSelectedFileIds(new Set()); setAnchorFileId(null); }, []);

  // ── Inline player ────────────────────────────────────────────────────────
  // Play a file in the bottom bar. Demo files have no url → show a toast.
  const handlePlayFile = useCallback((file: MediaFile) => {
    if (!file.url) {
      showToast("No audio source (demo file)");
      return;
    }
    // Queue = all playable (url-bearing) files in the current folder, so
    // next/prev work; start at the clicked file.
    const playable = currentFiles.filter((f) => !!f.url);
    const tracks: PlayerTrack[] = playable.map((f) => ({ id: f.id, name: f.name, src: f.url as string }));
    const start = Math.max(0, tracks.findIndex((t) => t.id === file.id));
    setPlayerQueue(tracks);
    setPlayerIndex(start);
  }, [currentFiles, showToast]);

  // ── Drag-to-move ───────────────────────────────────────────────────────
  const handleDragStartFile = useCallback((file: MediaFile, e: React.DragEvent) => {
    // If the dragged file is part of the current selection, move the whole
    // selection; otherwise just this file.
    const ids = selectedFileIds.has(file.id) && selectedFileIds.size > 0
      ? Array.from(selectedFileIds)
      : [file.id];
    draggingFileIds.current = ids;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DRAG_FILE_MIME, JSON.stringify(ids));
    // Plain-text fallback so the drag is valid in all browsers.
    e.dataTransfer.setData("text/plain", file.name);
  }, [selectedFileIds]);

  const handleDragEndFile = useCallback(() => { draggingFileIds.current = []; }, []);

  // Move a set of files to a destination folder (or root) + persist.
  const moveFilesTo = useCallback((ids: string[], folderId: string | null) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    updateState((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        idSet.has(f.id) ? { ...f, folderId, updatedAt: new Date().toISOString() } : f,
      ),
    }));
  }, [updateState]);

  // Drop handler shared by folder cards.
  const handleDropOnFolder = useCallback((folderId: string) => {
    const ids = draggingFileIds.current;
    moveFilesTo(ids, folderId);
    draggingFileIds.current = [];
    setSelectedFileIds(new Set());
  }, [moveFilesTo]);

  // Breadcrumb "My Media" root drop target → move dragged file(s) to root.
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_FILE_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setRootDropActive(true);
    }
  }, []);
  const handleDropOnRoot = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_FILE_MIME)) {
      e.preventDefault();
      setRootDropActive(false);
      moveFilesTo(draggingFileIds.current, null);
      draggingFileIds.current = [];
      setSelectedFileIds(new Set());
    }
  }, [moveFilesTo]);

  // ── Bulk actions ───────────────────────────────────────────────────────
  // All bulk ops act on the *visible* selection so filtering/search can never
  // silently move or delete something the user can't currently see.
  const bulkMove = useCallback((folderId: string | null) => {
    moveFilesTo(visibleSelectedIds.map((f) => f.id), folderId);
    setSelectedFileIds(new Set());
  }, [moveFilesTo, visibleSelectedIds]);

  const bulkDownload = useCallback(() => {
    const withUrl = visibleSelectedIds.filter((f) => !!f.url);
    if (withUrl.length === 0) {
      showToast("No downloadable source (demo files)");
      return;
    }
    for (const f of withUrl) window.open(f.url as string, "_blank");
  }, [visibleSelectedIds, showToast]);

  const bulkDelete = useCallback(() => {
    const ids = visibleSelectedIds.map((f) => f.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} file${ids.length !== 1 ? "s" : ""}? This can't be undone.`)) return;
    const idSet = new Set(ids);
    updateState((prev) => ({ ...prev, files: prev.files.filter((f) => !idSet.has(f.id)) }));
    setSelectedFileIds(new Set());
  }, [visibleSelectedIds, updateState]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const navigateToFolder = (folder: MediaFolder) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery("");
    setCategoryFilter("all");
    clearSelection();
  };

  const breadcrumbNavigate = (index: number) => {
    setFolderPath((prev) => (index === -1 ? [] : prev.slice(0, index + 1)));
    setSearchQuery("");
    setCategoryFilter("all");
    clearSelection();
  };

  const createFolder = (name: string) => {
    updateState((prev) => ({
      ...prev,
      folders: [...prev.folders, {
        id: generateId(),
        name,
        type: "folder",
        parentId: currentFolderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    }));
    setShowNewFolder(false);
  };

  // Next Monday's dated on-air folder — auto-named from the dated folders in
  // the current folder (latest + 7 days), keeping their exact suffix style
  // (e.g. "onair" vs "on-air"). Shown only when this folder already holds at
  // least one MMDDYYYY-onair folder (i.e. you're inside a time-slot folder).
  const nextOnairFolder = useMemo(() => {
    const re = /^(\d{2})(\d{2})(\d{4})-(on-?air)$/i;
    let latest: { date: Date; suffix: string } | null = null;
    for (const f of currentFolders) {
      const m = f.name.match(re);
      if (!m) continue;
      const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
      if (Number.isNaN(d.getTime())) continue;
      if (!latest || d > latest.date) latest = { date: d, suffix: m[4] };
    }
    if (!latest) return null;
    const next = new Date(latest.date);
    next.setDate(next.getDate() + 7);
    const name =
      `${String(next.getMonth() + 1).padStart(2, "0")}` +
      `${String(next.getDate()).padStart(2, "0")}` +
      `${next.getFullYear()}-${latest.suffix}`;
    const exists = currentFolders.some((f) => f.name.toLowerCase() === name.toLowerCase());
    return { name, exists };
  }, [currentFolders]);

  const createNextMonday = () => {
    if (nextOnairFolder && !nextOnairFolder.exists) createFolder(nextOnairFolder.name);
  };

  // ─── Folder actions (rename / copy / cut / delete) ──────────────────────
  const handleFolderAction = (action: string, folder: MediaFolder) => {
    switch (action) {
      case "open":
        navigateToFolder(folder);
        break;
      case "rename": {
        const newName = window.prompt("Rename folder:", folder.name);
        if (newName && newName.trim() && newName.trim() !== folder.name) {
          updateState((prev) => ({
            ...prev,
            folders: prev.folders.map((f) =>
              f.id === folder.id ? { ...f, name: newName.trim(), updatedAt: new Date().toISOString() } : f,
            ),
          }));
        }
        break;
      }
      case "copy":
        setClipboard({ kind: "folder", id: folder.id, op: "copy", name: folder.name });
        break;
      case "cut":
        setClipboard({ kind: "folder", id: folder.id, op: "cut", name: folder.name });
        break;
      case "delete": {
        const childCount = folderItemCounts[folder.id] || 0;
        if (window.confirm(`Delete "${folder.name}"${childCount ? ` and its ${childCount} item(s)` : ""}? This can't be undone.`)) {
          updateState((prev) => {
            const { folders, files } = deleteFolderDeep(prev.folders, prev.files, folder.id);
            return { ...prev, folders, files };
          });
          if (clipboard?.id === folder.id) setClipboard(null);
        }
        break;
      }
    }
  };

  // ─── Paste clipboard into the current folder ────────────────────────────
  const handlePaste = () => {
    if (!clipboard) return;
    const dest = currentFolderId;

    if (clipboard.kind === "folder") {
      // Block pasting a folder into itself or its own subtree.
      if (clipboard.op === "cut" && isSelfOrDescendant(state.folders, clipboard.id, dest)) {
        alert("Can't move a folder into itself or one of its subfolders.");
        return;
      }
      updateState((prev) => {
        if (clipboard.op === "cut") {
          return {
            ...prev,
            folders: prev.folders.map((f) =>
              f.id === clipboard.id ? { ...f, parentId: dest, updatedAt: new Date().toISOString() } : f,
            ),
          };
        }
        // copy → deep clone with a unique name in the destination
        const name = uniqueFolderName(prev.folders, dest, clipboard.name);
        const cloned = cloneFolderTree(prev.folders, prev.files, clipboard.id, dest, name);
        return { ...prev, folders: [...prev.folders, ...cloned.folders], files: [...prev.files, ...cloned.files] };
      });
    } else {
      // file
      updateState((prev) => {
        const src = prev.files.find((f) => f.id === clipboard.id);
        if (!src) return prev;
        if (clipboard.op === "cut") {
          return {
            ...prev,
            files: prev.files.map((f) =>
              f.id === clipboard.id ? { ...f, folderId: dest, updatedAt: new Date().toISOString() } : f,
            ),
          };
        }
        const ts = new Date().toISOString();
        return { ...prev, files: [...prev.files, { ...src, id: generateId(), folderId: dest, createdAt: ts, updatedAt: ts }] };
      });
    }
    // cut is consumed after paste; copy stays so you can paste again
    if (clipboard.op === "cut") setClipboard(null);
  };

  // ─── Refresh: re-read persisted state + brief spinner ───────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    setState(seedState());
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleUpload = (uploaded: { name: string; size: number; category: MediaCategory }[]) => {
    const newFiles: MediaFile[] = uploaded.map((u) => ({
      id: generateId(),
      name: u.name,
      type: "file",
      category: u.category,
      format: getFormat(u.name),
      size: u.size,
      folderId: currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    updateState((prev) => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const handleFileAction = (action: string, file: MediaFile) => {
    switch (action) {
      case "play":
        handlePlayFile(file);
        break;
      case "rename": {
        const newName = window.prompt("Rename file:", file.name);
        if (newName && newName.trim() && newName.trim() !== file.name) {
          updateState((prev) => ({
            ...prev,
            files: prev.files.map((f) => f.id === file.id ? { ...f, name: newName.trim(), format: getFormat(newName.trim()), updatedAt: new Date().toISOString() } : f),
          }));
        }
        break;
      }
      case "copy":
        setClipboard({ kind: "file", id: file.id, op: "copy", name: file.name });
        break;
      case "cut":
        setClipboard({ kind: "file", id: file.id, op: "cut", name: file.name });
        break;
      case "move":
        setMoveFile(file);
        break;
      case "convert":
        setConvertFile(file);
        break;
      case "djb":
        setDjbFile(file);
        break;
      case "download":
        if (file.url) {
          window.open(file.url, "_blank");
        } else {
          // Demo/seed files have no source.
          showToast("No download source (demo file)");
        }
        break;
      case "delete":
        if (window.confirm(`Delete "${file.name}"?`)) {
          updateState((prev) => ({ ...prev, files: prev.files.filter((f) => f.id !== file.id) }));
        }
        break;
    }
  };

  const handleConvert = (file: MediaFile, targetFormat: AudioFormat) => {
    const newName = stripExtension(file.name) + "." + targetFormat;
    const newFile: MediaFile = {
      ...file,
      id: generateId(),
      name: newName,
      format: targetFormat,
      updatedAt: new Date().toISOString(),
    };
    updateState((prev) => ({ ...prev, files: [...prev.files, newFile] }));
  };

  const handleDJBRename = (file: MediaFile, newName: string, cartNumber: number) => {
    updateState((prev) => ({
      ...prev,
      files: prev.files.map((f) => f.id === file.id ? { ...f, name: newName, djbName: newName, updatedAt: new Date().toISOString() } : f),
      djbPattern: { ...prev.djbPattern, nextCartNumber: cartNumber + 1 },
    }));
    setDjbFile(null);
  };

  const handleMoveFile = (fileId: string, folderId: string | null) => {
    updateState((prev) => ({
      ...prev,
      files: prev.files.map((f) => f.id === fileId ? { ...f, folderId, updatedAt: new Date().toISOString() } : f),
    }));
  };

  const handleSaveFTP = (config: FTPConfig) => {
    updateState((prev) => ({ ...prev, ftpConfig: config }));
  };

  const handleSyncFolder = () => {
    if (!state.ftpConfig) { setShowFTP(true); return; }
    setSyncingFolder(true);
    setTimeout(() => {
      updateState((prev) => ({
        ...prev,
        ftpConfig: prev.ftpConfig ? { ...prev.ftpConfig, lastSyncAt: new Date().toISOString(), lastSyncStatus: "success" } : undefined,
      }));
      setSyncingFolder(false);
    }, 2000);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!mounted) return null;

  // Media | DJ Mixshows mode toggle. Shown to production-tier staff AND to DJ
  // viewers (so a DJ can flip between their personal media library and their
  // mixshow folder). A manual choice seeds the mode so async resolution won't
  // override it.
  const modeToggle = canSeeProduction || isDjViewer ? (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5">
      <button
        onClick={() => { modeSeededRef.current = true; setManagerMode("media"); }}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${managerMode === "media" ? "bg-[#74ddc7] text-[#0a0a0f]" : "text-muted-foreground hover:text-foreground"}`}
      >
        My Media
      </button>
      <button
        onClick={() => { modeSeededRef.current = true; setManagerMode("mixshows"); }}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${managerMode === "mixshows" ? "bg-[#7401df] text-white" : "text-muted-foreground hover:text-foreground"}`}
      >
        {isDjViewer ? "My Mixshows" : "DJ Mixshows"}
      </button>
    </div>
  ) : null;

  // DJ Mixshows schedule-as-folders view. Production-tier staff get the full
  // view (all DJs, create slots, upload on anyone's behalf); a DJ viewer gets
  // a self-scoped drop surface — their own folder only, where they upload.
  if (managerMode === "mixshows" && (canSeeProduction || isDjViewer)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-[#7401df]" />
              {isDjViewer ? "My Mixshows" : "DJ Mixshows"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isDjViewer
                ? "Your weekly mixshow folder — drop each week's files into their slot. Uploads appear here instantly."
                : "The live weekly schedule as folders — Day › Time › files. DJ uploads populate automatically."}
            </p>
          </div>
          {modeToggle}
        </div>
        <ProductionMixshows
          focusSlotId={focusSlotId}
          focusDjId={focusDjId}
          selfDjId={isDjViewer ? viewerDjId : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-[#74ddc7]" />
            Media Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Station assets — commercials, promos, jingles, voiceovers, and music beds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modeToggle}
          <Link
            href="/studio/audio-editor"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-fit"
          >
            <Mic className="h-4 w-4" />
            Record in Studio
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
        <HardDrive className="h-4 w-4 text-muted-foreground/70 shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground">
              {formatFileSize(usedStorage)} of {formatFileSize(totalStorage)} &middot; {totalFiles} files
            </span>
            <span className="text-[11px] text-muted-foreground/70">{usagePercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#74ddc7] to-[#7401df] transition-all" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span key={cat} className="text-[10px] text-muted-foreground bg-foreground/[0.04] px-2 py-0.5 rounded">
              {count} {CATEGORY_LABELS[cat as MediaCategory]}
            </span>
          ))}
        </div>
      </div>

      {/* Breadcrumb + Back */}
      <div className="flex items-center gap-2">
        {currentFolderId && (
          <button
            onClick={() => breadcrumbNavigate(folderPath.length - 2)}
            className="flex items-center gap-1.5 shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-[#74ddc7]/40 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back
          </button>
        )}
        <BreadcrumbNav
          path={folderPath}
          onNavigate={breadcrumbNavigate}
          onDropRoot={handleDropOnRoot}
          rootDropActive={rootDropActive}
          onRootDragOver={handleRootDragOver}
          onRootDragLeave={() => setRootDropActive(false)}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1" />
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 w-[140px] sm:w-[180px] pl-8 text-xs bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[#74ddc7]/30 focus-visible:ring-0"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as MediaCategory | "all")}
            className="h-8 rounded-lg border border-border bg-foreground/[0.04] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/30"
          >
            <option value="all">All Types</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>

          {/* Refresh */}
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]" aria-label="Refresh">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Paste (enabled when clipboard has something) */}
          {clipboard && (
            <Button variant="ghost" size="sm" onClick={handlePaste} className="h-8 text-xs text-[#74ddc7] hover:text-[#74ddc7] hover:bg-[#74ddc7]/10">
              <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
              Paste {clipboard.op === "cut" ? "(move)" : ""} “{clipboard.name.length > 14 ? clipboard.name.slice(0, 14) + "…" : clipboard.name}”
            </Button>
          )}

          {/* Create next Monday's on-air folder (contextual) */}
          {nextOnairFolder && !nextOnairFolder.exists && (
            <Button
              variant="ghost"
              size="sm"
              onClick={createNextMonday}
              title={`Create ${nextOnairFolder.name}`}
              className="h-8 text-xs text-[#7401df] hover:text-[#7401df] hover:bg-[#7401df]/10"
            >
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              Next Monday · {nextOnairFolder.name}
            </Button>
          )}

          {/* New Folder */}
          <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(true)} className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]">
            <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
            New Folder
          </Button>

          {/* Upload */}
          <Button size="sm" onClick={() => setShowUploader(!showUploader)} className="h-8 text-xs rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
          </Button>

          {/* Tools dropdown */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowTools(!showTools)} className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]">
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              Tools
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {showTools && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTools(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-border bg-card p-1.5 shadow-2xl">
                  <button
                    onClick={() => { setShowTools(false); /* Need to select a file first */ alert("Select a file first, then use Convert from its menu."); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Convert Format
                  </button>
                  <button
                    onClick={() => { setShowTools(false); alert("Select a file first, then use DJB Rename from its menu."); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
                  >
                    <Tag className="h-3.5 w-3.5" /> DJB Rename
                  </button>
                  {isManagement && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={() => { setShowTools(false); setShowFTP(true); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
                      >
                        <Server className="h-3.5 w-3.5" /> FTP Settings
                      </button>
                      {currentFolderId && (
                        <button
                          onClick={() => { setShowTools(false); handleSyncFolder(); }}
                          disabled={syncingFolder}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncingFolder ? "animate-spin" : ""}`} />
                          {syncingFolder ? "Syncing..." : "Sync Folder"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "list" ? "bg-foreground/[0.08] text-[#74ddc7]" : "text-muted-foreground/70 hover:text-foreground/60"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "grid" ? "bg-foreground/[0.08] text-[#74ddc7]" : "text-muted-foreground/70 hover:text-foreground/60"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      {showUploader && (
        <UploadDropzone
          onClose={() => setShowUploader(false)}
          onUpload={handleUpload}
          currentFolderId={currentFolderId}
        />
      )}

      {/* New Folder Input */}
      {showNewFolder && (
        <NewFolderInput onSubmit={createFolder} onCancel={() => setShowNewFolder(false)} />
      )}

      {/* Sync status banner */}
      {syncingFolder && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
          <span className="text-sm text-blue-400 font-medium">Syncing folder to FTP server...</span>
        </div>
      )}

      {/* Content */}
      <div className={`space-y-3 ${playerIndex !== null ? "pb-24" : visibleSelectedIds.length > 0 ? "pb-20" : ""}`}>
        {/* DJ Mixshows as a folder — opens the on-air by-DJ view. The Media
            Manager's home is the file library; mixes are one click in here. */}
        {currentFolderId === null && (canSeeProduction || isDjViewer) && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">On-Air</p>
            <button
              type="button"
              onClick={() => { modeSeededRef.current = true; setManagerMode("mixshows"); }}
              className="group flex w-full items-center gap-3 rounded-xl border border-[#7401df]/30 bg-[#7401df]/[0.06] p-4 text-left transition-all hover:border-[#7401df]/50 hover:bg-[#7401df]/10"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7401df]/30 bg-[#7401df]/15">
                <FolderOpen className="h-6 w-6 text-[#7401df]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground group-hover:text-[#7401df]">DJ Mixshows</p>
                <p className="text-xs text-muted-foreground">On-air scheduled mixes — by DJ</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Folders</p>
            <div className={viewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-2"}>
              {filteredFolders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} onClick={() => navigateToFolder(folder)} onAction={handleFolderAction} itemCount={folderItemCounts[folder.id] || 0} viewMode={viewMode} onDropFiles={handleDropOnFolder} />
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {currentFiles.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">Files</p>
              <button
                onClick={selectAllOrClear}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-[#74ddc7]"
              >
                {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5 text-[#74ddc7]" /> : <Square className="h-3.5 w-3.5" />}
                {allVisibleSelected ? "Clear" : "Select all"}
              </button>
            </div>
            <div className={viewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-2"}>
              {currentFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  onAction={handleFileAction}
                  selected={selectedFileIds.has(file.id)}
                  onToggleSelect={toggleSelectFile}
                  onDragStartFile={handleDragStartFile}
                  onDragEndFile={handleDragEndFile}
                  onPlay={handlePlayFile}
                  isPlaying={playingFileId === file.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredFolders.length === 0 && currentFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16">
            {searchQuery || categoryFilter !== "all" ? (
              <>
                <Search className="h-8 w-8 text-foreground/15 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No results found</p>
                <button onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }} className="text-xs text-[#74ddc7] hover:underline mt-2">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <CloudUpload className="h-10 w-10 text-foreground/15 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {currentFolderId ? "This folder is empty" : "No files yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                  Upload audio files or create a folder to get started
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setShowUploader(true)} className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80">
                    <Upload className="mr-2 h-4 w-4" /> Upload
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewFolder(true)}>
                    <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {convertFile && (
        <ConverterModal
          file={convertFile}
          onClose={() => setConvertFile(null)}
          onConvert={(file, fmt) => { handleConvert(file, fmt); setConvertFile(null); }}
        />
      )}
      {djbFile && (
        <DJBRenameModal
          file={djbFile}
          pattern={state.djbPattern}
          onClose={() => setDjbFile(null)}
          onApply={handleDJBRename}
        />
      )}
      {moveFile && (
        <MoveToFolderModal
          file={moveFile}
          folders={state.folders}
          onClose={() => setMoveFile(null)}
          onMove={handleMoveFile}
        />
      )}
      {showFTP && (
        <FTPSettingsModal
          config={state.ftpConfig}
          onClose={() => setShowFTP(false)}
          onSave={handleSaveFTP}
        />
      )}
      {bulkMoveOpen && (
        <MoveManyToFolderModal
          count={visibleSelectedIds.length}
          folders={state.folders}
          onClose={() => setBulkMoveOpen(false)}
          onMove={bulkMove}
        />
      )}

      {/* Sticky bulk-action bar (≥1 file selected) */}
      {visibleSelectedIds.length > 0 && (
        <div className={`fixed inset-x-0 z-30 px-4 ${playerIndex !== null ? "bottom-20" : "bottom-4"}`}>
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#74ddc7]/40 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#74ddc7] px-1.5 text-xs font-bold text-[#0a0a0f]">
                {visibleSelectedIds.length}
              </span>
              selected
              <button onClick={clearSelection} className="ml-1 text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setBulkMoveOpen(true)} className="rounded-full">
                <Move className="mr-1.5 h-3.5 w-3.5" /> Move
              </Button>
              <Button size="sm" variant="outline" onClick={bulkDownload} className="rounded-full">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
              </Button>
              <Button size="sm" variant="outline" onClick={bulkDelete} className="rounded-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast (e.g. no audio source for demo files) */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-2xl backdrop-blur">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            {toast}
          </div>
        </div>
      )}

      {/* Inline bottom player */}
      {playerIndex !== null && playerQueue.length > 0 && (
        <AudioPlayerBar
          queue={playerQueue}
          index={playerIndex}
          onIndexChange={setPlayerIndex}
          onClose={() => { setPlayerIndex(null); setPlayerQueue([]); }}
        />
      )}
    </div>
  );
}
