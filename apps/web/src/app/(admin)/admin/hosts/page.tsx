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

const hostSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  bio: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  is_active: z.boolean(),
});

type HostFormValues = z.infer<typeof hostSchema>;

interface Host extends HostFormValues {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminHostsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [deletingHost, setDeletingHost] = useState<Host | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<HostFormValues>({
    resolver: zodResolver(hostSchema),
    defaultValues: {
      name: "",
      slug: "",
      bio: "",
      avatar_url: "",
      email: "",
      is_active: true,
    },
  });

  const fetchHosts = useCallback(async () => {
    try {
      const data = await apiClient<Host[]>("/hosts");
      setHosts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load hosts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  function openCreateDialog() {
    setEditingHost(null);
    form.reset({
      name: "",
      slug: "",
      bio: "",
      avatar_url: "",
      email: "",
      is_active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(host: Host) {
    setEditingHost(host);
    form.reset({
      name: host.name,
      slug: host.slug,
      bio: host.bio ?? "",
      avatar_url: host.avatar_url ?? "",
      email: host.email ?? "",
      is_active: host.is_active,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: HostFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        avatar_url: values.avatar_url || undefined,
        email: values.email || undefined,
        bio: values.bio || undefined,
      };

      if (editingHost) {
        await apiClient(`/hosts/${editingHost.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Host updated successfully");
      } else {
        await apiClient("/hosts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Host created successfully");
      }
      setDialogOpen(false);
      fetchHosts();
    } catch (err) {
      toast.error(
        editingHost ? "Failed to update host" : "Failed to create host"
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingHost) return;
    setSubmitting(true);
    try {
      await apiClient(`/hosts/${deletingHost.id}`, { method: "DELETE" });
      toast.success("Host deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingHost(null);
      fetchHosts();
    } catch (err) {
      toast.error("Failed to delete host");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Hosts</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Host
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : hosts.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            No hosts found. Create your first host to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell className="font-medium">{host.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {host.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {host.email || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        host.is_active
                          ? "bg-green-600 hover:bg-green-600"
                          : "bg-gray-500 hover:bg-gray-500"
                      }
                    >
                      {host.is_active ? "Active" : "Inactive"}
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
                          onClick={() => openEditDialog(host)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setDeletingHost(host);
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
              {editingHost ? "Edit Host" : "Add Host"}
            </DialogTitle>
            <DialogDescription>
              {editingHost
                ? "Update the host details below."
                : "Fill in the details to create a new host."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="host-form"
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="host@wccg.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Tell us about this host..."
                {...form.register("bio")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                placeholder="https://..."
                {...form.register("avatar_url")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                className="size-4 rounded border"
                {...form.register("is_active")}
              />
              <Label htmlFor="is_active">Active</Label>
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
            <Button type="submit" form="host-form" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingHost
                  ? "Update Host"
                  : "Create Host"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Host</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingHost?.name}
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
