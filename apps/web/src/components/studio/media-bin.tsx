"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  Search,
  LayoutGrid,
  List,
  Plus,
  ChevronDown,
  Music,
  Video,
  Image as ImageIcon,
  FileAudio,
  Sparkles,
  GripVertical,
  Play,
  Clock,
  HardDrive,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaType = "audio" | "video" | "image" | "graphics";
type FolderName = "All" | "Audio" | "Video" | "Graphics" | "Music" | "SFX";
type SortKey = "name" | "date" | "type" | "duration";
type ViewMode = "grid" | "list";

interface MediaItem {
  id: string;
  filename: string;
  type: MediaType;
  folder: FolderName;
  duration: string | null;
  size: string;
  dateAdded: string;
  thumbnailType: "waveform" | "video" | "image" | "sfx";
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MEDIA_ITEMS: MediaItem[] = [
  {
    id: "1",
    filename: "intro_jingle.mp3",
    type: "audio",
    folder: "Audio",
    duration: "00:15",
    size: "1.2 MB",
    dateAdded: "2026-02-28",
    thumbnailType: "waveform",
  },
  {
    id: "2",
    filename: "outro_music.mp3",
    type: "audio",
    folder: "Music",
    duration: "00:30",
    size: "2.4 MB",
    dateAdded: "2026-02-27",
    thumbnailType: "waveform",
  },
  {
    id: "3",
    filename: "episode_recording.mp4",
    type: "video",
    folder: "Video",
    duration: "01:23:45",
    size: "1.8 GB",
    dateAdded: "2026-03-01",
    thumbnailType: "video",
  },
  {
    id: "4",
    filename: "logo_overlay.png",
    type: "image",
    folder: "Graphics",
    duration: null,
    size: "340 KB",
    dateAdded: "2026-02-15",
    thumbnailType: "image",
  },
  {
    id: "5",
    filename: "lower_third.png",
    type: "graphics",
    folder: "Graphics",
    duration: null,
    size: "128 KB",
    dateAdded: "2026-02-20",
    thumbnailType: "image",
  },
  {
    id: "6",
    filename: "transition_swoosh.mp3",
    type: "audio",
    folder: "SFX",
    duration: "00:02",
    size: "180 KB",
    dateAdded: "2026-02-22",
    thumbnailType: "sfx",
  },
  {
    id: "7",
    filename: "background_loop.mp3",
    type: "audio",
    folder: "Music",
    duration: "03:00",
    size: "5.6 MB",
    dateAdded: "2026-02-25",
    thumbnailType: "waveform",
  },
  {
    id: "8",
    filename: "guest_intro.mp4",
    type: "video",
    folder: "Video",
    duration: "00:08",
    size: "12 MB",
    dateAdded: "2026-03-02",
    thumbnailType: "video",
  },
];

const FOLDERS: { name: FolderName; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "All", icon: FolderOpen },
  { name: "Audio", icon: FileAudio },
  { name: "Video", icon: Video },
  { name: "Graphics", icon: ImageIcon },
  { name: "Music", icon: Music },
  { name: "SFX", icon: Sparkles },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "duration", label: "Duration" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function durationToSeconds(d: string | null): number {
  if (!d) return 0;
  const parts = d.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function secondsToDisplay(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getTypeBadgeColor(type: MediaType): string {
  switch (type) {
    case "audio":
      return "bg-[#74ddc7]/20 text-[#74ddc7]";
    case "video":
      return "bg-[#7401df]/20 text-[#c084fc]";
    case "image":
      return "bg-blue-500/20 text-blue-400";
    case "graphics":
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-white/10 text-muted-foreground";
  }
}

function folderMatchesItem(folder: FolderName, item: MediaItem): boolean {
  if (folder === "All") return true;
  return item.folder === folder;
}

// ---------------------------------------------------------------------------
// Waveform Thumbnail (SVG mini waveform)
// ---------------------------------------------------------------------------

function WaveformThumb() {
  // Deterministic-ish bars for a fake waveform
  const bars = [3, 7, 12, 8, 14, 10, 6, 15, 11, 5, 13, 9, 7, 11, 8, 4, 10, 14, 6, 12];
  return (
    <svg
      viewBox="0 0 60 20"
      className="h-full w-full"
      preserveAspectRatio="none"
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 3}
          y={10 - h / 2}
          width={2}
          height={h}
          rx={0.5}
          className="fill-[#74ddc7]/60"
        />
      ))}
    </svg>
  );
}

function VideoThumb() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/30 to-[#7401df]/10">
      <Play className="h-5 w-5 text-[#c084fc]" />
    </div>
  );
}

function ImageThumb() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-500/5">
      <ImageIcon className="h-5 w-5 text-blue-400" />
    </div>
  );
}

function SfxThumb() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-500/5">
      <Sparkles className="h-4 w-4 text-amber-400" />
    </div>
  );
}

function MediaThumbnail({ item }: { item: MediaItem }) {
  switch (item.thumbnailType) {
    case "waveform":
      return <WaveformThumb />;
    case "video":
      return <VideoThumb />;
    case "image":
      return <ImageThumb />;
    case "sfx":
      return <SfxThumb />;
    default:
      return <WaveformThumb />;
  }
}

// ---------------------------------------------------------------------------
// Grid Item
// ---------------------------------------------------------------------------

function MediaGridItem({
  item,
  selected,
  onSelect,
}: {
  item: MediaItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all",
        selected
          ? "border-[#74ddc7] bg-[#74ddc7]/5 shadow-[0_0_12px_rgba(116,221,199,0.15)]"
          : "border-border bg-card/60 hover:border-border hover:bg-card"
      )}
    >
      {/* Drag handle */}
      <div className="absolute left-1 top-1 z-10 opacity-0 transition-opacity group-hover:opacity-60">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Thumbnail area */}
      <div className="relative h-16 w-full overflow-hidden bg-black/20">
        <MediaThumbnail item={item} />

        {/* Duration badge */}
        {item.duration && (
          <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5">
            <Clock className="h-2 w-2 text-white/70" />
            <span className="text-[9px] font-medium text-white/90">
              {item.duration}
            </span>
          </div>
        )}

        {/* Hover "Add to Timeline" */}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <span className="rounded-md bg-[#74ddc7] px-2 py-1 text-[10px] font-semibold text-black shadow-lg">
              Add to Timeline
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-2">
        <span className="truncate text-xs font-medium text-foreground">
          {item.filename}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1 py-0.5 text-[9px] font-semibold uppercase",
              getTypeBadgeColor(item.type)
            )}
          >
            {item.type}
          </span>
          <span className="text-[9px] text-muted-foreground">{item.size}</span>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// List Item
// ---------------------------------------------------------------------------

function MediaListItem({
  item,
  selected,
  onSelect,
}: {
  item: MediaItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all",
        selected
          ? "border-[#74ddc7] bg-[#74ddc7]/5"
          : "border-transparent hover:bg-card"
      )}
    >
      {/* Drag handle */}
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />

      {/* Mini thumbnail */}
      <div className="h-8 w-12 shrink-0 overflow-hidden rounded bg-black/20">
        <MediaThumbnail item={item} />
      </div>

      {/* Filename */}
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
        {item.filename}
      </span>

      {/* Type badge */}
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
          getTypeBadgeColor(item.type)
        )}
      >
        {item.type}
      </span>

      {/* Duration */}
      <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
        {item.duration ?? "--:--"}
      </span>

      {/* Size */}
      <span className="w-14 shrink-0 text-right text-[10px] text-muted-foreground">
        {item.size}
      </span>

      {/* Add to timeline on hover */}
      {hovered && (
        <span className="shrink-0 rounded bg-[#74ddc7] px-2 py-0.5 text-[9px] font-semibold text-black">
          + Timeline
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Media Bin Component
// ---------------------------------------------------------------------------

export function MediaBin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeFolder, setActiveFolder] = useState<FolderName>("All");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Filtering + Sorting
  // -------------------------------------------------------------------------

  const filteredItems = useMemo(() => {
    let items = MEDIA_ITEMS.filter((item) => {
      // Folder filter
      if (!folderMatchesItem(activeFolder, item)) return false;
      // Search filter
      if (
        searchQuery &&
        !item.filename.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });

    // Sort
    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.filename.localeCompare(b.filename);
        case "date":
          return b.dateAdded.localeCompare(a.dateAdded);
        case "type":
          return a.type.localeCompare(b.type);
        case "duration":
          return durationToSeconds(b.duration) - durationToSeconds(a.duration);
        default:
          return 0;
      }
    });

    return items;
  }, [searchQuery, activeFolder, sortBy]);

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const totalDurationSec = filteredItems.reduce(
    (acc, item) => acc + durationToSeconds(item.duration),
    0
  );

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const folder of FOLDERS) {
      counts[folder.name] =
        folder.name === "All"
          ? MEDIA_ITEMS.length
          : MEDIA_ITEMS.filter((i) => i.folder === folder.name).length;
    }
    return counts;
  }, []);

  // -------------------------------------------------------------------------
  // Storage bar (mock)
  // -------------------------------------------------------------------------

  const storageUsed = 2.1; // GB
  const storageTotal = 10; // GB
  const storagePct = (storageUsed / storageTotal) * 100;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-[#74ddc7]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Media
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View toggle */}
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                  : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                  : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Sort dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/5"
              >
                Sort: {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
                <ChevronDown className="h-3 w-3" />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-28 rounded-md border border-border bg-card p-1 shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.key);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded px-2 py-1.5 text-xs transition-colors",
                        sortBy === opt.key
                          ? "bg-[#74ddc7]/10 text-[#74ddc7]"
                          : "text-foreground hover:bg-white/5"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Import button */}
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-[#74ddc7]/20 px-2.5 py-1.5 text-xs font-medium text-[#74ddc7] transition-colors hover:bg-[#74ddc7]/30"
            >
              <Plus className="h-3 w-3" />
              Import
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Body: Folder sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folder tree sidebar */}
        <div className="flex w-28 shrink-0 flex-col gap-0.5 border-r border-border p-2">
          {FOLDERS.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setActiveFolder(name);
                setSelectedId(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all",
                activeFolder === name
                  ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-[11px] font-medium">{name}</span>
                <span
                  className={cn(
                    "text-[9px]",
                    activeFolder === name
                      ? "text-[#74ddc7]/70"
                      : "text-muted-foreground/60"
                  )}
                >
                  {folderCounts[name]}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Media content area */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No media found</p>
              <p className="text-xs text-muted-foreground/60">
                {searchQuery
                  ? "Try a different search term"
                  : "Import files to get started"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => (
                <MediaGridItem
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() =>
                    setSelectedId(selectedId === item.id ? null : item.id)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredItems.map((item) => (
                <MediaListItem
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() =>
                    setSelectedId(selectedId === item.id ? null : item.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </span>
          <div className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {secondsToDisplay(totalDurationSec)} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <HardDrive className="h-3 w-3 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#74ddc7]/60 transition-all"
                style={{ width: `${storagePct}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">
              {storageUsed} / {storageTotal} GB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
