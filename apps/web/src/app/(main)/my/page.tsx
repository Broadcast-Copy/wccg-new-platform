"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star, Ticket, Heart, TrendingUp, ChevronRight } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground">
          Your WCCG activity at a glance
        </p>
      </div>

      {/* Stats Cards */}
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
                {loading
                  ? "--"
                  : stats.pointsBalance.toLocaleString()}
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
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "--" : stats.favoritesCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Saved shows & streams
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Points Activity */}
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
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
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
                        ? "border-green-200 text-green-600"
                        : "border-red-200 text-red-600"
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

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/events">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Browse Events</p>
                <p className="text-sm text-muted-foreground">
                  Find upcoming community events
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/rewards">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Rewards Catalog</p>
                <p className="text-sm text-muted-foreground">
                  Redeem points for exclusive rewards
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
