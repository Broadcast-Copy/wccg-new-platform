"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Music,
  FolderPlus,
  Upload,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  Folder,
  FileAudio,
  MoreHorizontal,
  Play,
  Trash2,
  Pencil,
  Move,
  Clock,
  HardDrive,
  Disc3,
  CloudUpload,
  X,
  Check,
  Home,
  Search,
  SortAsc,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MixFile {
  id: string;
  name: string;
  type: "file";
  genre?: string;
  duration?: number;
  size?: number; // bytes
  audioUrl?: string;
  coverImageUrl?: string;
  hostName?: string;
  playCount?: number;
  status?: "PUBLISHED" | "PROCESSING" | "HIDDEN";
  createdAt?: string;
  updatedAt?: string;
}

interface MixFolder {
  id: string;
  name: string;
  type: "folder";
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

type MixItem = MixFile | MixFolder;

// ---------------------------------------------------------------------------
// Mock data — will be replaced by API
// ---------------------------------------------------------------------------

const MOCK_FOLDERS: MixFolder[] = [
  { id: "f1", name: "Hip Hop Sets", type: "folder", itemCount: 12, createdAt: "2025-12-15" },
  { id: "f2", name: "R&B Vibes", type: "folder", itemCount: 8, createdAt: "2025-12-20" },
  { id: "f3", name: "Gospel Mixes", type: "folder", itemCount: 5, createdAt: "2026-01-10" },
  { id: "f4", name: "Live Sets", type: "folder", itemCount: 3, createdAt: "2026-02-05" },
  { id: "f5", name: "Club Bangers", type: "folder", itemCount: 15, createdAt: "2026-02-14" },
];

const MOCK_FILES: MixFile[] = [
  { id: "m1", name: "Friday Night Vibes Vol. 3.mp3", type: "file", genre: "Hip Hop", duration: 3720, size: 89_400_000, hostName: "DJ Quick", playCount: 1450, status: "PUBLISHED", createdAt: "2026-02-28" },
  { id: "m2", name: "Sunday Soul Session.mp3", type: "file", genre: "R&B", duration: 5400, size: 129_600_000, hostName: "DJ Quick", playCount: 890, status: "PUBLISHED", createdAt: "2026-02-25" },
  { id: "m3", name: "Morning Praise Mix.mp3", type: "file", genre: "Gospel", duration: 2700, size: 64_800_000, hostName: "DJ Quick", playCount: 320, status: "PROCESSING", createdAt: "2026-03-01" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** Breadcrumb for folder navigation */
function Breadcrumb({
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
        <span className="font-medium">My Mixes</span>
      </button>
      {path.map((crumb, i) => (
        <div key={crumb.id} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3.5 w-3.5 text-foreground/20" />
          <button
            onClick={() => onNavigate(i)}
            className={`font-medium transition-colors ${
              i === path.length - 1
                ? "text-foreground"
                : "text-muted-foreground hover:text-[#74ddc7]"
            }`}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Folder card */
function FolderCard({
  folder,
  onClick,
  viewMode,
}: {
  folder: MixFolder;
  onClick: () => void;
  viewMode: "grid" | "list";
}) {
  if (viewMode === "list") {
    return (
      <button
        onClick={onClick}
        className="group flex items-center gap-4 w-full rounded-xl border border-border bg-white/[0.02] p-3 sm:p-4 transition-all hover:bg-white/[0.05] hover:border-input text-left"
      >
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border">
          <Folder className="h-5 w-5 sm:h-6 sm:w-6 text-[#74ddc7]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">
            {folder.name}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {folder.itemCount ?? 0} items
          </p>
        </div>
        <div className="hidden sm:block text-xs text-muted-foreground/60">
          {formatDate(folder.createdAt)}
        </div>
        <ChevronRight className="h-4 w-4 text-foreground/20 group-hover:text-muted-foreground transition-colors" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-white/[0.02] p-5 transition-all hover:bg-white/[0.05] hover:border-input text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10 border border-border group-hover:border-[#74ddc7]/20 transition-colors">
        <Folder className="h-8 w-8 text-[#74ddc7]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate max-w-[140px]">
          {folder.name}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {folder.itemCount ?? 0} items
        </p>
      </div>
    </button>
  );
}

/** File row / card */
function FileCard({
  file,
  viewMode,
}: {
  file: MixFile;
  viewMode: "grid" | "list";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: openPlayer } = useStreamPlayer();

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 w-full rounded-xl border border-border bg-white/[0.02] p-3 sm:p-4 transition-all hover:bg-white/[0.05] hover:border-input">
        {/* Icon */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7401df]/10 to-[#74ddc7]/5 border border-border">
          <FileAudio className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-foreground truncate">
            {file.name}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {file.genre && (
              <span className="text-[11px] font-medium text-[#7401df] bg-[#7401df]/10 px-1.5 py-0.5 rounded">
                {file.genre}
              </span>
            )}
            {file.duration && (
              <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(file.duration)}
              </span>
            )}
            {file.size && (
              <span className="hidden sm:block text-xs text-muted-foreground/60">
                {formatFileSize(file.size)}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        {file.status === "PROCESSING" && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
            Processing
          </span>
        )}

        {/* Date */}
        <div className="hidden sm:block text-xs text-muted-foreground/60 shrink-0">
          {formatDate(file.createdAt)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {file.audioUrl && (
            <button
              onClick={openPlayer}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
              aria-label="Play"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-border bg-card p-1.5 shadow-2xl">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground transition-colors">
                  <Move className="h-3.5 w-3.5" /> Move to...
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-white/[0.02] transition-all hover:bg-white/[0.05] hover:border-input">
      {/* Cover / artwork area */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#7401df]/20 to-[#74ddc7]/10">
        {file.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={file.coverImageUrl}
            alt={file.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music className="h-16 w-16 text-foreground/15" />
          </div>
        )}

        {/* Play overlay */}
        <button
          onClick={openPlayer}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7] shadow-xl scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all">
            <Play className="h-6 w-6 text-[#0a0a0f] translate-x-0.5" fill="#0a0a0f" />
          </div>
        </button>

        {/* Duration badge */}
        {file.duration && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
            {formatDuration(file.duration)}
          </div>
        )}

        {/* Status badge */}
        {file.status === "PROCESSING" && (
          <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-900/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
            Processing
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-1.5">
        <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
        <div className="flex items-center justify-between">
          {file.genre && (
            <span className="text-[10px] font-medium text-[#7401df] bg-[#7401df]/10 px-1.5 py-0.5 rounded">
              {file.genre}
            </span>
          )}
          {file.size && (
            <span className="text-[11px] text-muted-foreground/60">
              {formatFileSize(file.size)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Upload dropzone */
function UploadDropzone({
  onClose,
}: {
  onClose: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"].includes(f.type)
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-input bg-white/[0.02] p-6 sm:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Upload Mixes</h3>
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Drop area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-8 transition-colors cursor-pointer ${
          dragOver
            ? "border-[#74ddc7] bg-[#74ddc7]/10"
            : "border-border hover:border-white/[0.15] hover:bg-white/[0.03]"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".mp3,.wav,.m4a";
          input.multiple = true;
          input.onchange = (e) => {
            const selected = Array.from((e.target as HTMLInputElement).files ?? []);
            setFiles((prev) => [...prev, ...selected]);
          };
          input.click();
        }}
      >
        <CloudUpload className="h-10 w-10 text-foreground/20 mb-3" />
        <p className="text-sm font-medium text-foreground/60">
          Drag & drop audio files here
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          or click to browse — .mp3, .wav, .m4a
        </p>
      </div>

      {/* Queued files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {files.length} file{files.length !== 1 ? "s" : ""} ready
          </p>
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg bg-foreground/[0.04] px-3 py-2"
            >
              <FileAudio className="h-4 w-4 text-[#74ddc7] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="text-muted-foreground/70 hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button className="w-full rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] text-white font-bold hover:opacity-90">
            <Upload className="mr-2 h-4 w-4" />
            Upload {files.length} File{files.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}

/** New folder inline input */
function NewFolderInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#74ddc7]/30 bg-[#74ddc7]/5 p-3">
      <Folder className="h-5 w-5 text-[#74ddc7] shrink-0" />
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Folder name..."
        className="flex-1 h-8 text-sm bg-transparent border-0 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <button
        onClick={() => name.trim() && onSubmit(name.trim())}
        className="h-7 w-7 flex items-center justify-center rounded-full text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={onCancel}
        className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MixesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);

  // In the future these would come from API based on folderPath
  const [folders, setFolders] = useState<MixFolder[]>(MOCK_FOLDERS);
  const [files, setFiles] = useState<MixFile[]>(MOCK_FILES);

  // Combined items filtered by search
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    const q = searchQuery.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.genre?.toLowerCase().includes(q) ||
        f.hostName?.toLowerCase().includes(q)
    );
  }, [files, searchQuery]);

  // Storage usage mock
  const totalStorage = 5 * 1024 * 1024 * 1024; // 5 GB
  const usedStorage = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const usagePercent = Math.round((usedStorage / totalStorage) * 100);

  const handleNavigateToFolder = (folder: MixFolder) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery("");
    // In real app: fetch folder contents from API
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index === -1) {
      setFolderPath([]);
    } else {
      setFolderPath((prev) => prev.slice(0, index + 1));
    }
    setSearchQuery("");
  };

  const handleCreateFolder = (name: string) => {
    const newFolder: MixFolder = {
      id: `f-${Date.now()}`,
      name,
      type: "folder",
      itemCount: 0,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [newFolder, ...prev]);
    setShowNewFolder(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            My Mixes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user
              ? "Manage your DJ mixes, sets, and recordings"
              : "Browse DJ mixes from WCCG hosts"}
          </p>
        </div>

        {/* DJ Profile badge */}
        {user && (
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-border px-4 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7401df] to-[#74ddc7]">
              <Disc3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {user.user_metadata?.display_name || user.email?.split("@")[0] || "DJ"}
              </p>
              <p className="text-[10px] text-muted-foreground/70">DJ Profile</p>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Breadcrumb */}
        <div className="flex-1 min-w-0">
          <Breadcrumb path={folderPath} onNavigate={handleBreadcrumbNavigate} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 w-[160px] sm:w-[200px] pl-8 text-xs bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[#74ddc7]/30 focus-visible:ring-0"
            />
          </div>

          {/* New Folder */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewFolder(true)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
            >
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
              New Folder
            </Button>
          )}

          {/* Upload */}
          {user && (
            <Button
              size="sm"
              onClick={() => setShowUploader(!showUploader)}
              className="h-8 text-xs rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload
            </Button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border bg-white/[0.03] p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white/[0.1] text-[#74ddc7]"
                  : "text-muted-foreground/70 hover:text-foreground/60"
              }`}
              aria-label="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white/[0.1] text-[#74ddc7]"
                  : "text-muted-foreground/70 hover:text-foreground/60"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      {showUploader && (
        <UploadDropzone onClose={() => setShowUploader(false)} />
      )}

      {/* New Folder Input */}
      {showNewFolder && (
        <NewFolderInput
          onSubmit={handleCreateFolder}
          onCancel={() => setShowNewFolder(false)}
        />
      )}

      {/* Storage usage bar */}
      {user && (
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-border px-4 py-3">
          <HardDrive className="h-4 w-4 text-muted-foreground/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">
                {formatFileSize(usedStorage)} of {formatFileSize(totalStorage)} used
              </span>
              <span className="text-[11px] text-muted-foreground/70">{usagePercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#74ddc7] to-[#7401df] transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">
              Folders
            </p>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                  : "flex flex-col gap-2"
              }
            >
              {filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => handleNavigateToFolder(folder)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {filteredFiles.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">
              Files
            </p>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                  : "flex flex-col gap-2"
              }
            >
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/[0.02] py-16">
            {searchQuery ? (
              <>
                <Search className="h-8 w-8 text-foreground/15 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No results for &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#74ddc7] hover:underline mt-2"
                >
                  Clear search
                </button>
              </>
            ) : user ? (
              <>
                <CloudUpload className="h-10 w-10 text-foreground/15 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No mixes yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                  Upload your first mix to get started
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowUploader(true)}
                  className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Mix
                </Button>
              </>
            ) : (
              <>
                <Music className="h-10 w-10 text-foreground/15 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Sign in to manage your mixes
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                  Create folders, upload sets, and sync to your DJ profile
                </p>
                <Button size="sm" asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80">
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
