"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Podcast,
  Play,
  Users,
  Edit,
  Trash2,
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
import Link from "next/link";

interface PodcastSeries {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string;
  category?: string;
  status: string;
  subscriberCount: number;
  totalPlays: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "Music",
  "Sports",
  "Comedy",
  "News",
  "Culture",
  "Business",
  "Technology",
  "Education",
  "True Crime",
  "Society",
  "Other",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-600 hover:bg-green-600";
    case "DRAFT":
      return "bg-yellow-600 hover:bg-yellow-600";
    case "PAUSED":
      return "bg-orange-600 hover:bg-orange-600";
    case "ARCHIVED":
      return "bg-gray-500 hover:bg-gray-500";
    default:
      return "";
  }
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

export default function AdminPodcastsPage() {
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<PodcastSeries | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [rssUrl, setRssUrl] = useState("");

  const fetchSeries = useCallback(async () => {
    try {
      // Use /podcasts/my for creator's own, or /podcasts for all (admin)
      const data = await apiClient<PodcastSeries[]>("/podcasts");
      setSeries(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load podcasts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  function openCreate() {
    setEditingSeries(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setStatus("DRAFT");
    setCoverImageUrl("");
    setWebsiteUrl("");
    setRssUrl("");
    setDialogOpen(true);
  }

  function openEdit(s: PodcastSeries) {
    setEditingSeries(s);
    setTitle(s.title);
    setDescription(s.description || "");
    setCategory(s.category || "");
    setStatus(s.status);
    setCoverImageUrl(s.coverImageUrl || "");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category || undefined,
        status,
        coverImageUrl: coverImageUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        rssUrl: rssUrl.trim() || undefined,
      };

      if (editingSeries) {
        await apiClient(`/podcasts/${editingSeries.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Podcast series updated");
      } else {
        await apiClient("/podcasts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Podcast series created");
      }
      setDialogOpen(false);
      fetchSeries();
    } catch (err) {
      toast.error("Failed to save podcast series");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Podcasts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage podcast series and episodes for the platform.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-2" />
          New Series
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Series"
          value={series.length}
          icon={<Podcast className="size-4 text-purple-400" />}
        />
        <StatCard
          label="Active"
          value={series.filter((s) => s.status === "ACTIVE").length}
          icon={<Play className="size-4 text-green-400" />}
        />
        <StatCard
          label="Total Plays"
          value={series.reduce((sum, s) => sum + (s.totalPlays || 0), 0)}
          icon={<Play className="size-4 text-blue-400" />}
        />
        <StatCard
          label="Subscribers"
          value={series.reduce(
            (sum, s) => sum + (s.subscriberCount || 0),
            0
          )}
          icon={<Users className="size-4 text-teal-400" />}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : series.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <Podcast className="size-12 mx-auto text-white/20 mb-3" />
          <p className="text-muted-foreground mb-4">
            No podcast series yet. Create your first one!
          </p>
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            Create Series
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Plays</TableHead>
                <TableHead className="text-right">Subscribers</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/admin/podcasts/${s.id}`}
                      className="font-medium hover:text-[#74ddc7] transition-colors"
                    >
                      {s.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.category || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(s.status)}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(s.totalPlays || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(s.subscriberCount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(s.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}>
                          <Edit className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/podcasts/${s.id}`}>
                            <Play className="size-4" />
                            View Episodes
                          </Link>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? "Edit Podcast Series" : "New Podcast Series"}
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
                placeholder="My Awesome Podcast"
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
                placeholder="What is this podcast about?"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white/70">
                  Category
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {STATUS_OPTIONS.map((opt) => (
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
                RSS Feed URL
              </label>
              <Input
                value={rssUrl}
                onChange={(e) => setRssUrl(e.target.value)}
                placeholder="https://feeds.example.com/podcast.xml"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {editingSeries ? "Update" : "Create"} Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#141420] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-white/40 uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
