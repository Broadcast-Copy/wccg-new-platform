"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  DollarSign,
  TrendingUp,
  Receipt,
  Building,
  Wrench,
  Laptop,
  Plane,
  Megaphone,
  FileText,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, genId, formatDate, formatCurrency } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Expense {
  id: string;
  date: string;
  vendor: string;
  category: "Office Supplies" | "Utilities" | "Equipment" | "Maintenance" | "Travel" | "Marketing" | "Subscriptions";
  description: string;
  amount: number;
  paymentMethod: "Company Card" | "Check" | "ACH" | "Cash" | "Wire";
  receiptStatus: "Attached" | "Pending" | "Missing";
  approvedBy: string;
  submittedBy: string;
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

interface MonthlyBudget {
  category: string;
  budget: number;
  actual: number;
}

const MONTHLY_BUDGETS: MonthlyBudget[] = [
  { category: "Office Supplies", budget: 800, actual: 623 },
  { category: "Utilities", budget: 3200, actual: 2890 },
  { category: "Equipment", budget: 2000, actual: 1495 },
  { category: "Maintenance", budget: 1500, actual: 875 },
  { category: "Travel", budget: 1000, actual: 425 },
  { category: "Marketing", budget: 2500, actual: 1850 },
  { category: "Subscriptions", budget: 1200, actual: 1180 },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_EXPENSES: Expense[] = [
  { id: "exp1", date: "2026-03-14", vendor: "Staples", category: "Office Supplies", description: "Printer paper, toner cartridges, pens", amount: 187, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Patricia Young" },
  { id: "exp2", date: "2026-03-13", vendor: "Duke Energy", category: "Utilities", description: "March electricity - studio & transmitter site", amount: 1245, paymentMethod: "ACH", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Sarah Mitchell" },
  { id: "exp3", date: "2026-03-12", vendor: "Spectrum Business", category: "Utilities", description: "Internet & phone service - March", amount: 489, paymentMethod: "ACH", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Sarah Mitchell" },
  { id: "exp4", date: "2026-03-12", vendor: "B&H Photo", category: "Equipment", description: "Shure SM7B microphone for Studio B", amount: 399, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "James Carter" },
  { id: "exp5", date: "2026-03-11", vendor: "HVAC Solutions Fayetteville", category: "Maintenance", description: "Quarterly HVAC maintenance - transmitter building", amount: 375, paymentMethod: "Check", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Devon Robinson" },
  { id: "exp6", date: "2026-03-10", vendor: "Amazon Business", category: "Office Supplies", description: "Cable organizers, USB hubs, cleaning supplies", amount: 136, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Patricia Young" },
  { id: "exp7", date: "2026-03-10", vendor: "Canva Pro", category: "Subscriptions", description: "Annual design subscription renewal", amount: 120, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Brandon Lee" },
  { id: "exp8", date: "2026-03-09", vendor: "Facebook/Meta", category: "Marketing", description: "Social media ad spend - March Week 2", amount: 450, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Brandon Lee" },
  { id: "exp9", date: "2026-03-08", vendor: "Vistaprint", category: "Marketing", description: "Business cards & promotional flyers - 1000ct", amount: 285, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Brandon Lee" },
  { id: "exp10", date: "2026-03-07", vendor: "Southwest Airlines", category: "Travel", description: "Flight to NAB Show - Angela Davis", amount: 425, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Angela Davis" },
  { id: "exp11", date: "2026-03-06", vendor: "WideOrbit", category: "Subscriptions", description: "Traffic system monthly license", amount: 650, paymentMethod: "ACH", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Sarah Mitchell" },
  { id: "exp12", date: "2026-03-05", vendor: "Sweetwater Sound", category: "Equipment", description: "Audio cables, adapters, patch bay", amount: 296, paymentMethod: "Company Card", receiptStatus: "Pending", approvedBy: "Sarah Mitchell", submittedBy: "James Carter" },
  { id: "exp13", date: "2026-03-04", vendor: "City of Fayetteville", category: "Utilities", description: "Water & sewer - studio building", amount: 156, paymentMethod: "Check", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Sarah Mitchell" },
  { id: "exp14", date: "2026-03-03", vendor: "Google Workspace", category: "Subscriptions", description: "Monthly email & docs - 15 users", amount: 210, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Devon Robinson" },
  { id: "exp15", date: "2026-03-02", vendor: "Tower Maintenance Co.", category: "Maintenance", description: "Quarterly tower inspection & lighting check", amount: 500, paymentMethod: "Check", receiptStatus: "Missing", approvedBy: "Marcus Thompson", submittedBy: "James Carter" },
  { id: "exp16", date: "2026-03-01", vendor: "Adobe Creative Cloud", category: "Subscriptions", description: "Monthly creative suite - 3 licenses", amount: 200, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Chris Morgan" },
  { id: "exp17", date: "2026-03-01", vendor: "Waste Management", category: "Utilities", description: "Monthly waste & recycling pickup", amount: 85, paymentMethod: "ACH", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Patricia Young" },
  { id: "exp18", date: "2026-03-14", vendor: "Office Depot", category: "Office Supplies", description: "Desk organizer, file folders, labels", amount: 112, paymentMethod: "Company Card", receiptStatus: "Pending", approvedBy: "", submittedBy: "Patricia Young" },
  { id: "exp19", date: "2026-03-13", vendor: "Facebook/Meta", category: "Marketing", description: "Social media ad spend - March Week 3", amount: 450, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Marcus Thompson", submittedBy: "Brandon Lee" },
  { id: "exp20", date: "2026-03-08", vendor: "Spotify for Podcasters", category: "Subscriptions", description: "Premium podcast hosting - monthly", amount: 0, paymentMethod: "Company Card", receiptStatus: "Attached", approvedBy: "Sarah Mitchell", submittedBy: "Keisha Williams" },
];

const STORAGE_KEY = "wccg:traffic-expenses";

const CAT_ICONS: Record<string, typeof DollarSign> = {
  "Office Supplies": FileText,
  Utilities: Zap,
  Equipment: Laptop,
  Maintenance: Wrench,
  Travel: Plane,
  Marketing: Megaphone,
  Subscriptions: Receipt,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExpenseTrackingPage() {
  const [mounted, setMounted] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [tab, setTab] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  // New expense form
  const [newDate, setNewDate] = useState("2026-03-14");
  const [newVendor, setNewVendor] = useState("");
  const [newCat, setNewCat] = useState<Expense["category"]>("Office Supplies");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState<Expense["paymentMethod"]>("Company Card");

  useEffect(() => {
    setMounted(true);
    setExpenses(loadOrSeed(STORAGE_KEY, SEED_EXPENSES));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const addExpense = () => {
    if (!newVendor.trim() || !newAmount) return;
    const exp: Expense = {
      id: genId("exp"),
      date: newDate,
      vendor: newVendor,
      category: newCat,
      description: newDesc,
      amount: parseFloat(newAmount) || 0,
      paymentMethod: newMethod,
      receiptStatus: "Pending",
      approvedBy: "",
      submittedBy: "Sarah Mitchell",
    };
    const updated = [exp, ...expenses];
    setExpenses(updated);
    persist(STORAGE_KEY, updated);
    setShowAdd(false);
    setNewVendor(""); setNewDesc(""); setNewAmount("");
  };

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalBudget = MONTHLY_BUDGETS.reduce((s, b) => s + b.budget, 0);
  const pendingReceipts = expenses.filter((e) => e.receiptStatus === "Pending" || e.receiptStatus === "Missing").length;
  const categories = [...new Set(expenses.map((e) => e.category))];

  const filtered = tab === "all" ? expenses : expenses.filter((e) => e.category === tab);

  const allTabs = [
    { key: "all", label: "All", count: expenses.length },
    ...categories.map((c) => ({ key: c, label: c, count: expenses.filter((e) => e.category === c).length })),
  ];

  const columns: Column<Expense>[] = [
    { key: "date", label: "Date", sortable: true, sortKey: (r) => r.date, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span> },
    { key: "vendor", label: "Vendor", sortable: true, sortKey: (r) => r.vendor, render: (r) => <span className="font-medium text-sm">{r.vendor}</span> },
    { key: "cat", label: "Category", render: (r) => {
      const Icon = CAT_ICONS[r.category] || DollarSign;
      return <div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs">{r.category}</span></div>;
    }},
    { key: "desc", label: "Description", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{r.description}</span> },
    { key: "amount", label: "Amount", align: "right", sortable: true, sortKey: (r) => r.amount, render: (r) => <span className="text-sm font-medium">{formatCurrency(r.amount)}</span> },
    { key: "method", label: "Method", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.paymentMethod}</span> },
    { key: "receipt", label: "Receipt", render: (r) => <StatusBadge status={r.receiptStatus === "Attached" ? "Completed" : r.receiptStatus === "Pending" ? "Pending" : "Overdue"} /> },
    { key: "approved", label: "Approved By", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.approvedBy || "---"}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={CreditCard} title="Expense Tracking" description="Office and station expense management" badge="Expenses" badgeColor="bg-amber-500/10 text-amber-400 border-amber-500/20">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Spent (March)" value={formatCurrency(totalSpent)} icon={DollarSign} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Monthly Budget" value={formatCurrency(totalBudget)} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Budget Remaining" value={formatCurrency(totalBudget - totalSpent)} icon={DollarSign} color={totalBudget - totalSpent > 0 ? "text-[#74ddc7]" : "text-red-400"} bg={totalBudget - totalSpent > 0 ? "bg-[#74ddc7]/10" : "bg-red-500/10"} />
        <StatCard label="Pending Receipts" value={pendingReceipts} icon={Receipt} color="text-yellow-400" bg="bg-yellow-500/10" />
      </div>

      {/* Budget vs Actual */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Budget vs Actual</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {MONTHLY_BUDGETS.map((b) => {
            const pct = b.budget > 0 ? Math.round((b.actual / b.budget) * 100) : 0;
            const over = b.actual > b.budget;
            return (
              <div key={b.category} className="flex items-center gap-4 px-4 py-3">
                <div className="w-32 text-sm font-medium">{b.category}</div>
                <div className="flex-1">
                  <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 bottom-0 rounded-full transition-all ${
                        over ? "bg-red-500/60" : pct > 80 ? "bg-yellow-500/60" : "bg-emerald-500/60"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground">{formatCurrency(b.actual)} / {formatCurrency(b.budget)}</div>
                <div className={`w-12 text-right text-xs font-medium ${over ? "text-red-400" : pct > 80 ? "text-yellow-400" : "text-emerald-400"}`}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <TabsNav tabs={allTabs} active={tab} onChange={setTab} />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search vendor or description..."
        searchFilter={(r, q) => r.vendor.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      {/* Detail */}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} title={selected?.vendor || ""} subtitle={selected?.category} maxWidth="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Date</span><p className="text-sm">{formatDate(selected.date)}</p></div>
              <div><span className="text-xs text-muted-foreground">Amount</span><p className="text-lg font-bold">{formatCurrency(selected.amount)}</p></div>
              <div><span className="text-xs text-muted-foreground">Payment Method</span><p className="text-sm">{selected.paymentMethod}</p></div>
              <div><span className="text-xs text-muted-foreground">Receipt</span><p className="mt-0.5"><StatusBadge status={selected.receiptStatus === "Attached" ? "Completed" : selected.receiptStatus} /></p></div>
              <div><span className="text-xs text-muted-foreground">Submitted By</span><p className="text-sm">{selected.submittedBy}</p></div>
              <div><span className="text-xs text-muted-foreground">Approved By</span><p className="text-sm">{selected.approvedBy || "Pending approval"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm text-muted-foreground mt-1">{selected.description}</p></div>
          </div>
        )}
      </DetailModal>

      {/* Add Expense */}
      <DetailModal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense" subtitle="Log a new expense" maxWidth="max-w-lg"
        actions={<button onClick={addExpense} className="px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">Add Expense</button>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground">Date</label><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
            <div><label className="text-xs text-muted-foreground">Amount ($)</label><input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Vendor</label><input type="text" value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="Vendor name" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <select value={newCat} onChange={(e) => setNewCat(e.target.value as Expense["category"])} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>Office Supplies</option><option>Utilities</option><option>Equipment</option><option>Maintenance</option><option>Travel</option><option>Marketing</option><option>Subscriptions</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Payment Method</label>
              <select value={newMethod} onChange={(e) => setNewMethod(e.target.value as Expense["paymentMethod"])} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>Company Card</option><option>Check</option><option>ACH</option><option>Cash</option><option>Wire</option>
              </select>
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground">Description</label><textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Expense description..." className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
        </div>
      </DetailModal>
    </div>
  );
}
