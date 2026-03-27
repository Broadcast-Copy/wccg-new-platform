"use client";

import { useState } from "react";
import {
  Megaphone,
  Eye,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Plus,
  X,
  ChevronDown,
  CalendarDays,
  BarChart3,
  Pause,
  Play,
  CheckCircle2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignStatus = "Active" | "Paused" | "Completed";
type CampaignType = "Radio Spot" | "Digital Ad" | "Social Media" | "Event Sponsor";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  spend: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CAMPAIGN_TYPES: CampaignType[] = [
  "Radio Spot",
  "Digital Ad",
  "Social Media",
  "Event Sponsor",
];

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: "cm1",
    name: "Spring Sale Radio Blast",
    type: "Radio Spot",
    status: "Active",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    impressions: 45200,
    clicks: 1820,
    spend: 750,
  },
  {
    id: "cm2",
    name: "Instagram Growth Push",
    type: "Social Media",
    status: "Active",
    startDate: "2026-03-10",
    endDate: "2026-04-10",
    impressions: 28400,
    clicks: 2130,
    spend: 320,
  },
  {
    id: "cm3",
    name: "Crown City Festival Sponsor",
    type: "Event Sponsor",
    status: "Completed",
    startDate: "2026-02-14",
    endDate: "2026-02-16",
    impressions: 12800,
    clicks: 640,
    spend: 1200,
  },
  {
    id: "cm4",
    name: "Google Display Network",
    type: "Digital Ad",
    status: "Paused",
    startDate: "2026-02-01",
    endDate: "2026-03-15",
    impressions: 62100,
    clicks: 1490,
    spend: 540,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<CampaignStatus, { bg: string; text: string; icon: typeof Play }> = {
  Active: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: Play },
  Paused: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: Pause },
  Completed: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: CheckCircle2 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorMediaPage() {
  const [campaigns, setCampaigns] = useState(SEED_CAMPAIGNS);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CampaignType>("Radio Spot");
  const [formBudget, setFormBudget] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAudience, setFormAudience] = useState("");

  // Aggregate stats
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

  // Bar chart data (max height 120px)
  const maxImpressions = Math.max(...campaigns.map((c) => c.impressions));

  const handleCreate = () => {
    if (!formName.trim() || !formStart || !formEnd) return;
    const newCampaign: Campaign = {
      id: `cm${Date.now()}`,
      name: formName,
      type: formType,
      status: "Active",
      startDate: formStart,
      endDate: formEnd,
      impressions: 0,
      clicks: 0,
      spend: parseInt(formBudget, 10) || 0,
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    setFormName("");
    setFormType("Radio Spot");
    setFormBudget("");
    setFormStart("");
    setFormEnd("");
    setFormAudience("");
    setShowForm(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media & Ad Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage advertising campaigns and track performance
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Create Campaign"}
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Overview Stats                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-amber-500" },
          { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-blue-500" },
          { label: "Avg CTR", value: `${avgCtr}%`, icon: TrendingUp, color: "text-green-500" },
          { label: "Total Spend", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <div className={`rounded-xl bg-muted p-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Create Campaign Form                                              */}
      {/* ----------------------------------------------------------------- */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">New Campaign</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Campaign Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My Campaign"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <div className="relative">
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CampaignType)}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Budget ($)</label>
              <input
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="500"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Date</label>
              <input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Target Audience</label>
              <input
                type="text"
                value={formAudience}
                onChange={(e) => setFormAudience(e.target.value)}
                placeholder="18-35, Fayetteville area"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="mt-4 rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Launch Campaign
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Performance Chart (div bars)                                      */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Campaign Performance</h2>
        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-end gap-4">
            {campaigns.map((c) => {
              const height = maxImpressions > 0 ? (c.impressions / maxImpressions) * 120 : 0;
              const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0";
              return (
                <div key={c.id} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {ctr}%
                  </span>
                  <div
                    className="w-full max-w-[60px] rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-400 transition-all"
                    style={{ height: `${Math.max(height, 8)}px` }}
                  />
                  <span className="max-w-[80px] truncate text-center text-xs text-muted-foreground">
                    {c.name.split(" ").slice(0, 2).join(" ")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Bar height = impressions
            </span>
            <span>Label = CTR %</span>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Campaign Cards                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Campaigns</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => {
            const ctr = campaign.impressions > 0
              ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
              : "0.00";
            const sc = statusConfig[campaign.status];
            const StatusIcon = sc.icon;

            return (
              <div
                key={campaign.id}
                className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{campaign.type}</p>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${sc.bg} ${sc.text}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {campaign.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {campaign.startDate} &mdash; {campaign.endDate}
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Impressions", value: campaign.impressions.toLocaleString() },
                    { label: "Clicks", value: campaign.clicks.toLocaleString() },
                    { label: "CTR", value: `${ctr}%` },
                    { label: "Spend", value: `$${campaign.spend.toLocaleString()}` },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-muted/50 px-2 py-2">
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      <p className="text-sm font-semibold">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
