"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  X,
  Loader2,
  Store,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

// ─── Constants ─────────────────────────────────────────────────────────

const CATEGORIES = [
  "Restaurants",
  "Auto Services",
  "Beauty & Barber",
  "Health & Wellness",
  "Legal Services",
  "Real Estate",
  "Education",
  "Churches",
  "Entertainment",
  "Home Services",
  "Government & Services",
] as const;

const COUNTIES = [
  "Cumberland",
  "Hoke",
  "Robeson",
  "Harnett",
  "Sampson",
  "Bladen",
  "Moore",
] as const;

// ─── Types ─────────────────────────────────────────────────────────────

interface DirectoryListing {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  state: string;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: string;
  createdAt: string;
}

interface ListingFormData {
  name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
}

const EMPTY_FORM: ListingFormData = {
  name: "",
  category: "",
  description: "",
  address: "",
  city: "",
  county: "",
  state: "NC",
  zipCode: "",
  phone: "",
  email: "",
  website: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]";
    case "PENDING":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "INACTIVE":
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "Restaurants":
      return "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "Entertainment":
      return "border-[#7401df]/30 bg-[#7401df]/10 text-[#7401df]";
    case "Churches":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "Health & Wellness":
      return "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400";
    case "Education":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-muted-foreground";
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export default function MyDirectoryPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ListingFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiClient<DirectoryListing[]>("/directory/my");
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchListings();
  }, [user, fetchListings]);

  // ─── Form handlers ──────────────────────────────────────────────────

  function openCreateForm() {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(listing: DirectoryListing) {
    setFormData({
      name: listing.name,
      category: listing.category,
      description: listing.description ?? "",
      address: listing.address ?? "",
      city: listing.city ?? "",
      county: listing.county ?? "",
      state: listing.state || "NC",
      zipCode: listing.zipCode ?? "",
      phone: listing.phone ?? "",
      email: listing.email ?? "",
      website: listing.website ?? "",
    });
    setEditingId(listing.id);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!formData.category) {
      setFormError("Category is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingId) {
        await apiClient(`/directory/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiClient("/directory", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      closeForm();
      await fetchListings();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save listing.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    setDeleting(id);
    try {
      await apiClient(`/directory/${id}`, { method: "DELETE" });
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // Silently handle
    } finally {
      setDeleting(null);
    }
  }

  function updateField(field: keyof ListingFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Auth check ─────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            My Directory Listings
          </h1>
          <p className="text-muted-foreground">
            Please{" "}
            <Link href="/login" className="underline hover:text-foreground">
              sign in
            </Link>{" "}
            to manage your listings.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            My Directory Listings
          </h1>
          <p className="text-muted-foreground">
            Manage your business and organization listings
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
        >
          <Plus className="h-4 w-4" />
          Add New Listing
        </Button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <Card className="border-[#7401df]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {editingId ? "Edit Listing" : "Add New Listing"}
                </CardTitle>
                <CardDescription>
                  {editingId
                    ? "Update your directory listing details"
                    : "Fill in the details for your new directory listing"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter business name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => updateField("category", val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business or organization"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                />
              </div>

              <Separator />

              {/* Address */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Fayetteville"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Select
                    value={formData.county}
                    onValueChange={(val) => updateField("county", val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTIES.map((county) => (
                        <SelectItem key={county} value={county}>
                          {county}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="NC"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="28301"
                    value={formData.zipCode}
                    onChange={(e) => updateField("zipCode", e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="(910) 555-0123"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@business.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://www.business.com"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                  />
                </div>
              </div>

              {/* Error & Actions */}
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingId ? "Update Listing" : "Create Listing"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-5 w-5 animate-pulse" />
            <span>Loading your listings...</span>
          </div>
        </div>
      ) : listings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7401df]/10">
              <Store className="h-8 w-8 text-[#7401df]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No listings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven&apos;t created any directory listings yet. Add your
                business or organization to the WCCG community directory!
              </p>
            </div>
            <Button
              onClick={openCreateForm}
              className="gap-2 bg-[#7401df] hover:bg-[#7401df]/90"
            >
              <Plus className="h-4 w-4" />
              Add Your First Listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className="transition-colors hover:bg-muted/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {listing.name}
                  </CardTitle>
                  <Badge className={getStatusColor(listing.status)}>
                    {listing.status}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className={getCategoryColor(listing.category)}
                >
                  {listing.category}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3">
                {listing.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {listing.description}
                  </p>
                )}

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {(listing.city || listing.county) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[listing.city, listing.county ? `${listing.county} Co.` : null]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {listing.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{listing.phone}</span>
                    </div>
                  )}
                  {listing.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{listing.email}</span>
                    </div>
                  )}
                  {listing.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{listing.website}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => openEditForm(listing)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleting === listing.id}
                    onClick={() => handleDelete(listing.id)}
                  >
                    {deleting === listing.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
