"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Star,
  Ticket,
  Heart,
  TrendingUp,
  ChevronRight,
  CalendarDays,
  Building2,
  Mic,
  Music,
  Clock,
  Clapperboard,
  Palette,
  Megaphone,
  Headphones,
  DollarSign,
  ShoppingBag,
  Receipt,
  Radio,
  Gift,
  FolderOpen,
  Calendar,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { apiClient } from "@/lib/api-client";

// --- Types ---

interface DashboardStats {
  pointsBalance: number;
  favoritesCount: number;
  ticketsCount: number;
  recentPoints: Array<{
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

interface QuickAction {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

// --- Helpers ---

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function reasonLabel(reason: string) {
  switch (reason) {
    case "LISTENING":
      return "Listening";
    case "EVENT_CHECKIN":
      return "Event Check-in";
    case "PURCHASE":
      return "Purchase";
    case "REDEMPTION":
      return "Redemption";
    case "ADMIN_GRANT":
      return "Admin Grant";
    default:
      return reason;
  }
}

// ---------------------------------------------------------------------------
// Role-specific dashboard configuration
// ---------------------------------------------------------------------------
function getRoleDashboardConfig(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isCreator: boolean;
  isHost: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  department: string | null;
}): {
  title: string;
  subtitle: string;
  badge: { label: string; color: string } | null;
  quickActions: QuickAction[];
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
      title: "Admin Dashboard",
      subtitle: "Station management & controls",
      badge: { label: "Admin", color: "#dc2626" },
      quickActions: [
        { href: "/my/admin", label: "Station Control", desc: "Manage station settings", icon: Radio, color: "#dc2626" },
        { href: "/my/admin/campaigns", label: "Campaigns", desc: "Ad campaigns & scheduling", icon: Megaphone, color: "#7401df" },
        { href: "/my/admin/reports", label: "Reports", desc: "Station analytics & data", icon: TrendingUp, color: "#74ddc7" },
        { href: "/my/admin/programming", label: "Programming", desc: "Schedule & show management", icon: Music, color: "#7401df" },
        { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio", icon: Clapperboard, color: "#74ddc7" },
        { href: "/my/mixes", label: "Media Manager", desc: "Browse media assets", icon: FolderOpen, color: "#7401df" },
      ],
    };
  }

  if (isManagement) {
    return {
      title: "Management Dashboard",
      subtitle: "Station oversight & analytics",
      badge: { label: "Management", color: "#74ddc7" },
      quickActions: [
        { href: "/my/admin/campaigns", label: "Campaigns", desc: "Ad campaigns & scheduling", icon: Megaphone, color: "#7401df" },
        { href: "/my/admin/reports", label: "Reports", desc: "Station analytics & reports", icon: TrendingUp, color: "#74ddc7" },
        { href: "/my/admin/programming", label: "Programming", desc: "Schedule & show management", icon: Music, color: "#7401df" },
        { href: "/my/events", label: "Events Manager", desc: "Create & manage events", icon: CalendarDays, color: "#74ddc7" },
      ],
    };
  }

  if (isSales) {
    return {
      title: "Sales Dashboard",
      subtitle: "Campaigns, clients & revenue",
      badge: { label: "Sales", color: "#74ddc7" },
      quickActions: [
        { href: "/my/sales", label: "Sales Overview", desc: "Revenue & performance", icon: DollarSign, color: "#74ddc7" },
        { href: "/my/sales/campaign-builder", label: "Campaign Builder", desc: "Create ad campaigns", icon: Megaphone, color: "#7401df" },
        { href: "/my/sales/spot-shop", label: "Spot Shop", desc: "Purchase ad spots", icon: ShoppingBag, color: "#74ddc7" },
        { href: "/my/sales/invoices", label: "Invoices", desc: "Billing & payments", icon: Receipt, color: "#7401df" },
        { href: "/my/admin/campaigns", label: "My Campaigns", desc: "Manage active campaigns", icon: Briefcase, color: "#74ddc7" },
      ],
    };
  }

  if (isProduction) {
    return {
      title: "Production Dashboard",
      subtitle: "Studio & content production",
      badge: { label: "Production", color: "#7401df" },
      quickActions: [
        { href: "/my/admin/production", label: "Production Queue", desc: "Manage production tasks", icon: Clapperboard, color: "#7401df" },
        { href: "/studio/booking", label: "Studio Booking", desc: "Reserve studio time", icon: Calendar, color: "#74ddc7" },
        { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio", icon: Mic, color: "#7401df" },
        { href: "/my/mixes", label: "Media Manager", desc: "Browse media assets", icon: FolderOpen, color: "#74ddc7" },
      ],
    };
  }

  if (isPromotions) {
    return {
      title: "Promotions Dashboard",
      subtitle: "Events, contests & engagement",
      badge: { label: "Promotions", color: "#f59e0b" },
      quickActions: [
        { href: "/events/create", label: "Events Manager", desc: "Create & manage events", icon: CalendarDays, color: "#7401df" },
        { href: "/contests", label: "Contests", desc: "Run listener contests", icon: Gift, color: "#f59e0b" },
        { href: "/community", label: "Community", desc: "Engage with listeners", icon: Palette, color: "#74ddc7" },
        { href: "/my/events", label: "My Events", desc: "Events & tickets", icon: CalendarDays, color: "#7401df" },
      ],
    };
  }

  if (isCreator || isHost) {
    return {
      title: isHost ? "Host Dashboard" : "Creator Dashboard",
      subtitle: isHost ? "Shows, studio & content tools" : "Create, upload & manage content",
      badge: { label: isHost ? "Host" : "Creator", color: "#7401df" },
      quickActions: [
        { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio tools", icon: Clapperboard, color: "#7401df" },
        { href: "/my/mixes", label: "Media Manager", desc: "Upload & manage DJ mixes", icon: Music, color: "#74ddc7" },
        { href: "/studio", label: "Studio Tools", desc: "OBS, audio/video editors", icon: Mic, color: "#7401df" },
        { href: "/creators", label: "Creator Hub", desc: "Resources & support", icon: Palette, color: "#74ddc7" },
      ],
    };
  }

  // Default: Listener
  return {
    title: "Dashboard",
    subtitle: "Welcome back — your WCCG activity at a glance",
    badge: null,
    quickActions: [
      { href: "/my/history", label: "Listening History", desc: "Track what you heard", icon: Clock, color: "#74ddc7" },
      { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio", icon: Clapperboard, color: "#7401df" },
      { href: "/my/events", label: "My Events", desc: "Events & tickets", icon: CalendarDays, color: "#7401df" },
      { href: "/my/directory", label: "My Listings", desc: "Business listings", icon: Building2, color: "#74ddc7" },
    ],
  };
}

// --- Component ---

export default function UserDashboardPage() {
  const { user } = useAuth();
  const roles = useUserRoles();
  const {
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
    department,
  } = roles;

  const [stats, setStats] = useState<DashboardStats>({
    pointsBalance: 0,
    favoritesCount: 0,
    ticketsCount: 0,
    recentPoints: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        const [balanceRes, favoritesRes, ticketsRes, historyRes] =
          await Promise.allSettled([
            apiClient<{ balance: number }>("/points/balance"),
            apiClient<Array<{ id: string }>>("/favorites"),
            apiClient<Array<{ id: string }>>("/registrations/me"),
            apiClient<{
              data: Array<{
                id: string;
                amount: number;
                reason: string;
                createdAt: string;
              }>;
            }>("/points/history"),
          ]);

        setStats({
          pointsBalance:
            balanceRes.status === "fulfilled" ? balanceRes.value.balance : 0,
          favoritesCount:
            favoritesRes.status === "fulfilled"
              ? Array.isArray(favoritesRes.value)
                ? favoritesRes.value.length
                : 0
              : 0,
          ticketsCount:
            ticketsRes.status === "fulfilled"
              ? Array.isArray(ticketsRes.value)
                ? ticketsRes.value.length
                : 0
              : 0,
          recentPoints:
            historyRes.status === "fulfilled"
              ? Array.isArray(historyRes.value?.data)
                ? historyRes.value.data.slice(0, 5)
                : []
              : [],
        });
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
          <p className="text-muted-foreground">
            Please{" "}
            <Link href="/login" className="underline hover:text-foreground">
              sign in
            </Link>{" "}
            to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  const config = getRoleDashboardConfig({
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
    department,
  });

  return (
    <div className="space-y-8">
      {/* ═══ Header ═══ */}
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

      {/* ═══ My Activity stat cards ═══ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My Activity</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/my/points">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Balance</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "--" : stats.pointsBalance.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">WCCG Points</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/tickets">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Event Tickets</CardTitle>
                <Ticket className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "--" : stats.ticketsCount}
                </div>
                <p className="text-xs text-muted-foreground">Active registrations</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/favorites">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "--" : stats.favoritesCount}
                </div>
                <p className="text-xs text-muted-foreground">Saved shows &amp; streams</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* ═══ Recent Points Activity ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Points Activity</CardTitle>
              <CardDescription>Your latest points transactions</CardDescription>
            </div>
            <Link
              href="/my/points"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : stats.recentPoints.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No points activity yet. Listen to streams and attend events to start earning!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentPoints.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        tx.amount > 0
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{reasonLabel(tx.reason)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      tx.amount > 0
                        ? "border-green-500/30 text-green-600 dark:text-green-400"
                        : "border-red-500/30 text-red-600 dark:text-red-400"
                    }
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Role-specific Quick Actions ═══ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {config.badge ? `${config.badge.label} Tools` : "Quick Links"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {config.quickActions.map((item) => (
            <Link key={item.href + item.label} href={item.href}>
              <Card className="group border-border transition-all hover:border-input hover:bg-foreground/[0.02]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
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
