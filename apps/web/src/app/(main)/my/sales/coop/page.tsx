"use client";

import { useState, useEffect } from "react";
import {
  Handshake,
  DollarSign,
  Clock,
  AlertTriangle,
  Plus,
  Building2,
  Calendar,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, persist, genId, formatCurrency, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClaimStatus = "Available" | "Claimed" | "Submitted" | "Approved" | "Denied" | "Expired";

interface CoOpRecord {
  id: string;
  manufacturer: string;
  localClient: string;
  programName: string;
  totalAvailable: number;
  amountUsed: number;
  remaining: number;
  expirationDate: string;
  claimStatus: ClaimStatus;
  claimDate: string | null;
  notes: string;
}

const KEY = "wccg_sales_coop";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_COOP: CoOpRecord[] = [
  { id: "co1", manufacturer: "Toyota Motor Corp", localClient: "Fort Liberty Auto Group", programName: "Toyota Tier 2 Co-Op", totalAvailable: 15000, amountUsed: 6200, remaining: 8800, expirationDate: "2026-06-30", claimStatus: "Claimed", claimDate: "2026-02-15", notes: "Spring campaign allocation. Must use Toyota-approved creative." },
  { id: "co2", manufacturer: "Coca-Cola Company", localClient: "Mash House Brewing", programName: "Coca-Cola Fountain Partner", totalAvailable: 5000, amountUsed: 0, remaining: 5000, expirationDate: "2026-12-31", claimStatus: "Available", claimDate: null, notes: "Restaurant partner program. Requires Coca-Cola mention in spots." },
  { id: "co3", manufacturer: "Ford Motor Company", localClient: "Fort Liberty Auto Group", programName: "Ford Regional Co-Op", totalAvailable: 12000, amountUsed: 12000, remaining: 0, expirationDate: "2026-03-31", claimStatus: "Approved", claimDate: "2026-01-10", notes: "Q1 allocation fully utilized. Reimbursement pending." },
  { id: "co4", manufacturer: "Procter & Gamble", localClient: "Cross Creek Mall", programName: "P&G Retail Co-Op", totalAvailable: 8000, amountUsed: 3500, remaining: 4500, expirationDate: "2026-09-30", claimStatus: "Submitted", claimDate: "2026-03-01", notes: "Beauty department promotion. P&G reviewing claim." },
  { id: "co5", manufacturer: "State Farm Insurance", localClient: "State Farm - Dave Miller Agency", programName: "State Farm Local Agent Co-Op", totalAvailable: 4000, amountUsed: 1800, remaining: 2200, expirationDate: "2026-06-30", claimStatus: "Claimed", claimDate: "2026-02-20", notes: "Must follow State Farm brand guidelines." },
  { id: "co6", manufacturer: "McDonald's Corp", localClient: "McDonald's of Fayetteville", programName: "McD's Local Advertising Co-Op", totalAvailable: 10000, amountUsed: 4200, remaining: 5800, expirationDate: "2026-06-30", claimStatus: "Claimed", claimDate: "2026-01-15", notes: "Breakfast and value menu promotion." },
  { id: "co7", manufacturer: "Verizon Communications", localClient: "Verizon - Skibo Rd", programName: "Verizon Authorized Retailer Co-Op", totalAvailable: 6000, amountUsed: 0, remaining: 6000, expirationDate: "2026-04-15", claimStatus: "Available", claimDate: null, notes: "Expires soon. Must be claimed by April 1." },
  { id: "co8", manufacturer: "General Motors", localClient: "Heritage Chevrolet", programName: "GM Dealer Co-Op Advertising", totalAvailable: 18000, amountUsed: 7500, remaining: 10500, expirationDate: "2026-12-31", claimStatus: "Claimed", claimDate: "2026-02-01", notes: "Truck month and year-end clearance campaigns." },
  { id: "co9", manufacturer: "Anheuser-Busch InBev", localClient: "Huske Hardware House", programName: "AB InBev On-Premise Co-Op", totalAvailable: 3500, amountUsed: 3500, remaining: 0, expirationDate: "2025-12-31", claimStatus: "Expired", claimDate: "2025-10-15", notes: "2025 allocation expired. New 2026 funds pending." },
  { id: "co10", manufacturer: "AT&T Inc", localClient: "AT&T Store - Cross Creek", programName: "AT&T Authorized Dealer Co-Op", totalAvailable: 5500, amountUsed: 2000, remaining: 3500, expirationDate: "2026-06-30", claimStatus: "Submitted", claimDate: "2026-03-05", notes: "Holiday promo reimbursement submitted." },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoOpTrackerPage() {
  const [records, setRecords] = useState<CoOpRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({
    manufacturer: "",
    localClient: "",
    programName: "",
    totalAvailable: "",
    amountUsed: "",
    expirationDate: "",
    notes: "",
  });

  useEffect(() => {
    setMounted(true);
    setRecords(loadOrSeed(KEY, SEED_COOP));
  }, []);

  if (!mounted) return null;

  // Stats
  const totalAvailable = records.reduce((s, r) => s + r.remaining, 0);
  const totalUsed = records.reduce((s, r) => s + r.amountUsed, 0);
  const expiringSoon = records.filter((r) => {
    const exp = new Date(r.expirationDate);
    const now = new Date("2026-03-14");
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30 && r.remaining > 0;
  }).length;
  const pendingClaims = records.filter((r) => r.claimStatus === "Submitted").length;

  function handleAddRecord() {
    if (!newRecord.manufacturer.trim() || !newRecord.localClient.trim()) return;
    const total = Number(newRecord.totalAvailable) || 0;
    const used = Number(newRecord.amountUsed) || 0;
    const record: CoOpRecord = {
      id: genId("co"),
      manufacturer: newRecord.manufacturer,
      localClient: newRecord.localClient,
      programName: newRecord.programName,
      totalAvailable: total,
      amountUsed: used,
      remaining: total - used,
      expirationDate: newRecord.expirationDate || "2026-12-31",
      claimStatus: "Available",
      claimDate: null,
      notes: newRecord.notes,
    };
    const updated = [...records, record];
    setRecords(updated);
    persist(KEY, updated);
    setNewRecord({ manufacturer: "", localClient: "", programName: "", totalAvailable: "", amountUsed: "", expirationDate: "", notes: "" });
    setShowAdd(false);
  }

  const columns: Column<CoOpRecord>[] = [
    {
      key: "manufacturer",
      label: "Manufacturer",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.manufacturer}</p>
          <p className="text-[11px] text-muted-foreground">{row.programName}</p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.manufacturer,
    },
    {
      key: "client",
      label: "Local Client",
      hideOnMobile: true,
      render: (row) => <span className="text-sm text-foreground">{row.localClient}</span>,
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      hideOnMobile: true,
      sortable: true,
      sortKey: (row) => row.totalAvailable,
      render: (row) => <span className="text-muted-foreground">{formatCurrency(row.totalAvailable)}</span>,
    },
    {
      key: "used",
      label: "Used",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{formatCurrency(row.amountUsed)}</span>,
    },
    {
      key: "remaining",
      label: "Remaining",
      align: "right",
      sortable: true,
      sortKey: (row) => row.remaining,
      render: (row) => (
        <span className={`font-semibold ${row.remaining > 0 ? "text-[#74ddc7]" : "text-muted-foreground"}`}>
          {formatCurrency(row.remaining)}
        </span>
      ),
    },
    {
      key: "expires",
      label: "Expires",
      hideOnMobile: true,
      render: (row) => {
        const exp = new Date(row.expirationDate);
        const now = new Date("2026-03-14");
        const daysLeft = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <span className="text-xs text-muted-foreground">{formatDate(row.expirationDate)}</span>
            {daysLeft > 0 && daysLeft <= 30 && row.remaining > 0 && (
              <p className="text-[10px] text-orange-400 font-medium">{daysLeft}d left</p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.claimStatus} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Handshake}
        title="Co-Op Tracker"
        description="Track co-op advertising funds from manufacturers and vendors."
      >
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#74ddc7] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Co-Op
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Funds" value={formatCurrency(totalAvailable)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Funds Used" value={formatCurrency(totalUsed)} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Expiring Soon" value={expiringSoon.toString()} icon={AlertTriangle} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard label="Pending Claims" value={pendingClaims.toString()} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={records}
        keyField="id"
        searchable
        searchPlaceholder="Search by manufacturer, client, or program..."
        searchFilter={(row, q) =>
          row.manufacturer.toLowerCase().includes(q) ||
          row.localClient.toLowerCase().includes(q) ||
          row.programName.toLowerCase().includes(q)
        }
        emptyIcon={<Handshake className="h-8 w-8 text-foreground/20" />}
        emptyTitle="No co-op records"
        emptyDescription="Add your first co-op fund to start tracking."
      />

      {/* Add Modal */}
      <DetailModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Co-Op Fund"
        subtitle="Log a new co-op advertising program"
        maxWidth="max-w-md"
        actions={
          <>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="button" onClick={handleAddRecord} className="px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-[#74ddc7] rounded-lg hover:bg-[#74ddc7]/90 transition-colors inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />Save</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Manufacturer / Vendor *</label>
            <input type="text" value={newRecord.manufacturer} onChange={(e) => setNewRecord((p) => ({ ...p, manufacturer: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Toyota Motor Corp" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Local Client *</label>
            <input type="text" value={newRecord.localClient} onChange={(e) => setNewRecord((p) => ({ ...p, localClient: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Fort Liberty Auto Group" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Program Name</label>
            <input type="text" value={newRecord.programName} onChange={(e) => setNewRecord((p) => ({ ...p, programName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Total Available ($)</label>
              <input type="number" value={newRecord.totalAvailable} onChange={(e) => setNewRecord((p) => ({ ...p, totalAvailable: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount Used ($)</label>
              <input type="number" value={newRecord.amountUsed} onChange={(e) => setNewRecord((p) => ({ ...p, amountUsed: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Expiration Date</label>
            <input type="date" value={newRecord.expirationDate} onChange={(e) => setNewRecord((p) => ({ ...p, expirationDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={newRecord.notes} onChange={(e) => setNewRecord((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
