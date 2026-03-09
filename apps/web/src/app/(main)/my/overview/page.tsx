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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Station status &amp; quick access controls
        </p>
      </div>

      {/* Station Control header */}
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
                WCCG 104.5 FM &mdash; On Air
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

          {/* Page Views */}
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
          <Link href="/my/admin">
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

          <Link href="/my/admin">
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

          <Link href="/my/admin">
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

          <Link href="/my/admin">
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

          <Link href="/my/admin">
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

          <Link href="/my/admin">
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
    </div>
  );
}
