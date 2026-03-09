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

function getEmployeeCards(
  department: string | null,
  isSales: boolean,
  isProduction: boolean,
  isManagement: boolean,
  isPromotions: boolean,
) {
  if (isSales) {
    return [
      { href: "/my/admin/campaigns", label: "Campaign Builder", desc: "Create & manage ad campaigns", icon: Megaphone, color: "#7401df" },
      { href: "/advertise/portal/clients", label: "Client Manager", desc: "Manage advertiser accounts", icon: Headphones, color: "#74ddc7" },
      { href: "/my/admin/reports", label: "Sales Reports", desc: "Revenue & performance data", icon: TrendingUp, color: "#7401df" },
    ];
  }
  if (isProduction) {
    return [
      { href: "/my/admin/production", label: "Production Queue", desc: "Manage production tasks", icon: Clapperboard, color: "#7401df" },
      { href: "/studio/booking", label: "Studio Booking", desc: "Reserve studio time", icon: CalendarDays, color: "#74ddc7" },
      { href: "/studio", label: "Content Library", desc: "Browse media assets", icon: Music, color: "#7401df" },
    ];
  }
  if (isManagement) {
    return [
      { href: "/my/admin/campaigns", label: "Campaign Builder", desc: "Ad campaigns & scheduling", icon: Megaphone, color: "#7401df" },
      { href: "/my/admin/reports", label: "Reports", desc: "Station analytics & reports", icon: TrendingUp, color: "#74ddc7" },
      { href: "/my/admin/programming", label: "Programming", desc: "Schedule & show management", icon: Music, color: "#7401df" },
    ];
  }
  if (isPromotions) {
    return [
      { href: "/events/create", label: "Events Manager", desc: "Create & manage events", icon: CalendarDays, color: "#7401df" },
      { href: "/contests", label: "Contests", desc: "Run listener contests", icon: Star, color: "#74ddc7" },
      { href: "/community", label: "Community", desc: "Engage with listeners", icon: Palette, color: "#7401df" },
    ];
  }
  return [];
}

// --- Component ---

export default function UserDashboardPage() {
  const { user } = useAuth();
  const {
    isCreator,
    isEmployee,
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    department,
  } = useUserRoles();
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
        // Silently fail — stats will show defaults
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

  const employeeCards = getEmployeeCards(
    department,
    isSales,
    isProduction,
    isManagement,
    isPromotions,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back &mdash; your WCCG activity at a glance
        </p>
      </div>

      {/* ═══ My Activity stat cards ═══ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My Activity</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/my/points">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Points Balance
                </CardTitle>
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
                <CardTitle className="text-sm font-medium">
                  Event Tickets
                </CardTitle>
                <Ticket className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "--" : stats.ticketsCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active registrations
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/favorites">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Favorites
                </CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "--" : stats.favoritesCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Saved shows &amp; streams
                </p>
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
              <CardDescription>
                Your latest points transactions
              </CardDescription>
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
                No points activity yet. Listen to streams and attend events to
                start earning!
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
                      <p className="text-sm font-medium">
                        {reasonLabel(tx.reason)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </p>
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

      {/* ═══ Creator Dashboard ═══ */}
      {isCreator && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#7401df]" />
            <h2 className="text-lg font-semibold">Creator Dashboard</h2>
            <Badge className="border-[#7401df]/30 bg-[#7401df]/10 text-[#7401df] text-[10px]">
              Creator
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/my/studio", label: "My Studio", desc: "Podcasts, video & audio tools", icon: Clapperboard, color: "#7401df" },
              { href: "/mixes", label: "My Mixshows", desc: "Upload & manage DJ mixes", icon: Music, color: "#74ddc7" },
              { href: "/studio", label: "Studio Tools", desc: "OBS, audio/video editors", icon: Clapperboard, color: "#7401df" },
              { href: "/creators", label: "Creator Hub", desc: "Resources & support", icon: Palette, color: "#74ddc7" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
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
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.desc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground/60 transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Back Office ═══ */}
      {isEmployee && employeeCards.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#74ddc7]" />
            <h2 className="text-lg font-semibold">Back Office</h2>
            {department && (
              <Badge className="border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7] text-[10px] capitalize">
                {department}
              </Badge>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employeeCards.map((item) => (
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
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.desc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground/60 transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Quick Links ═══ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/my/history", label: "Listening History", desc: "Track what you heard", icon: Clock, color: "#74ddc7" },
            { href: "/my/studio", label: "Broadcast Studio", desc: "Podcasts, video & audio", icon: Clapperboard, color: "#7401df" },
            { href: "/my/events", label: "My Events", desc: "Events & tickets", icon: CalendarDays, color: "#7401df" },
            { href: "/my/directory", label: "My Listings", desc: "Business listings", icon: Building2, color: "#74ddc7" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="group border-border transition-all hover:border-input hover:bg-foreground/[0.02]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
