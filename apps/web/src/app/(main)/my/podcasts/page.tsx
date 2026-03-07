"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Podcast,
  Users,
  Calendar,
  Hash,
  Play,
  Pencil,
  Trash2,
  Video,
  Radio,
  Camera,
  MoreHorizontal,
  Settings,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { LoginRequired } from "@/components/auth/login-required";

// ─── Types ─────────────────────────────────────────────────────────────

interface PodcastSeries {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  language: string;
  coverImageUrl: string | null;
  tags: string[];
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  episodeCount: number;
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PodcastEpisode {
  id: string;
  seriesId: string;
  title: string;
  description: string | null;
  showNotes: string | null;
  audioUrl: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  tags: string[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type ProductionType = "audio" | "video-live" | "video-recorded";

interface SeriesFormData {
  title: string;
  description: string;
  category: string;
  language: string;
  coverImageUrl: string;
  tags: string;
  productionType: ProductionType;
  status: PodcastSeries["status"];
}

interface EpisodeFormData {
  title: string;
  description: string;
  showNotes: string;
  audioUrl: string;
  episodeNumber: string;
  seasonNumber: string;
  status: PodcastEpisode["status"];
}

// ─── Constants ─────────────────────────────────────────────────────────

const PODCAST_CATEGORIES = [
  "Arts",
  "Business",
  "Comedy",
  "Education",
  "Fiction",
  "Government",
  "Health & Fitness",
  "History",
  "Kids & Family",
  "Leisure",
  "Music",
  "News",
  "Religion & Spirituality",
  "Science",
  "Society & Culture",
  "Sports",
  "Technology",
  "True Crime",
  "TV & Film",
] as const;

const INITIAL_SERIES_FORM: SeriesFormData = {
  title: "",
  description: "",
  category: "",
  language: "en",
  coverImageUrl: "",
  tags: "",
  productionType: "audio",
  status: "DRAFT",
};

const INITIAL_EPISODE_FORM: EpisodeFormData = {
  title: "",
  description: "",
  showNotes: "",
  audioUrl: "",
  episodeNumber: "",
  seasonNumber: "",
  status: "DRAFT",
};

// ─── LocalStorage keys ────────────────────────────────────────────────

const SERIES_KEY = "wccg_podcast_series";
const EPISODES_KEY = "wccg_podcast_episodes";

// ─── Helpers ───────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getSeriesStatusStyle(status: PodcastSeries["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]";
    case "DRAFT":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "PAUSED":
      return "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "ARCHIVED":
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
  }
}

function getEpisodeStatusStyle(status: PodcastEpisode["status"]): string {
  switch (status) {
    case "PUBLISHED":
      return "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]";
    case "DRAFT":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "SCHEDULED":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "ARCHIVED":
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
  }
}

function genId(): string {
  return crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Component ─────────────────────────────────────────────────────────

export default function MyPodcastsPage() {
  return (
    <LoginRequired
      fullPage
      message="Sign in to manage your podcast series and episodes. Your creator dashboard is waiting."
    >
      <MyPodcastsContent />
    </LoginRequired>
  );
}

function MyPodcastsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Series state
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [expandedSeriesId, setExpandedSeriesId] = useState<string | null>(null);

  // Episodes state (keyed by series ID)
  const [episodesBySeriesId, setEpisodesBySeriesId] = useState<
    Record<string, PodcastEpisode[]>
  >({});
  const [loadingEpisodes, setLoadingEpisodes] = useState<
    Record<string, boolean>
  >({});

  // Series dialog (create & edit)
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [seriesForm, setSeriesForm] = useState<SeriesFormData>(INITIAL_SERIES_FORM);
  const [savingSeries, setSavingSeries] = useState(false);

  // Episode dialog (create & edit)
  const [showEpisodeDialog, setShowEpisodeDialog] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [episodeForm, setEpisodeForm] = useState<EpisodeFormData>(INITIAL_EPISODE_FORM);
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [activeSeriesForEpisode, setActiveSeriesForEpisode] =
    useState<PodcastSeries | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "series" | "episode";
    id: string;
    seriesId?: string;
    title: string;
  } | null>(null);

  // ─── Local storage helpers ───────────────────────────────────────────

  const loadLocalSeries = useCallback((): PodcastSeries[] => {
    try {
      const raw = localStorage.getItem(SERIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLocalSeries = useCallback((data: PodcastSeries[]) => {
    try {
      localStorage.setItem(SERIES_KEY, JSON.stringify(data));
    } catch { /* quota exceeded */ }
  }, []);

  const loadLocalEpisodes = useCallback((): Record<string, PodcastEpisode[]> => {
    try {
      const raw = localStorage.getItem(EPISODES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const saveLocalEpisodes = useCallback(
    (data: Record<string, PodcastEpisode[]>) => {
      try {
        localStorage.setItem(EPISODES_KEY, JSON.stringify(data));
      } catch { /* quota exceeded */ }
    },
    [],
  );

  // ─── Fetch series ──────────────────────────────────────────────────

  const fetchSeries = useCallback(async () => {
    if (!user) {
      const local = loadLocalSeries();
      setSeries(local);
      setLoadingSeries(false);
      return;
    }
    setLoadingSeries(true);
    try {
      const data = await apiClient<PodcastSeries[]>("/podcasts/my");
      const apiSeries = Array.isArray(data) ? data : [];
      const local = loadLocalSeries();
      const apiIds = new Set(apiSeries.map((s) => s.id));
      const merged = [...apiSeries, ...local.filter((l) => !apiIds.has(l.id))];
      setSeries(merged);
    } catch {
      const local = loadLocalSeries();
      setSeries(local);
    } finally {
      setLoadingSeries(false);
    }
  }, [user, loadLocalSeries]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // Load local episodes on mount
  useEffect(() => {
    const local = loadLocalEpisodes();
    if (Object.keys(local).length > 0) {
      setEpisodesBySeriesId(local);
    }
  }, [loadLocalEpisodes]);

  // ─── Fetch episodes for a series ──────────────────────────────────

  const fetchEpisodes = useCallback(
    async (seriesId: string) => {
      setLoadingEpisodes((prev) => ({ ...prev, [seriesId]: true }));
      try {
        const data = await apiClient<PodcastEpisode[]>(
          `/podcasts/${seriesId}/episodes`,
        );
        const apiEps = Array.isArray(data) ? data : [];
        // Merge with local episodes
        const localAll = loadLocalEpisodes();
        const localEps = localAll[seriesId] || [];
        const apiIds = new Set(apiEps.map((e) => e.id));
        const merged = [...apiEps, ...localEps.filter((l) => !apiIds.has(l.id))];
        setEpisodesBySeriesId((prev) => {
          const updated = { ...prev, [seriesId]: merged };
          saveLocalEpisodes(updated);
          return updated;
        });
      } catch {
        // API unavailable — use local
        const localAll = loadLocalEpisodes();
        const localEps = localAll[seriesId] || [];
        setEpisodesBySeriesId((prev) => ({ ...prev, [seriesId]: localEps }));
      } finally {
        setLoadingEpisodes((prev) => ({ ...prev, [seriesId]: false }));
      }
    },
    [loadLocalEpisodes, saveLocalEpisodes],
  );

  // ─── Toggle expand ─────────────────────────────────────────────────

  function handleToggleExpand(seriesId: string) {
    if (expandedSeriesId === seriesId) {
      setExpandedSeriesId(null);
      return;
    }
    setExpandedSeriesId(seriesId);
    if (!episodesBySeriesId[seriesId]) {
      fetchEpisodes(seriesId);
    }
  }

  // ─── Open create series dialog ─────────────────────────────────────

  function openCreateSeriesDialog() {
    setEditingSeriesId(null);
    setSeriesForm(INITIAL_SERIES_FORM);
    setShowSeriesDialog(true);
  }

  // ─── Open edit series dialog ───────────────────────────────────────

  function openEditSeriesDialog(s: PodcastSeries) {
    setEditingSeriesId(s.id);
    setSeriesForm({
      title: s.title,
      description: s.description || "",
      category: s.category || "",
      language: s.language || "en",
      coverImageUrl: s.coverImageUrl || "",
      tags: s.tags?.join(", ") || "",
      productionType: "audio",
      status: s.status,
    });
    setShowSeriesDialog(true);
  }

  // ─── Save series (create or update) ────────────────────────────────

  async function handleSaveSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!seriesForm.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setSavingSeries(true);
    const now = new Date().toISOString();

    const payload = {
      title: seriesForm.title.trim(),
      description: seriesForm.description.trim() || null,
      category: seriesForm.category || null,
      language: seriesForm.language || "en",
      coverImageUrl: seriesForm.coverImageUrl.trim() || null,
      tags: seriesForm.tags
        ? seriesForm.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      status: seriesForm.status,
    };

    if (editingSeriesId) {
      // ── Update existing series ──
      try {
        await apiClient<PodcastSeries>(`/podcasts/${editingSeriesId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } catch {
        // API unavailable — update locally
      }

      setSeries((prev) => {
        const updated = prev.map((s) =>
          s.id === editingSeriesId
            ? { ...s, ...payload, updatedAt: now }
            : s,
        );
        saveLocalSeries(updated);
        return updated;
      });

      toast.success("Series updated!");
    } else {
      // ── Create new series ──
      let created: PodcastSeries | null = null;

      try {
        created = await apiClient<PodcastSeries>("/podcasts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        created = {
          id: genId(),
          ...payload,
          tags: payload.tags ?? [],
          status: "DRAFT",
          episodeCount: 0,
          subscriberCount: 0,
          createdAt: now,
          updatedAt: now,
        };
      }

      if (created) {
        setSeries((prev) => {
          const updated = [created!, ...prev];
          saveLocalSeries(updated);
          return updated;
        });
      }

      toast.success("Podcast series created!");

      // Navigate to studio for new creations
      setSavingSeries(false);
      setShowSeriesDialog(false);
      setSeriesForm(INITIAL_SERIES_FORM);
      router.push("/studio/podcast");
      return;
    }

    setSavingSeries(false);
    setShowSeriesDialog(false);
    setSeriesForm(INITIAL_SERIES_FORM);
    setEditingSeriesId(null);
  }

  // ─── Open create episode dialog ────────────────────────────────────

  function openCreateEpisodeDialog(s: PodcastSeries) {
    setActiveSeriesForEpisode(s);
    setEditingEpisodeId(null);
    setEpisodeForm(INITIAL_EPISODE_FORM);
    setShowEpisodeDialog(true);
  }

  // ─── Open edit episode dialog ──────────────────────────────────────

  function openEditEpisodeDialog(s: PodcastSeries, ep: PodcastEpisode) {
    setActiveSeriesForEpisode(s);
    setEditingEpisodeId(ep.id);
    setEpisodeForm({
      title: ep.title,
      description: ep.description || "",
      showNotes: ep.showNotes || "",
      audioUrl: ep.audioUrl || "",
      episodeNumber: ep.episodeNumber?.toString() || "",
      seasonNumber: ep.seasonNumber?.toString() || "",
      status: ep.status,
    });
    setShowEpisodeDialog(true);
  }

  // ─── Save episode (create or update) ───────────────────────────────

  async function handleSaveEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSeriesForEpisode) return;
    if (!episodeForm.title.trim()) {
      toast.error("Episode title is required.");
      return;
    }

    setSavingEpisode(true);
    const now = new Date().toISOString();
    const seriesId = activeSeriesForEpisode.id;

    const payload = {
      title: episodeForm.title.trim(),
      description: episodeForm.description.trim() || null,
      showNotes: episodeForm.showNotes.trim() || null,
      audioUrl: episodeForm.audioUrl.trim() || null,
      episodeNumber: episodeForm.episodeNumber
        ? parseInt(episodeForm.episodeNumber, 10)
        : null,
      seasonNumber: episodeForm.seasonNumber
        ? parseInt(episodeForm.seasonNumber, 10)
        : null,
      status: episodeForm.status,
    };

    if (editingEpisodeId) {
      // ── Update existing episode ──
      try {
        await apiClient<PodcastEpisode>(
          `/podcasts/${seriesId}/episodes/${editingEpisodeId}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
      } catch {
        // API unavailable — update locally
      }

      setEpisodesBySeriesId((prev) => {
        const eps = (prev[seriesId] || []).map((ep) =>
          ep.id === editingEpisodeId
            ? { ...ep, ...payload, updatedAt: now }
            : ep,
        );
        const updated = { ...prev, [seriesId]: eps };
        saveLocalEpisodes(updated);
        return updated;
      });

      toast.success("Episode updated!");
    } else {
      // ── Create new episode ──
      let created: PodcastEpisode | null = null;

      try {
        created = await apiClient<PodcastEpisode>(
          `/podcasts/${seriesId}/episodes`,
          { method: "POST", body: JSON.stringify(payload) },
        );
      } catch {
        created = {
          id: genId(),
          seriesId,
          ...payload,
          tags: [],
          status: payload.status || "DRAFT",
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        };
      }

      if (created) {
        setEpisodesBySeriesId((prev) => {
          const existing = prev[seriesId] || [];
          const eps = [created!, ...existing];
          const updated = { ...prev, [seriesId]: eps };
          saveLocalEpisodes(updated);
          return updated;
        });

        // Update episode count on series
        setSeries((prev) => {
          const updated = prev.map((s) =>
            s.id === seriesId
              ? { ...s, episodeCount: s.episodeCount + 1, updatedAt: now }
              : s,
          );
          saveLocalSeries(updated);
          return updated;
        });
      }

      toast.success("Episode created!");
    }

    setSavingEpisode(false);
    setShowEpisodeDialog(false);
    setEpisodeForm(INITIAL_EPISODE_FORM);
    setEditingEpisodeId(null);
    setActiveSeriesForEpisode(null);
  }

  // ─── Delete handler ─────────────────────────────────────────────────

  function handleConfirmDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "series") {
      // Try API delete
      apiClient(`/podcasts/${deleteTarget.id}`, { method: "DELETE" }).catch(
        () => {},
      );

      setSeries((prev) => {
        const updated = prev.filter((s) => s.id !== deleteTarget.id);
        saveLocalSeries(updated);
        return updated;
      });

      // Remove episodes for this series
      setEpisodesBySeriesId((prev) => {
        const updated = { ...prev };
        delete updated[deleteTarget.id];
        saveLocalEpisodes(updated);
        return updated;
      });

      if (expandedSeriesId === deleteTarget.id) {
        setExpandedSeriesId(null);
      }

      toast.success("Series deleted.");
    } else {
      // Delete episode
      const sid = deleteTarget.seriesId!;

      apiClient(
        `/podcasts/${sid}/episodes/${deleteTarget.id}`,
        { method: "DELETE" },
      ).catch(() => {});

      setEpisodesBySeriesId((prev) => {
        const eps = (prev[sid] || []).filter(
          (ep) => ep.id !== deleteTarget.id,
        );
        const updated = { ...prev, [sid]: eps };
        saveLocalEpisodes(updated);
        return updated;
      });

      // Update episode count
      setSeries((prev) => {
        const updated = prev.map((s) =>
          s.id === sid
            ? { ...s, episodeCount: Math.max(0, s.episodeCount - 1) }
            : s,
        );
        saveLocalSeries(updated);
        return updated;
      });

      toast.success("Episode deleted.");
    }

    setDeleteTarget(null);
  }

  // ─── Auth loading ──────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // ─── Not logged in — still show local data ──────────────────────────

  if (!user && series.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Podcasts</h1>
          <p className="text-muted-foreground">
            Please{" "}
            <Link href="/login" className="underline hover:text-foreground">
              sign in
            </Link>{" "}
            to manage your podcasts.
          </p>
        </div>
      </div>
    );
  }

  // ─── Series form fields (shared between create & edit) ─────────────

  const seriesFormFields = (
    <div className="mt-4 space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="series-title">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="series-title"
          placeholder="My Awesome Podcast"
          value={seriesForm.title}
          onChange={(e) =>
            setSeriesForm((f) => ({ ...f, title: e.target.value }))
          }
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="series-description">Description</Label>
        <Textarea
          id="series-description"
          placeholder="What is this podcast about?"
          value={seriesForm.description}
          onChange={(e) =>
            setSeriesForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={2}
        />
      </div>

      {/* Production Type — only on create */}
      {!editingSeriesId && (
        <div className="space-y-1.5">
          <Label>Production Type</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { key: "audio" as const, label: "Audio", sub: "Podcast", icon: Mic, color: "#7401df" },
                { key: "video-live" as const, label: "Live", sub: "Broadcast", icon: Radio, color: "#dc2626" },
                { key: "video-recorded" as const, label: "Record", sub: "& Edit", icon: Video, color: "#74ddc7" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSeriesForm((f) => ({ ...f, productionType: opt.key }))}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all text-center ${
                  seriesForm.productionType === opt.key
                    ? ""
                    : "border-border bg-foreground/[0.02] hover:border-foreground/[0.15]"
                }`}
                style={
                  seriesForm.productionType === opt.key
                    ? { borderColor: opt.color, backgroundColor: `${opt.color}1a`, boxShadow: `0 0 0 1px ${opt.color}4d` }
                    : undefined
                }
              >
                <opt.icon
                  className={`h-5 w-5 ${seriesForm.productionType !== opt.key ? "text-muted-foreground" : ""}`}
                  style={seriesForm.productionType === opt.key ? { color: opt.color } : undefined}
                />
                <p
                  className={`text-[11px] font-semibold leading-tight ${seriesForm.productionType !== opt.key ? "text-foreground/60" : ""}`}
                  style={seriesForm.productionType === opt.key ? { color: opt.color } : undefined}
                >
                  {opt.label}
                </p>
                <p className="text-[9px] text-muted-foreground/70 leading-tight">{opt.sub}</p>
              </button>
            ))}
          </div>

          {seriesForm.productionType !== "audio" && (
            <div className="mt-1.5 rounded-lg border border-border bg-foreground/[0.03] p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-foreground/70">
                  {seriesForm.productionType === "video-live" ? "Live Video Studio" : "Video Recording Studio"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                2-camera setup with multi-track audio.
                {seriesForm.productionType === "video-live"
                  ? " Stream live to listeners in real-time."
                  : " Record, edit, then publish."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status — only on edit */}
      {editingSeriesId && (
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={seriesForm.status}
            onValueChange={(val) =>
              setSeriesForm((f) => ({ ...f, status: val as PodcastSeries["status"] }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category and Language */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={seriesForm.category}
            onValueChange={(val) =>
              setSeriesForm((f) => ({ ...f, category: val }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {PODCAST_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Language</Label>
          <Select
            value={seriesForm.language}
            onValueChange={(val) =>
              setSeriesForm((f) => ({ ...f, language: val }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="ko">Korean</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cover Image URL */}
      <div className="space-y-1.5">
        <Label>
          Cover Art{" "}
          <span className="text-[10px] text-muted-foreground/70 font-normal">
            (optional)
          </span>
        </Label>
        <Input
          type="url"
          placeholder="https://example.com/cover.jpg"
          value={seriesForm.coverImageUrl}
          onChange={(e) =>
            setSeriesForm((f) => ({ ...f, coverImageUrl: e.target.value }))
          }
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>Tags</Label>
        <Input
          placeholder="music, interviews, culture"
          value={seriesForm.tags}
          onChange={(e) =>
            setSeriesForm((f) => ({ ...f, tags: e.target.value }))
          }
        />
      </div>
    </div>
  );

  // ─── Episode form fields (shared between create & edit) ────────────

  const episodeFormFields = (
    <div className="mt-4 space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="episode-title">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="episode-title"
          placeholder="Episode title"
          value={episodeForm.title}
          onChange={(e) =>
            setEpisodeForm((f) => ({ ...f, title: e.target.value }))
          }
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="episode-description">Description</Label>
        <Textarea
          id="episode-description"
          placeholder="Brief episode description"
          value={episodeForm.description}
          onChange={(e) =>
            setEpisodeForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={2}
        />
      </div>

      {/* Show Notes */}
      <div className="space-y-2">
        <Label htmlFor="episode-shownotes">Show Notes</Label>
        <Textarea
          id="episode-shownotes"
          placeholder="Detailed show notes, links, credits..."
          value={episodeForm.showNotes}
          onChange={(e) =>
            setEpisodeForm((f) => ({ ...f, showNotes: e.target.value }))
          }
          rows={3}
        />
      </div>

      {/* Audio URL */}
      <div className="space-y-2">
        <Label htmlFor="episode-audio">Audio URL</Label>
        <Input
          id="episode-audio"
          type="url"
          placeholder="https://example.com/episode.mp3"
          value={episodeForm.audioUrl}
          onChange={(e) =>
            setEpisodeForm((f) => ({ ...f, audioUrl: e.target.value }))
          }
        />
      </div>

      {/* Episode / Season Number + Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="episode-number">Episode #</Label>
          <Input
            id="episode-number"
            type="number"
            min={1}
            placeholder="1"
            value={episodeForm.episodeNumber}
            onChange={(e) =>
              setEpisodeForm((f) => ({ ...f, episodeNumber: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="season-number">Season #</Label>
          <Input
            id="season-number"
            type="number"
            min={1}
            placeholder="1"
            value={episodeForm.seasonNumber}
            onChange={(e) =>
              setEpisodeForm((f) => ({ ...f, seasonNumber: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={episodeForm.status}
            onValueChange={(val) =>
              setEpisodeForm((f) => ({
                ...f,
                status: val as PodcastEpisode["status"],
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Podcasts</h1>
          <p className="text-muted-foreground">
            Create and manage your podcast series and episodes
          </p>
        </div>
        <Button
          className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
          onClick={openCreateSeriesDialog}
        >
          <Plus className="h-4 w-4" />
          Create Series
        </Button>
      </div>

      {/* Loading state */}
      {loadingSeries ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Podcast className="h-5 w-5 animate-pulse" />
            <span>Loading your podcasts...</span>
          </div>
        </div>
      ) : series.length === 0 ? (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7401df]/10">
              <Mic className="h-8 w-8 text-[#7401df]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No podcasts yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven&apos;t created any podcast series. Start by creating
                your first series to begin publishing episodes!
              </p>
            </div>
            <Button
              className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
              onClick={openCreateSeriesDialog}
            >
              <Plus className="h-4 w-4" />
              Create Your First Series
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Series list */
        <div className="space-y-4">
          {series.map((s) => {
            const isExpanded = expandedSeriesId === s.id;
            const episodes = episodesBySeriesId[s.id];
            const episodesLoading = loadingEpisodes[s.id] ?? false;

            return (
              <Card
                key={s.id}
                className="overflow-hidden border-border transition-colors"
              >
                {/* Series header row */}
                <div className="flex items-start gap-4 px-6 pt-6 pb-2">
                  {/* Cover image — click to open studio */}
                  <button
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-card cursor-pointer group"
                    onClick={() => router.push("/studio/podcast")}
                    title="Open in Studio"
                  >
                    {s.coverImageUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center group-hover:scale-105 transition-transform"
                        style={{ backgroundImage: `url(${s.coverImageUrl})` }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/60 via-[#7401df]/40 to-[#74ddc7]/30 group-hover:from-[#7401df]/80 group-hover:via-[#7401df]/60 group-hover:to-[#74ddc7]/50 transition-colors">
                        <Podcast className="h-8 w-8 text-foreground/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg">
                      <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>

                  {/* Series info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {/* Title — click to open studio */}
                          <button
                            className="truncate text-base font-semibold text-foreground hover:text-[#74ddc7] transition-colors text-left"
                            onClick={() => router.push("/studio/podcast")}
                            title="Open in Studio"
                          >
                            {s.title}
                          </button>
                          <Badge className={getSeriesStatusStyle(s.status)}>
                            {s.status}
                          </Badge>
                        </div>
                        {s.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {s.description}
                          </p>
                        )}
                      </div>

                      {/* Actions + Expand */}
                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        {/* Edit button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Edit series"
                          onClick={() => openEditSeriesDialog(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {/* Open Studio */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Open in Studio"
                          onClick={() => router.push("/studio/podcast")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        {/* Delete button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          title="Delete series"
                          onClick={() =>
                            setDeleteTarget({
                              type: "series",
                              id: s.id,
                              title: s.title,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {/* Chevron to expand episodes */}
                        <button
                          className="p-1 rounded hover:bg-foreground/[0.06] transition-colors"
                          onClick={() => handleToggleExpand(s.id)}
                          title={isExpanded ? "Collapse episodes" : "Show episodes"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {s.episodeCount}{" "}
                        {s.episodeCount === 1 ? "episode" : "episodes"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.subscriberCount}{" "}
                        {s.subscriberCount === 1 ? "subscriber" : "subscribers"}
                      </span>
                      {s.category && (
                        <span className="flex items-center gap-1">
                          <Podcast className="h-3 w-3" />
                          {s.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(s.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded episodes section */}
                {isExpanded && (
                  <CardContent className="border-t border-border pt-4">
                    {/* Episode actions bar */}
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Episodes
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateEpisodeDialog(s);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Episode
                      </Button>
                    </div>

                    {episodesLoading ? (
                      <div className="flex h-24 items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading episodes...</span>
                        </div>
                      </div>
                    ) : !episodes || episodes.length === 0 ? (
                      <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50">
                        <p className="text-sm text-muted-foreground">
                          No episodes in this series yet.
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-[#7401df] hover:text-[#7401df]/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateEpisodeDialog(s);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create your first episode
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="text-xs text-muted-foreground">
                                #
                              </TableHead>
                              <TableHead className="text-xs text-muted-foreground">
                                Title
                              </TableHead>
                              <TableHead className="text-xs text-muted-foreground">
                                Status
                              </TableHead>
                              <TableHead className="text-xs text-muted-foreground">
                                Date
                              </TableHead>
                              <TableHead className="w-[100px] text-xs text-muted-foreground">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {episodes.map((ep) => (
                              <TableRow
                                key={ep.id}
                                className="border-border"
                              >
                                <TableCell className="text-sm text-muted-foreground">
                                  {ep.seasonNumber != null &&
                                  ep.episodeNumber != null
                                    ? `S${ep.seasonNumber}E${ep.episodeNumber}`
                                    : ep.episodeNumber != null
                                      ? `E${ep.episodeNumber}`
                                      : "--"}
                                </TableCell>
                                <TableCell>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {ep.audioUrl && (
                                        <Play className="h-3 w-3 shrink-0 text-[#74ddc7]" />
                                      )}
                                      <span className="truncate text-sm font-medium">
                                        {ep.title}
                                      </span>
                                    </div>
                                    {ep.description && (
                                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {ep.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={getEpisodeStatusStyle(ep.status)}
                                  >
                                    {ep.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {ep.publishedAt
                                    ? formatDate(ep.publishedAt)
                                    : formatDate(ep.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      title="Edit episode"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditEpisodeDialog(s, ep);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                      title="Delete episode"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTarget({
                                          type: "episode",
                                          id: ep.id,
                                          seriesId: s.id,
                                          title: ep.title,
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Series Dialog (Create & Edit) ───────────────────────────── */}
      <Dialog
        open={showSeriesDialog}
        onOpenChange={(open) => {
          setShowSeriesDialog(open);
          if (!open) {
            setEditingSeriesId(null);
            setSeriesForm(INITIAL_SERIES_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveSeries}>
            <DialogHeader>
              <DialogTitle>
                {editingSeriesId ? "Edit Podcast Series" : "Create Podcast Series"}
              </DialogTitle>
              <DialogDescription>
                {editingSeriesId
                  ? "Update your podcast series details below."
                  : "Set up a new podcast series. Choose your production style below."}
              </DialogDescription>
            </DialogHeader>

            {seriesFormFields}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSeriesDialog(false)}
                disabled={savingSeries}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
                disabled={savingSeries}
              >
                {savingSeries && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSeriesId
                  ? "Save Changes"
                  : seriesForm.productionType === "audio"
                    ? "Create Series"
                    : seriesForm.productionType === "video-live"
                      ? "Create & Go Live"
                      : "Create & Open Studio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Episode Dialog (Create & Edit) ──────────────────────────── */}
      <Dialog
        open={showEpisodeDialog}
        onOpenChange={(open) => {
          setShowEpisodeDialog(open);
          if (!open) {
            setActiveSeriesForEpisode(null);
            setEditingEpisodeId(null);
            setEpisodeForm(INITIAL_EPISODE_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveEpisode}>
            <DialogHeader>
              <DialogTitle>
                {editingEpisodeId ? "Edit Episode" : "Add Episode"}
              </DialogTitle>
              <DialogDescription>
                {editingEpisodeId ? (
                  <>
                    Update episode details for{" "}
                    <span className="font-medium text-foreground">
                      {activeSeriesForEpisode?.title}
                    </span>
                  </>
                ) : (
                  <>
                    Add a new episode to{" "}
                    <span className="font-medium text-foreground">
                      {activeSeriesForEpisode?.title}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {episodeFormFields}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEpisodeDialog(false)}
                disabled={savingEpisode}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
                disabled={savingEpisode}
              >
                {savingEpisode && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEpisodeId ? "Save Changes" : "Add Episode"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.type === "series" ? "Series" : "Episode"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              ?{" "}
              {deleteTarget?.type === "series"
                ? "This will also remove all episodes in this series. "
                : ""}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
