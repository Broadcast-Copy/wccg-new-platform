"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MARKETING_CAMPAIGNS_KEY,
  formatCurrency,
  formatDate,
  type MarketingCampaign,
} from "@/lib/sales-shared";
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Radio,
  Search,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: MarketingCampaign["status"] }) {
  const map: Record<
    MarketingCampaign["status"],
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Draft" },
    active: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      label: "Active",
    },
    completed: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      label: "Completed",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MARKETING_CAMPAIGNS_KEY);
      if (raw) setCampaigns(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const filtered = campaigns.filter(
    (c) =>
      c.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      c.client.businessName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = (id: string) => {
    const updated = campaigns.filter((c) => c.id !== id);
    setCampaigns(updated);
    localStorage.setItem(MARKETING_CAMPAIGNS_KEY, JSON.stringify(updated));
  };

  // Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalRevenue = campaigns.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Marketing Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage on-air, digital, remote, and promotional campaigns.
          </p>
        </div>
        <Link
          href="/my/marketing/campaign-builder"
          className="inline-flex items-center gap-2 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition-colors hover:bg-[#74ddc7]/90"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#74ddc7]/10">
              <Briefcase className="h-5 w-5 text-[#74ddc7]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Campaigns</p>
              <p className="text-xl font-bold">{totalCampaigns}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Radio className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{activeCampaigns}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <DollarSign className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search campaigns or clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#74ddc7]/50 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
        />
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Briefcase className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {campaigns.length === 0
              ? "No campaigns yet"
              : "No campaigns match your search"}
          </p>
          {campaigns.length === 0 && (
            <Link
              href="/my/marketing/campaign-builder"
              className="mt-3 text-sm font-medium text-[#74ddc7] hover:underline"
            >
              Create your first campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {c.campaignName}
                  </p>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{c.client.businessName}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(c.flightStart)} &ndash;{" "}
                    {formatDate(c.flightEnd)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(c.createdAt)}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="ml-4 shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label={`Delete ${c.campaignName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
