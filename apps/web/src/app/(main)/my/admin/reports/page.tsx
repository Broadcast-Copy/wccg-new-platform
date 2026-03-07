"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Megaphone,
  Users,
  ArrowLeft,
  Download,
  X,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = "week" | "month" | "quarter" | "year";
type CampaignStatus = "Active" | "Paused" | "Completed";

interface RevenueCard {
  label: string;
  base: number;       // base monthly value
  trend: string;
  up: boolean;
  icon: LucideIcon;
  color: string;
  prefix?: string;
  suffix?: string;
}

interface Campaign {
  campaign: string;
  client: string;
  revenue: number;
  impressions: number;
  ctr: number;
  status: CampaignStatus;
  details: {
    startDate: string;
    endDate: string;
    type: string;
    dayparts: string[];
    creativesReceived: number;
    creativesTotal: number;
  };
}

interface DepartmentRevenue {
  department: string;
  base: number;
  color: string;
  icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Multipliers per date range
// ---------------------------------------------------------------------------

const RANGE_MULTIPLIERS: Record<DateRange, number> = {
  week: 0.25,
  month: 1,
  quarter: 3,
  year: 12,
};

const RANGE_LABELS: Record<DateRange, string> = {
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  year: "This Year",
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const revenueCardsBase: RevenueCard[] = [
  { label: "Revenue", base: 45200, trend: "+12%", up: true, icon: DollarSign, color: "text-[#22c55e]", prefix: "$" },
  { label: "Active Campaigns", base: 12, trend: "+3", up: true, icon: Megaphone, color: "text-[#3b82f6]" },
  { label: "New Clients", base: 3, trend: "+1", up: true, icon: Users, color: "text-[#7401df]" },
  { label: "Avg Campaign Value", base: 3800, trend: "-2%", up: false, icon: BarChart3, color: "text-[#f59e0b]", prefix: "$" },
];

const topCampaigns: Campaign[] = [
  {
    campaign: "Spring Auto Blitz",
    client: "Metro Auto Group",
    revenue: 8400,
    impressions: 142000,
    ctr: 3.2,
    status: "Active",
    details: { startDate: "Feb 15, 2026", endDate: "Apr 15, 2026", type: "Audio Spot + Digital", dayparts: ["Morning Drive", "Afternoon Drive"], creativesReceived: 3, creativesTotal: 3 },
  },
  {
    campaign: "Health Awareness",
    client: "City Health Clinic",
    revenue: 5200,
    impressions: 98000,
    ctr: 2.8,
    status: "Active",
    details: { startDate: "Mar 1, 2026", endDate: "May 31, 2026", type: "Audio Spot", dayparts: ["Midday", "Evening"], creativesReceived: 2, creativesTotal: 2 },
  },
  {
    campaign: "BBQ Fest Promo",
    client: "Carolina BBQ Fest",
    revenue: 4800,
    impressions: 115000,
    ctr: 4.1,
    status: "Active",
    details: { startDate: "Mar 5, 2026", endDate: "Mar 20, 2026", type: "Audio + Video", dayparts: ["All Day"], creativesReceived: 4, creativesTotal: 5 },
  },
  {
    campaign: "Banking Solutions",
    client: "First National Bank",
    revenue: 6100,
    impressions: 87000,
    ctr: 1.9,
    status: "Paused",
    details: { startDate: "Jan 10, 2026", endDate: "Jun 30, 2026", type: "Audio Spot", dayparts: ["Morning Drive"], creativesReceived: 1, creativesTotal: 2 },
  },
  {
    campaign: "Legal Services",
    client: "Johnson Law Firm",
    revenue: 3200,
    impressions: 54000,
    ctr: 2.4,
    status: "Active",
    details: { startDate: "Feb 1, 2026", endDate: "Apr 30, 2026", type: "Audio Spot", dayparts: ["Afternoon", "Evening"], creativesReceived: 2, creativesTotal: 2 },
  },
  {
    campaign: "Weekend Events",
    client: "WCCG Events",
    revenue: 2500,
    impressions: 72000,
    ctr: 3.6,
    status: "Completed",
    details: { startDate: "Jan 15, 2026", endDate: "Feb 28, 2026", type: "Promo", dayparts: ["Weekend"], creativesReceived: 3, creativesTotal: 3 },
  },
];

const departmentRevenueBase: DepartmentRevenue[] = [
  { department: "Sales", base: 32000, color: "from-[#74ddc7] to-[#0d9488]", icon: DollarSign },
  { department: "Production", base: 8200, color: "from-[#f59e0b] to-[#d97706]", icon: BarChart3 },
  { department: "Events", base: 5000, color: "from-[#ec4899] to-[#be185d]", icon: Megaphone },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function getCampaignStatusBadge(status: CampaignStatus) {
  const styles: Record<CampaignStatus, string> = {
    Active: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
    Paused: "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]",
    Completed: "bg-muted border-border text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { user } = useAuth();

  // -- State ----------------------------------------------------------------
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const multiplier = RANGE_MULTIPLIERS[dateRange];

  // -- Computed values for current range ------------------------------------
  const revenueCards = useMemo(
    () =>
      revenueCardsBase.map((card) => {
        const scaled = card.prefix === "$"
          ? Math.round(card.base * multiplier)
          : card.label === "Active Campaigns"
          ? card.base
          : card.label === "New Clients"
          ? Math.max(1, Math.round(card.base * multiplier))
          : card.base;
        const display = card.prefix
          ? formatCurrency(scaled)
          : scaled.toString();
        return { ...card, displayValue: display };
      }),
    [multiplier]
  );

  const departmentRevenue = useMemo(
    () =>
      departmentRevenueBase.map((dept) => ({
        ...dept,
        scaledRevenue: Math.round(dept.base * multiplier),
      })),
    [multiplier]
  );

  // Bar chart: find max for percentage calc
  const maxDeptRevenue = useMemo(
    () => Math.max(...departmentRevenue.map((d) => d.scaledRevenue)),
    [departmentRevenue]
  );

  // -- Helpers --------------------------------------------------------------
  const showToast = useCallback((msg: string) => {
    setStatusMsg(msg);
    toast.success(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  // -- Handlers -------------------------------------------------------------
  function handleExport(type: string) {
    setExportingType(type);
    // Simulate export delay
    setTimeout(() => {
      setExportingType(null);
      showToast(`${type} report exported successfully`);
    }, 1500);
  }

  // -- Render ---------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Status Message Bar */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-medium text-black shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {statusMsg}
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCampaign(null)}>
          <div
            className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedCampaign.campaign}</h3>
                <p className="text-sm text-muted-foreground">{selectedCampaign.client}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-[#22c55e]">{formatCurrency(selectedCampaign.revenue)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Impressions</p>
                  <p className="text-lg font-bold text-foreground">{formatNumber(selectedCampaign.impressions)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-lg font-bold text-[#3b82f6]">{selectedCampaign.ctr}%</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Status</span>
                  {getCampaignStatusBadge(selectedCampaign.status)}
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground font-medium">{selectedCampaign.details.type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="text-foreground">{selectedCampaign.details.startDate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="text-foreground">{selectedCampaign.details.endDate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Dayparts</span>
                  <span className="text-foreground">{selectedCampaign.details.dayparts.join(", ")}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Creatives</span>
                  <span className="text-foreground">
                    {selectedCampaign.details.creativesReceived} / {selectedCampaign.details.creativesTotal} received
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCampaign(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0d9488]/10 border border-[#0d9488]/20">
            <BarChart3 className="h-7 w-7 text-[#0d9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports &amp; Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Revenue, campaigns, and performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={exportingType === "PDF"}
            onClick={() => handleExport("PDF")}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exportingType === "PDF" ? "Exporting..." : "Export PDF"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={exportingType === "CSV"}
            onClick={() => handleExport("CSV")}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exportingType === "CSV" ? "Exporting..." : "Export CSV"}
          </Button>
          <span className="rounded-full bg-[#0d9488]/10 border border-[#0d9488]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
            Reports
          </span>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(RANGE_LABELS) as DateRange[]).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setDateRange(range)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              dateRange === range
                ? "bg-[#74ddc7] text-black"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {RANGE_LABELS[range]}
          </button>
        ))}
      </div>

      {/* Revenue Overview */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#22c55e]" />
          Revenue Overview
          <span className="text-xs font-normal text-muted-foreground ml-2">
            {RANGE_LABELS[dateRange]}
          </span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {revenueCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {card.label}
                </p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.displayValue}</p>
              <div className="flex items-center gap-1">
                {card.up ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[#22c55e]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#dc2626]" />
                )}
                <span
                  className={`text-xs font-medium ${
                    card.up ? "text-[#22c55e]" : "text-[#dc2626]"
                  }`}
                >
                  {card.trend}
                </span>
                <span className="text-xs text-muted-foreground">vs prior period</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue Bar Chart */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#74ddc7]" />
          Revenue by Department
          <span className="text-xs font-normal text-muted-foreground ml-2">
            {RANGE_LABELS[dateRange]}
          </span>
        </h2>

        {/* Bar Chart using divs */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {departmentRevenue.map((dept) => {
            const pct = maxDeptRevenue > 0 ? (dept.scaledRevenue / maxDeptRevenue) * 100 : 0;
            return (
              <div key={dept.department} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{dept.department}</span>
                  <span className="text-[#22c55e] font-bold">{formatCurrency(dept.scaledRevenue)}</span>
                </div>
                <div className="h-6 w-full rounded-lg bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-lg bg-gradient-to-r ${dept.color} transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-[#22c55e]">
              {formatCurrency(departmentRevenue.reduce((sum, d) => sum + d.scaledRevenue, 0))}
            </span>
          </div>
        </div>

        {/* Department cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          {departmentRevenue.map((dept) => (
            <div
              key={dept.department}
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${dept.color}`}
                >
                  <dept.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {dept.department}
                  </p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(dept.scaledRevenue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Campaigns */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#dc2626]" />
          Top Campaigns
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Impressions</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CTR</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((row) => (
                  <tr
                    key={row.campaign}
                    onClick={() => setSelectedCampaign(row)}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    title="Click to view details"
                  >
                    <td className="px-4 py-3 font-medium text-foreground hover:text-[#74ddc7] transition-colors">
                      {row.campaign}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.client}</td>
                    <td className="px-4 py-3 text-[#22c55e] font-medium">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatNumber(row.impressions)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.ctr}%</td>
                    <td className="px-4 py-3">{getCampaignStatusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Click on any campaign row to view full details
        </p>
      </section>

      {/* Back to Admin */}
      <div className="pt-2">
        <Link
          href="/my/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Station Control
        </Link>
      </div>
    </div>
  );
}
