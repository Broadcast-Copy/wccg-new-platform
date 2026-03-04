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
  Radio,
  Users,
  BarChart3,
  Shield,
  Megaphone,
  Settings,
  FileText,
  Clock,
  ListMusic,
  Eye,
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
import { apiClient } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────

export default function UserDashboardPage() {
  const { user } = useAuth();
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Station management &amp; your WCCG activity
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ADMIN: Station Overview
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#dc2626]" />
          <h2 className="text-lg font-semibold">Station Control</h2>
          <Badge className="border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626] text-[10px]">
            Admin
          </Badge>
        </div>

        {/* Live status cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stream status */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stream Status
              </CardTitle>
              <Radio className="h-4 w-4 text-[#74ddc7]" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#74ddc7]" />
                </span>
                <span className="text-lg font-bold text-[#74ddc7]">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                WCCG 104.5 FM — On Air
              </p>
            </CardContent>
          </Card>

          {/* Active Listeners */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listeners
              </CardTitle>
              <Headphones className="h-4 w-4 text-[#7401df]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Current sessions</p>
            </CardContent>
          </Card>

          {/* Today&apos;s Page Views */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>

          {/* Registered Users */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-[#74ddc7]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin quick actions */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/my/admin/content">
            <Card className="group border-border transition-all hover:border-[#7401df]/30 hover:bg-[#7401df]/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10 group-hover:bg-[#7401df]/20 transition-colors">
                  <FileText className="h-5 w-5 text-[#7401df]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Content Manager</p>
                  <p className="text-xs text-muted-foreground">
                    Shows, schedule, playlists
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#7401df] transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/admin/users">
            <Card className="group border-border transition-all hover:border-[#74ddc7]/30 hover:bg-[#74ddc7]/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#74ddc7]/10 group-hover:bg-[#74ddc7]/20 transition-colors">
                  <Users className="h-5 w-5 text-[#74ddc7]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">User Management</p>
                  <p className="text-xs text-muted-foreground">
                    Roles, permissions, accounts
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#74ddc7] transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/admin/analytics">
            <Card className="group border-border transition-all hover:border-blue-400/30 hover:bg-blue-400/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-400/10 group-hover:bg-blue-400/20 transition-colors">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Analytics</p>
                  <p className="text-xs text-muted-foreground">
                    Listeners, engagement, trends
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/admin/broadcast">
            <Card className="group border-border transition-all hover:border-[#dc2626]/30 hover:bg-[#dc2626]/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dc2626]/10 group-hover:bg-[#dc2626]/20 transition-colors">
                  <Radio className="h-5 w-5 text-[#dc2626]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Broadcast Controls</p>
                  <p className="text-xs text-muted-foreground">
                    Stream, automation, fallback
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#dc2626] transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/admin/announcements">
            <Card className="group border-border transition-all hover:border-yellow-400/30 hover:bg-yellow-400/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400/10 group-hover:bg-yellow-400/20 transition-colors">
                  <Megaphone className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Announcements</p>
                  <p className="text-xs text-muted-foreground">
                    Push alerts, banners, news
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/my/admin/settings">
            <Card className="group border-border transition-all hover:border-foreground/20 hover:bg-foreground/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.06] group-hover:bg-foreground/10 transition-colors">
                  <Settings className="h-5 w-5 text-foreground/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Station Settings</p>
                  <p className="text-xs text-muted-foreground">
                    Branding, integrations, config
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground/60 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          USER: Personal Stats
          ═══════════════════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════════════════
          Recent Points Activity
          ═══════════════════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════════════════
          Quick Links
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <div className="space-y-4">
          {/* ── Row 1: Listening History ── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/my/history", label: "Listening History", desc: "Track what you heard", icon: Clock, color: "#74ddc7" },
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

          <div className="border-t border-border" />

          {/* ── Row 2: Podcasts, Events, Directory ── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/my/podcasts", label: "My Podcasts", desc: "Create & manage", icon: Mic, color: "#7401df" },
              { href: "/my/events", label: "My Events", desc: "Events & tickets", icon: CalendarDays, color: "#7401df" },
              { href: "/my/directory", label: "My Directory", desc: "Business listings", icon: Building2, color: "#74ddc7" },
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

          <div className="border-t border-border" />

          {/* ── Row 3: Mixes, Browse, Rewards, Schedule ── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/mixes", label: "My Mixes", desc: "Upload DJ mixes", icon: Music, color: "#74ddc7" },
              { href: "/events", label: "Browse Events", desc: "Upcoming events", icon: Ticket, color: "#7401df" },
              { href: "/rewards", label: "Rewards Catalog", desc: "Redeem points", icon: Star, color: "#dc2626" },
              { href: "/schedule", label: "Schedule", desc: "What\u2019s on today", icon: ListMusic, color: "#7401df" },
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
        </div>
      </section>
    </div>
  );
}
