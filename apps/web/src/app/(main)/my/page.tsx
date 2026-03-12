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
  Eye,
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
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
import {
  getHistoryEntries,
  getListeningStats,
  type HistoryEntry,
} from "@/lib/listening-history";
import {
  fetchSongHistory,
  formatTime,
  type SongHistoryEntry,
  type SongHistoryGroup,
} from "@/lib/song-history";

/**
 * Read points balance directly from localStorage, checking both
 * user-specific and default keys so we don't depend on the module-level
 * _currentEmail variable (which may not be set yet on first render).
 */
function readPointsFromStorage(email: string | null | undefined): {
  balance: number;
  history: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
} {
  if (typeof window === "undefined") return { balance: 0, history: [] };
  try {
    const keys = email
      ? [`wccg_listening_points_${email}`, "wccg_listening_points"]
      : ["wccg_listening_points"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const totalPoints = parsed.totalPoints ?? 0;
        const history = (parsed.history ?? []).slice(0, 5).map(
          (h: { points: number; reason: string; timestamp: string }, i: number) => ({
            id: `local_${i}`,
            amount: h.points,
            reason: h.reason,
            createdAt: h.timestamp,
          }),
        );
        if (totalPoints > 0 || history.length > 0) {
          return { balance: totalPoints, history };
        }
      }
    }
  } catch {
    // ignore
  }
  return { balance: 0, history: [] };
}

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

interface StatCard {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  color: string;
  live?: boolean;
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
}): {
  title: string;
  subtitle: string;
  badge: { label: string; color: string } | null;
  stats: StatCard[];
  quickActions: QuickAction[];
  isListener: boolean;
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
      isListener: false,
      stats: [
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
        { label: "Active Listeners", value: "--", sub: "Current sessions", icon: Headphones, color: "#7401df" },
        { label: "Page Views", value: "--", sub: "Today", icon: Eye, color: "#3b82f6" },
        { label: "Total Users", value: "--", sub: "Registered accounts", icon: Users, color: "#74ddc7" },
      ],
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
      isListener: false,
      stats: [
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
        { label: "Active Listeners", value: "--", sub: "Current sessions", icon: Headphones, color: "#7401df" },
        { label: "Active Campaigns", value: "--", sub: "Running ads", icon: Megaphone, color: "#f59e0b" },
        { label: "Total Users", value: "--", sub: "Registered accounts", icon: Users, color: "#74ddc7" },
      ],
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
      isListener: false,
      stats: [
        { label: "Active Campaigns", value: "--", sub: "Currently running", icon: Megaphone, color: "#7401df" },
        { label: "Monthly Revenue", value: "--", sub: "This month", icon: DollarSign, color: "#74ddc7" },
        { label: "Total Clients", value: "--", sub: "Active accounts", icon: Users, color: "#3b82f6" },
        { label: "Pending Invoices", value: "--", sub: "Awaiting payment", icon: ShoppingBag, color: "#f59e0b" },
      ],
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
      isListener: false,
      stats: [
        { label: "Production Queue", value: "--", sub: "Pending tasks", icon: Clapperboard, color: "#7401df" },
        { label: "Studio Bookings", value: "--", sub: "This week", icon: Calendar, color: "#74ddc7" },
        { label: "Media Assets", value: "--", sub: "Total files", icon: FolderOpen, color: "#3b82f6" },
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      ],
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
      isListener: false,
      stats: [
        { label: "Active Events", value: "--", sub: "Currently live", icon: CalendarDays, color: "#7401df" },
        { label: "Active Contests", value: "--", sub: "Running now", icon: Gift, color: "#f59e0b" },
        { label: "Registrations", value: "--", sub: "This month", icon: Users, color: "#74ddc7" },
        { label: "Engagement", value: "--", sub: "Social interactions", icon: Palette, color: "#3b82f6" },
      ],
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
      isListener: false,
      stats: [
        { label: "Total Content", value: "--", sub: "Published items", icon: Music, color: "#7401df" },
        { label: "Listeners", value: "--", sub: "Total plays", icon: Headphones, color: "#74ddc7" },
        { label: "Favorites", value: "--", sub: "Saved by users", icon: Heart, color: "#dc2626" },
        { label: "Stream Status", value: "LIVE", sub: "WCCG 104.5 FM — On Air", icon: Radio, color: "#74ddc7", live: true },
      ],
      quickActions: [
        { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio tools", icon: Clapperboard, color: "#7401df" },
        { href: "/my/mixes", label: "Media Manager", desc: "Upload & manage DJ mixes", icon: Music, color: "#74ddc7" },
        { href: "/studio", label: "Studio Tools", desc: "OBS, audio/video editors", icon: Mic, color: "#7401df" },
        { href: "/creators", label: "Creator Hub", desc: "Resources & support", icon: Palette, color: "#74ddc7" },
      ],
    };
  }

  // Default: Listener (base dashboard) — no role-specific tools
  return {
    title: "Dashboard",
    subtitle: "Welcome back — your WCCG activity at a glance",
    badge: null,
    isListener: true,
    stats: [],
    quickActions: [],
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
  } = roles;

  const [stats, setStats] = useState<DashboardStats>({
    pointsBalance: 0,
    favoritesCount: 0,
    ticketsCount: 0,
    recentPoints: [],
  });
  const [listeningHistory, setListeningHistory] = useState<HistoryEntry[]>([]);
  const [listeningStats, setListeningStats] = useState<{
    totalHours: number;
    remainingMinutes: number;
    totalTracks: number;
    topArtist: string;
  } | null>(null);
  const [songGroups, setSongGroups] = useState<SongHistoryGroup[]>([]);
  const [songHistoryLoading, setSongHistoryLoading] = useState(true);
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

        // Get API values
        let pointsBalance =
          balanceRes.status === "fulfilled" ? balanceRes.value.balance : 0;
        let recentPoints =
          historyRes.status === "fulfilled"
            ? Array.isArray(historyRes.value?.data)
              ? historyRes.value.data.slice(0, 5)
              : []
            : [];

        // Fall back to localStorage if API returned 0 / empty
        if (pointsBalance === 0 || recentPoints.length === 0) {
          const local = readPointsFromStorage(user?.email);
          if (local.balance > pointsBalance) pointsBalance = local.balance;
          if (recentPoints.length === 0 && local.history.length > 0)
            recentPoints = local.history;
        }

        setStats({
          pointsBalance,
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
          recentPoints,
        });
      } catch {
        // Silently fail
      } finally {
        // Load listening history from localStorage
        try {
          const entries = getHistoryEntries();
          setListeningHistory(entries.slice(0, 8)); // Show up to 8 recent entries
          const lStats = getListeningStats();
          setListeningStats(lStats);
        } catch {
          // ignore
        }
        setLoading(false);
      }
    }

    fetchStats();

    // Fetch station song history from Supabase
    async function fetchSongData() {
      try {
        const { groups } = await fetchSongHistory("WCCG", 50);
        setSongGroups(groups);
      } catch {
        // ignore — table may not exist yet
      } finally {
        setSongHistoryLoading(false);
      }
    }
    fetchSongData();
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

      {/* ═══ Role-specific stat cards (non-listener roles) ═══ */}
      {!config.isListener && config.stats.length > 0 && (
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
      )}

      {/* ═══ Role-specific Quick Actions (non-listener roles) ═══ */}
      {!config.isListener && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {config.badge ? `${config.badge.label} Tools` : "Quick Actions"}
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
      )}

      {/* ═══ Listener Base: My Activity stat cards ═══ */}
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

      {/* ═══ Song History — Station Playlist ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Song History</h2>
            <p className="text-sm text-muted-foreground">What played on WCCG 104.5 FM</p>
          </div>
          <Link
            href="/my/history"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {songHistoryLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-2.5 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : songGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <Music className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Song history will appear here once the station playlist is being tracked.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {songGroups.map((group) => (
              <div key={group.label} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.songs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                    >
                      {/* Album art or fallback icon */}
                      {song.album_art ? (
                        <img
                          src={song.album_art}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#7401df]/10">
                          <Music className="h-5 w-5 text-[#7401df]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(song.played_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ Listening History (personal) ═══ */}
      {listeningHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">My Listening Sessions</CardTitle>
                <CardDescription>
                  {listeningStats && (listeningStats.totalHours > 0 || listeningStats.remainingMinutes > 0)
                    ? `${listeningStats.totalHours > 0 ? `${listeningStats.totalHours}h ` : ""}${listeningStats.remainingMinutes}m total · ${listeningStats.totalTracks} tracks heard`
                    : "Your recent listening sessions"}
                </CardDescription>
              </div>
              <Link
                href="/my/overview"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {listeningHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        entry.isActive
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-[#7401df]/10 text-[#7401df]"
                      }`}
                    >
                      {entry.isActive ? (
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                        </span>
                      ) : (
                        <Music className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.title}
                        {entry.isActive && (
                          <span className="ml-2 text-[10px] font-semibold text-green-600 dark:text-green-400">
                            LIVE
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.artist} · {entry.streamName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {entry.listenedDuration}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {entry.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              {listeningStats && listeningStats.topArtist !== "—" && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  <span>
                    Top artist: <span className="font-medium text-foreground">{listeningStats.topArtist}</span>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Listener Quick Links (only for listener role) ═══ */}
      {config.isListener && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Links</h2>
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
      )}
    </div>
  );
}
