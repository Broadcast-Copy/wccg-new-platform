"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Check,
  Pencil,
  Search,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/directory/listing-form";
import { apiClient } from "@/lib/api-client";

interface DirectoryListing {
  id: string;
  name: string;
  category: string;
  description?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  isFeatured: boolean;
  createdAt?: string;
}

export default function AdminDirectoryPage() {
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingListing, setEditingListing] =
    useState<DirectoryListing | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingListing, setDeletingListing] =
    useState<DirectoryListing | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const data = await apiClient<DirectoryListing[]>("/directory");
      setListings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load directory listings");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Filter listings by search query
  const filteredListings = listings.filter((listing) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      listing.name.toLowerCase().includes(q) ||
      listing.category.toLowerCase().includes(q) ||
      (listing.city && listing.city.toLowerCase().includes(q)) ||
      (listing.county && listing.county.toLowerCase().includes(q))
    );
  });

  function openEditDialog(listing: DirectoryListing) {
    setEditingListing(listing);
    setEditDialogOpen(true);
  }

  function handleSave() {
    setEditDialogOpen(false);
    setEditingListing(null);
    fetchListings();
    toast.success("Listing saved successfully");
  }

  async function handleDelete() {
    if (!deletingListing) return;
    setSubmitting(true);
    try {
      await apiClient(`/directory/${deletingListing.id}`, {
        method: "DELETE",
      });
      toast.success("Listing deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingListing(null);
      fetchListings();
    } catch {
      toast.error("Failed to delete listing");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(listing: DirectoryListing) {
    try {
      await apiClient(`/directory/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      toast.success(`"${listing.name}" approved`);
      fetchListings();
    } catch {
      toast.error("Failed to approve listing");
    }
  }

  async function handleToggleFeatured(listing: DirectoryListing) {
    try {
      await apiClient(`/directory/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: !listing.isFeatured }),
      });
      toast.success(
        listing.isFeatured
          ? `"${listing.name}" unfeatured`
          : `"${listing.name}" featured`
      );
      fetchListings();
    } catch {
      toast.error("Failed to update featured status");
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-600/90 text-white hover:bg-green-600">
            Active
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-500/90 text-black hover:bg-yellow-500">
            Pending
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-red-500/90 text-white hover:bg-red-500">
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-[#74ddc7]" />
          <h1 className="text-3xl font-bold tracking-tight">
            Directory Management
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search listings..."
          className="pl-9 border-white/15 bg-white/5 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            {searchQuery
              ? "No listings match your search."
              : "No directory listings found."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>City</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium">
                    {listing.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {listing.category}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {listing.city || "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {listing.county || "\u2014"}
                  </TableCell>
                  <TableCell>{statusBadge(listing.status)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleFeatured(listing)}
                      className="transition-colors hover:text-yellow-400"
                      title={
                        listing.isFeatured
                          ? "Remove from featured"
                          : "Mark as featured"
                      }
                    >
                      {listing.isFeatured ? (
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(listing)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {listing.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(listing)}
                          title="Approve"
                          className="text-green-500 hover:text-green-400"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingListing(listing);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete"
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingListing ? "Edit Listing" : "New Listing"}
            </DialogTitle>
            <DialogDescription>
              Update the directory listing details below.
            </DialogDescription>
          </DialogHeader>
          <ListingForm
            listing={editingListing}
            onSave={handleSave}
            onCancel={() => {
              setEditDialogOpen(false);
              setEditingListing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingListing?.name}
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
