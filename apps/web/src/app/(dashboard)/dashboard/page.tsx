"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Music,
  Play,
  Radio,
  Upload,
  User,
  Eye,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Mix {
  id: string;
  title: string;
  genre?: string;
  playCount?: number;
  status?: string;
  createdAt?: string;
  coverImageUrl?: string;
}

interface HostProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

export default function DashboardOverviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [host, setHost] = useState<HostProfile | null>(null);
  const [recentMixes, setRecentMixes] = useState<Mix[]>([]);
  const [stats, setStats] = useState({
    totalMixes: "--",
    totalPlays: "--",
    activeShows: "--",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function fetchData() {
      // Fetch host profile
      try {
        const profile = await apiClient<HostProfile>("/hosts/me");
        setHost(profile);
      } catch {
        // Not linked to a host yet
      }

      // Fetch mixes
      try {
        const mixes = await apiClient<Mix[]>("/mixes/my");
        const mixList = Array.isArray(mixes) ? mixes : [];
        setRecentMixes(mixList.slice(0, 5));
        const totalPlays = mixList.reduce(
          (sum, m) => sum + (m.playCount || 0),
          0
        );
        setStats((prev) => ({
          ...prev,
          totalMixes: String(mixList.length),
          totalPlays: String(totalPlays),
        }));
      } catch {
        // API not available
      }

      // Fetch shows
      try {
        const shows = await apiClient<unknown[]>("/shows?hostId=me");
        setStats((prev) => ({
          ...prev,
          activeShows: String(Array.isArray(shows) ? shows.length : 0),
        }));
      } catch {
        // API not available
      }

      setLoading(false);
    }

    fetchData();
  }, [authLoading]);

  const displayName =
    host?.name || user?.user_metadata?.display_name || "DJ";

  const statCards = [
    {
      title: "Total Mixes",
      value: stats.totalMixes,
      icon: Music,
      color: "text-[#74ddc7]",
      bgColor: "bg-[#74ddc7]/10",
    },
    {
      title: "Total Plays",
      value: stats.totalPlays,
      icon: Play,
      color: "text-[#7401df]",
      bgColor: "bg-[#7401df]/10",
    },
    {
      title: "Active Shows",
      value: stats.activeShows,
      icon: Radio,
      color: "text-[#74ddc7]",
      bgColor: "bg-[#74ddc7]/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back,{" "}
          <span className="text-[#74ddc7]">{displayName}</span>
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your DJ profile and content.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="border-white/10 bg-[#12121a] transition-shadow hover:shadow-md hover:shadow-[#74ddc7]/5"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardDescription>
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <Icon className={cn("size-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">
                  {loading ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-white/10" />
                  ) : (
                    stat.value
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription>Jump to common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/5 hover:bg-[#74ddc7]/10 hover:text-[#74ddc7] hover:border-[#74ddc7]/30"
              asChild
            >
              <Link href="/dashboard/mixes/upload">
                <Upload className="mr-2 size-4" />
                Upload Mix
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/5 hover:bg-[#74ddc7]/10 hover:text-[#74ddc7] hover:border-[#74ddc7]/30"
              asChild
            >
              <Link href="/dashboard/profile">
                <User className="mr-2 size-4" />
                Edit Profile
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start border-white/10 bg-white/5 hover:bg-[#74ddc7]/10 hover:text-[#74ddc7] hover:border-[#74ddc7]/30"
              asChild
            >
              <Link href="/dashboard/shows">
                <Eye className="mr-2 size-4" />
                View Shows
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Mixes */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Mixes</CardTitle>
              <CardDescription>Your latest uploaded mixes</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#74ddc7] hover:text-[#74ddc7] hover:bg-[#74ddc7]/10"
              asChild
            >
              <Link href="/dashboard/mixes">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <div className="h-10 w-10 animate-pulse rounded bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentMixes.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5">
              <Music className="mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No mixes uploaded yet.
              </p>
              <Button
                variant="link"
                className="mt-1 text-[#74ddc7]"
                asChild
              >
                <Link href="/dashboard/mixes/upload">Upload your first mix</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMixes.map((mix) => (
                <div
                  key={mix.id}
                  className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <div className="flex size-10 items-center justify-center rounded bg-[#7401df]/20">
                    <Music className="size-5 text-[#7401df]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {mix.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {mix.genre && <span>{mix.genre}</span>}
                      {mix.playCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Play className="size-3" />
                          {mix.playCount}
                        </span>
                      )}
                      {mix.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(mix.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {mix.status && (
                    <Badge
                      variant="outline"
                      className={
                        mix.status === "Published"
                          ? "border-[#74ddc7]/30 text-[#74ddc7]"
                          : mix.status === "Processing"
                            ? "border-yellow-500/30 text-yellow-500"
                            : "border-white/20 text-muted-foreground"
                      }
                    >
                      {mix.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
