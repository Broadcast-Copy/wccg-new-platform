"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatDate, formatCurrency } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Invoice {
  id: string;
  client: string;
  month: string;
  totalBilled: number;
  amountPaid: number;
  outstanding: number;
  status: "Paid" | "Sent" | "Draft" | "Overdue";
  issueDate: string;
  dueDate: string;
  spots: number;
  lineItems: { description: string; amount: number }[];
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_INVOICES: Invoice[] = [
  { id: "INV-2026-0301", client: "Cape Fear Auto Group", month: "March 2026", totalBilled: 8500, amountPaid: 8500, outstanding: 0, status: "Paid", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 120, lineItems: [{ description: "Morning Drive :30 x 60", amount: 4500 }, { description: "Afternoon Drive :30 x 40", amount: 2800 }, { description: "Midday :30 x 20", amount: 1200 }] },
  { id: "INV-2026-0302", client: "Fort Bragg FCU", month: "March 2026", totalBilled: 12000, amountPaid: 0, outstanding: 12000, status: "Sent", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 90, lineItems: [{ description: "Morning Drive :60 x 30", amount: 5400 }, { description: "Afternoon Drive :60 x 30", amount: 4200 }, { description: "Evening :60 x 30", amount: 2400 }] },
  { id: "INV-2026-0303", client: "Cross Creek Mall", month: "March 2026", totalBilled: 5200, amountPaid: 5200, outstanding: 0, status: "Paid", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 80, lineItems: [{ description: "Midday :30 x 40", amount: 2400 }, { description: "Afternoon Drive :30 x 40", amount: 2800 }] },
  { id: "INV-2026-0304", client: "Fayetteville Kia", month: "March 2026", totalBilled: 9800, amountPaid: 4900, outstanding: 4900, status: "Sent", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 100, lineItems: [{ description: "Morning Drive :30 x 50", amount: 3750 }, { description: "Afternoon Drive :30 x 30", amount: 2100 }, { description: "Evening :30 x 20", amount: 1200 }, { description: "Weekend :60 x 10", amount: 2750 }] },
  { id: "INV-2026-0305", client: "Lowe's Home Improvement", month: "March 2026", totalBilled: 4200, amountPaid: 0, outstanding: 4200, status: "Draft", issueDate: "2026-03-15", dueDate: "2026-04-15", spots: 60, lineItems: [{ description: "Midday :30 x 30", amount: 1800 }, { description: "Afternoon Drive :30 x 30", amount: 2400 }] },
  { id: "INV-2026-0306", client: "Carolina Ale House", month: "March 2026", totalBilled: 2400, amountPaid: 2400, outstanding: 0, status: "Paid", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 60, lineItems: [{ description: "Midday :15 x 60", amount: 2400 }] },
  { id: "INV-2026-0307", client: "NC Lottery", month: "March 2026", totalBilled: 6000, amountPaid: 6000, outstanding: 0, status: "Paid", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 80, lineItems: [{ description: "Morning Drive :30 x 40", amount: 3000 }, { description: "Afternoon Drive :30 x 40", amount: 3000 }] },
  { id: "INV-2026-0308", client: "Crown Complex", month: "March 2026", totalBilled: 7500, amountPaid: 0, outstanding: 7500, status: "Sent", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 50, lineItems: [{ description: "Morning Drive :60 x 20", amount: 3600 }, { description: "Evening :60 x 20", amount: 2400 }, { description: "Weekend :60 x 10", amount: 1500 }] },
  { id: "INV-2026-0209", client: "McDonald's Fayetteville", month: "February 2026", totalBilled: 3600, amountPaid: 0, outstanding: 3600, status: "Overdue", issueDate: "2026-02-01", dueDate: "2026-02-28", spots: 90, lineItems: [{ description: "All Day :30 x 90", amount: 3600 }] },
  { id: "INV-2026-0210", client: "State Farm - J. Williams", month: "February 2026", totalBilled: 2800, amountPaid: 0, outstanding: 2800, status: "Overdue", issueDate: "2026-02-01", dueDate: "2026-02-28", spots: 40, lineItems: [{ description: "Midday :30 x 40", amount: 2800 }] },
  { id: "INV-2026-0311", client: "Walmart Skibo Rd", month: "March 2026", totalBilled: 3000, amountPaid: 3000, outstanding: 0, status: "Paid", issueDate: "2026-03-01", dueDate: "2026-03-31", spots: 60, lineItems: [{ description: "Midday :15 x 30", amount: 1200 }, { description: "Afternoon :15 x 30", amount: 1800 }] },
  { id: "INV-2026-0312", client: "Fayetteville Tech", month: "March 2026", totalBilled: 3200, amountPaid: 0, outstanding: 3200, status: "Draft", issueDate: "2026-03-15", dueDate: "2026-04-15", spots: 40, lineItems: [{ description: "Midday :30 x 20", amount: 1200 }, { description: "Evening :30 x 20", amount: 2000 }] },
];

const STORAGE_KEY = "wccg:traffic-billing";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BillingDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    setMounted(true);
    setInvoices(loadOrSeed(STORAGE_KEY, SEED_INVOICES));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const totalBilled = invoices.reduce((s, i) => s + i.totalBilled, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.outstanding, 0);
  const pastDue = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.outstanding, 0);

  const filtered = tab === "all" ? invoices : invoices.filter((i) => i.status.toLowerCase() === tab);

  const tabs = [
    { key: "all", label: "All Invoices", count: invoices.length },
    { key: "paid", label: "Paid", count: invoices.filter((i) => i.status === "Paid").length },
    { key: "sent", label: "Sent", count: invoices.filter((i) => i.status === "Sent").length },
    { key: "draft", label: "Draft", count: invoices.filter((i) => i.status === "Draft").length },
    { key: "overdue", label: "Overdue", count: invoices.filter((i) => i.status === "Overdue").length },
  ];

  const columns: Column<Invoice>[] = [
    { key: "id", label: "Invoice #", sortable: true, sortKey: (r) => r.id, render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "client", label: "Client", sortable: true, sortKey: (r) => r.client, render: (r) => <span className="font-medium text-sm">{r.client}</span> },
    { key: "month", label: "Period", hideOnMobile: true, render: (r) => <span className="text-sm text-muted-foreground">{r.month}</span> },
    { key: "spots", label: "Spots", align: "center", hideOnMobile: true, render: (r) => <span className="text-sm">{r.spots}</span> },
    { key: "billed", label: "Billed", align: "right", sortable: true, sortKey: (r) => r.totalBilled, render: (r) => <span className="text-sm font-medium">{formatCurrency(r.totalBilled)}</span> },
    { key: "paid", label: "Paid", align: "right", hideOnMobile: true, render: (r) => <span className="text-sm text-emerald-400">{formatCurrency(r.amountPaid)}</span> },
    { key: "outstanding", label: "Outstanding", align: "right", sortable: true, sortKey: (r) => r.outstanding, render: (r) => <span className={`text-sm font-medium ${r.outstanding > 0 ? "text-red-400" : "text-muted-foreground"}`}>{formatCurrency(r.outstanding)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "due", label: "Due Date", hideOnMobile: true, sortable: true, sortKey: (r) => r.dueDate, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.dueDate)}</span> },
  ];

  const markPaid = (id: string) => {
    const updated = invoices.map((i) => i.id === id ? { ...i, status: "Paid" as const, amountPaid: i.totalBilled, outstanding: 0 } : i);
    setInvoices(updated);
    persist(STORAGE_KEY, updated);
    if (selected?.id === id) setSelected({ ...selected, status: "Paid", amountPaid: selected.totalBilled, outstanding: 0 });
  };

  // Monthly comparison data
  const months = [
    { month: "Oct 2025", billed: 52000, collected: 48000 },
    { month: "Nov 2025", billed: 58000, collected: 55000 },
    { month: "Dec 2025", billed: 62000, collected: 58000 },
    { month: "Jan 2026", billed: 48000, collected: 44000 },
    { month: "Feb 2026", billed: 54000, collected: 47600 },
    { month: "Mar 2026", billed: totalBilled, collected: totalCollected },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={DollarSign} title="Billing Dashboard" description="Monthly billing overview, invoices and collections" badge="Billing" badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Billed" value={formatCurrency(totalBilled)} icon={DollarSign} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Collected" value={formatCurrency(totalCollected)} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Past Due" value={formatCurrency(pastDue)} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Monthly Comparison */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Monthly Comparison</h2>
        <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
          <div className="flex gap-4 min-w-[500px]">
            {months.map((m) => {
              const pct = m.billed > 0 ? Math.round((m.collected / m.billed) * 100) : 0;
              return (
                <div key={m.month} className="flex-1 text-center">
                  <div className="text-[10px] text-muted-foreground mb-2">{m.month}</div>
                  <div className="relative h-20 bg-muted/20 rounded">
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-500/20 rounded" style={{ height: "100%" }} />
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/40 rounded transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{formatCurrency(m.billed)}</div>
                  <div className="text-[10px] text-emerald-400">{pct}% collected</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aging Summary */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Aging Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Current", amount: invoices.filter((i) => i.status === "Sent").reduce((s, i) => s + i.outstanding, 0), color: "text-blue-400 border-blue-500/20" },
            { label: "30 Days", amount: pastDue * 0.6, color: "text-yellow-400 border-yellow-500/20" },
            { label: "60 Days", amount: pastDue * 0.3, color: "text-orange-400 border-orange-500/20" },
            { label: "90+ Days", amount: pastDue * 0.1, color: "text-red-400 border-red-500/20" },
          ].map((bucket) => (
            <div key={bucket.label} className={`rounded-xl border bg-card p-4 ${bucket.color.split(" ")[1]}`}>
              <p className="text-xs text-muted-foreground">{bucket.label}</p>
              <p className={`text-lg font-bold mt-1 ${bucket.color.split(" ")[0]}`}>{formatCurrency(bucket.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <TabsNav tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search client or invoice..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.id || ""}
        subtitle={`${selected?.client} — ${selected?.month}`}
        maxWidth="max-w-lg"
        actions={
          selected && selected.status !== "Paid" && (
            <button onClick={() => markPaid(selected.id)} className="px-4 py-2 text-sm rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              Mark as Paid
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-xs text-muted-foreground">Total Spots</span><p className="text-sm font-medium">{selected.spots}</p></div>
              <div><span className="text-xs text-muted-foreground">Issue Date</span><p className="text-sm">{formatDate(selected.issueDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Due Date</span><p className="text-sm">{formatDate(selected.dueDate)}</p></div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Line Items</span>
              <div className="mt-1 rounded-lg border border-border divide-y divide-border">
                {selected.lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{li.description}</span>
                    <span className="font-medium">{formatCurrency(li.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 text-sm font-bold bg-muted/20">
                  <span>Total</span>
                  <span>{formatCurrency(selected.totalBilled)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Amount Paid</span><p className="text-sm font-medium text-emerald-400">{formatCurrency(selected.amountPaid)}</p></div>
              <div><span className="text-xs text-muted-foreground">Outstanding</span><p className={`text-sm font-medium ${selected.outstanding > 0 ? "text-red-400" : "text-muted-foreground"}`}>{formatCurrency(selected.outstanding)}</p></div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
