"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Music,
  Plus,
  Upload,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Play,
  Clock,
  HardDrive,
  BarChart3,
  X,
  Check,
  Image as ImageIcon,
  FileAudio,
  User,
  ExternalLink,
  ArrowUpDown,
  ChevronDown,
  Loader2,
  Disc3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardMix {
  id: string;
  title: string;
  genre: string;
  duration: number;
  playCount: number;
  coverImageUrl?: string;
  status: "PUBLISHED" | "PROCESSING" | "HIDDEN";
  createdAt: string;
  description?: string;
  tags?: string[];
  fileSize?: number;
}

type SortKey = "newest" | "most-played" | "name";
type ViewMode = "grid" | "list";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "wccg_dj_mixes";

const GENRE_OPTIONS = [
  "Hip Hop",
  "R&B",
  "Club",
  "Old School",
  "Gospel",
  "Afrobeats",
  "Reggae",
  "Soca",
  "Other",
];

const STATUS_STYLES: Record<DashboardMix["status"], string> = {
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PROCESSING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIDDEN: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const STATUS_LABELS: Record<DashboardMix["status"], string> = {
  PUBLISHED: "Published",
  PROCESSING: "Processing",
  HIDDEN: "Hidden",
};

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

function seedMixes(): DashboardMix[] {
  return [
    {
      id: "mix-1",
      title: "Friday Night Vibes Vol. 3",
      genre: "Hip Hop",
      duration: 3720,
      playCount: 1450,
      coverImageUrl: "",
      status: "PUBLISHED",
      createdAt: "2026-02-28T20:00:00Z",
      description: "Live set from the Friday Night Vibe Session at Club 104. Featuring the hottest tracks in rotation.",
      tags: ["friday", "vibes", "live"],
      fileSize: 89_400_000,
    },
    {
      id: "mix-2",
      title: "Sunday Soul Brunch",
      genre: "R&B",
      duration: 5400,
      playCount: 820,
      coverImageUrl: "",
      status: "PUBLISHED",
      createdAt: "2026-02-20T12:00:00Z",
      description: "Smooth R&B and neo-soul for your lazy Sunday morning.",
      tags: ["sunday", "soul", "brunch", "rnb"],
      fileSize: 129_600_000,
    },
    {
      id: "mix-3",
      title: "Old School Block Party",
      genre: "Old School",
      duration: 4200,
      playCount: 2100,
      coverImageUrl: "",
      status: "PUBLISHED",
      createdAt: "2026-02-14T18:00:00Z",
      description: "Classic cuts from the golden era. 80s and 90s block party anthems.",
      tags: ["oldschool", "classic", "80s", "90s"],
      fileSize: 100_800_000,
    },
    {
      id: "mix-4",
      title: "Afrobeats Overdrive",
      genre: "Afrobeats",
      duration: 2700,
      playCount: 560,
      coverImageUrl: "",
      status: "PROCESSING",
      createdAt: "2026-03-01T15:00:00Z",
      description: "The best of Afrobeats — Burna Boy, Wizkid, Davido and more.",
      tags: ["afrobeats", "africa", "dance"],
      fileSize: 64_800_000,
    },
    {
      id: "mix-5",
      title: "Gospel Hour Uplift",
      genre: "Gospel",
      duration: 3600,
      playCount: 340,
      coverImageUrl: "",
      status: "HIDDEN",
      createdAt: "2026-01-25T09:00:00Z",
      description: "Inspirational gospel mix for the morning commute.",
      tags: ["gospel", "inspirational"],
      fileSize: 86_400_000,
    },
    {
      id: "mix-6",
      title: "Club Soca Carnival",
      genre: "Soca",
      duration: 3000,
      playCount: 710,
      coverImageUrl: "",
      status: "PUBLISHED",
      createdAt: "2026-02-08T22:00:00Z",
      description: "Carnival vibes all year round. Soca and dancehall fusion.",
      tags: ["soca", "carnival", "dancehall"],
      fileSize: 72_000_000,
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `mix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function loadMixes(): DashboardMix[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seeded = seedMixes();
  saveMixes(seeded);
  return seeded;
}

function saveMixes(mixes: DashboardMix[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mixes));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Gradient Covers (deterministic from id)
// ---------------------------------------------------------------------------

const GRADIENTS = [
  "from-[#74ddc7] to-[#7401df]",
  "from-[#7401df] to-[#74ddc7]",
  "from-purple-600 to-pink-500",
  "from-teal-500 to-cyan-400",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-fuchsia-500 to-violet-600",
  "from-rose-500 to-red-600",
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ===========================================================================
// Component
// ===========================================================================

export default function MyMixesPage() {
  const { user, isLoading: authLoading } = useAuth();

  // ---- state ----
  const [mixes, setMixes] = useState<DashboardMix[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadGenre, setUploadGenre] = useState("Hip Hop");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadCoverUrl, setUploadCoverUrl] = useState("");
  const [uploadCoverPreview, setUploadCoverPreview] = useState("");
  const [uploadAudioName, setUploadAudioName] = useState("");
  const [uploadCoverFileName, setUploadCoverFileName] = useState("");

  // edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");

  // ---- load from localStorage on mount ----
  useEffect(() => {
    setMixes(loadMixes());
  }, []);

  // ---- persist on change ----
  const persistMixes = useCallback((updated: DashboardMix[]) => {
    setMixes(updated);
    saveMixes(updated);
  }, []);

  // ---- derived ----
  const djName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "DJ";

  const totalPlays = useMemo(() => mixes.reduce((s, m) => s + m.playCount, 0), [mixes]);
  const totalStorage = useMemo(() => mixes.reduce((s, m) => s + (m.fileSize || 0), 0), [mixes]);

  const filteredMixes = useMemo(() => {
    let list = [...mixes];

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // sort
    switch (sortKey) {
      case "newest":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "most-played":
        list.sort((a, b) => b.playCount - a.playCount);
        break;
      case "name":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return list;
  }, [mixes, searchQuery, sortKey]);

  // ---- actions ----

  const handleUpload = useCallback(() => {
    if (!uploadTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    // Simulate upload delay
    setTimeout(() => {
      const newMix: DashboardMix = {
        id: generateId(),
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || undefined,
        genre: uploadGenre,
        tags: uploadTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        coverImageUrl: uploadCoverUrl.trim() || uploadCoverPreview || undefined,
        duration: Math.floor(Math.random() * 3600) + 1800, // simulated 30-90 min
        playCount: 0,
        status: "PROCESSING",
        createdAt: new Date().toISOString(),
        fileSize: Math.floor(Math.random() * 100_000_000) + 30_000_000, // simulated size
      };

      const updated = [newMix, ...mixes];
      persistMixes(updated);

      // reset form
      setUploadTitle("");
      setUploadDescription("");
      setUploadGenre("Hip Hop");
      setUploadTags("");
      setUploadCoverUrl("");
      setUploadCoverPreview("");
      setUploadAudioName("");
      setUploadCoverFileName("");
      setShowUpload(false);
      setIsSubmitting(false);
      toast.success("Mix uploaded! It will be ready shortly.");
    }, 1500);
  }, [
    uploadTitle, uploadDescription, uploadGenre, uploadTags,
    uploadCoverUrl, uploadCoverPreview, mixes, persistMixes,
  ]);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = mixes.filter((m) => m.id !== id);
      persistMixes(updated);
      setDeleteConfirmId(null);
      toast.success("Mix deleted");
    },
    [mixes, persistMixes],
  );

  const handleToggleStatus = useCallback(
    (id: string) => {
      const updated = mixes.map((m) => {
        if (m.id !== id) return m;
        const newStatus: DashboardMix["status"] = m.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";
        return { ...m, status: newStatus };
      });
      persistMixes(updated);
      const mix = updated.find((m) => m.id === id);
      toast.success(mix?.status === "PUBLISHED" ? "Mix published" : "Mix hidden");
    },
    [mixes, persistMixes],
  );

  const startEditing = useCallback((mix: DashboardMix) => {
    setEditingId(mix.id);
    setEditTitle(mix.title);
    setEditDescription(mix.description || "");
    setEditGenre(mix.genre);
    setEditCoverUrl(mix.coverImageUrl || "");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const updated = mixes.map((m) => {
      if (m.id !== editingId) return m;
      return {
        ...m,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        genre: editGenre,
        coverImageUrl: editCoverUrl.trim() || undefined,
      };
    });
    persistMixes(updated);
    setEditingId(null);
    toast.success("Mix updated");
  }, [editingId, editTitle, editDescription, editGenre, editCoverUrl, mixes, persistMixes]);

  // ---- audio drag & drop handler (simulated) ----
  const handleAudioDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp3|wav|m4a)$/i.test(file.name)) {
      setUploadAudioName(file.name);
      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    } else {
      toast.error("Please drop an audio file (.mp3, .wav, .m4a)");
    }
  }, [uploadTitle]);

  // ---- cover image drag & drop handler (simulated) ----
  const handleCoverDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      setUploadCoverFileName(file.name);
      // Create preview via FileReader
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadCoverPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please drop an image file (.jpg, .png, .webp)");
    }
  }, []);

  const preventDefault = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  // ===========================================================================
  // Render: Auth Guard
  // ===========================================================================

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#74ddc7]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-zinc-800 ring-1 ring-zinc-700">
          <Music className="size-10 text-zinc-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white">Sign In Required</h1>
        <p className="mb-8 text-zinc-400">
          You need to be signed in to manage your DJ mixes.
        </p>
        <Link href="/sign-in">
          <Button className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // ===========================================================================
  // Render: Main Dashboard
  // ===========================================================================

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header + Profile Card                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Title & action */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">My DJ Mixes</h1>
          <p className="mt-1 text-zinc-400">Manage the mixes on your public profile</p>
          <div className="mt-4">
            <Button
              className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? <X className="size-4" /> : <Plus className="size-4" />}
              {showUpload ? "Cancel Upload" : "Upload New Mix"}
            </Button>
          </div>
        </div>

        {/* Right: Profile card */}
        <Card className="w-full border-zinc-800 bg-zinc-900/50 lg:w-80">
          <CardContent className="flex items-center gap-4 py-4">
            {/* Avatar */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
              <span className="text-lg font-bold text-white">
                {djName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{djName}</p>
              <Link
                href="/mix-squad"
                className="inline-flex items-center gap-1 text-xs text-[#74ddc7] hover:underline"
              >
                View Public Profile <ExternalLink className="size-3" />
              </Link>
              <div className="mt-1 flex gap-3 text-xs text-zinc-400">
                <span><strong className="text-white">{mixes.length}</strong> mixes</span>
                <span><strong className="text-white">{totalPlays.toLocaleString()}</strong> plays</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Bar                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#74ddc7]/10">
              <Disc3 className="size-5 text-[#74ddc7]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mixes.length}</p>
              <p className="text-xs text-zinc-400">Total Mixes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#7401df]/10">
              <BarChart3 className="size-5 text-[#7401df]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalPlays.toLocaleString()}</p>
              <p className="text-xs text-zinc-400">Total Plays</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <HardDrive className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatFileSize(totalStorage)}</p>
              <p className="text-xs text-zinc-400">Storage Used</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Upload Section (toggleable)                                       */}
      {/* ----------------------------------------------------------------- */}
      {showUpload && (
        <Card className="mb-8 border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Upload className="size-5 text-[#74ddc7]" />
              Upload New Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Audio Drop Zone */}
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/40 py-10 transition-colors hover:border-[#74ddc7]/50"
              onDrop={handleAudioDrop}
              onDragOver={preventDefault}
              onClick={() => {
                const inp = document.createElement("input");
                inp.type = "file";
                inp.accept = ".mp3,.wav,.m4a";
                inp.onchange = () => {
                  const f = inp.files?.[0];
                  if (f) {
                    setUploadAudioName(f.name);
                    if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
                  }
                };
                inp.click();
              }}
            >
              {uploadAudioName ? (
                <div className="flex items-center gap-2 text-[#74ddc7]">
                  <FileAudio className="size-6" />
                  <span className="font-medium">{uploadAudioName}</span>
                </div>
              ) : (
                <>
                  <FileAudio className="mb-2 size-10 text-zinc-500" />
                  <p className="text-sm text-zinc-400">
                    Drag & drop audio file or <span className="text-[#74ddc7]">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">.mp3, .wav, .m4a</p>
                </>
              )}
            </div>

            {/* Title & Genre */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Title <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Mix title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Genre</label>
                <select
                  value={uploadGenre}
                  onChange={(e) => setUploadGenre(e.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-[#74ddc7] focus:ring-1 focus:ring-[#74ddc7]"
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Description</label>
              <textarea
                rows={3}
                placeholder="Describe your mix..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#74ddc7] focus:ring-1 focus:ring-[#74ddc7]"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Tags <span className="text-xs text-zinc-500">(comma separated)</span>
              </label>
              <Input
                placeholder="e.g. friday, vibes, live"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* Cover Art */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Cover Art URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Cover Art URL
                </label>
                <Input
                  placeholder="https://example.com/cover.jpg"
                  value={uploadCoverUrl}
                  onChange={(e) => setUploadCoverUrl(e.target.value)}
                  className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                />
                {uploadCoverUrl && (
                  <div className="mt-2 overflow-hidden rounded-md border border-zinc-700">
                    <img
                      src={uploadCoverUrl}
                      alt="Cover preview"
                      className="h-24 w-24 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Cover Art Upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Cover Art Upload
                </label>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/40 py-6 transition-colors hover:border-[#74ddc7]/50"
                  onDrop={handleCoverDrop}
                  onDragOver={preventDefault}
                  onClick={() => {
                    const inp = document.createElement("input");
                    inp.type = "file";
                    inp.accept = ".jpg,.jpeg,.png,.webp";
                    inp.onchange = () => {
                      const f = inp.files?.[0];
                      if (f) {
                        setUploadCoverFileName(f.name);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setUploadCoverPreview(ev.target?.result as string);
                        };
                        reader.readAsDataURL(f);
                      }
                    };
                    inp.click();
                  }}
                >
                  {uploadCoverPreview ? (
                    <img
                      src={uploadCoverPreview}
                      alt="Cover preview"
                      className="h-20 w-20 rounded object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mb-1 size-8 text-zinc-500" />
                      <p className="text-xs text-zinc-400">
                        Drop image or <span className="text-[#74ddc7]">browse</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">.jpg, .png, .webp</p>
                    </>
                  )}
                </div>
                {uploadCoverFileName && (
                  <p className="mt-1 truncate text-xs text-zinc-400">{uploadCoverFileName}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80"
                onClick={handleUpload}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload Mix
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Toolbar: Search, Sort, View Toggle                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search mixes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-zinc-700 bg-zinc-800 pl-9 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-9 appearance-none rounded-md border border-zinc-700 bg-zinc-800 pl-3 pr-8 text-sm text-white outline-none focus:border-[#74ddc7]"
            >
              <option value="newest">Newest</option>
              <option value="most-played">Most Played</option>
              <option value="name">Name</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
          </div>

          {/* View toggle */}
          <div className="flex overflow-hidden rounded-md border border-zinc-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex size-9 items-center justify-center transition-colors ${
                viewMode === "grid" ? "bg-[#74ddc7]/10 text-[#74ddc7]" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex size-9 items-center justify-center border-l border-zinc-700 transition-colors ${
                viewMode === "list" ? "bg-[#74ddc7]/10 text-[#74ddc7]" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Empty State                                                       */}
      {/* ----------------------------------------------------------------- */}
      {filteredMixes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-800 ring-1 ring-zinc-700">
            <Music className="size-8 text-zinc-500" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-white">
            {searchQuery ? "No mixes found" : "No mixes yet"}
          </h3>
          <p className="mb-6 text-sm text-zinc-400">
            {searchQuery
              ? "Try a different search term."
              : "Upload your first mix to get started."}
          </p>
          {!searchQuery && (
            <Button
              className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80"
              onClick={() => setShowUpload(true)}
            >
              <Plus className="size-4" />
              Upload Mix
            </Button>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Grid View                                                         */}
      {/* ----------------------------------------------------------------- */}
      {filteredMixes.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMixes.map((mix) => (
            <Card
              key={mix.id}
              className="group overflow-hidden border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700"
            >
              {/* Cover art */}
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                {mix.coverImageUrl ? (
                  <img
                    src={mix.coverImageUrl}
                    alt={mix.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(mix.id)}`}
                  >
                    <Music className="size-12 text-white/40" />
                  </div>
                )}
                {/* Status badge overlay */}
                <div className="absolute right-2 top-2">
                  <Badge className={`border text-[10px] ${STATUS_STYLES[mix.status]}`}>
                    {STATUS_LABELS[mix.status]}
                  </Badge>
                </div>
                {/* Duration overlay */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <Clock className="size-3" />
                  {formatDuration(mix.duration)}
                </div>
              </div>

              <CardContent className="space-y-3 px-4 py-4">
                {/* Inline edit form */}
                {editingId === mix.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="border-zinc-700 bg-zinc-800 text-white"
                      placeholder="Title"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-[#74ddc7]"
                      placeholder="Description"
                    />
                    <select
                      value={editGenre}
                      onChange={(e) => setEditGenre(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none"
                    >
                      {GENRE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <Input
                      value={editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      className="border-zinc-700 bg-zinc-800 text-white"
                      placeholder="Cover art URL (optional)"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80"
                        onClick={handleSaveEdit}
                      >
                        <Check className="size-3.5" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-400"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="truncate font-semibold text-white">{mix.title}</h3>
                      {mix.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                          {mix.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="border border-[#7401df]/30 bg-[#7401df]/10 text-[#c084fc] text-[10px]">
                        {mix.genre}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Play className="size-3" />
                        {mix.playCount.toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(mix.createdAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 border-t border-zinc-800 pt-2">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-zinc-400 hover:text-[#74ddc7]"
                        onClick={() => startEditing(mix)}
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-zinc-400 hover:text-[#74ddc7]"
                        onClick={() => handleToggleStatus(mix.id)}
                        title={mix.status === "PUBLISHED" ? "Hide" : "Publish"}
                      >
                        {mix.status === "PUBLISHED" ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>

                      {deleteConfirmId === mix.id ? (
                        <div className="ml-auto flex items-center gap-1">
                          <span className="text-xs text-red-400">Delete?</span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(mix.id)}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-zinc-400"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-zinc-400 hover:text-red-400"
                          onClick={() => setDeleteConfirmId(mix.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* List View                                                         */}
      {/* ----------------------------------------------------------------- */}
      {filteredMixes.length > 0 && viewMode === "list" && (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          {/* Header row */}
          <div className="hidden border-b border-zinc-800 bg-zinc-900/70 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 sm:grid sm:grid-cols-[1fr_100px_80px_80px_100px_120px]">
            <span>Mix</span>
            <span>Genre</span>
            <span>Duration</span>
            <span>Plays</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {filteredMixes.map((mix, i) => (
            <div
              key={mix.id}
              className={`group px-4 py-3 transition-colors hover:bg-zinc-800/50 ${
                i !== filteredMixes.length - 1 ? "border-b border-zinc-800/50" : ""
              }`}
            >
              {editingId === mix.id ? (
                /* Inline edit in list view */
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="border-zinc-700 bg-zinc-800 text-white"
                      placeholder="Title"
                    />
                    <select
                      value={editGenre}
                      onChange={(e) => setEditGenre(e.target.value)}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none"
                    >
                      {GENRE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none"
                    placeholder="Description"
                  />
                  <Input
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-white"
                    placeholder="Cover art URL (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[#74ddc7] text-black hover:bg-[#74ddc7]/80"
                      onClick={handleSaveEdit}
                    >
                      <Check className="size-3.5" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-zinc-400"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normal list row */
                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_100px_80px_80px_100px_120px] sm:items-center">
                  {/* Mix info */}
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      {mix.coverImageUrl ? (
                        <img
                          src={mix.coverImageUrl}
                          alt={mix.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(mix.id)}`}
                        >
                          <Music className="size-4 text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{mix.title}</p>
                      <p className="truncate text-xs text-zinc-500">{formatDate(mix.createdAt)}</p>
                    </div>
                  </div>

                  {/* Genre */}
                  <Badge className="w-fit border border-[#7401df]/30 bg-[#7401df]/10 text-[#c084fc] text-[10px]">
                    {mix.genre}
                  </Badge>

                  {/* Duration */}
                  <span className="text-sm text-zinc-400">{formatDuration(mix.duration)}</span>

                  {/* Plays */}
                  <span className="text-sm text-zinc-400">{mix.playCount.toLocaleString()}</span>

                  {/* Status */}
                  <Badge className={`w-fit border text-[10px] ${STATUS_STYLES[mix.status]}`}>
                    {STATUS_LABELS[mix.status]}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-zinc-400 hover:text-[#74ddc7]"
                      onClick={() => startEditing(mix)}
                      title="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-zinc-400 hover:text-[#74ddc7]"
                      onClick={() => handleToggleStatus(mix.id)}
                      title={mix.status === "PUBLISHED" ? "Hide" : "Publish"}
                    >
                      {mix.status === "PUBLISHED" ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </Button>
                    {deleteConfirmId === mix.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-400">Delete?</span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(mix.id)}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-zinc-400"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-zinc-400 hover:text-red-400"
                        onClick={() => setDeleteConfirmId(mix.id)}
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
