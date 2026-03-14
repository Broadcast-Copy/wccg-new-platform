"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, genId, formatCurrency, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgingBucket = "Current" | "1-30 Days" | "31-60 Days" | "61-90 Days" | "90+ Days";

interface ARRecord {
  id: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  daysOutstanding: number;
  agingBucket: AgingBucket;
  status: "Current" | "Overdue" | "Paid" | "Collections";
  contactName: string;
  lastPayment: string | null;
}

const AGING_COLORS: Record<AgingBucket, string> = {
  Current: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "1-30 Days": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "31-60 Days": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "61-90 Days": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "90+ Days": "bg-red-500/10 text-red-400 border-red-500/20",
};

const KEY = "wccg_sales_ar";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_AR: ARRecord[] = [
  { id: "ar1", clientName: "Fort Liberty Auto Group", invoiceNumber: "INV-2026-0045", amount: 8400, invoiceDate: "2026-03-01", dueDate: "2026-03-31", daysOutstanding: 0, agingBucket: "Current", status: "Current", contactName: "James Williams", lastPayment: "2026-02-15" },
  { id: "ar2", clientName: "Cross Creek Mall", invoiceNumber: "INV-2026-0038", amount: 5500, invoiceDate: "2026-02-15", dueDate: "2026-03-17", daysOutstanding: 0, agingBucket: "Current", status: "Current", contactName: "Sarah Johnson", lastPayment: "2026-01-20" },
  { id: "ar3", clientName: "Cape Fear Valley Health", invoiceNumber: "INV-2026-0032", amount: 6200, invoiceDate: "2026-02-01", dueDate: "2026-03-03", daysOutstanding: 11, agingBucket: "1-30 Days", status: "Overdue", contactName: "Dr. Michael Brown", lastPayment: "2025-12-28" },
  { id: "ar4", clientName: "Mash House Brewing", invoiceNumber: "INV-2026-0028", amount: 3750, invoiceDate: "2026-01-15", dueDate: "2026-02-14", daysOutstanding: 28, agingBucket: "1-30 Days", status: "Overdue", contactName: "Kim Taylor", lastPayment: "2025-11-30" },
  { id: "ar5", clientName: "Crown Complex", invoiceNumber: "INV-2025-0198", amount: 12000, invoiceDate: "2025-12-20", dueDate: "2026-01-19", daysOutstanding: 54, agingBucket: "31-60 Days", status: "Overdue", contactName: "Lisa Martinez", lastPayment: "2025-10-15" },
  { id: "ar6", clientName: "Fayetteville Woodpeckers", invoiceNumber: "INV-2025-0185", amount: 7800, invoiceDate: "2025-12-01", dueDate: "2025-12-31", daysOutstanding: 73, agingBucket: "61-90 Days", status: "Overdue", contactName: "Mark Thompson", lastPayment: "2025-09-30" },
  { id: "ar7", clientName: "Joe's Pizza Palace", invoiceNumber: "INV-2025-0152", amount: 2400, invoiceDate: "2025-10-15", dueDate: "2025-11-14", daysOutstanding: 120, agingBucket: "90+ Days", status: "Collections", contactName: "Joe Romano", lastPayment: null },
  { id: "ar8", clientName: "Cumberland County Schools", invoiceNumber: "INV-2026-0042", amount: 4500, invoiceDate: "2026-02-25", dueDate: "2026-03-27", daysOutstanding: 0, agingBucket: "Current", status: "Current", contactName: "Angela Davis", lastPayment: "2026-02-10" },
  { id: "ar9", clientName: "Huske Hardware House", invoiceNumber: "INV-2025-0170", amount: 3200, invoiceDate: "2025-11-10", dueDate: "2025-12-10", daysOutstanding: 94, agingBucket: "90+ Days", status: "Collections", contactName: "Tom Davis", lastPayment: "2025-08-15" },
  { id: "ar10", clientName: "Fayetteville State University", invoiceNumber: "INV-2026-0041", amount: 11000, invoiceDate: "2026-02-20", dueDate: "2026-03-22", daysOutstanding: 0, agingBucket: "Current", status: "Current", contactName: "Kevin Moore", lastPayment: "2026-01-28" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountsReceivablePage() {
  const [records, setRecords] = useState<ARRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    setMounted(true);
    setRecords(loadOrSeed(KEY, SEED_AR));
  }, []);

  if (!mounted) return null;

  // Stats
  const totalAR = records.reduce((s, r) => s + r.amount, 0);
  const currentAR = records.filter((r) => r.agingBucket === "Current").reduce((s, r) => s + r.amount, 0);
  const overdueAR = records.filter((r) => r.status === "Overdue" || r.status === "Collections").reduce((s, r) => s + r.amount, 0);
  const collectionsAR = records.filter((r) => r.status === "Collections").reduce((s, r) => s + r.amount, 0);

  // Aging breakdown
  const agingBuckets: AgingBucket[] = ["Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days"];
  const agingData = agingBuckets.map((bucket) => ({
    bucket,
    count: records.filter((r) => r.agingBucket === bucket).length,
    total: records.filter((r) => r.agingBucket === bucket).reduce((s, r) => s + r.amount, 0),
  }));

  const filteredRecords = activeTab === "all"
    ? records
    : records.filter((r) => {
        if (activeTab === "current") return r.agingBucket === "Current";
        if (activeTab === "overdue") return r.status === "Overdue";
        if (activeTab === "collections") return r.status === "Collections";
        return true;
      });

  const columns: Column<ARRecord>[] = [
    {
      key: "client",
      label: "Client",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.clientName}</p>
          <p className="text-[11px] text-muted-foreground">{row.contactName}</p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.clientName,
    },
    {
      key: "invoice",
      label: "Invoice",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground font-mono">{row.invoiceNumber}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      sortable: true,
      sortKey: (row) => row.amount,
      render: (row) => <span className="font-semibold text-foreground">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "dueDate",
      label: "Due Date",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.dueDate)}</span>,
    },
    {
      key: "days",
      label: "Days Out",
      align: "center",
      sortable: true,
      sortKey: (row) => row.daysOutstanding,
      render: (row) => (
        <span className={`text-xs font-semibold ${row.daysOutstanding > 60 ? "text-red-400" : row.daysOutstanding > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
          {row.daysOutstanding}
        </span>
      ),
    },
    {
      key: "aging",
      label: "Aging",
      render: (row) => (
        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${AGING_COLORS[row.agingBucket]}`}>
          {row.agingBucket}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Receipt}
        title="Accounts Receivable"
        description="AR aging report and outstanding invoice management."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total AR" value={formatCurrency(totalAR)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Current" value={formatCurrency(currentAR)} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Overdue" value={formatCurrency(overdueAR)} icon={AlertCircle} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="In Collections" value={formatCurrency(collectionsAR)} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Aging Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Aging Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {agingData.map((ag) => (
            <div key={ag.bucket} className={`rounded-xl border p-4 ${AGING_COLORS[ag.bucket]}`}>
              <p className="text-xs font-bold uppercase tracking-wider">{ag.bucket}</p>
              <p className="text-xl font-bold mt-2">{formatCurrency(ag.total)}</p>
              <p className="text-[11px] mt-1 opacity-70">{ag.count} invoice{ag.count !== 1 ? "s" : ""}</p>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full bg-current opacity-50"
                  style={{ width: `${totalAR > 0 ? (ag.total / totalAR) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs & Table */}
      <TabsNav
        tabs={[
          { key: "all", label: "All Invoices", count: records.length },
          { key: "current", label: "Current", count: records.filter((r) => r.agingBucket === "Current").length },
          { key: "overdue", label: "Overdue", count: records.filter((r) => r.status === "Overdue").length },
          { key: "collections", label: "Collections", count: records.filter((r) => r.status === "Collections").length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <DataTable
        columns={columns}
        data={filteredRecords}
        keyField="id"
        searchable
        searchPlaceholder="Search by client or invoice..."
        searchFilter={(row, q) => row.clientName.toLowerCase().includes(q) || row.invoiceNumber.toLowerCase().includes(q)}
        emptyIcon={<Receipt className="h-8 w-8 text-foreground/20" />}
        emptyTitle="No records found"
        emptyDescription="No invoices match the current filter."
      />
    </div>
  );
}
