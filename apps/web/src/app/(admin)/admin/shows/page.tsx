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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";

const showSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean(),
});

type ShowFormValues = z.infer<typeof showSchema>;

interface Show extends ShowFormValues {
  id: string;
  hosts?: Array<{ id: string; name: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [deletingShow, setDeletingShow] = useState<Show | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ShowFormValues>({
    resolver: zodResolver(showSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      isActive: true,
    },
  });

  const fetchShows = useCallback(async () => {
    try {
      const data = await apiClient<Show[]>("/shows");
      setShows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load shows");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  function openCreateDialog() {
    setEditingShow(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      isActive: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(show: Show) {
    setEditingShow(show);
    form.reset({
      name: show.name,
      slug: show.slug,
      description: show.description ?? "",
      imageUrl: show.imageUrl ?? "",
      isActive: show.isActive,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: ShowFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        imageUrl: values.imageUrl || undefined,
      };

      if (editingShow) {
        await apiClient(`/shows/${editingShow.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Show updated successfully");
      } else {
        await apiClient("/shows", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Show created successfully");
      }
      setDialogOpen(false);
      fetchShows();
    } catch (err) {
      toast.error(
        editingShow ? "Failed to update show" : "Failed to create show"
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingShow) return;
    setSubmitting(true);
    try {
      await apiClient(`/shows/${deletingShow.id}`, { method: "DELETE" });
      toast.success("Show deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingShow(null);
      fetchShows();
    } catch (err) {
      toast.error("Failed to delete show");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Shows</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Show
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : shows.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            No shows found. Create your first show to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Hosts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shows.map((show) => (
                <TableRow key={show.id}>
                  <TableCell className="font-medium">{show.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {show.slug}
                  </TableCell>
                  <TableCell>
                    {show.hosts && show.hosts.length > 0
                      ? show.hosts.map((h) => h.name).join(", ")
                      : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        show.isActive
                          ? "bg-green-600 hover:bg-green-600"
                          : "bg-gray-500 hover:bg-gray-500"
                      }
                    >
                      {show.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
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
                          onClick={() => openEditDialog(show)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setDeletingShow(show);
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingShow ? "Edit Show" : "Add Show"}
            </DialogTitle>
            <DialogDescription>
              {editingShow
                ? "Update the show details below."
                : "Fill in the details to create a new show."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="show-form"
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

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://..."
                {...form.register("imageUrl")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                className="size-4 rounded border"
                {...form.register("isActive")}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="show-form" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingShow
                  ? "Update Show"
                  : "Create Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Show</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingShow?.name}
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
