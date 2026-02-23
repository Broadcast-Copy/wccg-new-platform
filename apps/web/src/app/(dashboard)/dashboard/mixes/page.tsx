"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Music,
  Plus,
  Play,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  Loader2,
  Clock,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

interface Mix {
  id: string;
  title: string;
  genre?: string;
  playCount?: number;
  status?: string;
  createdAt?: string;
  coverImageUrl?: string;
  description?: string;
}

export default function DashboardMixesPage() {
  const { isLoading: authLoading } = useAuth();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMix, setDeletingMix] = useState<Mix | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMixes = useCallback(async () => {
    try {
      const data = await apiClient<Mix[]>("/mixes/my");
      setMixes(Array.isArray(data) ? data : []);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchMixes();
  }, [authLoading, fetchMixes]);

  async function handleDelete() {
    if (!deletingMix) return;
    setSubmitting(true);
    try {
      await apiClient(`/mixes/${deletingMix.id}`, { method: "DELETE" });
      toast.success("Mix deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingMix(null);
      fetchMixes();
    } catch (err) {
      toast.error("Failed to delete mix");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleVisibility(mix: Mix) {
    const newStatus = mix.status === "Published" ? "Hidden" : "Published";
    try {
      await apiClient(`/mixes/${mix.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(
        newStatus === "Published" ? "Mix is now visible" : "Mix is now hidden"
      );
      fetchMixes();
    } catch (err) {
      toast.error("Failed to update mix visibility");
      console.error(err);
    }
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case "Published":
        return (
          <Badge
            variant="outline"
            className="border-[#74ddc7]/30 text-[#74ddc7]"
          >
            Published
          </Badge>
        );
      case "Processing":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500/30 text-yellow-500"
          >
            Processing
          </Badge>
        );
      case "Hidden":
        return (
          <Badge
            variant="outline"
            className="border-white/20 text-muted-foreground"
          >
            Hidden
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-white/20 text-muted-foreground"
          >
            {status || "Draft"}
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Mixes
          </h1>
          <p className="text-muted-foreground">
            Manage your uploaded DJ mixes
          </p>
        </div>
        <Button
          className="bg-[#74ddc7] text-black hover:bg-[#5fc4b0]"
          asChild
        >
          <Link href="/dashboard/mixes/upload">
            <Upload className="mr-2 size-4" />
            Upload New Mix
          </Link>
        </Button>
      </div>

      {loading ? (
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Loading mixes...</span>
            </div>
          </CardContent>
        </Card>
      ) : mixes.length === 0 ? (
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex h-48 flex-col items-center justify-center">
            <Music className="mb-3 size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              You have not uploaded any mixes yet.
            </p>
            <Button
              variant="link"
              className="mt-1 text-[#74ddc7]"
              asChild
            >
              <Link href="/dashboard/mixes/upload">Upload your first mix</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden rounded-lg border border-white/10 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Genre</TableHead>
                  <TableHead className="text-muted-foreground">Plays</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Uploaded</TableHead>
                  <TableHead className="w-[70px] text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mixes.map((mix) => (
                  <TableRow
                    key={mix.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded bg-[#7401df]/20">
                          <Music className="size-4 text-[#7401df]" />
                        </div>
                        <span className="font-medium text-white">
                          {mix.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mix.genre || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Play className="size-3" />
                        {mix.playCount ?? 0}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(mix.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {mix.createdAt
                        ? new Date(mix.createdAt).toLocaleDateString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-white"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="border-white/10 bg-[#1a1a24]"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleVisibility(mix)
                            }
                          >
                            {mix.status === "Published" ? (
                              <>
                                <EyeOff className="size-4" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="size-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setDeletingMix(mix);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {mixes.map((mix) => (
              <Card
                key={mix.id}
                className="border-white/10 bg-[#12121a]"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded bg-[#7401df]/20">
                        <Music className="size-5 text-[#7401df]" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{mix.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {mix.genre && <span>{mix.genre}</span>}
                          <span className="flex items-center gap-1">
                            <Play className="size-3" />
                            {mix.playCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(mix.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="border-white/10 bg-[#1a1a24]"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleVisibility(mix)
                            }
                          >
                            {mix.status === "Published" ? (
                              <>
                                <EyeOff className="size-4" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="size-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setDeletingMix(mix);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {mix.createdAt && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(mix.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-white/10 bg-[#12121a]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Mix</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingMix?.title}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
