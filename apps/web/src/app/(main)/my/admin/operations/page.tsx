"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  HardDrive,
  Radio,
  FileText,
  Calendar,
  BookOpen,
  ChevronRight,
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
  { icon: Radio, title: "Master Control", description: "Transmitter, EAS, audio processing & stream health", href: "/my/admin/operations/master-control", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: ShieldCheck, title: "FCC Compliance", description: "Filings, deadlines & EAS test logs", href: "/my/admin/operations/fcc-compliance", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: HardDrive, title: "Equipment Inventory", description: "Track all station equipment & maintenance", href: "/my/admin/operations/equipment", color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: Wrench, title: "Engineering Requests", description: "Submit & track maintenance tickets", href: "/my/admin/operations/engineering", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: HardDrive, title: "Backup & DR", description: "Backup status, schedules & disaster recovery", href: "/my/admin/operations/backup", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: BookOpen, title: "SOP Library", description: "Standard operating procedures & manuals", href: "/my/admin/operations/sop", color: "text-[#74ddc7]", bg: "bg-[#74ddc7]/10" },
  { icon: Calendar, title: "Shift Scheduling", description: "Weekly on-air, production & office shifts", href: "/my/admin/operations/shifts", color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

// ---------------------------------------------------------------------------
// Seed activity
// ---------------------------------------------------------------------------

const SEED_ACTIVITY: ActivityItem[] = [
  { id: "oa1", action: "completed EAS weekly test on", target: "WCCG Transmitter", actor: "James Carter", timestamp: new Date(Date.now() - 25 * 60000).toISOString(), type: "update" },
  { id: "oa2", action: "submitted engineering request for", target: "Studio B Console Repair", actor: "Chris Morgan", timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), type: "create" },
  { id: "oa3", action: "updated FCC filing status for", target: "Q1 Issues/Programs List", actor: "Devon Robinson", timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), type: "update" },
  { id: "oa4", action: "ran full system backup on", target: "Automation Server", actor: "James Carter", timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), type: "note" },
  { id: "oa5", action: "flagged equipment alert for", target: "STL Backup Unit", actor: "Devon Robinson", timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), type: "alert" },
  { id: "oa6", action: "reviewed SOP", target: "Emergency Broadcast Procedures", actor: "Marcus Thompson", timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), type: "update" },
  { id: "oa7", action: "completed maintenance on", target: "Transmitter #1 Air Filter", actor: "James Carter", timestamp: new Date(Date.now() - 36 * 3600000).toISOString(), type: "create" },
  { id: "oa8", action: "published shift schedule for", target: "Week of Mar 16", actor: "Devon Robinson", timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), type: "note" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OperationsDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={Settings}
        title="Operations Manager"
        description="Station systems, compliance, equipment & scheduling for WCCG 104.5 FM"
        badge="Ops"
        badgeColor="bg-orange-500/10 text-orange-400 border-orange-500/20"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Equipment Alerts" value={2} icon={AlertTriangle} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Open Engineering Requests" value={3} icon={Wrench} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard label="FCC Compliance Score" value="96%" icon={ShieldCheck} color="text-emerald-400" bg="bg-emerald-500/10" trend="All filings current" trendUp />
        <StatCard label="Backup System Status" value="OK" icon={HardDrive} color="text-blue-400" bg="bg-blue-500/10" trend="Last backup 4h ago" trendUp />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Departments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border bg-card p-5 hover:border-input hover:shadow-lg hover:shadow-black/10 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.bg}`}>
                  <link.icon className={`h-5 w-5 ${link.color}`} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{link.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Operations Activity</h2>
        <ActivityFeed
          items={SEED_ACTIVITY}
          typeIcons={{ update: Activity, create: Wrench, alert: AlertTriangle, note: FileText }}
          maxItems={8}
        />
      </div>
    </div>
  );
}
