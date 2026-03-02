"use client";

import { useState } from "react";
import {
  Users,
  Headphones,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  HardDrive,
  Radio,
  Clock,
  CalendarDays,
  Music,
  Podcast,
  Disc3,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type DateRange = "7d" | "30d" | "90d" | "all";

const kpiByRange: Record<
  DateRange,
  {
    totalUsers: { value: string; change: number };
    activeListeners: { value: string; change: number };
    monthlyRevenue: { value: string; change: number };
    contentItems: { value: string; change: number };
  }
> = {
  "7d": {
    totalUsers: { value: "2,847", change: 12.5 },
    activeListeners: { value: "342", change: 8.2 },
    monthlyRevenue: { value: "$18,450", change: 15.3 },
    contentItems: { value: "1,247", change: 5.1 },
  },
  "30d": {
    totalUsers: { value: "2,847", change: 9.8 },
    activeListeners: { value: "489", change: 11.4 },
    monthlyRevenue: { value: "$18,450", change: 12.1 },
    contentItems: { value: "1,247", change: 7.3 },
  },
  "90d": {
    totalUsers: { value: "2,847", change: 22.1 },
    activeListeners: { value: "527", change: 18.6 },
    monthlyRevenue: { value: "$52,340", change: 19.7 },
    contentItems: { value: "1,247", change: 14.2 },
  },
  all: {
    totalUsers: { value: "2,847", change: 48.3 },
    activeListeners: { value: "612", change: 35.9 },
    monthlyRevenue: { value: "$198,200", change: 42.6 },
    contentItems: { value: "1,247", change: 31.0 },
  },
};

const dailyListeners = [
  { day: "Mon", value: 245 },
  { day: "Tue", value: 312 },
  { day: "Wed", value: 289 },
  { day: "Thu", value: 356 },
  { day: "Fri", value: 378 },
  { day: "Sat", value: 198 },
  { day: "Sun", value: 421 },
];

const maxListeners = Math.max(...dailyListeners.map((d) => d.value));

const topContent = [
  {
    rank: 1,
    title: "Morning Drive with DJ Smooth",
    type: "Show",
    plays: 4821,
    avgDuration: "32:15",
    trend: 14.2,
  },
  {
    rank: 2,
    title: "Sunday Gospel Hour",
    type: "Show",
    plays: 3954,
    avgDuration: "48:30",
    trend: 22.8,
  },
  {
    rank: 3,
    title: "Late Night R&B Mix Vol. 12",
    type: "Mix",
    plays: 3412,
    avgDuration: "55:10",
    trend: 8.5,
  },
  {
    rank: 4,
    title: "Community Voices Podcast Ep. 47",
    type: "Podcast",
    plays: 2987,
    avgDuration: "24:45",
    trend: -3.1,
  },
  {
    rank: 5,
    title: "Afternoon Jazz Sessions",
    type: "Show",
    plays: 2654,
    avgDuration: "41:20",
    trend: 5.7,
  },
  {
    rank: 6,
    title: "Hip-Hop Throwback Fridays",
    type: "Show",
    plays: 2341,
    avgDuration: "38:55",
    trend: 18.3,
  },
  {
    rank: 7,
    title: "Old School Funk Mix Vol. 8",
    type: "Mix",
    plays: 2198,
    avgDuration: "62:30",
    trend: 2.1,
  },
  {
    rank: 8,
    title: "WCCG News Roundup",
    type: "Podcast",
    plays: 1876,
    avgDuration: "15:40",
    trend: -1.4,
  },
  {
    rank: 9,
    title: "Weekend Party Starter Mix",
    type: "Mix",
    plays: 1743,
    avgDuration: "72:05",
    trend: 11.9,
  },
  {
    rank: 10,
    title: "Health & Wellness Talk",
    type: "Podcast",
    plays: 1521,
    avgDuration: "28:10",
    trend: 6.4,
  },
];

const monthlyGrowth = [
  { month: "Sep", users: 1820 },
  { month: "Oct", users: 2045 },
  { month: "Nov", users: 2210 },
  { month: "Dec", users: 2380 },
  { month: "Jan", users: 2590 },
  { month: "Feb", users: 2847 },
];

const maxGrowth = Math.max(...monthlyGrowth.map((m) => m.users));

const revenueBreakdown = [
  { category: "Advertising", amount: 8200, color: "bg-blue-500", pct: 44.3 },
  {
    category: "Sponsorships",
    amount: 5400,
    color: "bg-emerald-500",
    pct: 29.2,
  },
  { category: "Events", amount: 3100, color: "bg-amber-500", pct: 16.8 },
  {
    category: "Subscriptions",
    amount: 1750,
    color: "bg-purple-500",
    pct: 9.5,
  },
];

const totalRevenue = revenueBreakdown.reduce((s, r) => s + r.amount, 0);

const recentSignups = [
  {
    name: "Marcus Williams",
    email: "marcus.w@email.com",
    joined: "Feb 24, 2026",
    initials: "MW",
  },
  {
    name: "Tameka Johnson",
    email: "tameka.j@email.com",
    joined: "Feb 23, 2026",
    initials: "TJ",
  },
  {
    name: "DeAndre Mitchell",
    email: "deandre.m@email.com",
    joined: "Feb 23, 2026",
    initials: "DM",
  },
  {
    name: "Keisha Brown",
    email: "keisha.b@email.com",
    joined: "Feb 22, 2026",
    initials: "KB",
  },
  {
    name: "Tyrone Davis",
    email: "tyrone.d@email.com",
    joined: "Feb 22, 2026",
    initials: "TD",
  },
];

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  const variantMap: Record<string, "default" | "secondary" | "outline"> = {
    Show: "default",
    Mix: "secondary",
    Podcast: "outline",
  };
  const iconMap: Record<string, React.ReactNode> = {
    Show: <Radio className="size-3" />,
    Mix: <Disc3 className="size-3" />,
    Podcast: <Podcast className="size-3" />,
  };
  return (
    <Badge variant={variantMap[type] ?? "outline"} className="gap-1">
      {iconMap[type]}
      {type}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const kpi = kpiByRange[dateRange];

  const dateRangeLabels: Record<DateRange, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    all: "All Time",
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor listener engagement, revenue, and platform health.
          </p>
        </div>
        <Select
          value={dateRange}
          onValueChange={(v) => setDateRange(v as DateRange)}
        >
          <SelectTrigger className="w-[180px]">
            <CalendarDays className="mr-2 size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* KPI Stats Row                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{kpi.totalUsers.value}</span>
              <TrendBadge value={kpi.totalUsers.change} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              vs prior {dateRangeLabels[dateRange].toLowerCase()}
            </p>
          </CardContent>
        </Card>

        {/* Active Listeners */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Headphones className="size-4" />
              Active Listeners (24h)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {kpi.activeListeners.value}
              </span>
              <TrendBadge value={kpi.activeListeners.change} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              vs prior {dateRangeLabels[dateRange].toLowerCase()}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Monthly Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {kpi.monthlyRevenue.value}
              </span>
              <TrendBadge value={kpi.monthlyRevenue.change} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              vs prior {dateRangeLabels[dateRange].toLowerCase()}
            </p>
          </CardContent>
        </Card>

        {/* Content Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="size-4" />
              Content Items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {kpi.contentItems.value}
              </span>
              <TrendBadge value={kpi.contentItems.change} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              vs prior {dateRangeLabels[dateRange].toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Listener Trends + User Growth                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Listener Trends - Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Listener Trends</CardTitle>
            <CardDescription>
              Daily active listeners over the past 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3" style={{ height: 220 }}>
              {dailyListeners.map((d) => {
                const heightPct = (d.value / maxListeners) * 100;
                return (
                  <div
                    key={d.day}
                    className="group flex flex-1 flex-col items-center gap-1"
                  >
                    {/* Value label */}
                    <span className="text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      {d.value}
                    </span>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary"
                      style={{ height: `${heightPct}%`, minHeight: 4 }}
                    />
                    {/* Day label */}
                    <span className="mt-1 text-xs font-medium text-muted-foreground">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Avg:{" "}
                {Math.round(
                  dailyListeners.reduce((s, d) => s + d.value, 0) /
                    dailyListeners.length
                )}{" "}
                listeners / day
              </span>
              <span>
                Peak: {Math.max(...dailyListeners.map((d) => d.value))} (
                {
                  dailyListeners.reduce((best, d) =>
                    d.value > best.value ? d : best
                  ).day
                }
                )
              </span>
            </div>
          </CardContent>
        </Card>

        {/* User Growth - Mini Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Monthly registered users (6 mo)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {monthlyGrowth.map((m, i) => {
                const heightPct = (m.users / maxGrowth) * 100;
                const prev = i > 0 ? monthlyGrowth[i - 1].users : m.users;
                const growth = (((m.users - prev) / prev) * 100).toFixed(1);
                return (
                  <div
                    key={m.month}
                    className="group flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      {m.users}
                    </span>
                    <div className="relative w-full">
                      {/* Background faded bar */}
                      <div
                        className="w-full rounded-t-sm bg-emerald-500/20 transition-colors group-hover:bg-emerald-500/30"
                        style={{ height: `${heightPct * 1.6}px`, minHeight: 4 }}
                      />
                      {/* Solid top portion */}
                      <div
                        className="absolute bottom-0 w-full rounded-t-sm bg-emerald-500/70 transition-colors group-hover:bg-emerald-500"
                        style={{
                          height: `${heightPct * 0.6}px`,
                          minHeight: 2,
                        }}
                      />
                    </div>
                    <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {m.month}
                    </span>
                    {i > 0 && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400">
                        +{growth}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-md bg-muted/50 p-2 text-center text-xs text-muted-foreground">
              Total growth:{" "}
              <span className="font-semibold text-foreground">
                +
                {(
                  ((monthlyGrowth[monthlyGrowth.length - 1].users -
                    monthlyGrowth[0].users) /
                    monthlyGrowth[0].users) *
                  100
                ).toFixed(1)}
                %
              </span>{" "}
              over 6 months
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Top Content Table                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="size-5" />
            Top Content
          </CardTitle>
          <CardDescription>
            Most played shows, mixes, and podcasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Plays</TableHead>
                <TableHead className="text-right">Avg Duration</TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topContent.map((item) => (
                <TableRow key={item.rank}>
                  <TableCell className="font-medium text-muted-foreground">
                    {item.rank}
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <ContentTypeBadge type={item.type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.plays.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.avgDuration}
                  </TableCell>
                  <TableCell className="text-right">
                    <TrendBadge value={item.trend} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Revenue Breakdown + Recent Signups + Platform Health              */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-5" />
              Revenue Breakdown
            </CardTitle>
            <CardDescription>
              Monthly revenue by source: $
              {totalRevenue.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* CSS Donut-style horizontal bar breakdown */}
            <div className="mb-4 flex h-4 overflow-hidden rounded-full">
              {revenueBreakdown.map((seg) => (
                <div
                  key={seg.category}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${seg.pct}%` }}
                  title={`${seg.category}: $${seg.amount.toLocaleString()} (${seg.pct}%)`}
                />
              ))}
            </div>
            <div className="space-y-3">
              {revenueBreakdown.map((seg) => (
                <div key={seg.category} className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${seg.color}`} />
                  <span className="flex-1 text-sm">{seg.category}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    ${seg.amount.toLocaleString()}
                  </span>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                    {seg.pct}%
                  </span>
                </div>
              ))}
            </div>
            {/* Mini bar chart per category */}
            <div className="mt-4 space-y-2">
              {revenueBreakdown.map((seg) => (
                <div key={seg.category} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{seg.category}</span>
                    <span>${seg.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${seg.color} transition-all`}
                      style={{
                        width: `${(seg.amount / revenueBreakdown[0].amount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Recent Signups
            </CardTitle>
            <CardDescription>Latest platform registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSignups.map((user) => (
                <div key={user.email} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {user.joined}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 w-full" size="sm">
              View all users
            </Button>
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Platform Health
            </CardTitle>
            <CardDescription>
              Infrastructure and service status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Stream Uptime */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Radio className="size-4 text-emerald-500" />
                    Stream Uptime
                  </span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    99.7%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: "99.7%" }}
                  />
                </div>
              </div>

              {/* API Response Time */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-blue-500" />
                    API Response Time
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    45ms
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: "18%" }}
                    title="45ms (target: &lt;250ms)"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Target: &lt;250ms
                </p>
              </div>

              {/* Storage Used */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <HardDrive className="size-4 text-amber-500" />
                    Storage Used
                  </span>
                  <span className="text-sm font-semibold">
                    12.4{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / 50 GB
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: "24.8%" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  24.8% utilized
                </p>
              </div>

              {/* Active Streams */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Headphones className="size-4 text-purple-500" />
                    Active Streams
                  </span>
                  <span className="text-sm font-semibold">
                    3{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / 5
                    </span>
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((slot) => (
                    <div
                      key={slot}
                      className={`h-3 flex-1 rounded-sm ${
                        slot <= 3
                          ? "bg-purple-500"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  3 of 5 stream slots in use
                </p>
              </div>
            </div>

            {/* Overall status */}
            <div className="mt-5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                All systems operational
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
