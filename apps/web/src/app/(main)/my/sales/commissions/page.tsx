"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Users,
  Trophy,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, genId, formatCurrency } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommissionRecord {
  id: string;
  repName: string;
  month: string;
  totalSales: number;
  commissionRate: number;
  commissionEarned: number;
  paidStatus: "Paid" | "Pending" | "Processing";
  paidDate: string | null;
  deals: number;
}

const KEY = "wccg_sales_commissions";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const REPS = [
  { name: "Marcus Jefferson", rate: 0.15 },
  { name: "Danielle Brooks", rate: 0.15 },
  { name: "Tony Ramirez", rate: 0.12 },
  { name: "Ashley Chen", rate: 0.12 },
  { name: "David Patterson", rate: 0.10 },
];

const MONTHS = ["2026-01", "2026-02", "2026-03"];

function buildSeedCommissions(): CommissionRecord[] {
  const records: CommissionRecord[] = [];
  const salesRanges: Record<string, [number, number]> = {
    "Marcus Jefferson": [18000, 32000],
    "Danielle Brooks": [15000, 28000],
    "Tony Ramirez": [12000, 22000],
    "Ashley Chen": [10000, 20000],
    "David Patterson": [8000, 16000],
  };

  for (const rep of REPS) {
    for (const month of MONTHS) {
      const [min, max] = salesRanges[rep.name];
      const totalSales = Math.round(min + Math.random() * (max - min));
      const commissionEarned = Math.round(totalSales * rep.rate);
      const isPast = month !== "2026-03";
      records.push({
        id: genId("com"),
        repName: rep.name,
        month,
        totalSales,
        commissionRate: rep.rate,
        commissionEarned,
        paidStatus: isPast ? "Paid" : month === "2026-03" ? "Pending" : "Processing",
        paidDate: isPast ? `${month}-28` : null,
        deals: Math.round(3 + Math.random() * 7),
      });
    }
  }
  return records;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommissionsPage() {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("current");
  const [selectedMonth, setSelectedMonth] = useState("2026-03");

  useEffect(() => {
    setMounted(true);
    setRecords(loadOrSeed(KEY, buildSeedCommissions()));
  }, []);

  if (!mounted) return null;

  // Current month data
  const currentMonthRecords = records.filter((r) => r.month === selectedMonth);
  const totalCommissions = currentMonthRecords.reduce((s, r) => s + r.commissionEarned, 0);
  const totalSales = currentMonthRecords.reduce((s, r) => s + r.totalSales, 0);
  const topEarner = currentMonthRecords.sort((a, b) => b.commissionEarned - a.commissionEarned)[0];
  const avgRate = currentMonthRecords.length > 0
    ? Math.round((currentMonthRecords.reduce((s, r) => s + r.commissionRate, 0) / currentMonthRecords.length) * 100)
    : 0;

  // All time data by rep
  const repSummary = REPS.map((rep) => {
    const repRecords = records.filter((r) => r.repName === rep.name);
    const totalSales = repRecords.reduce((s, r) => s + r.totalSales, 0);
    const totalCommission = repRecords.reduce((s, r) => s + r.commissionEarned, 0);
    const totalDeals = repRecords.reduce((s, r) => s + r.deals, 0);
    return { name: rep.name, rate: rep.rate, totalSales, totalCommission, totalDeals, months: repRecords.length };
  }).sort((a, b) => b.totalCommission - a.totalCommission);

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const columns: Column<CommissionRecord>[] = [
    {
      key: "rep",
      label: "Sales Rep",
      render: (row) => <span className="font-medium text-foreground">{row.repName}</span>,
      sortable: true,
      sortKey: (row) => row.repName,
    },
    {
      key: "totalSales",
      label: "Total Sales",
      align: "right",
      sortable: true,
      sortKey: (row) => row.totalSales,
      render: (row) => <span className="text-foreground">{formatCurrency(row.totalSales)}</span>,
    },
    {
      key: "deals",
      label: "Deals",
      align: "center",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{row.deals}</span>,
    },
    {
      key: "rate",
      label: "Rate",
      align: "center",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{Math.round(row.commissionRate * 100)}%</span>,
    },
    {
      key: "earned",
      label: "Commission",
      align: "right",
      sortable: true,
      sortKey: (row) => row.commissionEarned,
      render: (row) => <span className="font-semibold text-[#74ddc7]">{formatCurrency(row.commissionEarned)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.paidStatus} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Wallet}
        title="Commission Tracker"
        description="Track sales rep commissions and payouts."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commissions This Month" value={formatCurrency(totalCommissions)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Total Sales" value={formatCurrency(totalSales)} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Top Earner" value={topEarner?.repName || "—"} icon={Trophy} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Avg Commission Rate" value={`${avgRate}%`} icon={Users} color="text-blue-400" bg="bg-blue-500/10" />
      </div>

      <TabsNav
        tabs={[
          { key: "current", label: "Monthly View" },
          { key: "summary", label: "Rep Summary" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "current" && (
        <div className="space-y-4">
          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={currentMonthRecords}
            keyField="id"
            emptyTitle="No commission data"
            emptyDescription="No records for this month."
          />
        </div>
      )}

      {activeTab === "summary" && (
        <div className="space-y-4">
          {/* Rep Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repSummary.map((rep, i) => (
              <div key={rep.name} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                      i === 0 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      : i === 1 ? "bg-slate-400/10 text-slate-400 border border-slate-400/20"
                      : "bg-amber-700/10 text-amber-600 border border-amber-700/20"
                    }`}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">{Math.round(rep.rate * 100)}% commission rate</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sales</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(rep.totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Earned</p>
                    <p className="text-sm font-semibold text-[#74ddc7]">{formatCurrency(rep.totalCommission)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deals</p>
                    <p className="text-sm font-semibold text-foreground">{rep.totalDeals}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Monthly Breakdown</h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-3">Month</th>
                    <th className="text-right font-medium px-4 py-3">Total Sales</th>
                    <th className="text-right font-medium px-4 py-3 hidden sm:table-cell">Deals</th>
                    <th className="text-right font-medium px-4 py-3">Commissions Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((m) => {
                    const monthRecs = records.filter((r) => r.month === m);
                    const mSales = monthRecs.reduce((s, r) => s + r.totalSales, 0);
                    const mComm = monthRecs.reduce((s, r) => s + r.commissionEarned, 0);
                    const mDeals = monthRecs.reduce((s, r) => s + r.deals, 0);
                    return (
                      <tr key={m} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                        <td className="px-4 py-3 font-medium text-foreground">{monthLabel(m)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatCurrency(mSales)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{mDeals}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#74ddc7]">{formatCurrency(mComm)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
