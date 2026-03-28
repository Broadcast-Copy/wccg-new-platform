"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import Link from "next/link";
import {
  FolderOpen,
  FolderPlus,
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
  FileText,
  ChevronDown,
  AlertCircle,
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
  createdAt: string;
  updatedAt: string;
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

const SEED_FOLDERS: MediaFolder[] = [
  { id: "mf1", name: "DJ Mixes", type: "folder", parentId: null, createdAt: "2026-02-01T10:00:00Z", updatedAt: now },
  { id: "mf2", name: "Commercials", type: "folder", parentId: null, createdAt: "2026-02-05T10:00:00Z", updatedAt: now },
  { id: "mf3", name: "Promos", type: "folder", parentId: null, createdAt: "2026-02-10T10:00:00Z", updatedAt: now },
  { id: "mf4", name: "Voiceovers", type: "folder", parentId: null, createdAt: "2026-02-15T10:00:00Z", updatedAt: now },
  { id: "mf5", name: "Music Beds", type: "folder", parentId: null, createdAt: "2026-02-20T10:00:00Z", updatedAt: now },
];

const SEED_FILES: MediaFile[] = [
  { id: "fl1", name: "Friday Night Vibes Vol 3.mp3", type: "file", category: "mix", format: "mp3", duration: 3720, size: 89_400_000, folderId: "mf1", createdAt: "2026-02-28T20:00:00Z", updatedAt: now },
  { id: "fl2", name: "Sunday Soul Brunch.mp3", type: "file", category: "mix", format: "mp3", duration: 5400, size: 129_600_000, folderId: "mf1", createdAt: "2026-02-20T12:00:00Z", updatedAt: now },
  { id: "fl3", name: "Spring Auto Sale 30s.wav", type: "file", category: "commercial", format: "wav", duration: 30, size: 4_800_000, folderId: "mf2", createdAt: "2026-03-01T10:00:00Z", updatedAt: now },
  { id: "fl4", name: "Health Fair Spot 15s.wav", type: "file", category: "commercial", format: "wav", duration: 15, size: 2_400_000, folderId: "mf2", createdAt: "2026-03-03T14:00:00Z", updatedAt: now },
  { id: "fl5", name: "Weekend Events Promo.mp3", type: "file", category: "promo", format: "mp3", duration: 22, size: 3_600_000, folderId: "mf3", createdAt: "2026-03-02T09:00:00Z", updatedAt: now },
  { id: "fl6", name: "WCCG Station ID.wav", type: "file", category: "jingle", format: "wav", duration: 8, size: 1_200_000, folderId: null, createdAt: "2026-01-15T10:00:00Z", updatedAt: now },
  { id: "fl7", name: "Smooth Jazz Bed.wav", type: "file", category: "music_bed", format: "wav", duration: 60, size: 12_000_000, folderId: "mf5", createdAt: "2026-02-25T16:00:00Z", updatedAt: now },
  { id: "fl8", name: "Morning Show Intro VO.mp3", type: "file", category: "voiceover", format: "mp3", duration: 12, size: 1_800_000, folderId: "mf4", createdAt: "2026-02-18T08:00:00Z", updatedAt: now },
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
// Persistence
// ---------------------------------------------------------------------------

function loadState(): MediaManagerState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MediaManagerState;

    // Migration from legacy
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
      const state: MediaManagerState = {
        files: [...migratedFiles, ...SEED_FILES.filter((sf) => !migratedFiles.find((mf) => mf.id === sf.id))],
        folders: SEED_FOLDERS,
        djbPattern: DEFAULT_DJB,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return state;
    }

    // First load — seed
    const state = seedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    return seedState();
  }
}

function persistState(state: MediaManagerState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BreadcrumbNav({
  path,
  onNavigate,
}: {
  path: { id: string; name: string }[];
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-hide">
      <button
        onClick={() => onNavigate(-1)}
        className="flex items-center gap-1 text-muted-foreground hover:text-[#74ddc7] transition-colors shrink-0"
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

function FolderCard({
  folder,
  onClick,
  itemCount,
  viewMode,
}: {
  folder: MediaFolder;
  onClick: () => void;
  itemCount: number;
  viewMode: "grid" | "list";
}) {
  if (viewMode === "list") {
    return (
      <button
        onClick={onClick}
        className="group flex items-center gap-4 w-full rounded-xl border border-border bg-card p-3 sm:p-4 transition-all hover:border-input text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
          <Folder className="h-5 w-5 text-[#74ddc7]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">{folder.name}</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{itemCount} items</p>
        </div>
        <div className="hidden sm:block text-xs text-muted-foreground/60">{formatDate(folder.createdAt)}</div>
        <ChevronRight className="h-4 w-4 text-foreground/20 group-hover:text-muted-foreground transition-colors" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-input text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border group-hover:border-[#74ddc7]/20 transition-colors">
        <Folder className="h-8 w-8 text-[#74ddc7]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate max-w-[140px]">{folder.name}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">{itemCount} items</p>
      </div>
    </button>
  );
}

function FileCard({
  file,
  viewMode,
  onAction,
}: {
  file: MediaFile;
  viewMode: "grid" | "list";
  onAction: (action: string, file: MediaFile) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { key: "rename", icon: Pencil, label: "Rename" },
    { key: "move", icon: Move, label: "Move to..." },
    { key: "convert", icon: ArrowLeftRight, label: "Convert Format" },
    { key: "djb", icon: Tag, label: "DJB Rename" },
    { key: "download", icon: Download, label: "Download" },
    { key: "delete", icon: Trash2, label: "Delete", danger: true },
  ];

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 w-full rounded-xl border border-border bg-card p-3 sm:p-4 transition-all hover:border-input">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/10 to-[#74ddc7]/5 border border-border">
          <FileAudio className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
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
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-card p-1.5 shadow-2xl">
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
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-input">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#7401df]/10 to-[#74ddc7]/5 flex items-center justify-center">
        <FileAudio className="h-12 w-12 text-foreground/10" />
        {file.duration !== undefined && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
            {formatDuration(file.duration)}
          </div>
        )}
        <div className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${FORMAT_COLORS[file.format] || "bg-foreground/[0.06] text-muted-foreground"}`}>
          {file.format}
        </div>
        {/* Menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-foreground/70 hover:bg-black/70 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-card p-1.5 shadow-2xl">
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
        <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
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
  currentFolderId,
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MediaManagerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isManagement } = useUserRoles();

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<MediaManagerState>(seedState());
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
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

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setMounted(true);
    setState(loadState());
  }, []);

  // Persist on change
  const updateState = useCallback((updater: (prev: MediaManagerState) => MediaManagerState) => {
    setState((prev) => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, []);

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
  // Handlers
  // ---------------------------------------------------------------------------

  const navigateToFolder = (folder: MediaFolder) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery("");
    setCategoryFilter("all");
  };

  const breadcrumbNavigate = (index: number) => {
    setFolderPath((prev) => (index === -1 ? [] : prev.slice(0, index + 1)));
    setSearchQuery("");
    setCategoryFilter("all");
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
        // In a real app this would trigger a download from storage
        alert(`Download "${file.name}" — feature requires backend storage integration.`);
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
            Organize audio files, mixes, commercials, and production assets.
          </p>
        </div>
        <Link
          href="/studio/audio-editor"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-fit"
        >
          <Mic className="h-4 w-4" />
          Record in Studio
        </Link>
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
        <BreadcrumbNav path={folderPath} onNavigate={breadcrumbNavigate} />
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
      <div className="space-y-3">
        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Folders</p>
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "flex flex-col gap-2"}>
              {filteredFolders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} onClick={() => navigateToFolder(folder)} itemCount={folderItemCounts[folder.id] || 0} viewMode={viewMode} />
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {currentFiles.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Files</p>
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "flex flex-col gap-2"}>
              {currentFiles.map((file) => (
                <FileCard key={file.id} file={file} viewMode={viewMode} onAction={handleFileAction} />
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
    </div>
  );
}
