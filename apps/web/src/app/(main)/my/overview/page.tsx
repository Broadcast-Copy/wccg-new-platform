"use client";

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
  Ticket,
  Building2,
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

  // Default: Listener
  return {
    title: "Overview",
    subtitle: "Your WCCG activity & platform highlights",
    badge: null,
    stats: [
      { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      { label: "Points Balance", value: "--", sub: "WCCG Points", icon: Star, color: "#f59e0b" },
      { label: "Favorites", value: "--", sub: "Saved shows & streams", icon: Heart, color: "#dc2626" },
      { label: "Tickets", value: "--", sub: "Active registrations", icon: Ticket, color: "#3b82f6" },
    ],
    actions: [
      { href: "/my/history", label: "Listening History", desc: "Track what you heard", icon: Clock, color: "#74ddc7" },
      { href: "/my/events", label: "My Events", desc: "Events & tickets", icon: CalendarDays, color: "#7401df" },
      { href: "/my/directory", label: "My Listings", desc: "Business listings", icon: Building2, color: "#74ddc7" },
      { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio", icon: Clapperboard, color: "#7401df" },
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

      {/* Quick actions */}
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
    </div>
  );
}
