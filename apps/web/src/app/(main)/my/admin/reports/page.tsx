"use client";

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
  type LucideIcon,
} from "lucide-react";

const revenueCards = [
  { label: "Monthly Revenue", value: "$45,200", trend: "+12%", up: true, icon: DollarSign, color: "text-[#22c55e]" },
  { label: "Active Campaigns", value: "12", trend: "+3", up: true, icon: Megaphone, color: "text-[#3b82f6]" },
  { label: "New Clients", value: "3", trend: "+1", up: true, icon: Users, color: "text-[#7401df]" },
  { label: "Avg Campaign Value", value: "$3,800", trend: "-2%", up: false, icon: BarChart3, color: "text-[#f59e0b]" },
];

const topCampaigns = [
  { campaign: "Spring Auto Blitz", client: "Metro Auto Group", revenue: "$8,400", impressions: "142K", ctr: "3.2%", status: "Active" as const },
  { campaign: "Health Awareness", client: "City Health Clinic", revenue: "$5,200", impressions: "98K", ctr: "2.8%", status: "Active" as const },
  { campaign: "BBQ Fest Promo", client: "Carolina BBQ Fest", revenue: "$4,800", impressions: "115K", ctr: "4.1%", status: "Active" as const },
  { campaign: "Banking Solutions", client: "First National Bank", revenue: "$6,100", impressions: "87K", ctr: "1.9%", status: "Paused" as const },
  { campaign: "Legal Services", client: "Johnson Law Firm", revenue: "$3,200", impressions: "54K", ctr: "2.4%", status: "Active" as const },
  { campaign: "Weekend Events", client: "WCCG Events", revenue: "$2,500", impressions: "72K", ctr: "3.6%", status: "Completed" as const },
];

const departmentRevenue = [
  { department: "Sales", revenue: "$32,000", color: "from-[#74ddc7] to-[#0d9488]", icon: DollarSign },
  { department: "Production", revenue: "$8,200", color: "from-[#f59e0b] to-[#d97706]", icon: BarChart3 },
  { department: "Events", revenue: "$5,000", color: "from-[#ec4899] to-[#be185d]", icon: Megaphone },
];

function getCampaignStatusBadge(status: string) {
  switch (status) {
    case "Active":
      return (
        <span className="inline-flex items-center rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
          Active
        </span>
      );
    case "Paused":
      return (
        <span className="inline-flex items-center rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">
          Paused
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Completed
        </span>
      );
    default:
      return null;
  }
}

export default function ReportsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
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
          <span className="rounded-full bg-[#0d9488]/10 border border-[#0d9488]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">
            Reports
          </span>
        </div>
      </div>

      {/* Revenue Overview */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[#22c55e]" />
          Revenue Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {revenueCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {card.label}
                </p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
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
                <span className="text-xs text-muted-foreground">vs last month</span>
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
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{row.campaign}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.client}</td>
                    <td className="px-4 py-3 text-[#22c55e] font-medium">{row.revenue}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.impressions}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.ctr}</td>
                    <td className="px-4 py-3">{getCampaignStatusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Revenue by Department */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#74ddc7]" />
          Revenue by Department
        </h2>
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
                  <p className="text-xl font-bold text-foreground">{dept.revenue}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
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
