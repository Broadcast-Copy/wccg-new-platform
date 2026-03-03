"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
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
import { apiClient } from "@/lib/api-client";

interface ListingData {
  id?: string;
  name?: string;
  category?: string;
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
  status?: string;
  isFeatured?: boolean;
}

interface ListingFormProps {
  listing?: ListingData | null;
  onSave?: (listing: ListingData) => void;
  onCancel?: () => void;
}

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
];

const COUNTIES = [
  "Cumberland",
  "Hoke",
  "Robeson",
  "Harnett",
  "Sampson",
  "Bladen",
  "Moore",
];

export function ListingForm({ listing, onSave, onCancel }: ListingFormProps) {
  const isEditing = !!listing;

  const [name, setName] = useState(listing?.name ?? "");
  const [category, setCategory] = useState(listing?.category ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [address, setAddress] = useState(listing?.address ?? "");
  const [city, setCity] = useState(listing?.city ?? "");
  const [county, setCounty] = useState(listing?.county ?? "");
  const [state, setState] = useState(listing?.state ?? "NC");
  const [zipCode, setZipCode] = useState(listing?.zipCode ?? "");
  const [phone, setPhone] = useState(listing?.phone ?? "");
  const [email, setEmail] = useState(listing?.email ?? "");
  const [website, setWebsite] = useState(listing?.website ?? "");
  const [imageUrl, setImageUrl] = useState(listing?.imageUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Business name is required.");
      return;
    }
    if (!category) {
      setError("Category is required.");
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      county: county || undefined,
      state: state.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    };

    try {
      let result: ListingData;
      if (isEditing) {
        result = await apiClient<ListingData>(`/directory/${listing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        result = await apiClient<ListingData>("/directory", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSave?.(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save listing."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name + Category row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="listing-name" className="text-gray-300">
            Business Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="listing-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith Auto Repair"
            required
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">
            Category <span className="text-red-400">*</span>
          </Label>
          <Select
            value={category}
            onValueChange={setCategory}
            disabled={submitting}
          >
            <SelectTrigger className="w-full border-white/15 bg-white/5 text-foreground">
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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="listing-desc" className="text-gray-300">
          Description
        </Label>
        <Textarea
          id="listing-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the business..."
          rows={3}
          disabled={submitting}
          className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="listing-address" className="text-gray-300">
          Address
        </Label>
        <Input
          id="listing-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main Street"
          disabled={submitting}
          className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
        />
      </div>

      {/* City + County + State + Zip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="listing-city" className="text-gray-300">
            City
          </Label>
          <Input
            id="listing-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Fayetteville"
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">County</Label>
          <Select
            value={county}
            onValueChange={setCounty}
            disabled={submitting}
          >
            <SelectTrigger className="w-full border-white/15 bg-white/5 text-foreground">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="listing-state" className="text-gray-300">
            State
          </Label>
          <Input
            id="listing-state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="listing-zip" className="text-gray-300">
            Zip Code
          </Label>
          <Input
            id="listing-zip"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="28301"
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>
      </div>

      {/* Phone + Email row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="listing-phone" className="text-gray-300">
            Phone
          </Label>
          <Input
            id="listing-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(910) 555-1234"
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="listing-email" className="text-gray-300">
            Email
          </Label>
          <Input
            id="listing-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@business.com"
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>
      </div>

      {/* Website + Image URL row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="listing-website" className="text-gray-300">
            Website
          </Label>
          <Input
            id="listing-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.business.com"
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="listing-image" className="text-gray-300">
            Image URL
          </Label>
          <Input
            id="listing-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            disabled={submitting}
            className="border-white/15 bg-white/5 text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] text-white shadow-lg shadow-[#7401df]/20 hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "Update Listing" : "Save Listing"}
            </>
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-full border-white/20 text-foreground hover:bg-foreground/10"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
