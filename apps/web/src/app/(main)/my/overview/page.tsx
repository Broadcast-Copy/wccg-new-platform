"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Users,
  Eye,
  Headphones,
  FileText,
  BarChart3,
  Megaphone,
  Settings,
  Shield,
  ChevronRight,
  DollarSign,
  ShoppingBag,
  Clapperboard,
  Calendar,
  CalendarDays,
  Gift,
  Palette,
  Music,
  Mic,
  FolderOpen,
  Clock,
  Heart,
  Star,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useAuth } from "@/hooks/use-auth";
import { getListeningStats, getHistoryEntries } from "@/lib/listening-history";
import { readPointsBalance } from "@/lib/points-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StatCard {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  live?: boolean;
}

interface ActionCard {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

// ---------------------------------------------------------------------------
// Role-specific overview configurations
// ---------------------------------------------------------------------------
function getOverviewConfig(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isCreator: boolean;
  isHost: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}): {
  title: string;
  subtitle: string;
  badge: { label: string; color: string } | null;
  stats: StatCard[];
  actions: ActionCard[];
} {
  const {
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
  } = flags;

  if (isSuperAdmin || isAdmin) {
    return {
      title: "Station Overview",
      subtitle: "Station status & quick access controls",
      badge: { label: "Admin", color: "#dc2626" },
      stats: [
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
        { label: "Active Listeners", value: "--", sub: "Current sessions", icon: Headphones, color: "#7401df" },
        { label: "Page Views", value: "--", sub: "Today", icon: Eye, color: "#3b82f6" },
        { label: "Total Users", value: "--", sub: "Registered accounts", icon: Users, color: "#74ddc7" },
      ],
      actions: [
        { href: "/my/admin", label: "Content Manager", desc: "Shows, schedule, playlists", icon: FileText, color: "#7401df" },
        { href: "/my/admin", label: "User Management", desc: "Roles, permissions, accounts", icon: Users, color: "#74ddc7" },
        { href: "/my/admin", label: "Analytics", desc: "Listeners, engagement, trends", icon: BarChart3, color: "#3b82f6" },
        { href: "/my/admin", label: "Broadcast Controls", desc: "Stream, automation, fallback", icon: Radio, color: "#dc2626" },
        { href: "/my/admin", label: "Announcements", desc: "Push alerts, banners, news", icon: Megaphone, color: "#f59e0b" },
        { href: "/my/admin", label: "Station Settings", desc: "Branding, integrations, config", icon: Settings, color: "#71717a" },
      ],
    };
  }

  if (isManagement) {
    return {
      title: "Management Overview",
      subtitle: "Station performance & analytics",
      badge: { label: "Management", color: "#74ddc7" },
      stats: [
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
        { label: "Active Listeners", value: "--", sub: "Current sessions", icon: Headphones, color: "#7401df" },
        { label: "Active Campaigns", value: "--", sub: "Running ads", icon: Megaphone, color: "#f59e0b" },
        { label: "Total Users", value: "--", sub: "Registered accounts", icon: Users, color: "#74ddc7" },
      ],
      actions: [
        { href: "/my/admin/campaigns", label: "Campaigns", desc: "Ad campaigns & scheduling", icon: Megaphone, color: "#7401df" },
        { href: "/my/admin/reports", label: "Reports", desc: "Revenue & performance data", icon: BarChart3, color: "#74ddc7" },
        { href: "/my/admin/programming", label: "Programming", desc: "Schedule & show management", icon: Music, color: "#7401df" },
        { href: "/my/events", label: "Events", desc: "Upcoming events & tickets", icon: CalendarDays, color: "#74ddc7" },
      ],
    };
  }

  if (isSales) {
    return {
      title: "Sales Overview",
      subtitle: "Campaign performance & revenue",
      badge: { label: "Sales", color: "#74ddc7" },
      stats: [
        { label: "Active Campaigns", value: "--", sub: "Currently running", icon: Megaphone, color: "#7401df" },
        { label: "Monthly Revenue", value: "--", sub: "This month", icon: DollarSign, color: "#74ddc7" },
        { label: "Total Clients", value: "--", sub: "Active accounts", icon: Users, color: "#3b82f6" },
        { label: "Pending Invoices", value: "--", sub: "Awaiting payment", icon: ShoppingBag, color: "#f59e0b" },
      ],
      actions: [
        { href: "/my/sales/campaign-builder", label: "New Campaign", desc: "Create an ad campaign", icon: Megaphone, color: "#7401df" },
        { href: "/my/sales/invoices", label: "View Invoices", desc: "Billing & payments", icon: DollarSign, color: "#74ddc7" },
        { href: "/my/sales/spot-shop", label: "Spot Shop", desc: "Purchase ad spots", icon: ShoppingBag, color: "#7401df" },
        { href: "/my/admin/campaigns", label: "My Campaigns", desc: "Manage active campaigns", icon: FileText, color: "#74ddc7" },
      ],
    };
  }

  if (isProduction) {
    return {
      title: "Production Overview",
      subtitle: "Studio & content production status",
      badge: { label: "Production", color: "#7401df" },
      stats: [
        { label: "Production Queue", value: "--", sub: "Pending tasks", icon: Clapperboard, color: "#7401df" },
        { label: "Studio Bookings", value: "--", sub: "This week", icon: Calendar, color: "#74ddc7" },
        { label: "Media Assets", value: "--", sub: "Total files", icon: FolderOpen, color: "#3b82f6" },
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      ],
      actions: [
        { href: "/my/admin/production", label: "Production Queue", desc: "Manage production tasks", icon: Clapperboard, color: "#7401df" },
        { href: "/studio/booking", label: "Studio Booking", desc: "Reserve studio time", icon: Calendar, color: "#74ddc7" },
        { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio", icon: Mic, color: "#7401df" },
        { href: "/my/mixes", label: "Media Manager", desc: "Browse media assets", icon: FolderOpen, color: "#74ddc7" },
      ],
    };
  }

  if (isPromotions) {
    return {
      title: "Promotions Overview",
      subtitle: "Events, contests & community engagement",
      badge: { label: "Promotions", color: "#f59e0b" },
      stats: [
        { label: "Active Events", value: "--", sub: "Currently live", icon: CalendarDays, color: "#7401df" },
        { label: "Active Contests", value: "--", sub: "Running now", icon: Gift, color: "#f59e0b" },
        { label: "Registrations", value: "--", sub: "This month", icon: Users, color: "#74ddc7" },
        { label: "Engagement", value: "--", sub: "Social interactions", icon: Palette, color: "#3b82f6" },
      ],
      actions: [
        { href: "/events/create", label: "Create Event", desc: "New event or promotion", icon: CalendarDays, color: "#7401df" },
        { href: "/contests", label: "Contests", desc: "Run listener contests", icon: Gift, color: "#f59e0b" },
        { href: "/community", label: "Community", desc: "Engage with listeners", icon: Palette, color: "#74ddc7" },
        { href: "/my/events", label: "My Events", desc: "Manage your events", icon: CalendarDays, color: "#7401df" },
      ],
    };
  }

  if (isCreator || isHost) {
    return {
      title: isHost ? "Host Overview" : "Creator Overview",
      subtitle: isHost ? "Shows, audience & content performance" : "Content performance & tools",
      badge: { label: isHost ? "Host" : "Creator", color: "#7401df" },
      stats: [
        { label: "Total Content", value: "--", sub: "Published items", icon: Music, color: "#7401df" },
        { label: "Listeners", value: "--", sub: "Total plays", icon: Headphones, color: "#74ddc7" },
        { label: "Favorites", value: "--", sub: "Saved by users", icon: Heart, color: "#dc2626" },
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      ],
      actions: [
        { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio tools", icon: Clapperboard, color: "#7401df" },
        { href: "/my/mixes", label: "Media Manager", desc: "Upload & manage content", icon: FolderOpen, color: "#74ddc7" },
        { href: "/studio", label: "Studio Tools", desc: "OBS, audio/video editors", icon: Mic, color: "#7401df" },
        { href: "/creators", label: "Creator Hub", desc: "Resources & support", icon: Palette, color: "#74ddc7" },
      ],
    };
  }

  // Default: Listener — dynamic activity stats
  return {
    title: "Overview",
    subtitle: "Your WCCG activity & platform highlights",
    badge: null,
    stats: [
      { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      { label: "Points Balance", value: "--", sub: "WCCG Points", icon: Star, color: "#f59e0b" },
      { label: "Listen Time", value: "--", sub: "Total listening", icon: Clock, color: "#7401df" },
      { label: "Songs Heard", value: "--", sub: "Unique tracks", icon: Music, color: "#dc2626" },
    ],
    actions: [
      { href: "/rewards", label: "Points & Rewards", desc: "Redeem your listening rewards", icon: Gift, color: "#f59e0b" },
      { href: "/my/history", label: "Listening History", desc: "See what you've listened to", icon: Clock, color: "#7401df" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OverviewPage() {
  const {
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
  } = useUserRoles();
  const { user } = useAuth();

  const [listenerStats, setListenerStats] = useState<{
    points: number;
    totalHours: number;
    remainingMinutes: number;
    totalTracks: number;
    topArtist: string;
    recentEntries: { id: string; streamName: string; title: string; timestamp: string }[];
  } | null>(null);

  const isListener = !isSales && !isProduction && !isManagement && !isPromotions && !isCreator && !isHost && !isAdmin && !isSuperAdmin;

  useEffect(() => {
    if (!isListener) return;
    const email = user?.email ?? null;
    function refresh() {
      const points = readPointsBalance(email);
      const stats = getListeningStats();
      const entries = getHistoryEntries().slice(0, 5);
      setListenerStats({
        points,
        totalHours: stats.totalHours,
        remainingMinutes: stats.remainingMinutes,
        totalTracks: stats.totalTracks,
        topArtist: stats.topArtist,
        recentEntries: entries.map((e) => ({ id: e.id, streamName: e.streamName, title: e.title, timestamp: e.timestamp })),
      });
    }
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [isListener, user?.email]);

  const config = getOverviewConfig({
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
  });

  // Patch listener stats into config
  if (isListener && listenerStats) {
    config.stats = [
      { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      { label: "Points Balance", value: listenerStats.points.toLocaleString(), sub: "WCCG Points", icon: Star, color: "#f59e0b" },
      { label: "Listen Time", value: listenerStats.totalHours > 0 ? `${listenerStats.totalHours}h ${listenerStats.remainingMinutes}m` : `${listenerStats.remainingMinutes}m`, sub: "Total listening", icon: Clock, color: "#7401df" },
      { label: "Songs Heard", value: listenerStats.totalTracks.toLocaleString(), sub: listenerStats.topArtist !== "—" ? `Top: ${listenerStats.topArtist}` : "Unique tracks", icon: Music, color: "#dc2626" },
    ];
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          {config.badge && (
            <Badge
              className="text-[10px]"
              style={{
                borderColor: `${config.badge.color}40`,
                backgroundColor: `${config.badge.color}15`,
                color: config.badge.color,
              }}
            >
              {config.badge.label}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">{config.subtitle}</p>
      </div>

      {/* Stat cards */}
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {config.stats.map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </CardHeader>
              <CardContent>
                {stat.live ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span
                        className="relative inline-flex h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stat.color }}
                      />
                    </span>
                    <span className="text-lg font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Activity — listener only */}
      {isListener && listenerStats && listenerStats.recentEntries.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="space-y-2">
            {listenerStats.recentEntries.map((entry) => (
              <Card key={entry.id} className="border-border">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#74ddc7]/10">
                    <Radio className="h-4 w-4 text-[#74ddc7]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.streamName} · {entry.timestamp}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions (hidden when empty, e.g. listener) */}
      {config.actions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.actions.map((item) => (
              <Link key={item.href + item.label} href={item.href}>
                <Card className="group border-border transition-all hover:border-input hover:bg-foreground/[0.02]">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground/60 transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
