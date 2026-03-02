"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api-client";

const CATEGORIES = [
  "MAIN",
  "GOSPEL",
  "HIP_HOP",
  "RNB",
  "JAZZ",
  "TALK",
  "SPORTS",
  "COMMUNITY",
] as const;

const STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;

const streamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  sortOrder: z.number().int().min(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  primaryUrl: z.string().url().optional().or(z.literal("")),
  fallbackUrl: z.string().url().optional().or(z.literal("")),
  mountPoint: z.string().optional(),
  format: z.string().optional(),
  bitrate: z.number().int().min(0).optional(),
});

type StreamFormValues = z.infer<typeof streamSchema>;

interface Stream extends StreamFormValues {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-600 hover:bg-green-600";
    case "INACTIVE":
      return "bg-yellow-600 hover:bg-yellow-600";
    case "MAINTENANCE":
      return "bg-red-600 hover:bg-red-600";
    default:
      return "";
  }
}

export default function AdminStreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [deletingStream, setDeletingStream] = useState<Stream | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<StreamFormValues>({
    resolver: zodResolver(streamSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      category: "MAIN",
      status: "ACTIVE",
      sortOrder: 0,
      imageUrl: "",
      primaryUrl: "",
      fallbackUrl: "",
      mountPoint: "",
      format: "",
      bitrate: 128,
    },
  });

  const fetchStreams = useCallback(async () => {
    try {
      const data = await apiClient<Stream[]>("/streams");
      setStreams(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load streams");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  function openCreateDialog() {
    setEditingStream(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      category: "MAIN",
      status: "ACTIVE",
      sortOrder: 0,
      imageUrl: "",
      primaryUrl: "",
      fallbackUrl: "",
      mountPoint: "",
      format: "",
      bitrate: 128,
    });
    setDialogOpen(true);
  }

  function openEditDialog(stream: Stream) {
    setEditingStream(stream);
    form.reset({
      name: stream.name,
      slug: stream.slug,
      description: stream.description ?? "",
      category: stream.category,
      status: stream.status,
      sortOrder: stream.sortOrder ?? 0,
      imageUrl: stream.imageUrl ?? "",
      primaryUrl: stream.primaryUrl ?? "",
      fallbackUrl: stream.fallbackUrl ?? "",
      mountPoint: stream.mountPoint ?? "",
      format: stream.format ?? "",
      bitrate: stream.bitrate ?? 128,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: StreamFormValues) {
    setSubmitting(true);
    try {
      // Clean empty strings to undefined
      const payload = {
        ...values,
        imageUrl: values.imageUrl || undefined,
        primaryUrl: values.primaryUrl || undefined,
        fallbackUrl: values.fallbackUrl || undefined,
        mountPoint: values.mountPoint || undefined,
        format: values.format || undefined,
      };

      if (editingStream) {
        await apiClient(`/streams/${editingStream.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Stream updated successfully");
      } else {
        await apiClient("/streams", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Stream created successfully");
      }
      setDialogOpen(false);
      fetchStreams();
    } catch (err) {
      toast.error(
        editingStream ? "Failed to update stream" : "Failed to create stream"
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingStream) return;
    setSubmitting(true);
    try {
      await apiClient(`/streams/${deletingStream.id}`, { method: "DELETE" });
      toast.success("Stream deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingStream(null);
      fetchStreams();
    } catch (err) {
      toast.error("Failed to delete stream");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Streams</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Stream
        </Button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : streams.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            No streams found. Create your first stream to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map((stream) => (
                <TableRow key={stream.id}>
                  <TableCell className="font-medium">{stream.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {stream.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{stream.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(stream.status)}>
                      {stream.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{stream.sortOrder}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(stream)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setDeletingStream(stream);
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
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingStream ? "Edit Stream" : "Add Stream"}
            </DialogTitle>
            <DialogDescription>
              {editingStream
                ? "Update the stream details below."
                : "Fill in the details to create a new stream."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <form
              id="stream-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...form.register("slug")} />
                  {form.formState.errors.slug && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.slug.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register("description")} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(val) =>
                      form.setValue("category", val as (typeof CATEGORIES)[number])
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(val) =>
                      form.setValue("status", val as (typeof STATUSES)[number])
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    {...form.register("sortOrder")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  {...form.register("imageUrl")}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">Stream Source</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryUrl">Primary URL</Label>
                    <Input
                      id="primaryUrl"
                      placeholder="https://..."
                      {...form.register("primaryUrl")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fallbackUrl">Fallback URL</Label>
                    <Input
                      id="fallbackUrl"
                      placeholder="https://..."
                      {...form.register("fallbackUrl")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mountPoint">Mount Point</Label>
                    <Input
                      id="mountPoint"
                      placeholder="/live"
                      {...form.register("mountPoint")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="format">Format</Label>
                    <Input
                      id="format"
                      placeholder="mp3"
                      {...form.register("format")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bitrate">Bitrate (kbps)</Label>
                    <Input
                      id="bitrate"
                      type="number"
                      {...form.register("bitrate")}
                    />
                  </div>
                </div>
              </div>
            </form>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="stream-form" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingStream
                  ? "Update Stream"
                  : "Create Stream"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stream</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingStream?.name}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
