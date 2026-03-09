"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Loader2,
  ArrowLeft,
  Pause,
  Play,
  Pencil,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface AdvertiserAccount {
  id: string;
  companyName: string;
}

interface Creative {
  id: string;
  name: string;
  creativeType: string;
  status: string;
  fileUrl: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  budgetTotal: number;
  budgetDaily: number;
  startDate: string;
  endDate: string;
  targetGeo: string[];
  targetDayparts: string[];
  impressions?: number;
  clicks?: number;
  creatives?: Creative[];
}

interface CreateCampaignPayload {
  name: string;
  description: string;
  budgetTotal: number;
  budgetDaily: number;
  startDate: string;
  endDate: string;
  targetGeo: string[];
  targetDayparts: string[];
}

/* ---------- Constants ---------- */

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PENDING_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PAUSED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  COMPLETED: "bg-foreground/[0.06] text-muted-foreground border-border",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const GEO_OPTIONS = [
  "Fayetteville",
  "Cumberland County",
  "Hoke County",
  "Robeson County",
  "Harnett County",
  "Sampson County",
  "Bladen County",
  "Moore County",
  "Statewide NC",
];

const DAYPART_OPTIONS = [
  "Morning Drive (6am-10am)",
  "Midday (10am-3pm)",
  "Afternoon Drive (3pm-7pm)",
  "Evening (7pm-12am)",
  "Overnight (12am-6am)",
  "All Day",
];

const CREATIVE_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  ARCHIVED: "bg-foreground/[0.06] text-muted-foreground border-border",
};

/* ---------- Helpers ---------- */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- Create Campaign Dialog ---------- */

function CreateCampaignDialog({
  onCreated,
}: {
  onCreated: (campaign: Campaign) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateCampaignPayload>({
    name: "",
    description: "",
    budgetTotal: 0,
    budgetDaily: 0,
    startDate: "",
    endDate: "",
    targetGeo: [],
    targetDayparts: [],
  });

  function toggleGeo(geo: string) {
    setForm((prev) => ({
      ...prev,
      targetGeo: prev.targetGeo.includes(geo)
        ? prev.targetGeo.filter((g) => g !== geo)
        : [...prev.targetGeo, geo],
    }));
  }

  function toggleDaypart(dp: string) {
    setForm((prev) => ({
      ...prev,
      targetDayparts: prev.targetDayparts.includes(dp)
        ? prev.targetDayparts.filter((d) => d !== dp)
        : [...prev.targetDayparts, dp],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (form.budgetTotal <= 0) {
      toast.error("Total budget must be greater than 0");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end dates are required");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiClient<Campaign>("/advertising/campaigns", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Campaign created successfully");
      onCreated(created);
      setOpen(false);
      setForm({
        name: "",
        description: "",
        budgetTotal: 0,
        budgetDaily: 0,
        startDate: "",
        endDate: "",
        targetGeo: [],
        targetDayparts: [],
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create campaign"
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
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover border-border text-foreground max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Campaign</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up your advertising campaign details. You can edit these later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Campaign Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Summer Sale 2026"
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description of this campaign..."
              rows={3}
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20 resize-none"
            />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground/60">Total Budget ($) *</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.budgetTotal || ""}
                onChange={(e) =>
                  setForm({ ...form, budgetTotal: Number(e.target.value) })
                }
                placeholder="5000"
                className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60">Daily Budget ($)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.budgetDaily || ""}
                onChange={(e) =>
                  setForm({ ...form, budgetDaily: Number(e.target.value) })
                }
                placeholder="100"
                className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground/60">Start Date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="bg-foreground/[0.04] border-border text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60">End Date *</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="bg-foreground/[0.04] border-border text-foreground"
              />
            </div>
          </div>

          {/* Target Geo */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Target Geography</Label>
            <div className="flex flex-wrap gap-2">
              {GEO_OPTIONS.map((geo) => (
                <button
                  key={geo}
                  type="button"
                  onClick={() => toggleGeo(geo)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.targetGeo.includes(geo)
                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                      : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                  }`}
                >
                  {geo}
                </button>
              ))}
            </div>
          </div>

          {/* Dayparts */}
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Target Dayparts</Label>
            <div className="flex flex-wrap gap-2">
              {DAYPART_OPTIONS.map((dp) => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => toggleDaypart(dp)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.targetDayparts.includes(dp)
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                  }`}
                >
                  {dp}
                </button>
              ))}
            </div>
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
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Campaign Row with Expandable Creatives ---------- */

function CampaignRow({
  campaign,
  onUpdate,
}: {
  campaign: Campaign;
  onUpdate: (updated: Campaign) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setCreativesLoading(true);
    apiClient<Creative[]>(
      `/advertising/campaigns/${campaign.id}/creatives`
    )
      .then(setCreatives)
      .catch(() => toast.error("Failed to load creatives"))
      .finally(() => setCreativesLoading(false));
  }, [expanded, campaign.id]);

  async function handleToggleStatus() {
    const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setActionLoading(true);
    try {
      const updated = await apiClient<Campaign>(
        `/advertising/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      toast.success(
        `Campaign ${newStatus === "ACTIVE" ? "resumed" : "paused"}`
      );
      onUpdate(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update campaign"
      );
    } finally {
      setActionLoading(false);
    }
  }

  const canToggle =
    campaign.status === "ACTIVE" || campaign.status === "PAUSED";

  return (
    <>
      <TableRow className="border-border hover:bg-foreground/[0.02]">
        <TableCell>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-foreground font-medium hover:text-[#74ddc7] transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/70" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
            )}
            {campaign.name}
          </button>
        </TableCell>
        <TableCell>
          <Badge
            className={`text-[10px] border ${STATUS_STYLES[campaign.status] || "bg-foreground/[0.06] text-muted-foreground border-border"}`}
          >
            {campaign.status.replace("_", " ")}
          </Badge>
        </TableCell>
        <TableCell className="text-foreground/60">
          {formatCurrency(campaign.budgetTotal)}
        </TableCell>
        <TableCell className="text-muted-foreground hidden md:table-cell">
          {formatCurrency(campaign.budgetDaily)}
          <span className="text-foreground/20 ml-1">/day</span>
        </TableCell>
        <TableCell className="text-muted-foreground hidden sm:table-cell">
          {formatDate(campaign.startDate)}
        </TableCell>
        <TableCell className="text-muted-foreground hidden sm:table-cell">
          {formatDate(campaign.endDate)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {canToggle && (
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={actionLoading}
                onClick={handleToggleStatus}
                className="text-muted-foreground hover:text-foreground"
                title={campaign.status === "ACTIVE" ? "Pause" : "Resume"}
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : campaign.status === "ACTIVE" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Creatives */}
      {expanded && (
        <TableRow className="border-border bg-foreground/[0.01]">
          <TableCell colSpan={7} className="p-0">
            <div className="px-8 py-4 space-y-3">
              {/* Campaign Details */}
              {campaign.description && (
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {campaign.targetGeo && campaign.targetGeo.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {campaign.targetGeo.join(", ")}
                  </div>
                )}
                {campaign.targetDayparts &&
                  campaign.targetDayparts.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {campaign.targetDayparts.join(", ")}
                    </div>
                  )}
              </div>

              {/* Creatives List */}
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-foreground/60 uppercase tracking-wider mb-2">
                  Creatives
                </h4>
                {creativesLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
                    <span className="text-xs text-muted-foreground/70">
                      Loading creatives...
                    </span>
                  </div>
                ) : creatives.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 py-2">
                    No creatives for this campaign.{" "}
                    <Link
                      href="/advertise/portal/creatives"
                      className="text-[#74ddc7] hover:underline"
                    >
                      Upload one
                    </Link>
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {creatives.map((creative) => (
                      <div
                        key={creative.id}
                        className="flex items-center gap-3 rounded-lg bg-foreground/[0.02] border border-border p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-foreground/[0.04] shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {creative.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {creative.creativeType.replace("_", " ")}
                          </p>
                        </div>
                        <Badge
                          className={`text-[9px] border ${CREATIVE_STATUS_STYLES[creative.status] || "bg-foreground/[0.06] text-muted-foreground border-border"}`}
                        >
                          {creative.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/* ---------- Main Page ---------- */

export default function CampaignsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [account, setAccount] = useState<AdvertiserAccount | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async (advertiserId: string) => {
    try {
      const data = await apiClient<Campaign[]>(
        `/advertising/campaigns?advertiserId=${advertiserId}`
      );
      setCampaigns(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load campaigns"
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
        await loadCampaigns(acct.id);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load account"
        );
      })
      .finally(() => setLoading(false));
  }, [user, loadCampaigns]);

  function handleCampaignCreated(campaign: Campaign) {
    setCampaigns((prev) => [campaign, ...prev]);
  }

  function handleCampaignUpdate(updated: Campaign) {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  const isLoading = authLoading || loading;

  // Count by status
  const statusCounts = campaigns.reduce<Record<string, number>>(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-red-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
                <Megaphone className="h-7 w-7 text-white" />
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
                    Campaigns
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
                <p className="text-muted-foreground mt-1">
                  Create and manage your advertising campaigns
                </p>
              </div>
            </div>
            <div className="hidden sm:block">
              {account && (
                <CreateCampaignDialog onCreated={handleCampaignCreated} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Create Button */}
      {account && (
        <div className="sm:hidden">
          <CreateCampaignDialog onCreated={handleCampaignCreated} />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">
            Loading campaigns...
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
            to view your campaigns.
          </p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Campaigns Content */}
      {!isLoading && user && account && !error && (
        <>
          {/* Status Summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
              >
                <Badge
                  className={`text-[10px] border ${STATUS_STYLES[status] || "bg-foreground/[0.06] text-muted-foreground border-border"}`}
                >
                  {status.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            ))}
            {campaigns.length > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                  {campaigns.length} total
                </span>
              </div>
            )}
          </div>

          {/* Campaigns Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Megaphone className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No campaigns yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Create your first advertising campaign to start reaching WCCG
                  listeners.
                </p>
                <CreateCampaignDialog onCreated={handleCampaignCreated} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Campaign</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Budget</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">
                      Daily
                    </TableHead>
                    <TableHead className="text-muted-foreground hidden sm:table-cell">
                      Start
                    </TableHead>
                    <TableHead className="text-muted-foreground hidden sm:table-cell">
                      End
                    </TableHead>
                    <TableHead className="text-muted-foreground w-16">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <CampaignRow
                      key={campaign.id}
                      campaign={campaign}
                      onUpdate={handleCampaignUpdate}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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
