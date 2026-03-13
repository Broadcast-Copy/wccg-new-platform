"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radio,
  Users,
  Clock,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Globe,
  Monitor,
  MapPin,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchLiveMetrics,
  fetchDailyStats,
  formatDuration,
  formatHour,
  maskIp,
  type LiveMetrics,
  type DailyStat,
} from "@/lib/streaming-analytics";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreamingAnalyticsPage() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [live, daily] = await Promise.all([
        fetchLiveMetrics(),
        fetchDailyStats(
          new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
          new Date().toISOString().slice(0, 10),
        ),
      ]);

      if (live) setMetrics(live);
      setDailyStats(daily);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Compute max hourly value for bar chart scaling
  const maxHourly = metrics
    ? Math.max(...metrics.hourlyBreakdown.map((h) => h.listeners), 1)
    : 1;

  // Compute max daily value for trend chart scaling
  const maxDaily = dailyStats.length
    ? Math.max(...dailyStats.map((d) => d.unique_listeners), 1)
    : 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/my/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#0d9488]">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Streaming Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Live listener data from WCCG stream
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated{" "}
              {lastRefresh.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !metrics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 animate-pulse"
            >
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Live Stats Cards */}
      {metrics && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Activity}
              label="Current Listeners"
              value={metrics.currentListeners.toString()}
              sub="Active in last 5 min"
              color="text-[#22c55e]"
              iconBg="bg-[#22c55e]/10"
            />
            <StatCard
              icon={Users}
              label="Unique Listeners"
              value={metrics.totalUniqueListeners.toString()}
              sub="Today"
              color="text-[#3b82f6]"
              iconBg="bg-[#3b82f6]/10"
            />
            <StatCard
              icon={Clock}
              label="Listening Hours"
              value={metrics.totalListeningHours.toString()}
              sub={`Avg ${formatDuration(metrics.avgSessionDurationSecs)}/session`}
              color="text-[#7401df]"
              iconBg="bg-[#7401df]/10"
            />
            <StatCard
              icon={TrendingUp}
              label="Peak Listeners"
              value={metrics.peakListeners.toString()}
              sub={`at ${formatHour(metrics.peakHour)}`}
              color="text-[#f59e0b]"
              iconBg="bg-[#f59e0b]/10"
            />
          </div>

          {/* Hourly Chart */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#74ddc7]" />
              Listeners by Hour
            </h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-end gap-1 h-40">
                {metrics.hourlyBreakdown.map((h) => {
                  const pct = maxHourly > 0 ? (h.listeners / maxHourly) * 100 : 0;
                  const isNow = h.hour === new Date().getHours();
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {h.listeners}
                      </span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          isNow
                            ? "bg-[#74ddc7]"
                            : "bg-[#7401df]/30 group-hover:bg-[#7401df]/50"
                        }`}
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          minHeight: h.listeners > 0 ? "4px" : "2px",
                        }}
                        title={`${formatHour(h.hour)}: ${h.listeners} listeners`}
                      />
                      <span
                        className={`text-[9px] ${
                          isNow
                            ? "text-[#74ddc7] font-bold"
                            : "text-muted-foreground/50"
                        } ${h.hour % 3 === 0 ? "" : "hidden sm:inline"}`}
                      >
                        {h.hour % 3 === 0 || isNow ? formatHour(h.hour).replace(" ", "") : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Top User Agents & Location placeholder */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* User Agents */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Monitor className="h-4 w-4 text-[#3b82f6]" />
                Top Platforms
              </h2>
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {metrics.topUserAgents.map((ua) => {
                  const pct =
                    metrics.totalRequests > 0
                      ? Math.round((ua.count / metrics.totalRequests) * 100)
                      : 0;
                  return (
                    <div
                      key={ua.agent}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-sm text-foreground">{ua.agent}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#3b82f6]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Summary */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#74ddc7]" />
                Session Summary
              </h2>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <SummaryRow
                  label="Total Requests"
                  value={metrics.totalRequests.toLocaleString()}
                />
                <SummaryRow
                  label="Avg Session"
                  value={formatDuration(metrics.avgSessionDurationSecs)}
                />
                <SummaryRow
                  label="Peak Hour"
                  value={`${formatHour(metrics.peakHour)} (${metrics.peakListeners} listeners)`}
                />
                <SummaryRow
                  label="Data As Of"
                  value={new Date(metrics.dataAsOf).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                />
              </div>
            </section>
          </div>
        </>
      )}

      {/* 7-Day Trend */}
      {dailyStats.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#7401df]" />
            7-Day Trend
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-end gap-2 h-32">
              {dailyStats.map((d) => {
                const pct =
                  maxDaily > 0
                    ? (d.unique_listeners / maxDaily) * 100
                    : 0;
                const isToday =
                  d.log_date === new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={d.log_date}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.unique_listeners}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isToday
                          ? "bg-[#74ddc7]"
                          : "bg-[#7401df]/30 group-hover:bg-[#7401df]/50"
                      }`}
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        minHeight: "4px",
                      }}
                      title={`${d.log_date}: ${d.unique_listeners} unique listeners`}
                    />
                    <span
                      className={`text-[10px] ${
                        isToday
                          ? "text-[#74ddc7] font-bold"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {new Date(d.log_date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short" },
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Daily stats row */}
            <div className="mt-4 grid gap-2 sm:grid-cols-3 text-center">
              {dailyStats.length > 0 && (
                <>
                  <MiniStat
                    label="Avg Listeners/Day"
                    value={Math.round(
                      dailyStats.reduce((s, d) => s + d.unique_listeners, 0) /
                        dailyStats.length,
                    ).toString()}
                  />
                  <MiniStat
                    label="Total Requests (7d)"
                    value={dailyStats
                      .reduce((s, d) => s + d.total_requests, 0)
                      .toLocaleString()}
                  />
                  <MiniStat
                    label="Total Hours (7d)"
                    value={Math.round(
                      dailyStats.reduce(
                        (s, d) => s + d.total_listening_secs,
                        0,
                      ) / 3600,
                    ).toLocaleString()}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Top Locations (from daily stats) */}
      {dailyStats.length > 0 && (() => {
        const latest = dailyStats[dailyStats.length - 1];
        const hasGeo =
          latest.top_countries?.length > 0 ||
          latest.top_states?.length > 0 ||
          latest.top_cities?.length > 0;
        if (!hasGeo) return null;
        return (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#ec4899]" />
              Top Locations
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {latest.top_countries?.length > 0 && (
                <LocationList title="Countries" items={latest.top_countries} />
              )}
              {latest.top_states?.length > 0 && (
                <LocationList title="States" items={latest.top_states} />
              )}
              {latest.top_cities?.length > 0 && (
                <LocationList title="Cities" items={latest.top_cities} />
              )}
            </div>
          </section>
        );
      })()}

      {/* No data state */}
      {!loading && !metrics && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Radio className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Streaming Data Available
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The streaming analytics Edge Function needs to be deployed to
            Supabase. Check the deployment guide in the project docs.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function LocationList({
  title,
  items,
}: {
  title: string;
  items: { code: string; count: number }[];
}) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.code} className="flex items-center gap-2">
            <span className="text-sm text-foreground w-12 shrink-0">
              {item.code}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ec4899]"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
