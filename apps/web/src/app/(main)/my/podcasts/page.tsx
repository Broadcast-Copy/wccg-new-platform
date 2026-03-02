"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  Video,
  Radio,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

interface CreateSeriesForm {
  title: string;
  description: string;
  category: string;
  language: string;
  coverImageUrl: string;
  tags: string;
  productionType: ProductionType;
}

interface CreateEpisodeForm {
  title: string;
  description: string;
  showNotes: string;
  audioUrl: string;
  episodeNumber: string;
  seasonNumber: string;
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

const INITIAL_SERIES_FORM: CreateSeriesForm = {
  title: "",
  description: "",
  category: "",
  language: "en",
  coverImageUrl: "",
  tags: "",
  productionType: "audio",
};

const INITIAL_EPISODE_FORM: CreateEpisodeForm = {
  title: "",
  description: "",
  showNotes: "",
  audioUrl: "",
  episodeNumber: "",
  seasonNumber: "",
};

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
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    case "PAUSED":
      return "border-orange-500/30 bg-orange-500/10 text-orange-400";
    case "ARCHIVED":
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
  }
}

function getEpisodeStatusStyle(status: PodcastEpisode["status"]): string {
  switch (status) {
    case "PUBLISHED":
      return "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]";
    case "DRAFT":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    case "SCHEDULED":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    case "ARCHIVED":
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-gray-400";
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export default function MyPodcastsPage() {
  const { user, isLoading: authLoading } = useAuth();

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

  // Create series dialog
  const [showCreateSeriesDialog, setShowCreateSeriesDialog] = useState(false);
  const [seriesForm, setSeriesForm] =
    useState<CreateSeriesForm>(INITIAL_SERIES_FORM);
  const [creatingSeries, setCreatingSeries] = useState(false);

  // Create episode dialog
  const [showCreateEpisodeDialog, setShowCreateEpisodeDialog] = useState(false);
  const [episodeForm, setEpisodeForm] =
    useState<CreateEpisodeForm>(INITIAL_EPISODE_FORM);
  const [creatingEpisode, setCreatingEpisode] = useState(false);
  const [activeSeriesForEpisode, setActiveSeriesForEpisode] =
    useState<PodcastSeries | null>(null);

  // ─── Fetch series ──────────────────────────────────────────────────

  const fetchSeries = useCallback(async () => {
    if (!user) {
      setLoadingSeries(false);
      return;
    }
    setLoadingSeries(true);
    try {
      const data = await apiClient<PodcastSeries[]>("/podcasts/my");
      setSeries(Array.isArray(data) ? data : []);
    } catch {
      setSeries([]);
      toast.error("Failed to load your podcast series.");
    } finally {
      setLoadingSeries(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // ─── Fetch episodes for a series ──────────────────────────────────

  const fetchEpisodes = useCallback(async (seriesId: string) => {
    setLoadingEpisodes((prev) => ({ ...prev, [seriesId]: true }));
    try {
      const data = await apiClient<PodcastEpisode[]>(
        `/podcasts/${seriesId}/episodes`,
      );
      setEpisodesBySeriesId((prev) => ({
        ...prev,
        [seriesId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      setEpisodesBySeriesId((prev) => ({ ...prev, [seriesId]: [] }));
      toast.error("Failed to load episodes.");
    } finally {
      setLoadingEpisodes((prev) => ({ ...prev, [seriesId]: false }));
    }
  }, []);

  // ─── Toggle expand ─────────────────────────────────────────────────

  function handleToggleExpand(seriesId: string) {
    if (expandedSeriesId === seriesId) {
      setExpandedSeriesId(null);
      return;
    }
    setExpandedSeriesId(seriesId);
    // Fetch episodes if not already loaded
    if (!episodesBySeriesId[seriesId]) {
      fetchEpisodes(seriesId);
    }
  }

  // ─── Create series ─────────────────────────────────────────────────

  async function handleCreateSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!seriesForm.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setCreatingSeries(true);
    try {
      const payload = {
        title: seriesForm.title.trim(),
        description: seriesForm.description.trim() || undefined,
        category: seriesForm.category || undefined,
        language: seriesForm.language || "en",
        coverImageUrl: seriesForm.coverImageUrl.trim() || undefined,
        tags: seriesForm.tags
          ? seriesForm.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      };

      await apiClient<PodcastSeries>("/podcasts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Podcast series created!");
      setShowCreateSeriesDialog(false);
      setSeriesForm(INITIAL_SERIES_FORM);
      fetchSeries();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create series.",
      );
    } finally {
      setCreatingSeries(false);
    }
  }

  // ─── Create episode ────────────────────────────────────────────────

  function openCreateEpisodeDialog(s: PodcastSeries) {
    setActiveSeriesForEpisode(s);
    setEpisodeForm(INITIAL_EPISODE_FORM);
    setShowCreateEpisodeDialog(true);
  }

  async function handleCreateEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSeriesForEpisode) return;
    if (!episodeForm.title.trim()) {
      toast.error("Episode title is required.");
      return;
    }

    setCreatingEpisode(true);
    try {
      const payload = {
        title: episodeForm.title.trim(),
        description: episodeForm.description.trim() || undefined,
        showNotes: episodeForm.showNotes.trim() || undefined,
        audioUrl: episodeForm.audioUrl.trim() || undefined,
        episodeNumber: episodeForm.episodeNumber
          ? parseInt(episodeForm.episodeNumber, 10)
          : undefined,
        seasonNumber: episodeForm.seasonNumber
          ? parseInt(episodeForm.seasonNumber, 10)
          : undefined,
      };

      await apiClient<PodcastEpisode>(
        `/podcasts/${activeSeriesForEpisode.id}/episodes`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success("Episode created!");
      setShowCreateEpisodeDialog(false);
      setEpisodeForm(INITIAL_EPISODE_FORM);
      setActiveSeriesForEpisode(null);
      // Refresh episodes for this series
      fetchEpisodes(activeSeriesForEpisode.id);
      // Refresh series to update episode counts
      fetchSeries();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create episode.",
      );
    } finally {
      setCreatingEpisode(false);
    }
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

  // ─── Not logged in ─────────────────────────────────────────────────

  if (!user) {
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
          onClick={() => {
            setSeriesForm(INITIAL_SERIES_FORM);
            setShowCreateSeriesDialog(true);
          }}
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
              onClick={() => {
                setSeriesForm(INITIAL_SERIES_FORM);
                setShowCreateSeriesDialog(true);
              }}
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
                className="overflow-hidden border-white/[0.06] transition-colors"
              >
                {/* Series header row */}
                <div
                  className="flex cursor-pointer items-start gap-4 px-6 pt-6 pb-2"
                  onClick={() => handleToggleExpand(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleExpand(s.id);
                    }
                  }}
                >
                  {/* Cover image or placeholder */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#141420]">
                    {s.coverImageUrl ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${s.coverImageUrl})` }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7401df]/60 via-[#7401df]/40 to-[#74ddc7]/30">
                        <Podcast className="h-8 w-8 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Series info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold">
                            {s.title}
                          </h3>
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

                      {/* Expand chevron */}
                      <div className="shrink-0 pt-1">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
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
                        {s.subscriberCount === 1
                          ? "subscriber"
                          : "subscribers"}
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
                  <CardContent className="border-t border-white/[0.06] pt-4">
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
                      <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.06] bg-[#141420]/50">
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
                      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/[0.06] hover:bg-transparent">
                              <TableHead className="text-xs text-white/50">
                                #
                              </TableHead>
                              <TableHead className="text-xs text-white/50">
                                Title
                              </TableHead>
                              <TableHead className="text-xs text-white/50">
                                Status
                              </TableHead>
                              <TableHead className="text-xs text-white/50">
                                Date
                              </TableHead>
                              <TableHead className="w-[80px] text-xs text-white/50">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {episodes.map((ep) => (
                              <TableRow
                                key={ep.id}
                                className="border-white/[0.06]"
                              >
                                <TableCell className="text-sm text-white/50">
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
                                <TableCell className="text-xs text-white/50">
                                  {ep.publishedAt
                                    ? formatDate(ep.publishedAt)
                                    : formatDate(ep.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    title="Edit episode"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
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

      {/* ─── Create Series Dialog ───────────────────────────────────── */}
      <Dialog
        open={showCreateSeriesDialog}
        onOpenChange={setShowCreateSeriesDialog}
      >
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleCreateSeries}>
            <DialogHeader>
              <DialogTitle>Create Podcast Series</DialogTitle>
              <DialogDescription>
                Set up a new podcast series. Cover art is optional — you can
                add it later. Choose your production style below.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Title */}
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="series-description">Description</Label>
                <Textarea
                  id="series-description"
                  placeholder="What is this podcast about?"
                  value={seriesForm.description}
                  onChange={(e) =>
                    setSeriesForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              {/* ── Production Type Selector ──────────────────────────── */}
              <div className="space-y-2">
                <Label>Production Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Audio Only */}
                  <button
                    type="button"
                    onClick={() => setSeriesForm((f) => ({ ...f, productionType: "audio" }))}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center ${
                      seriesForm.productionType === "audio"
                        ? "border-[#7401df] bg-[#7401df]/10 ring-1 ring-[#7401df]/30"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                    }`}
                  >
                    <Mic className={`h-6 w-6 ${seriesForm.productionType === "audio" ? "text-[#7401df]" : "text-white/50"}`} />
                    <div>
                      <p className={`text-xs font-semibold ${seriesForm.productionType === "audio" ? "text-[#7401df]" : "text-white/70"}`}>Audio Only</p>
                      <p className="text-[10px] text-white/30 mt-0.5">Traditional podcast</p>
                    </div>
                  </button>

                  {/* Video Studio — Live */}
                  <button
                    type="button"
                    onClick={() => setSeriesForm((f) => ({ ...f, productionType: "video-live" }))}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center ${
                      seriesForm.productionType === "video-live"
                        ? "border-[#dc2626] bg-[#dc2626]/10 ring-1 ring-[#dc2626]/30"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                    }`}
                  >
                    <Radio className={`h-6 w-6 ${seriesForm.productionType === "video-live" ? "text-[#dc2626]" : "text-white/50"}`} />
                    <div>
                      <p className={`text-xs font-semibold ${seriesForm.productionType === "video-live" ? "text-[#dc2626]" : "text-white/70"}`}>Live Broadcast</p>
                      <p className="text-[10px] text-white/30 mt-0.5">2-camera studio</p>
                    </div>
                  </button>

                  {/* Video Studio — Recorded */}
                  <button
                    type="button"
                    onClick={() => setSeriesForm((f) => ({ ...f, productionType: "video-recorded" }))}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center ${
                      seriesForm.productionType === "video-recorded"
                        ? "border-[#74ddc7] bg-[#74ddc7]/10 ring-1 ring-[#74ddc7]/30"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                    }`}
                  >
                    <Video className={`h-6 w-6 ${seriesForm.productionType === "video-recorded" ? "text-[#74ddc7]" : "text-white/50"}`} />
                    <div>
                      <p className={`text-xs font-semibold ${seriesForm.productionType === "video-recorded" ? "text-[#74ddc7]" : "text-white/70"}`}>Record &amp; Edit</p>
                      <p className="text-[10px] text-white/30 mt-0.5">2-camera studio</p>
                    </div>
                  </button>
                </div>

                {/* Studio info box for video modes */}
                {(seriesForm.productionType === "video-live" || seriesForm.productionType === "video-recorded") && (
                  <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-white/50" />
                      <span className="text-xs font-semibold text-white/70">
                        {seriesForm.productionType === "video-live" ? "Live Video Studio" : "Video Recording Studio"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      {seriesForm.productionType === "video-live"
                        ? "After creating your series, you'll be taken to the podcast studio with a 2-camera setup. Your live video feed will be broadcasted in real-time to listeners."
                        : "After creating your series, you'll be taken to the podcast studio with a 2-camera setup. Record your episode, then edit and publish when you're ready."}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> Camera 1: Host</span>
                      <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> Camera 2: Guest</span>
                      <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> Multi-track audio</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Category and Language row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="series-category">Category</Label>
                  <Select
                    value={seriesForm.category}
                    onValueChange={(val) =>
                      setSeriesForm((f) => ({ ...f, category: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
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

                <div className="space-y-2">
                  <Label htmlFor="series-language">Language</Label>
                  <Select
                    value={seriesForm.language}
                    onValueChange={(val) =>
                      setSeriesForm((f) => ({ ...f, language: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
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

              {/* Cover Image URL — clearly optional */}
              <div className="space-y-2">
                <Label htmlFor="series-cover">
                  Cover Image URL <span className="text-xs text-white/30 font-normal">(optional)</span>
                </Label>
                <Input
                  id="series-cover"
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={seriesForm.coverImageUrl}
                  onChange={(e) =>
                    setSeriesForm((f) => ({
                      ...f,
                      coverImageUrl: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  You can add cover art later. A default will be generated if left empty.
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="series-tags">Tags</Label>
                <Input
                  id="series-tags"
                  placeholder="music, interviews, culture (comma-separated)"
                  value={seriesForm.tags}
                  onChange={(e) =>
                    setSeriesForm((f) => ({ ...f, tags: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separate tags with commas
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateSeriesDialog(false)}
                disabled={creatingSeries}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
                disabled={creatingSeries}
              >
                {creatingSeries && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {seriesForm.productionType === "audio"
                  ? "Create Series"
                  : seriesForm.productionType === "video-live"
                    ? "Create & Go Live"
                    : "Create & Open Studio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Create Episode Dialog ──────────────────────────────────── */}
      <Dialog
        open={showCreateEpisodeDialog}
        onOpenChange={(open) => {
          setShowCreateEpisodeDialog(open);
          if (!open) setActiveSeriesForEpisode(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateEpisode}>
            <DialogHeader>
              <DialogTitle>Add Episode</DialogTitle>
              <DialogDescription>
                Add a new episode to{" "}
                <span className="font-medium text-foreground">
                  {activeSeriesForEpisode?.title}
                </span>
              </DialogDescription>
            </DialogHeader>

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
                    setEpisodeForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
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
                    setEpisodeForm((f) => ({
                      ...f,
                      showNotes: e.target.value,
                    }))
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
                    setEpisodeForm((f) => ({
                      ...f,
                      audioUrl: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Episode and Season Number row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="episode-number">Episode Number</Label>
                  <Input
                    id="episode-number"
                    type="number"
                    min={1}
                    placeholder="1"
                    value={episodeForm.episodeNumber}
                    onChange={(e) =>
                      setEpisodeForm((f) => ({
                        ...f,
                        episodeNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season-number">Season Number</Label>
                  <Input
                    id="season-number"
                    type="number"
                    min={1}
                    placeholder="1"
                    value={episodeForm.seasonNumber}
                    onChange={(e) =>
                      setEpisodeForm((f) => ({
                        ...f,
                        seasonNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateEpisodeDialog(false)}
                disabled={creatingEpisode}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
                disabled={creatingEpisode}
              >
                {creatingEpisode && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Add Episode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
