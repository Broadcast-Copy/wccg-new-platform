"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Mic2,
  CalendarDays,
  Users,
  Plus,
  Eye,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface DashboardStats {
  streams: string;
  shows: string;
  events: string;
  users: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    streams: "--",
    shows: "--",
    events: "--",
    users: "--",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const results: DashboardStats = {
        streams: "--",
        shows: "--",
        events: "--",
        users: "--",
      };

      try {
        const streams = await apiClient<unknown[]>("/streams");
        results.streams = String(Array.isArray(streams) ? streams.length : 0);
      } catch {
        // API not available
      }

      try {
        const shows = await apiClient<unknown[]>("/shows");
        results.shows = String(Array.isArray(shows) ? shows.length : 0);
      } catch {
        // API not available
      }

      try {
        const events = await apiClient<unknown[]>("/events");
        results.events = String(Array.isArray(events) ? events.length : 0);
      } catch {
        // API not available
      }

      try {
        const users = await apiClient<unknown[]>("/admin/users");
        results.users = String(Array.isArray(users) ? users.length : 0);
      } catch {
        // API not available
      }

      setStats(results);
      setLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Streams",
      value: stats.streams,
      icon: Radio,
      color: "text-blue-500",
      href: "/admin/streams",
    },
    {
      title: "Active Shows",
      value: stats.shows,
      icon: Mic2,
      color: "text-green-500",
      href: "/admin/shows",
    },
    {
      title: "Upcoming Events",
      value: stats.events,
      icon: CalendarDays,
      color: "text-purple-500",
      href: "/admin/events",
    },
    {
      title: "Registered Users",
      value: stats.users,
      icon: Users,
      color: "text-orange-500",
      href: "/admin/users",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your WCCG station management
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-sm font-medium">
                    {stat.title}
                  </CardDescription>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {loading ? (
                      <span className="inline-block h-8 w-12 animate-pulse rounded bg-muted" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your station
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/admin/streams">
                <Plus className="mr-2 h-4 w-4" />
                Add Stream
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/admin/shows">
                <Plus className="mr-2 h-4 w-4" />
                Add Show
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/admin/events">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/admin/schedule">
                <Eye className="mr-2 h-4 w-4" />
                Edit Schedule
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <CardDescription>Latest changes across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Activity feed will appear once the API is connected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
