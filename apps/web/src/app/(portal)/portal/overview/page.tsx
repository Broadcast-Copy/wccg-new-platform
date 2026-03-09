"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDemoRole } from "../layout";
import { ROLE_CONFIGS } from "../_lib/role-config";
import { MOCK_DATA } from "../_lib/mock-data";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  Play,
  Radio,
  Music,
  Mic,
  Heart,
  Star,
  Ticket,
  Headphones,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Toast-like status message
// ---------------------------------------------------------------------------

function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }, []);

  return { message, showMessage };
}

function StatusToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border border-border bg-popover px-4 py-3 text-sm text-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-[#74ddc7]" />
          {message}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------------------

function AdminDashboard() {
  const config = ROLE_CONFIGS.admin;
  const data = MOCK_DATA.admin;
  const { message, showMessage } = useStatusMessage();

  return (
    <>
      <StatusToast message={message} />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-[#10b981]/30 hover:shadow-lg hover:shadow-[#10b981]/5"
              onClick={() => showMessage(`Viewing ${stat.title} details`)}
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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {stat.changeUp ? (
                      <TrendingUp className="size-3 text-[#10b981]" />
                    ) : (
                      <TrendingDown className="size-3 text-[#ef4444]" />
                    )}
                    <span className={stat.changeUp ? "text-[#10b981]" : "text-[#ef4444]"}>
                      {stat.change}
                    </span>{" "}
                    this month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Jump to common admin tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:border-[#10b981]/30 hover:bg-[#10b981]/10"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4 text-[#10b981]" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">System Health</CardTitle>
          <CardDescription>Real-time platform status indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.healthIndicators?.map((item) => {
              const Icon = item.icon;
              const statusColor =
                item.status === "healthy"
                  ? "text-[#10b981]"
                  : item.status === "warning"
                    ? "text-[#f97316]"
                    : "text-[#ef4444]";
              const StatusIcon =
                item.status === "healthy"
                  ? CheckCircle
                  : item.status === "warning"
                    ? AlertTriangle
                    : XCircle;
              return (
                <div
                  key={item.label}
                  className="cursor-pointer rounded-lg border border-border bg-foreground/5 p-4 transition-all hover:border-border hover:bg-foreground/8"
                  onClick={() => showMessage(`${item.label}: ${item.value}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <StatusIcon className={cn("size-4", statusColor)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </div>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {data.activity.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex cursor-pointer items-start gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-all hover:border-[#10b981]/20 hover:bg-foreground/8"
                  onClick={() => showMessage(`Opening: ${item.text}`)}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${config.accentColor}15` }}
                  >
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sales Dashboard
// ---------------------------------------------------------------------------

function SalesDashboard() {
  const config = ROLE_CONFIGS.sales;
  const data = MOCK_DATA.sales;
  const { message, showMessage } = useStatusMessage();

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      pending: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
      completed: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
      paused: "border-border bg-foreground/5 text-muted-foreground",
    };
    return colors[status] || colors.paused;
  };

  return (
    <>
      <StatusToast message={message} />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-[#f97316]/30 hover:shadow-lg hover:shadow-[#f97316]/5"
              onClick={() => showMessage(`Viewing ${stat.title} breakdown`)}
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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3 text-[#10b981]" />
                    <span className="text-[#10b981]">{stat.change}</span> this month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Common sales tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:border-[#f97316]/30 hover:bg-[#f97316]/10"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4 text-[#f97316]" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Active Campaigns</CardTitle>
              <CardDescription>Current advertising campaigns</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/campaigns">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.campaigns?.slice(0, 4).map((campaign) => (
              <div
                key={campaign.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-4 transition-all hover:border-[#f97316]/20 hover:bg-foreground/8"
                onClick={() => showMessage(`Opening campaign: ${campaign.name}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{campaign.name}</p>
                    <Badge variant="outline" className={statusBadge(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{campaign.client}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{campaign.spent} / {campaign.budget}</p>
                  <p className="text-xs text-muted-foreground">{campaign.impressions} impressions</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Placeholder */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue over the past 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end justify-between gap-2 px-4">
            {[
              { month: "Oct", value: 65 },
              { month: "Nov", value: 72 },
              { month: "Dec", value: 58 },
              { month: "Jan", value: 80 },
              { month: "Feb", value: 85 },
              { month: "Mar", value: 92 },
            ].map((bar) => (
              <div key={bar.month} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#f97316] to-[#f97316]/40 transition-all hover:from-[#f97316] hover:to-[#f97316]/60"
                  style={{ height: `${bar.value}%` }}
                />
                <span className="text-xs text-muted-foreground">{bar.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription>Latest sales events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex cursor-pointer items-start gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-all hover:border-[#f97316]/20 hover:bg-foreground/8"
                  onClick={() => showMessage(`Opening: ${item.text}`)}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10">
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// DJ Dashboard
// ---------------------------------------------------------------------------

function DjDashboard() {
  const config = ROLE_CONFIGS.dj;
  const data = MOCK_DATA.dj;
  const { message, showMessage } = useStatusMessage();

  const showStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      live: "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
      upcoming: "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]",
      recorded: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
    };
    return colors[status] || "";
  };

  return (
    <>
      <StatusToast message={message} />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-[#74ddc7]/30 hover:shadow-lg hover:shadow-[#74ddc7]/5"
              onClick={() => showMessage(`Viewing ${stat.title}`)}
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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3 text-[#10b981]" />
                    <span className="text-[#10b981]">{stat.change}</span> this week
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Jump to common DJ tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:border-[#74ddc7]/30 hover:bg-[#74ddc7]/10"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4 text-[#74ddc7]" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Shows */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Upcoming Shows</CardTitle>
              <CardDescription>Your scheduled show slots</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/shows">Manage Shows</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.shows?.map((show) => (
              <div
                key={show.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-4 transition-all hover:border-[#74ddc7]/20 hover:bg-foreground/8"
                onClick={() => showMessage(`Opening show: ${show.name}`)}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#74ddc7]/10">
                  <Radio className="size-5 text-[#74ddc7]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{show.name}</p>
                    <Badge variant="outline" className={showStatusBadge(show.status)}>
                      {show.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {show.day} &middot; {show.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{show.listeners}</p>
                  <p className="text-xs text-muted-foreground">avg listeners</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Episodes */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Episodes</CardTitle>
          <CardDescription>Your latest uploaded mixes and recordings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.episodes?.map((episode) => (
              <div
                key={episode.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-all hover:border-[#74ddc7]/20 hover:bg-foreground/8"
                onClick={() => showMessage(`Playing: ${episode.title}`)}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#7401df]/10">
                  <Play className="size-4 text-[#7401df]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{episode.title}</p>
                  <p className="text-xs text-muted-foreground">{episode.date} &middot; {episode.duration}</p>
                </div>
                <p className="text-sm text-muted-foreground">{episode.plays} plays</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription>Latest updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-colors hover:bg-foreground/8"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#74ddc7]/10">
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Creator Dashboard
// ---------------------------------------------------------------------------

function CreatorDashboard() {
  const config = ROLE_CONFIGS.creator;
  const data = MOCK_DATA.creator;
  const { message, showMessage } = useStatusMessage();

  const contentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      podcast: "border-[#7401df]/30 bg-[#7401df]/10 text-[#7401df]",
      music: "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]",
      video: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
    };
    return colors[type] || "";
  };

  const contentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      published: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      draft: "border-border bg-foreground/5 text-muted-foreground",
      review: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
    };
    return colors[status] || "";
  };

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "podcast") return <Mic className="size-4 text-[#7401df]" />;
    if (type === "music") return <Music className="size-4 text-[#74ddc7]" />;
    return <Play className="size-4 text-[#f97316]" />;
  };

  return (
    <>
      <StatusToast message={message} />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-[#7401df]/30 hover:shadow-lg hover:shadow-[#7401df]/5"
              onClick={() => showMessage(`Viewing ${stat.title}`)}
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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3 text-[#10b981]" />
                    <span className="text-[#10b981]">{stat.change}</span> this month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Create and manage content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:border-[#7401df]/30 hover:bg-[#7401df]/10"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4 text-[#7401df]" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Content */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Uploads</CardTitle>
              <CardDescription>Your latest content</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/content">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.contentItems?.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-all hover:border-[#7401df]/20 hover:bg-foreground/8"
                onClick={() => showMessage(`Opening: ${item.title}`)}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
                  <TypeIcon type={item.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="outline" className={contentTypeBadge(item.type)}>
                      {item.type}
                    </Badge>
                    <Badge variant="outline" className={contentStatusBadge(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.status === "published" ? `${item.plays} plays` : "--"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription>Latest updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-colors hover:bg-foreground/8"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#7401df]/10">
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Advertiser Dashboard
// ---------------------------------------------------------------------------

function AdvertiserDashboard() {
  const config = ROLE_CONFIGS.advertiser;
  const data = MOCK_DATA.advertiser;
  const { message, showMessage } = useStatusMessage();

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      pending: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
      completed: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
      paused: "border-border bg-foreground/5 text-muted-foreground",
    };
    return colors[status] || colors.paused;
  };

  return (
    <>
      <StatusToast message={message} />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-[#ef4444]/30 hover:shadow-lg hover:shadow-[#ef4444]/5"
              onClick={() => showMessage(`Viewing ${stat.title}`)}
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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3 text-[#10b981]" />
                    <span className="text-[#10b981]">{stat.change}</span> this month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Manage your advertising</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:border-[#ef4444]/30 hover:bg-[#ef4444]/10"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4 text-[#ef4444]" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Your Campaigns</CardTitle>
              <CardDescription>Active and past advertising campaigns</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/campaigns">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.campaigns?.map((campaign) => (
              <div
                key={campaign.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-4 transition-all hover:border-[#ef4444]/20 hover:bg-foreground/8"
                onClick={() => showMessage(`Viewing campaign: ${campaign.name}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{campaign.name}</p>
                    <Badge variant="outline" className={statusBadge(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {campaign.impressions} impressions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{campaign.spent}</p>
                  <p className="text-xs text-muted-foreground">of {campaign.budget}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription>Latest ad events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-colors hover:bg-foreground/8"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ef4444]/10">
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Listener Dashboard
// ---------------------------------------------------------------------------

function ListenerDashboard() {
  const config = ROLE_CONFIGS.listener;
  const data = MOCK_DATA.listener;
  const { message, showMessage } = useStatusMessage();

  const ticketBadge = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      available: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
      "sold-out": "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
    };
    return colors[status] || "";
  };

  return (
    <>
      <StatusToast message={message} />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-[#3b82f6]/30 hover:shadow-lg hover:shadow-[#3b82f6]/5"
              onClick={() => showMessage(`Viewing ${stat.title}`)}
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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3 text-[#10b981]" />
                    <span className="text-[#10b981]">{stat.change}</span> this week
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription>Explore and engage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10"
                  asChild
                >
                  <Link href={action.href}>
                    <Icon className="mr-2 size-4 text-[#3b82f6]" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Listening History */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Listening</CardTitle>
          <CardDescription>Your listening history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.listeningHistory?.map((item) => (
              <div
                key={item.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-all hover:border-[#3b82f6]/20 hover:bg-foreground/8"
                onClick={() => showMessage(`Playing: ${item.show}`)}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                  <Headphones className="size-4 text-[#3b82f6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.show}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.host} &middot; {item.date}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{item.duration}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Upcoming Events</CardTitle>
          <CardDescription>Events and tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.events?.map((event) => (
              <div
                key={event.id}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground/5 p-4 transition-all hover:border-[#3b82f6]/20 hover:bg-foreground/8"
                onClick={() =>
                  showMessage(
                    event.ticketStatus === "confirmed"
                      ? `Your ticket for ${event.name} is confirmed!`
                      : event.ticketStatus === "available"
                        ? `Getting tickets for ${event.name}...`
                        : `${event.name} is sold out`
                  )
                }
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                  <Ticket className="size-5 text-[#3b82f6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{event.name}</p>
                    <Badge variant="outline" className={ticketBadge(event.ticketStatus)}>
                      {event.ticketStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.date} &middot; {event.location}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription>Your latest engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.activity.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-foreground/5 p-3 transition-colors hover:bg-foreground/8"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                    <Icon className={cn("size-4", item.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Overview Page — dispatches to role-specific dashboard
// ---------------------------------------------------------------------------

export default function PortalOverviewPage() {
  const { role } = useDemoRole();
  const router = useRouter();

  // Redirect to role selection if no role chosen
  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-[#74ddc7]" />
      </div>
    );
  }

  const config = ROLE_CONFIGS[role];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back,{" "}
          <span style={{ color: config.accentColor }}>
            {config.mockUser.name}
          </span>
        </h1>
        <p className="text-muted-foreground">
          Here is your {config.shortLabel.toLowerCase()} dashboard overview.
        </p>
      </div>

      {/* Role-specific dashboard */}
      {role === "admin" && <AdminDashboard />}
      {role === "sales" && <SalesDashboard />}
      {role === "dj" && <DjDashboard />}
      {role === "creator" && <CreatorDashboard />}
      {role === "advertiser" && <AdvertiserDashboard />}
      {role === "listener" && <ListenerDashboard />}

      {/* Role Info Card */}
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${config.accentColor}15` }}
          >
            {(() => {
              const Icon = config.icon;
              return <Icon className="size-6" style={{ color: config.accentColor }} />;
            })()}
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              Viewing as {config.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {config.mockUser.email} &mdash; This is a demo dashboard. Switch
              roles anytime from the sidebar.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/portal">Change Role</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
