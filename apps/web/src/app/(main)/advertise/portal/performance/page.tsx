"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Eye,
  Gift,
  Headphones,
  TrendingUp,
  ArrowLeft,
  Download,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
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
import { SponsorStatsCard } from "@/components/sales/sponsor-stats-card";
import { PerformanceChart } from "@/components/sales/performance-chart";
import {
  summaryStats,
  dailyData,
  sponsoredHours,
  campaignPerformance,
} from "@/data/advertiser-performance";
import { toast } from "sonner";

/* ---------- Helpers ---------- */

type DateRange = "7" | "30" | "90";

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-foreground/[0.06] text-muted-foreground border-border",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

/* ---------- Page ---------- */

export default function PerformanceDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30");

  const filteredDailyData = useMemo(() => {
    const days = parseInt(dateRange);
    if (days >= dailyData.length) return dailyData;
    return dailyData.slice(dailyData.length - days);
  }, [dateRange]);

  // Compute filtered stats from selected range
  const rangeStats = useMemo(() => {
    const totalImpressions = filteredDailyData.reduce(
      (sum, d) => sum + d.impressions,
      0
    );
    const totalRedemptions = filteredDailyData.reduce(
      (sum, d) => sum + d.redemptions,
      0
    );
    const avgLTR =
      filteredDailyData.reduce((sum, d) => sum + d.listenThroughRate, 0) /
      filteredDailyData.length;

    return { totalImpressions, totalRedemptions, avgLTR };
  }, [filteredDailyData]);

  function handleExport() {
    toast.success("Report downloading...", {
      description: "Your performance report is being generated.",
    });
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-[#7401df]/10 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#7401df]/70 shadow-xl">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Campaign Performance
                </h1>
                <p className="text-muted-foreground mt-1">
                  Track your advertising ROI and listener engagement
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-border text-muted-foreground hover:text-foreground"
              >
                <Link href="/advertise/portal">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to Portal
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#74ddc7]/80"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Tabs */}
      <div className="flex gap-2">
        {(
          [
            { value: "7", label: "Last 7 Days" },
            { value: "30", label: "Last 30 Days" },
            { value: "90", label: "Last 90 Days" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setDateRange(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              dateRange === tab.value
                ? "bg-[#7401df] text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-input"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SponsorStatsCard
          icon={Eye}
          label="Impressions"
          value={formatNumber(rangeStats.totalImpressions)}
          trend={12.3}
          trendDirection="up"
        />
        <SponsorStatsCard
          icon={Gift}
          label="Redemptions"
          value={rangeStats.totalRedemptions.toString()}
          trend={8.7}
          trendDirection="up"
        />
        <SponsorStatsCard
          icon={Headphones}
          label="Listen-Through Rate"
          value={`${rangeStats.avgLTR.toFixed(1)}%`}
          trend={2.1}
          trendDirection="up"
        />
        <SponsorStatsCard
          icon={TrendingUp}
          label="Estimated ROI"
          value={`${summaryStats.estimatedROI}x`}
          trend={0.5}
          trendDirection="up"
        />
      </div>

      {/* Chart Section */}
      <PerformanceChart data={filteredDailyData} />

      {/* Sponsored Hours Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            Sponsored Hours Breakdown
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Performance by sponsored time slot
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">
                Sponsored Hour
              </TableHead>
              <TableHead className="text-muted-foreground text-right">
                Impressions
              </TableHead>
              <TableHead className="text-muted-foreground text-right hidden sm:table-cell">
                Redemptions
              </TableHead>
              <TableHead className="text-muted-foreground text-right hidden sm:table-cell">
                CTR
              </TableHead>
              <TableHead className="text-muted-foreground text-right">
                Revenue
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsoredHours.map((hour) => (
              <TableRow
                key={hour.label}
                className="border-border hover:bg-foreground/[0.02]"
              >
                <TableCell className="text-foreground font-medium">
                  {hour.label}
                </TableCell>
                <TableCell className="text-foreground/60 text-right">
                  {formatNumber(hour.impressions)}
                </TableCell>
                <TableCell className="text-foreground/60 text-right hidden sm:table-cell">
                  {hour.redemptions}
                </TableCell>
                <TableCell className="text-foreground/60 text-right hidden sm:table-cell">
                  {hour.ctr}%
                </TableCell>
                <TableCell className="text-foreground text-right font-medium">
                  {formatCurrency(hour.revenue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Active Campaigns */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Campaign Progress</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active and recent campaigns
          </p>
        </div>
        <div className="divide-y divide-border">
          {campaignPerformance.map((campaign) => {
            // Compute progress for active campaigns
            const start = new Date(campaign.startDate).getTime();
            const end = new Date(campaign.endDate).getTime();
            const now = Date.now();
            const progress =
              campaign.status === "completed"
                ? 100
                : Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(((now - start) / (end - start)) * 100)
                    )
                  );

            return (
              <div key={campaign.name} className="p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7401df]/10 shrink-0">
                      {campaign.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      ) : campaign.status === "active" ? (
                        <TrendingUp className="h-4 w-4 text-[#74ddc7]" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {campaign.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        <Calendar className="inline h-3 w-3 mr-1 -mt-0.5" />
                        {formatDate(campaign.startDate)} &ndash;{" "}
                        {formatDate(campaign.endDate)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] border capitalize ${
                      STATUS_STYLES[campaign.status] || ""
                    }`}
                  >
                    {campaign.status}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress}% complete</span>
                    <span>{campaign.spotsAired} spots aired</span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        campaign.status === "completed"
                          ? "bg-muted-foreground/40"
                          : "bg-gradient-to-r from-[#7401df] to-[#74ddc7]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-6 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Reach</span>
                    <p className="font-semibold text-foreground">
                      {formatNumber(campaign.totalReach)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Conversion Rate
                    </span>
                    <p className="font-semibold text-foreground">
                      {campaign.conversionRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Spots Aired</span>
                    <p className="font-semibold text-foreground">
                      {campaign.spotsAired}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Need help interpreting your performance data?{" "}
          <Link
            href="/contact"
            className="text-[#74ddc7] hover:underline"
          >
            Contact our advertising team
          </Link>{" "}
          or call (910) 484-4932.
        </p>
      </div>
    </div>
  );
}
