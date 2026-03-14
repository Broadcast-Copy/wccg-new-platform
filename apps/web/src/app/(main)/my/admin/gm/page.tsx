"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Radio,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Target,
  Handshake,
  MessageSquare,
  FileText,
  CalendarDays,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { loadSingle, persistSingle } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

interface GMDashboardData {
  monthlyRevenue: number;
  revenueTarget: number;
  listenerReach: number;
  listenerReachPrev: number;
  activeStaff: number;
  totalStaff: number;
  complianceScore: number;
  revenueTrend: { month: string; actual: number; target: number }[];
  alerts: { id: string; severity: "critical" | "warning" | "info"; message: string; time: string }[];
}

const SEED_DATA: GMDashboardData = {
  monthlyRevenue: 187500,
  revenueTarget: 200000,
  listenerReach: 48200,
  listenerReachPrev: 45800,
  activeStaff: 14,
  totalStaff: 15,
  complianceScore: 96,
  revenueTrend: [
    { month: "Oct", actual: 165000, target: 175000 },
    { month: "Nov", actual: 178000, target: 180000 },
    { month: "Dec", actual: 195000, target: 190000 },
    { month: "Jan", actual: 172000, target: 185000 },
    { month: "Feb", actual: 181000, target: 195000 },
    { month: "Mar", actual: 187500, target: 200000 },
  ],
  alerts: [
    { id: "a1", severity: "critical", message: "FCC License renewal due in 45 days", time: "2026-03-14T08:00:00Z" },
    { id: "a2", severity: "warning", message: "Q1 revenue trailing target by 6.3%", time: "2026-03-14T09:00:00Z" },
    { id: "a3", severity: "warning", message: "Morning show ratings dipped 0.3 share points", time: "2026-03-13T14:00:00Z" },
    { id: "a4", severity: "info", message: "New partnership lead from Fayetteville Auto Mall", time: "2026-03-13T10:00:00Z" },
  ],
};

const QUICK_LINKS = [
  { href: "/my/admin/gm/revenue", label: "Revenue Tracking", icon: DollarSign, color: "text-emerald-400" },
  { href: "/my/admin/gm/staff", label: "Staff Directory", icon: Users, color: "text-blue-400" },
  { href: "/my/admin/gm/meetings", label: "Meeting Notes", icon: CalendarDays, color: "text-purple-400" },
  { href: "/my/admin/gm/ratings", label: "Ratings Dashboard", icon: BarChart3, color: "text-[#74ddc7]" },
  { href: "/my/admin/gm/competitors", label: "Competitor Monitor", icon: Radio, color: "text-orange-400" },
  { href: "/my/admin/gm/goals", label: "Strategic Goals", icon: Target, color: "text-yellow-400" },
  { href: "/my/admin/gm/feedback", label: "Listener Feedback", icon: MessageSquare, color: "text-pink-400" },
  { href: "/my/admin/gm/partnerships", label: "Partnerships", icon: Handshake, color: "text-[#74ddc7]" },
  { href: "/my/admin/gm/board-reports", label: "Board Reports", icon: FileText, color: "text-indigo-400" },
];

const STORAGE_KEY = "wccg:gm:dashboard";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GMDashboardPage() {
  const [data, setData] = useState<GMDashboardData | null>(null);

  useEffect(() => {
    setData(loadSingle(STORAGE_KEY, SEED_DATA));
  }, []);

  if (!data) return null;

  const revenuePercent = Math.round((data.monthlyRevenue / data.revenueTarget) * 100);
  const listenerTrend = ((data.listenerReach - data.listenerReachPrev) / data.listenerReachPrev * 100).toFixed(1);
  const maxRevenue = Math.max(...data.revenueTrend.map((r) => Math.max(r.actual, r.target)));

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={LayoutDashboard}
        title="General Manager"
        description="Executive overview of WCCG 104.5 FM operations"
        badge="GM"
        badgeColor="bg-[#7401df]/10 text-[#7401df] border-[#7401df]/20"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Revenue"
          value={`$${(data.monthlyRevenue / 1000).toFixed(0)}K`}
          icon={DollarSign}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          trend={`${revenuePercent}% of $${(data.revenueTarget / 1000).toFixed(0)}K target`}
          trendUp={revenuePercent >= 90}
        />
        <StatCard
          label="Listener Reach"
          value={data.listenerReach.toLocaleString()}
          icon={Radio}
          color="text-blue-400"
          bg="bg-blue-500/10"
          trend={`${Number(listenerTrend) >= 0 ? "+" : ""}${listenerTrend}% vs last month`}
          trendUp={Number(listenerTrend) >= 0}
        />
        <StatCard
          label="Active Staff"
          value={`${data.activeStaff}/${data.totalStaff}`}
          icon={Users}
          color="text-purple-400"
          bg="bg-purple-500/10"
          trend={`${data.totalStaff - data.activeStaff} on leave/remote`}
          trendUp={true}
        />
        <StatCard
          label="Compliance Score"
          value={`${data.complianceScore}%`}
          icon={ShieldCheck}
          color="text-[#74ddc7]"
          bg="bg-[#74ddc7]/10"
          trend={data.complianceScore >= 95 ? "All systems compliant" : "Needs attention"}
          trendUp={data.complianceScore >= 95}
        />
      </div>

      {/* Revenue Trend Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">Revenue Trend (6 Months)</h2>
        <p className="text-xs text-muted-foreground mb-6">Actual vs Target</p>
        <div className="flex items-end gap-3 h-48">
          {data.revenueTrend.map((item) => (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end justify-center" style={{ height: "160px" }}>
                <div
                  className="w-5 rounded-t bg-[#74ddc7]/70 transition-all"
                  style={{ height: `${(item.actual / maxRevenue) * 100}%` }}
                  title={`Actual: $${(item.actual / 1000).toFixed(0)}K`}
                />
                <div
                  className="w-5 rounded-t bg-[#7401df]/40 transition-all"
                  style={{ height: `${(item.target / maxRevenue) * 100}%` }}
                  title={`Target: $${(item.target / 1000).toFixed(0)}K`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{item.month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-[#74ddc7]/70" />
            Actual
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-[#7401df]/40" />
            Target
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Critical Alerts
          </h2>
          <div className="space-y-3">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  alert.severity === "critical"
                    ? "border-red-500/30 bg-red-500/5 text-red-400"
                    : alert.severity === "warning"
                    ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"
                    : "border-blue-500/30 bg-blue-500/5 text-blue-400"
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#74ddc7]" />
            Department Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm text-foreground hover:bg-muted/30 hover:border-input transition-colors group"
              >
                <link.icon className={`h-4 w-4 ${link.color}`} />
                <span className="flex-1">{link.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
