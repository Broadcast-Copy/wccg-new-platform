"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Calendar,
  FileText,
  DollarSign,
  ClipboardList,
  Megaphone,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Clock,
  ChevronRight,
  BarChart3,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityFeed, type ActivityItem } from "@/components/admin/activity-feed";

// ---------------------------------------------------------------------------
// Quick-link cards
// ---------------------------------------------------------------------------

interface QuickLink {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color: string;
  bg: string;
}

const QUICK_LINKS: QuickLink[] = [
  { icon: Calendar, title: "Traffic Log", description: "Daily program & commercial schedule", href: "/my/admin/traffic/log", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: FileText, title: "Copy Management", description: "Ad copy tracking & approvals", href: "/my/admin/traffic/copy", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: DollarSign, title: "Billing Dashboard", description: "Monthly billing overview & invoices", href: "/my/admin/traffic/billing", color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: CreditCard, title: "Accounts Receivable", description: "AR aging & payment tracking", href: "/my/admin/traffic/ar", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: ClipboardList, title: "Production Orders", description: "Commercial production requests", href: "/my/admin/traffic/production-orders", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: FileCheck, title: "Continuity Log", description: "FCC continuity & program logs", href: "/my/admin/traffic/continuity", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Megaphone, title: "PSA Rotation", description: "Public service announcement management", href: "/my/admin/traffic/psa", color: "text-[#74ddc7]", bg: "bg-[#74ddc7]/10" },
  { icon: AlertTriangle, title: "Makegood Tracker", description: "Missed spots & makegood scheduling", href: "/my/admin/traffic/makegoods", color: "text-rose-400", bg: "bg-rose-500/10" },
  { icon: FileCheck, title: "Contracts", description: "Active advertising contracts", href: "/my/admin/traffic/contracts", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { icon: CreditCard, title: "Expense Tracking", description: "Office & station expenses", href: "/my/admin/traffic/expenses", color: "text-amber-400", bg: "bg-amber-500/10" },
  { icon: Clock, title: "Deadline Calendar", description: "FCC filings, renewals & due dates", href: "/my/admin/traffic/deadlines", color: "text-cyan-400", bg: "bg-cyan-500/10" },
];

// ---------------------------------------------------------------------------
// Seed activity
// ---------------------------------------------------------------------------

const SEED_ACTIVITY: ActivityItem[] = [
  { id: "ta1", action: "approved copy for", target: "Cape Fear Auto - Spring Sale :30", actor: "Sarah Mitchell", timestamp: new Date(Date.now() - 15 * 60000).toISOString(), type: "update" },
  { id: "ta2", action: "scheduled makegood for", target: "Fort Bragg FCU - Mortgage :60", actor: "Mike Johnson", timestamp: new Date(Date.now() - 45 * 60000).toISOString(), type: "create" },
  { id: "ta3", action: "generated invoice for", target: "Cross Creek Mall - March 2026", actor: "Sarah Mitchell", timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), type: "note" },
  { id: "ta4", action: "flagged missed spot for", target: "Lowe's Home Improvement :30", actor: "Mike Johnson", timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), type: "alert" },
  { id: "ta5", action: "updated contract for", target: "Fayetteville Kia - Annual Deal", actor: "Sarah Mitchell", timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), type: "update" },
  { id: "ta6", action: "submitted production order for", target: "Carolina Ale House - New Spot", actor: "Patricia Young", timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), type: "create" },
  { id: "ta7", action: "completed continuity log for", target: "March 13, 2026", actor: "Mike Johnson", timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), type: "note" },
  { id: "ta8", action: "added PSA to rotation", target: "American Red Cross - Blood Drive", actor: "Sarah Mitchell", timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), type: "create" },
];

// ---------------------------------------------------------------------------
// Today's log summary (mock)
// ---------------------------------------------------------------------------

interface HourSummary {
  hour: string;
  scheduled: number;
  aired: number;
  missed: number;
}

const TODAY_HOURS: HourSummary[] = [
  { hour: "6 AM", scheduled: 8, aired: 8, missed: 0 },
  { hour: "7 AM", scheduled: 10, aired: 10, missed: 0 },
  { hour: "8 AM", scheduled: 10, aired: 9, missed: 1 },
  { hour: "9 AM", scheduled: 8, aired: 8, missed: 0 },
  { hour: "10 AM", scheduled: 6, aired: 6, missed: 0 },
  { hour: "11 AM", scheduled: 6, aired: 5, missed: 1 },
  { hour: "12 PM", scheduled: 8, aired: 8, missed: 0 },
  { hour: "1 PM", scheduled: 6, aired: 6, missed: 0 },
  { hour: "2 PM", scheduled: 6, aired: 6, missed: 0 },
  { hour: "3 PM", scheduled: 8, aired: 8, missed: 0 },
  { hour: "4 PM", scheduled: 10, aired: 9, missed: 1 },
  { hour: "5 PM", scheduled: 10, aired: 10, missed: 0 },
];

export default function TrafficDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalScheduled = TODAY_HOURS.reduce((s, h) => s + h.scheduled, 0);
  const totalAired = TODAY_HOURS.reduce((s, h) => s + h.aired, 0);
  const totalMissed = TODAY_HOURS.reduce((s, h) => s + h.missed, 0);
  const fillRate = totalScheduled > 0 ? Math.round((totalAired / totalScheduled) * 100) : 0;

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Radio}
        title="Traffic / Office Manager"
        description="Daily traffic log, billing, contracts & office management for WCCG 104.5 FM"
        badge="Traffic Dept"
        badgeColor="bg-orange-500/10 text-orange-400 border-orange-500/20"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Scheduled" value={totalScheduled} icon={Calendar} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Spots Aired" value={totalAired} icon={BarChart3} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Fill Rate" value={`${fillRate}%`} icon={Activity} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" trend={fillRate >= 95 ? "Excellent" : "Needs attention"} trendUp={fillRate >= 95} />
        <StatCard label="Outstanding Makegoods" value={totalMissed} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Today's log summary */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Today&apos;s Log Status</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-12 gap-1 p-4">
            {TODAY_HOURS.map((h) => {
              const pct = h.scheduled > 0 ? (h.aired / h.scheduled) * 100 : 0;
              return (
                <div key={h.hour} className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">{h.hour.replace(" ", "\n")}</div>
                  <div
                    className={`h-8 rounded-md ${
                      pct === 100 ? "bg-emerald-500/30 border border-emerald-500/40" :
                      pct >= 80 ? "bg-yellow-500/30 border border-yellow-500/40" :
                      "bg-red-500/30 border border-red-500/40"
                    }`}
                    title={`${h.aired}/${h.scheduled} aired`}
                  />
                  <div className="text-[10px] text-muted-foreground mt-1">{h.aired}/{h.scheduled}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Traffic & Office</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-input hover:shadow-lg hover:shadow-black/10"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.bg}`}>
                <link.icon className={`h-5 w-5 ${link.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{link.title}</p>
                <p className="text-xs text-muted-foreground truncate">{link.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h2>
        <ActivityFeed items={SEED_ACTIVITY} />
      </div>
    </div>
  );
}
