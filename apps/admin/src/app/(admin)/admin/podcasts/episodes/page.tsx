"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  ListMusic,
  Play,
  Clock,
  Edit,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

interface PodcastSeries {
  id: string;
  title: string;
}

interface Episode {
  id: string;
  seriesId: string;
  title: string;
  slug: string;
  description: string;
  audioUrl?: string;
  audioDuration?: number;
  coverImageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  status: string;
  playCount: number;
  downloadCount: number;
  publishedAt?: string;
  createdAt: string;
}

const EPISODE_STATUS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "bg-green-600 hover:bg-green-600";
    case "DRAFT":
      return "bg-yellow-600 hover:bg-yellow-600";
    case "SCHEDULED":
      return "bg-blue-600 hover:bg-blue-600";
    case "ARCHIVED":
      return "bg-gray-500 hover:bg-gray-500";
    default:
      return "";
  }
}

function formatDuration(seconds?: number) {
  if (!seconds) return "\u2014";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
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

export default function AdminEpisodesPage() {
  const [allSeries, setAllSeries] = useState<PodcastSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDuration, setAudioDuration] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [seasonNumber, setSeasonNumber] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [showNotes, setShowNotes] = useState("");
  const [guestNames, setGuestNames] = useState("");

  // Fetch all series first
  const fetchSeries = useCallback(async () => {
    try {
      const data = await apiClient<PodcastSeries[]>("/podcasts");
      const list = Array.isArray(data) ? data : [];
      setAllSeries(list);
      if (list.length > 0 && !selectedSeriesId) {
        setSelectedSeriesId(list[0].id);
      }
    } catch (err) {
      toast.error("Failed to load podcast series");
      console.error(err);
    }
  }, [selectedSeriesId]);

  // Fetch episodes for selected series
  const fetchEpisodes = useCallback(async () => {
    if (!selectedSeriesId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient<Episode[]>(
        `/podcasts/${selectedSeriesId}/episodes`
      );
      setEpisodes(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load episodes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSeriesId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  function openCreate() {
    setEditingEpisode(null);
    setTitle("");
    setDescription("");
    setAudioUrl("");
    setAudioDuration("");
    setEpisodeNumber(String((episodes.length || 0) + 1));
    setSeasonNumber("1");
    setStatus("DRAFT");
    setCoverImageUrl("");
    setShowNotes("");
    setGuestNames("");
    setDialogOpen(true);
  }

  function openEdit(ep: Episode) {
    setEditingEpisode(ep);
    setTitle(ep.title);
    setDescription(ep.description || "");
    setAudioUrl(ep.audioUrl || "");
    setAudioDuration(ep.audioDuration ? String(ep.audioDuration) : "");
    setEpisodeNumber(ep.episodeNumber ? String(ep.episodeNumber) : "");
    setSeasonNumber(ep.seasonNumber ? String(ep.seasonNumber) : "");
    setStatus(ep.status);
    setCoverImageUrl(ep.coverImageUrl || "");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!selectedSeriesId) {
      toast.error("Select a podcast series first");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        status,
        audioUrl: audioUrl.trim() || undefined,
        audioDuration: audioDuration ? Number(audioDuration) : undefined,
        episodeNumber: episodeNumber ? Number(episodeNumber) : undefined,
        seasonNumber: seasonNumber ? Number(seasonNumber) : undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        showNotes: showNotes.trim() || undefined,
        guestNames: guestNames
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
      };

      if (editingEpisode) {
        await apiClient(
          `/podcasts/${selectedSeriesId}/episodes/${editingEpisode.id}`,
          { method: "PATCH", body: JSON.stringify(payload) }
        );
        toast.success("Episode updated");
      } else {
        await apiClient(`/podcasts/${selectedSeriesId}/episodes`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Episode created");
      }
      setDialogOpen(false);
      fetchEpisodes();
    } catch (err) {
      toast.error("Failed to save episode");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSeriesTitle =
    allSeries.find((s) => s.id === selectedSeriesId)?.title ?? "Select a series";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Episodes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage podcast episodes across all series.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!selectedSeriesId}>
          <Plus className="size-4 mr-2" />
          New Episode
        </Button>
      </div>

      {/* Series selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/60">Series:</label>
        <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a podcast series" />
          </SelectTrigger>
          <SelectContent>
            {allSeries.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : !selectedSeriesId ? (
        <div className="rounded-lg border p-8 text-center">
          <ListMusic className="size-12 mx-auto text-white/20 mb-3" />
          <p className="text-muted-foreground">
            Select a podcast series to manage its episodes.
          </p>
        </div>
      ) : episodes.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <ListMusic className="size-12 mx-auto text-white/20 mb-3" />
          <p className="text-muted-foreground mb-4">
            No episodes in &ldquo;{selectedSeriesTitle}&rdquo; yet.
          </p>
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            Add First Episode
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Clock className="size-3.5 inline mr-1" />
                  Duration
                </TableHead>
                <TableHead className="text-right">Plays</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {episodes.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell className="text-muted-foreground">
                    {ep.episodeNumber || "\u2014"}
                  </TableCell>
                  <TableCell className="font-medium">{ep.title}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(ep.status)}>
                      {ep.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(ep.audioDuration)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(ep.playCount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ep.publishedAt ? formatDate(ep.publishedAt) : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(ep)}>
                          <Edit className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Episode Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEpisode ? "Edit Episode" : "New Episode"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-white/70">
                Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Episode title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Episode description..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-white/70">
                  Season #
                </label>
                <Input
                  type="number"
                  value={seasonNumber}
                  onChange={(e) => setSeasonNumber(e.target.value)}
                  className="mt-1"
                  min={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70">
                  Episode #
                </label>
                <Input
                  type="number"
                  value={episodeNumber}
                  onChange={(e) => setEpisodeNumber(e.target.value)}
                  className="mt-1"
                  min={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EPISODE_STATUS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Audio URL
              </label>
              <Input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://storage.example.com/episode.mp3"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Duration (seconds)
              </label>
              <Input
                type="number"
                value={audioDuration}
                onChange={(e) => setAudioDuration(e.target.value)}
                placeholder="3600"
                className="mt-1"
                min={0}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Cover Image URL
              </label>
              <Input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Show Notes
              </label>
              <Textarea
                value={showNotes}
                onChange={(e) => setShowNotes(e.target.value)}
                placeholder="Links, timestamps, credits..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70">
                Guest Names (comma-separated)
              </label>
              <Input
                value={guestNames}
                onChange={(e) => setGuestNames(e.target.value)}
                placeholder="John Doe, Jane Smith"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {editingEpisode ? "Update" : "Create"} Episode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
