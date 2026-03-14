"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle,
  MessageSquare,
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

interface ARAccount {
  id: string;
  client: string;
  contactName: string;
  contactPhone: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90plus: number;
  totalOwed: number;
  lastPayment: string;
  lastPaymentAmount: number;
  status: "Current" | "Past Due" | "Collections" | "Paid";
  notes: CollectionNote[];
}

interface CollectionNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_AR: ARAccount[] = [
  { id: "ar1", client: "Cape Fear Auto Group", contactName: "Bill Henderson", contactPhone: "(910) 555-2001", current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, totalOwed: 0, lastPayment: "2026-03-10", lastPaymentAmount: 8500, status: "Paid", notes: [{ id: "n1", date: "2026-03-10", author: "Sarah Mitchell", text: "Payment received in full. Account current." }] },
  { id: "ar2", client: "Fort Bragg FCU", contactName: "Lt. Davis Monroe", contactPhone: "(910) 555-2002", current: 12000, days30: 0, days60: 0, days90: 0, days90plus: 0, totalOwed: 12000, lastPayment: "2026-02-28", lastPaymentAmount: 11000, status: "Current", notes: [{ id: "n2", date: "2026-03-01", author: "Sarah Mitchell", text: "March invoice sent. Payment expected by 3/31." }] },
  { id: "ar3", client: "Fayetteville Kia", contactName: "Greg Palmer", contactPhone: "(910) 555-2004", current: 4900, days30: 3200, days60: 0, days90: 0, days90plus: 0, totalOwed: 8100, lastPayment: "2026-02-15", lastPaymentAmount: 4900, status: "Past Due", notes: [{ id: "n3", date: "2026-03-12", author: "Sarah Mitchell", text: "Called Greg, he says payment processing next week." }, { id: "n3b", date: "2026-03-05", author: "Mike Johnson", text: "Sent reminder email for February balance." }] },
  { id: "ar4", client: "McDonald's Fayetteville", contactName: "Janet Owens", contactPhone: "(910) 555-2005", current: 0, days30: 3600, days60: 2800, days90: 0, days90plus: 0, totalOwed: 6400, lastPayment: "2026-01-05", lastPaymentAmount: 3200, status: "Past Due", notes: [{ id: "n4", date: "2026-03-10", author: "Sarah Mitchell", text: "Left voicemail for Janet. No response yet." }, { id: "n4b", date: "2026-03-01", author: "Sarah Mitchell", text: "Sent past-due letter via mail and email." }] },
  { id: "ar5", client: "State Farm - J. Williams", contactName: "Justin Williams", contactPhone: "(910) 555-2006", current: 0, days30: 2800, days60: 0, days90: 0, days90plus: 0, totalOwed: 2800, lastPayment: "2026-01-30", lastPaymentAmount: 2800, status: "Past Due", notes: [{ id: "n5", date: "2026-03-08", author: "Mike Johnson", text: "Justin says he'll mail check this week." }] },
  { id: "ar6", client: "Cross Creek Mall", contactName: "Diane Foster", contactPhone: "(910) 555-2003", current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, totalOwed: 0, lastPayment: "2026-03-08", lastPaymentAmount: 5200, status: "Paid", notes: [] },
  { id: "ar7", client: "Crown Complex", contactName: "Robert King", contactPhone: "(910) 555-2007", current: 7500, days30: 0, days60: 0, days90: 0, days90plus: 0, totalOwed: 7500, lastPayment: "2026-02-25", lastPaymentAmount: 6000, status: "Current", notes: [{ id: "n7", date: "2026-03-02", author: "Sarah Mitchell", text: "Invoice sent for March gospel concert campaign." }] },
  { id: "ar8", client: "Carolina Ale House", contactName: "Mike Torres", contactPhone: "(910) 555-2008", current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, totalOwed: 0, lastPayment: "2026-03-05", lastPaymentAmount: 2400, status: "Paid", notes: [] },
  { id: "ar9", client: "NC Lottery", contactName: "State Advertising Dept", contactPhone: "(919) 555-3001", current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0, totalOwed: 0, lastPayment: "2026-03-12", lastPaymentAmount: 6000, status: "Paid", notes: [] },
  { id: "ar10", client: "Walmart Skibo Rd", contactName: "Corporate AR", contactPhone: "(800) 555-9999", current: 0, days30: 0, days60: 0, days90: 3000, days90plus: 2400, totalOwed: 5400, lastPayment: "2025-11-15", lastPaymentAmount: 3000, status: "Collections", notes: [{ id: "n10", date: "2026-03-01", author: "Sarah Mitchell", text: "Escalated to corporate AR department. Awaiting response." }, { id: "n10b", date: "2026-02-15", author: "Sarah Mitchell", text: "Third past-due notice sent. No response from local contact." }] },
];

const STORAGE_KEY = "wccg:traffic-ar";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountsReceivablePage() {
  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<ARAccount[]>([]);
  const [selected, setSelected] = useState<ARAccount | null>(null);
  const [tab, setTab] = useState("all");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    setMounted(true);
    setAccounts(loadOrSeed(STORAGE_KEY, SEED_AR));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const totalCurrent = accounts.reduce((s, a) => s + a.current, 0);
  const total30 = accounts.reduce((s, a) => s + a.days30, 0);
  const total60 = accounts.reduce((s, a) => s + a.days60, 0);
  const total90 = accounts.reduce((s, a) => s + a.days90 + a.days90plus, 0);
  const totalOwed = accounts.reduce((s, a) => s + a.totalOwed, 0);

  const filtered = tab === "all" ? accounts : accounts.filter((a) => a.status.toLowerCase().replace(" ", "-") === tab);

  const tabs = [
    { key: "all", label: "All Accounts", count: accounts.length },
    { key: "current", label: "Current", count: accounts.filter((a) => a.status === "Current").length },
    { key: "past-due", label: "Past Due", count: accounts.filter((a) => a.status === "Past Due").length },
    { key: "collections", label: "Collections", count: accounts.filter((a) => a.status === "Collections").length },
    { key: "paid", label: "Paid", count: accounts.filter((a) => a.status === "Paid").length },
  ];

  const addNote = () => {
    if (!selected || !newNote.trim()) return;
    const note: CollectionNote = { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), author: "Sarah Mitchell", text: newNote.trim() };
    const updated = accounts.map((a) => a.id === selected.id ? { ...a, notes: [note, ...a.notes] } : a);
    setAccounts(updated);
    persist(STORAGE_KEY, updated);
    setSelected({ ...selected, notes: [note, ...selected.notes] });
    setNewNote("");
  };

  const columns: Column<ARAccount>[] = [
    { key: "client", label: "Client", sortable: true, sortKey: (r) => r.client, render: (r) => <div><span className="font-medium text-sm">{r.client}</span><p className="text-xs text-muted-foreground">{r.contactName}</p></div> },
    { key: "current", label: "Current", align: "right", sortable: true, sortKey: (r) => r.current, render: (r) => <span className={`text-sm ${r.current > 0 ? "text-blue-400" : "text-muted-foreground"}`}>{formatCurrency(r.current)}</span> },
    { key: "30", label: "30 Days", align: "right", hideOnMobile: true, render: (r) => <span className={`text-sm ${r.days30 > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>{formatCurrency(r.days30)}</span> },
    { key: "60", label: "60 Days", align: "right", hideOnMobile: true, render: (r) => <span className={`text-sm ${r.days60 > 0 ? "text-orange-400" : "text-muted-foreground"}`}>{formatCurrency(r.days60)}</span> },
    { key: "90", label: "90+ Days", align: "right", hideOnMobile: true, render: (r) => <span className={`text-sm ${(r.days90 + r.days90plus) > 0 ? "text-red-400" : "text-muted-foreground"}`}>{formatCurrency(r.days90 + r.days90plus)}</span> },
    { key: "total", label: "Total Owed", align: "right", sortable: true, sortKey: (r) => r.totalOwed, render: (r) => <span className="text-sm font-bold">{formatCurrency(r.totalOwed)}</span> },
    { key: "lastPay", label: "Last Payment", hideOnMobile: true, render: (r) => <div className="text-xs text-muted-foreground"><p>{formatDate(r.lastPayment)}</p><p className="text-emerald-400">{formatCurrency(r.lastPaymentAmount)}</p></div> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "Past Due" ? "Overdue" : r.status === "Collections" ? "Critical" : r.status} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={CreditCard} title="Accounts Receivable" description="AR aging, payment tracking and collection notes" badge="AR" badgeColor="bg-orange-500/10 text-orange-400 border-orange-500/20" />

      {/* Aging buckets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Current" value={formatCurrency(totalCurrent)} icon={DollarSign} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="30 Days" value={formatCurrency(total30)} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="60 Days" value={formatCurrency(total60)} icon={Clock} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard label="90+ Days" value={formatCurrency(total90)} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
        <StatCard label="Total Outstanding" value={formatCurrency(totalOwed)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
      </div>

      <TabsNav tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search client..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.contactName.toLowerCase().includes(q)}
        onRowClick={(r) => { setSelected(r); setNewNote(""); }}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.client || ""}
        subtitle={`Contact: ${selected?.contactName} ${selected?.contactPhone}`}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status === "Past Due" ? "Overdue" : selected.status} /></p></div>
              <div><span className="text-xs text-muted-foreground">Total Owed</span><p className="text-lg font-bold">{formatCurrency(selected.totalOwed)}</p></div>
              <div><span className="text-xs text-muted-foreground">Last Payment</span><p className="text-sm">{formatDate(selected.lastPayment)} ({formatCurrency(selected.lastPaymentAmount)})</p></div>
            </div>

            {/* Aging breakdown */}
            <div>
              <span className="text-xs text-muted-foreground">Aging Breakdown</span>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[
                  { label: "Current", val: selected.current, color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
                  { label: "30 Days", val: selected.days30, color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" },
                  { label: "60 Days", val: selected.days60, color: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
                  { label: "90+ Days", val: selected.days90 + selected.days90plus, color: "bg-red-500/10 border-red-500/20 text-red-400" },
                ].map((b) => (
                  <div key={b.label} className={`rounded-lg border p-2 text-center ${b.color}`}>
                    <p className="text-[10px] uppercase tracking-wider">{b.label}</p>
                    <p className="text-sm font-bold mt-0.5">{formatCurrency(b.val)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection notes */}
            <div>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Collection Notes</span>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a collection note..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                />
                <button onClick={addNote} className="px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">
                  Add
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {selected.notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{note.author}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(note.date)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.text}</p>
                  </div>
                ))}
                {selected.notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>}
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
