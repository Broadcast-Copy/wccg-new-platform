"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatCurrency } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

interface RevenueSource {
  id: string;
  source: string;
  current: number;
  previous: number;
  target: number;
}

interface TopClient {
  id: string;
  name: string;
  revenue: number;
  category: string;
  contractEnd: string;
  trend: "up" | "down" | "flat";
}

interface MonthlyRevenue {
  id: string;
  month: string;
  onAir: number;
  digital: number;
  events: number;
  production: number;
  total: number;
}

const SEED_SOURCES: RevenueSource[] = [
  { id: "rs1", source: "On-Air Advertising", current: 98500, previous: 91200, target: 105000 },
  { id: "rs2", source: "Digital / Streaming", current: 42300, previous: 38100, target: 50000 },
  { id: "rs3", source: "Events & Sponsorships", current: 31200, previous: 28500, target: 30000 },
  { id: "rs4", source: "Production Services", current: 15500, previous: 14200, target: 15000 },
];

const SEED_CLIENTS: TopClient[] = [
  { id: "c1", name: "Fayetteville Auto Mall", revenue: 24500, category: "Automotive", contractEnd: "2026-09-30", trend: "up" },
  { id: "c2", name: "Cross Creek Mall", revenue: 18200, category: "Retail", contractEnd: "2026-06-15", trend: "up" },
  { id: "c3", name: "Cape Fear Valley Health", revenue: 15800, category: "Healthcare", contractEnd: "2026-12-31", trend: "flat" },
  { id: "c4", name: "Fort Liberty Federal CU", revenue: 12400, category: "Financial", contractEnd: "2026-08-01", trend: "up" },
  { id: "c5", name: "Outdoor Living Supply", revenue: 9800, category: "Home & Garden", contractEnd: "2026-04-30", trend: "down" },
];

const SEED_MONTHLY: MonthlyRevenue[] = [
  { id: "m1", month: "2025-10", onAir: 85000, digital: 35000, events: 28000, production: 17000, total: 165000 },
  { id: "m2", month: "2025-11", onAir: 92000, digital: 38000, events: 32000, production: 16000, total: 178000 },
  { id: "m3", month: "2025-12", onAir: 105000, digital: 42000, events: 30000, production: 18000, total: 195000 },
  { id: "m4", month: "2026-01", onAir: 88000, digital: 36000, events: 30000, production: 18000, total: 172000 },
  { id: "m5", month: "2026-02", onAir: 94000, digital: 40000, events: 31000, production: 16000, total: 181000 },
  { id: "m6", month: "2026-03", onAir: 98500, digital: 42300, events: 31200, production: 15500, total: 187500 },
];

const SK_SRC = "wccg:gm:revenue-sources";
const SK_CLI = "wccg:gm:revenue-clients";
const SK_MON = "wccg:gm:revenue-monthly";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RevenuePage() {
  const [tab, setTab] = useState("overview");
  const [sources, setSources] = useState<RevenueSource[]>([]);
  const [clients, setClients] = useState<TopClient[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);

  useEffect(() => {
    setSources(loadOrSeed(SK_SRC, SEED_SOURCES));
    setClients(loadOrSeed(SK_CLI, SEED_CLIENTS));
    setMonthly(loadOrSeed(SK_MON, SEED_MONTHLY));
  }, []);

  const totalCurrent = sources.reduce((s, r) => s + r.current, 0);
  const totalPrevious = sources.reduce((s, r) => s + r.previous, 0);
  const totalTarget = sources.reduce((s, r) => s + r.target, 0);
  const changePct = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1) : "0";

  const clientCols: Column<TopClient>[] = [
    { key: "rank", label: "#", render: (r) => <span className="text-muted-foreground font-mono">{(clients.indexOf(r) + 1)}</span> },
    { key: "name", label: "Client", sortable: true, sortKey: (r) => r.name, render: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "category", label: "Category", hideOnMobile: true, render: (r) => <span className="text-muted-foreground">{r.category}</span> },
    { key: "revenue", label: "Revenue", align: "right", sortable: true, sortKey: (r) => r.revenue, render: (r) => <span className="font-mono text-foreground">{formatCurrency(r.revenue)}</span> },
    { key: "trend", label: "Trend", align: "center", render: (r) => (
      r.trend === "up" ? <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto" /> :
      r.trend === "down" ? <TrendingDown className="h-4 w-4 text-red-400 mx-auto" /> :
      <span className="text-muted-foreground">--</span>
    )},
    { key: "contract", label: "Contract End", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.contractEnd}</span> },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={DollarSign}
        title="Revenue Tracking"
        description="Monthly and quarterly revenue performance"
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10 border-emerald-500/20"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Month"
          value={formatCurrency(totalCurrent)}
          icon={DollarSign}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          trend={`${Number(changePct) >= 0 ? "+" : ""}${changePct}% vs last month`}
          trendUp={Number(changePct) >= 0}
        />
        <StatCard
          label="Target"
          value={formatCurrency(totalTarget)}
          icon={BarChart3}
          color="text-blue-400"
          bg="bg-blue-500/10"
          trend={`${Math.round(totalCurrent / totalTarget * 100)}% achieved`}
          trendUp={totalCurrent / totalTarget >= 0.9}
        />
        <StatCard
          label="Top Client"
          value={formatCurrency(clients[0]?.revenue ?? 0)}
          icon={ArrowUpRight}
          color="text-purple-400"
          bg="bg-purple-500/10"
          trend={clients[0]?.name ?? ""}
          trendUp={true}
        />
        <StatCard
          label="Avg Per Source"
          value={formatCurrency(Math.round(totalCurrent / (sources.length || 1)))}
          icon={PieChart}
          color="text-[#74ddc7]"
          bg="bg-[#74ddc7]/10"
          trend={`${sources.length} revenue streams`}
          trendUp={true}
        />
      </div>

      <TabsNav
        tabs={[
          { key: "overview", label: "Revenue by Source" },
          { key: "clients", label: "Top Clients", count: clients.length },
          { key: "monthly", label: "Monthly Breakdown" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="space-y-4">
          {sources.map((src) => {
            const pct = Math.round((src.current / src.target) * 100);
            const change = ((src.current - src.previous) / src.previous * 100).toFixed(1);
            return (
              <div key={src.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{src.source}</h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${Number(change) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {Number(change) >= 0 ? "+" : ""}{change}%
                    </span>
                    <span className="text-sm font-mono text-foreground">{formatCurrency(src.current)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-400" : pct >= 80 ? "bg-[#74ddc7]" : "bg-yellow-400"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{pct}% of {formatCurrency(src.target)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "clients" && (
        <DataTable
          columns={clientCols}
          data={clients}
          keyField="id"
          searchable
          searchPlaceholder="Search clients..."
          searchFilter={(r, q) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)}
        />
      )}

      {tab === "monthly" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Month</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">On-Air</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Digital</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Events</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Production</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3 font-medium text-foreground">{m.month}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(m.onAir)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(m.digital)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(m.events)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{formatCurrency(m.production)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
