"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ImagePlus,
  Plus,
  Loader2,
  ArrowLeft,
  Music,
  Monitor,
  Star,
  ExternalLink,
  FileAudio,
  LayoutTemplate,
  SidebarIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface AdvertiserAccount {
  id: string;
  companyName: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Creative {
  id: string;
  campaignId: string;
  name: string;
  creativeType: string;
  status: string;
  fileUrl: string;
  clickUrl: string;
  altText: string;
  createdAt?: string;
}

interface CreateCreativePayload {
  campaignId: string;
  name: string;
  creativeType: string;
  fileUrl: string;
  clickUrl: string;
  altText: string;
}

/* ---------- Constants ---------- */

const CREATIVE_TYPES = [
  { value: "AUDIO_15S", label: "Audio 15s", icon: FileAudio },
  { value: "AUDIO_30S", label: "Audio 30s", icon: FileAudio },
  { value: "AUDIO_60S", label: "Audio 60s", icon: Music },
  { value: "BANNER_LEADERBOARD", label: "Banner Leaderboard", icon: LayoutTemplate },
  { value: "BANNER_SIDEBAR", label: "Banner Sidebar", icon: SidebarIcon },
  { value: "SPONSORSHIP", label: "Sponsorship", icon: Star },
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  ARCHIVED: "bg-foreground/[0.06] text-muted-foreground border-border",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  AUDIO_15S: FileAudio,
  AUDIO_30S: FileAudio,
  AUDIO_60S: Music,
  BANNER_LEADERBOARD: LayoutTemplate,
  BANNER_SIDEBAR: SidebarIcon,
  SPONSORSHIP: Star,
};

const TYPE_COLORS: Record<string, { text: string; bg: string }> = {
  AUDIO_15S: { text: "text-purple-400", bg: "bg-purple-500/10" },
  AUDIO_30S: { text: "text-purple-400", bg: "bg-purple-500/10" },
  AUDIO_60S: { text: "text-violet-400", bg: "bg-violet-500/10" },
  BANNER_LEADERBOARD: { text: "text-blue-400", bg: "bg-blue-500/10" },
  BANNER_SIDEBAR: { text: "text-cyan-400", bg: "bg-cyan-500/10" },
  SPONSORSHIP: { text: "text-amber-400", bg: "bg-amber-500/10" },
};

/* ---------- Upload Creative Dialog ---------- */

function UploadCreativeDialog({
  campaigns,
  onCreated,
}: {
  campaigns: Campaign[];
  onCreated: (creative: Creative) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateCreativePayload>({
    campaignId: "",
    name: "",
    creativeType: "",
    fileUrl: "",
    clickUrl: "",
    altText: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaignId) {
      toast.error("Please select a campaign");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Creative name is required");
      return;
    }
    if (!form.creativeType) {
      toast.error("Please select a creative type");
      return;
    }
    if (!form.fileUrl.trim()) {
      toast.error("File URL is required");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiClient<Creative>("/advertising/creatives", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Creative uploaded successfully");
      onCreated(created);
      setOpen(false);
      setForm({
        campaignId: "",
        name: "",
        creativeType: "",
        fileUrl: "",
        clickUrl: "",
        altText: "",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload creative"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-5">
          <Plus className="h-4 w-4 mr-1.5" />
          Upload Creative
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover border-border text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Creative</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new creative to one of your campaigns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Campaign Select */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Campaign *</Label>
            <Select
              value={form.campaignId}
              onValueChange={(val) => setForm({ ...form, campaignId: val })}
            >
              <SelectTrigger className="w-full bg-foreground/[0.04] border-border text-foreground">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {campaigns.length === 0 ? (
                  <SelectItem value="__none" disabled className="text-muted-foreground">
                    No campaigns available
                  </SelectItem>
                ) : (
                  campaigns.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="text-foreground"
                    >
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Creative Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Summer Sale Audio Spot"
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Creative Type *</Label>
            <Select
              value={form.creativeType}
              onValueChange={(val) => setForm({ ...form, creativeType: val })}
            >
              <SelectTrigger className="w-full bg-foreground/[0.04] border-border text-foreground">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {CREATIVE_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-foreground"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File URL */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">File URL *</Label>
            <Input
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              placeholder="https://cdn.example.com/ad-spot.mp3"
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Provide a direct URL to your creative file (audio, image, etc.)
            </p>
          </div>

          {/* Click URL */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Click-Through URL</Label>
            <Input
              value={form.clickUrl}
              onChange={(e) => setForm({ ...form, clickUrl: e.target.value })}
              placeholder="https://yourwebsite.com/promo"
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
            />
          </div>

          {/* Alt Text */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Alt Text</Label>
            <Input
              value={form.altText}
              onChange={(e) => setForm({ ...form, altText: e.target.value })}
              placeholder="Brief description for accessibility"
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-foreground/60 hover:bg-foreground/[0.04]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c]"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Upload Creative
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Creative Card ---------- */

function CreativeCard({ creative }: { creative: Creative }) {
  const TypeIcon = TYPE_ICONS[creative.creativeType] || Monitor;
  const colors = TYPE_COLORS[creative.creativeType] || {
    text: "text-muted-foreground",
    bg: "bg-foreground/[0.04]",
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-input group">
      {/* Preview Placeholder */}
      <div className="aspect-[16/9] bg-foreground/[0.02] flex items-center justify-center border-b border-border relative">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colors.bg}`}>
          <TypeIcon className={`h-7 w-7 ${colors.text}`} />
        </div>
        <Badge
          className={`absolute top-3 right-3 text-[10px] border ${STATUS_STYLES[creative.status] || "bg-foreground/[0.06] text-muted-foreground border-border"}`}
        >
          {creative.status}
        </Badge>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-foreground text-sm truncate">
          {creative.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {creative.creativeType.replace(/_/g, " ")}
          </span>
        </div>
        {creative.clickUrl && (
          <a
            href={creative.clickUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-[#74ddc7] hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Click-through URL
          </a>
        )}
        {creative.altText && (
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {creative.altText}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function CreativesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [account, setAccount] = useState<AdvertiserAccount | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const loadCreatives = useCallback(async (campaignList: Campaign[]) => {
    try {
      const allCreatives: Creative[] = [];
      await Promise.all(
        campaignList.map(async (c) => {
          try {
            const data = await apiClient<Creative[]>(
              `/advertising/campaigns/${c.id}/creatives`
            );
            allCreatives.push(...data);
          } catch {
            // Skip campaigns with no creatives
          }
        })
      );
      setCreatives(allCreatives);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load creatives"
      );
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiClient<AdvertiserAccount>("/advertising/accounts/my")
      .then(async (acct) => {
        setAccount(acct);
        const campaignData = await apiClient<Campaign[]>(
          `/advertising/campaigns?advertiserId=${acct.id}`
        );
        setCampaigns(campaignData);
        await loadCreatives(campaignData);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load account"
        );
      })
      .finally(() => setLoading(false));
  }, [user, loadCreatives]);

  function handleCreativeCreated(creative: Creative) {
    setCreatives((prev) => [creative, ...prev]);
  }

  const filteredCreatives = creatives.filter((c) => {
    if (filterType !== "ALL" && c.creativeType !== filterType) return false;
    if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
    return true;
  });

  const isLoading = authLoading || loading;

  // Count by type
  const typeCounts = creatives.reduce<Record<string, number>>((acc, c) => {
    acc[c.creativeType] = (acc[c.creativeType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-red-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
                <ImagePlus className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href="/advertise/portal"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Portal
                  </Link>
                  <span className="text-foreground/20">/</span>
                  <span className="text-foreground text-sm font-medium">
                    Creatives
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">Creatives</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your ad creative files and assets
                </p>
              </div>
            </div>
            <div className="hidden sm:block">
              {account && (
                <UploadCreativeDialog
                  campaigns={campaigns}
                  onCreated={handleCreativeCreated}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Upload Button */}
      {account && (
        <div className="sm:hidden">
          <UploadCreativeDialog
            campaigns={campaigns}
            onCreated={handleCreativeCreated}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">
            Loading creatives...
          </span>
        </div>
      )}

      {/* Auth required */}
      {!isLoading && !user && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Please{" "}
            <Link href="/login" className="text-[#74ddc7] hover:underline">
              sign in
            </Link>{" "}
            to view your creatives.
          </p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Creatives Content */}
      {!isLoading && user && account && !error && (
        <>
          {/* Filters & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-auto bg-card border-border text-foreground text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ALL" className="text-foreground">
                    All Types
                  </SelectItem>
                  {CREATIVE_TYPES.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      className="text-foreground"
                    >
                      {t.label}
                      {typeCounts[t.value]
                        ? ` (${typeCounts[t.value]})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-auto bg-card border-border text-foreground text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="ALL" className="text-foreground">
                    All Statuses
                  </SelectItem>
                  {["PENDING", "APPROVED", "REJECTED", "ARCHIVED"].map(
                    (status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="text-foreground"
                      >
                        {status}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              {filteredCreatives.length} creative
              {filteredCreatives.length !== 1 ? "s" : ""}
              {filterType !== "ALL" || filterStatus !== "ALL"
                ? ` (filtered from ${creatives.length})`
                : ""}
            </p>
          </div>

          {/* Creatives Grid */}
          {filteredCreatives.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-16 text-center">
              <ImagePlus className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {creatives.length === 0
                  ? "No creatives yet"
                  : "No creatives match your filters"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                {creatives.length === 0
                  ? "Upload your first ad creative to get started."
                  : "Try adjusting your filters to see more results."}
              </p>
              {creatives.length === 0 && (
                <UploadCreativeDialog
                  campaigns={campaigns}
                  onCreated={handleCreativeCreated}
                />
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCreatives.map((creative) => (
                <CreativeCard key={creative.id} creative={creative} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Back Link */}
      <div className="flex justify-center">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/advertise/portal">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Portal
          </Link>
        </Button>
      </div>
    </div>
  );
}
