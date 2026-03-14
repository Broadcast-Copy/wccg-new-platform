"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import Link from "next/link";
import {
  Shield,
  Radio,
  Users,
  CalendarDays,
  BarChart3,
  Megaphone,
  Music,
  Settings,
  ExternalLink,
  Lock,
  ScrollText,
  Briefcase,
  FileAudio,
  Palette,
  Trophy,
  MessageSquare,
  Crown,
  Activity,
  Clock,
  X,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminModule {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color: string;
}

interface QuickStat {
  label: string;
  value: string;
  color: string;
  details: { label: string; value: string }[];
}

interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  target: string;
  time: string;
  type: "create" | "update" | "delete" | "broadcast";
}

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

const defaultModules: AdminModule[] = [
  { icon: Radio, title: "Stream Management", description: "Manage live streams, channels, and on-air scheduling.", href: "/my/admin", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: Users, title: "User Management", description: "View and manage listeners, hosts, and admin accounts.", href: "/my/admin", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: CalendarDays, title: "Events & Tickets", description: "Create events, manage ticket sales, and check-ins.", href: "/events/create", color: "from-[#ec4899] to-[#be185d]" },
  { icon: Megaphone, title: "Advertising", description: "Manage ad campaigns, clients, creatives, and billing.", href: "/advertise/portal", color: "from-[#dc2626] to-[#b91c1c]" },
  { icon: Music, title: "Shows & Programming", description: "Manage show listings, host assignments, and schedules.", href: "/shows", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: BarChart3, title: "Analytics", description: "Listener metrics, stream stats, and engagement data.", href: "/my/admin/streaming-analytics", color: "from-[#f59e0b] to-[#d97706]" },
  { icon: Settings, title: "Platform Settings", description: "Site configuration, branding, and system preferences.", href: "/my/admin", color: "from-[#8b5cf6] to-[#6d28d9]" },
  { icon: ScrollText, title: "Platform Changelog", description: "Version history and updates across all platform tools.", href: "/my/admin/changelog", color: "from-[#74ddc7] to-[#0d9488]" },
];

const salesModules: AdminModule[] = [
  { icon: Megaphone, title: "Campaign Builder", description: "Create and manage advertising campaigns.", href: "/my/admin/campaigns", color: "from-[#dc2626] to-[#b91c1c]" },
  { icon: Briefcase, title: "Client Manager", description: "Manage advertiser accounts and contacts.", href: "/advertise/portal/clients", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: BarChart3, title: "Sales Reports", description: "Revenue tracking, pipeline, and sales analytics.", href: "/my/admin/reports", color: "from-[#f59e0b] to-[#d97706]" },
  { icon: FileAudio, title: "Rate Cards", description: "Manage advertising rates and packages.", href: "/advertise/portal", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: Settings, title: "Advertising Portal", description: "Full advertiser management portal.", href: "/advertise/portal", color: "from-[#8b5cf6] to-[#6d28d9]" },
];

const productionModules: AdminModule[] = [
  { icon: FileAudio, title: "Production Queue", description: "Active jobs, deadlines, and production workflow.", href: "/my/admin/production", color: "from-[#f59e0b] to-[#d97706]" },
  { icon: CalendarDays, title: "Studio Booking", description: "Reserve studio time and manage sessions.", href: "/studio/booking", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: Radio, title: "Content Library", description: "Browse and manage audio assets and recordings.", href: "/studio", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: Music, title: "Audio Editor", description: "Edit, mix, and master audio content.", href: "/studio/audio-editor", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: Megaphone, title: "Shows & Programming", description: "Manage show listings, host assignments, and schedules.", href: "/shows", color: "from-[#ec4899] to-[#be185d]" },
];

const promotionsModules: AdminModule[] = [
  { icon: CalendarDays, title: "Events Manager", description: "Create and manage station events and appearances.", href: "/events/create", color: "from-[#ec4899] to-[#be185d]" },
  { icon: Trophy, title: "Contests Manager", description: "Run contests, giveaways, and listener promotions.", href: "/contests", color: "from-[#f59e0b] to-[#d97706]" },
  { icon: MessageSquare, title: "Community Hub", description: "Engage with listeners and manage community content.", href: "/community", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: Palette, title: "Social Content", description: "Create and schedule social media content.", href: "/studio/social-content", color: "from-[#7401df] to-[#4c1d95]" },
];

const departmentModules: AdminModule[] = [
  { icon: Settings, title: "Operations", description: "Master control, equipment, FCC compliance, engineering, and backups.", href: "/my/admin/operations", color: "from-[#f59e0b] to-[#d97706]" },
  { icon: Crown, title: "GM Dashboard", description: "Executive overview, revenue, ratings, staff, goals, and board reports.", href: "/my/admin/gm", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: Briefcase, title: "Sales Center", description: "Pipeline, rate cards, commissions, proposals, and accounts receivable.", href: "/my/sales", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: ScrollText, title: "Traffic & Office", description: "Traffic logs, copy management, billing, contracts, and deadlines.", href: "/my/admin/traffic", color: "from-[#ec4899] to-[#be185d]" },
];

const allModules: AdminModule[] = [
  ...defaultModules,
  { icon: Megaphone, title: "Campaign Builder", description: "Create and manage advertising campaigns.", href: "/my/admin/campaigns", color: "from-[#dc2626] to-[#b91c1c]" },
  { icon: BarChart3, title: "Reports", description: "Revenue tracking, pipeline, and sales analytics.", href: "/my/admin/reports", color: "from-[#f59e0b] to-[#d97706]" },
  { icon: Radio, title: "Programming", description: "Programming schedules, show management, and hosts.", href: "/my/admin/programming", color: "from-[#74ddc7] to-[#0d9488]" },
  ...departmentModules,
];

// ---------------------------------------------------------------------------
// Quick stats with detail drill-down
// ---------------------------------------------------------------------------

const quickStats: QuickStat[] = [
  {
    label: "Active Shows",
    value: "22",
    color: "text-[#74ddc7]",
    details: [
      { label: "Weekday Shows", value: "16" },
      { label: "Weekend Shows", value: "6" },
      { label: "Live Right Now", value: "1" },
      { label: "On Hiatus", value: "2" },
    ],
  },
  {
    label: "Total Hosts",
    value: "25",
    color: "text-[#7401df]",
    details: [
      { label: "Full-Time", value: "8" },
      { label: "Part-Time", value: "12" },
      { label: "Guest / Rotating", value: "5" },
      { label: "Active This Week", value: "18" },
    ],
  },
  {
    label: "Streams",
    value: "6",
    color: "text-[#3b82f6]",
    details: [
      { label: "Main FM Stream", value: "1" },
      { label: "HD2 Stream", value: "1" },
      { label: "Web-Only", value: "2" },
      { label: "App Exclusive", value: "2" },
    ],
  },
  {
    label: "Status",
    value: "On Air",
    color: "text-[#22c55e]",
    details: [
      { label: "Current Show", value: "Midday Groove" },
      { label: "Host", value: "DJ Smooth" },
      { label: "Listeners Now", value: "1,842" },
      { label: "Uptime", value: "99.97%" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Recent activity feed
// ---------------------------------------------------------------------------

const recentActivity: ActivityItem[] = [
  { id: "a1", action: "created", actor: "Marcus T.", target: "Production job PQ-1048", time: "5 min ago", type: "create" },
  { id: "a2", action: "updated", actor: "Keisha W.", target: "Promo for WCCG Internal", time: "12 min ago", type: "update" },
  { id: "a3", action: "started broadcast", actor: "DJ Smooth", target: "Midday Groove", time: "28 min ago", type: "broadcast" },
  { id: "a4", action: "deleted", actor: "Admin", target: "Expired campaign draft", time: "1 hour ago", type: "delete" },
  { id: "a5", action: "created", actor: "Sales Team", target: "Spring Auto Blitz campaign", time: "2 hours ago", type: "create" },
  { id: "a6", action: "updated", actor: "Devon R.", target: "Studio B booking", time: "3 hours ago", type: "update" },
  { id: "a7", action: "started broadcast", actor: "DJ Quick", target: "The Morning Mix", time: "6 hours ago", type: "broadcast" },
  { id: "a8", action: "created", actor: "Lady Soul", target: "New playlist for Evening Vibes", time: "8 hours ago", type: "create" },
];

// ---------------------------------------------------------------------------
// Module selector
// ---------------------------------------------------------------------------

function getModulesForRole(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPromotions: boolean;
}): AdminModule[] {
  if (flags.isManagement || flags.isAdmin || flags.isSuperAdmin) return allModules;
  if (flags.isSales) return salesModules;
  if (flags.isProduction) return productionModules;
  if (flags.isPromotions) return promotionsModules;
  return defaultModules;
}

// ---------------------------------------------------------------------------
// Activity type styles
// ---------------------------------------------------------------------------

const ACTIVITY_COLORS: Record<ActivityItem["type"], string> = {
  create: "bg-[#22c55e]/10 text-[#22c55e]",
  update: "bg-[#3b82f6]/10 text-[#3b82f6]",
  delete: "bg-[#dc2626]/10 text-[#dc2626]",
  broadcast: "bg-[#7401df]/10 text-[#7401df]",
};

const ACTIVITY_ICONS: Record<ActivityItem["type"], LucideIcon> = {
  create: CheckCircle2,
  update: Settings,
  delete: X,
  broadcast: Radio,
};


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StationControlPage() {
  const { user } = useAuth();
  const {
    isSales,
    isProduction,
    isManagement,
    isAdmin,
    isSuperAdmin,
    isPromotions,
  } = useUserRoles();

  const [selectedStat, setSelectedStat] = useState<QuickStat | null>(null);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Admin";

  const modules = getModulesForRole({
    isSales,
    isProduction,
    isManagement,
    isAdmin,
    isSuperAdmin,
    isPromotions,
  });

  return (
    <div className="space-y-8">
      {/* Stat Detail Modal */}
      {selectedStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedStat(null)}>
          <div
            className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedStat.label}</h3>
                <p className={`text-3xl font-bold ${selectedStat.color}`}>{selectedStat.value}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStat(null)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {selectedStat.details.map((detail) => (
                <div key={detail.label} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{detail.label}</span>
                  <span className="text-sm font-medium text-foreground">{detail.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedStat(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Banner */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-[#f59e0b]/30 bg-gradient-to-r from-[#f59e0b]/10 via-[#f59e0b]/5 to-transparent p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/20">
              <Crown className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#f59e0b]">Super Admin Mode</p>
              <p className="text-xs text-muted-foreground">
                Full access to all station controls and system configuration
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">
            Super Admin
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <Shield className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Station Control</h1>
            <p className="text-sm text-muted-foreground">
              Admin dashboard for WCCG 104.5 FM
            </p>
          </div>
        </div>
        {/* Right: user info + badge */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <span className="rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#dc2626]">
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </span>
        </div>
      </div>

      {/* Quick Stats (clickable) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => setSelectedStat(stat)}
            className="text-left rounded-xl border border-border bg-card p-4 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all cursor-pointer group"
            title="Click to view details"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium group-hover:text-foreground transition-colors">
              {stat.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Click for details
            </p>
          </button>
        ))}
      </div>

      {/* Admin Modules */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Link
              key={mod.title}
              href={mod.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color}`}
                >
                  <mod.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                </div>
              </div>
              <div
                className={`absolute -inset-1 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#74ddc7]" />
          Recent Activity
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {recentActivity.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type];
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACTIVITY_COLORS[item.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.actor}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="font-medium">{item.target}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {item.time}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* External Admin Link */}
      <div className="rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-[#dc2626]" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Full Admin Panel
            </p>
            <p className="text-xs text-muted-foreground">
              Access the complete admin interface at admin.wccg1045fm.com
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
          asChild
        >
          <a
            href="https://admin.wccg1045fm.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Admin
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      {/* Logged in info */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Logged in as {user?.email || "admin"} · Carson Communications / WCCG
          104.5 FM
        </p>
      </div>
    </div>
  );
}
