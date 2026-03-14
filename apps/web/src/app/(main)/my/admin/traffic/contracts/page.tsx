"use client";

import { useState, useEffect } from "react";
import {
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  DollarSign,
  CalendarClock,
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

interface Contract {
  id: string;
  client: string;
  contactName: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  monthlyMinimum: number;
  spotsPerWeek: number;
  daypartRestrictions: string;
  renewalDate: string;
  status: "Active" | "Expiring" | "Expired" | "Pending";
  autoRenew: boolean;
  notes: string;
  salesRep: string;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_CONTRACTS: Contract[] = [
  { id: "CTR-001", client: "Cape Fear Auto Group", contactName: "Bill Henderson", startDate: "2026-01-01", endDate: "2026-12-31", totalValue: 102000, monthlyMinimum: 8500, spotsPerWeek: 30, daypartRestrictions: "Morning Drive & Afternoon Drive preferred", renewalDate: "2026-11-30", status: "Active", autoRenew: true, notes: "Tier 1 advertiser. Annual contract with quarterly rate review.", salesRep: "Angela Davis" },
  { id: "CTR-002", client: "Fort Bragg FCU", contactName: "Lt. Davis Monroe", startDate: "2026-01-01", endDate: "2026-06-30", totalValue: 72000, monthlyMinimum: 12000, spotsPerWeek: 20, daypartRestrictions: "All dayparts, heavy on Morning Drive", renewalDate: "2026-06-01", status: "Active", autoRenew: false, notes: "Renegotiating rate for second half of year.", salesRep: "Angela Davis" },
  { id: "CTR-003", client: "Cross Creek Mall", contactName: "Diane Foster", startDate: "2026-01-01", endDate: "2026-03-31", totalValue: 15600, monthlyMinimum: 5200, spotsPerWeek: 20, daypartRestrictions: "Midday & Afternoon Drive", renewalDate: "2026-03-15", status: "Expiring", autoRenew: false, notes: "Renewal discussion scheduled for 3/20. May increase budget for Q2.", salesRep: "Tanya Brooks" },
  { id: "CTR-004", client: "Fayetteville Kia", contactName: "Greg Palmer", startDate: "2025-10-01", endDate: "2026-03-31", totalValue: 58800, monthlyMinimum: 9800, spotsPerWeek: 25, daypartRestrictions: "Morning Drive, Afternoon Drive, Weekends", renewalDate: "2026-03-15", status: "Expiring", autoRenew: true, notes: "Auto-renew clause, but client has expressed interest in restructuring.", salesRep: "Angela Davis" },
  { id: "CTR-005", client: "Carolina Ale House", contactName: "Mike Torres", startDate: "2026-02-01", endDate: "2026-05-31", totalValue: 9600, monthlyMinimum: 2400, spotsPerWeek: 15, daypartRestrictions: "Midday only (lunch specials)", renewalDate: "2026-05-01", status: "Active", autoRenew: true, notes: "Lunch-time only campaign. Consistent performer.", salesRep: "Lisa Henderson" },
  { id: "CTR-006", client: "NC Lottery", contactName: "State Advertising Dept", startDate: "2026-01-01", endDate: "2026-12-31", totalValue: 72000, monthlyMinimum: 6000, spotsPerWeek: 20, daypartRestrictions: "All dayparts", renewalDate: "2026-11-01", status: "Active", autoRenew: true, notes: "State contract, annual renewal. No rate negotiation.", salesRep: "Angela Davis" },
  { id: "CTR-007", client: "Crown Complex", contactName: "Robert King", startDate: "2026-02-01", endDate: "2026-04-30", totalValue: 22500, monthlyMinimum: 7500, spotsPerWeek: 15, daypartRestrictions: "Morning Drive & Evening preferred", renewalDate: "2026-04-15", status: "Active", autoRenew: false, notes: "Event-based contract for spring concert series.", salesRep: "Tanya Brooks" },
  { id: "CTR-008", client: "McDonald's Fayetteville", contactName: "Janet Owens", startDate: "2025-07-01", endDate: "2025-12-31", totalValue: 21600, monthlyMinimum: 3600, spotsPerWeek: 20, daypartRestrictions: "All dayparts", renewalDate: "2025-12-01", status: "Expired", autoRenew: false, notes: "Contract expired. AR has outstanding balance. Hold new contract until paid.", salesRep: "Lisa Henderson" },
  { id: "CTR-009", client: "State Farm - J. Williams", contactName: "Justin Williams", startDate: "2026-04-01", endDate: "2026-09-30", totalValue: 16800, monthlyMinimum: 2800, spotsPerWeek: 10, daypartRestrictions: "Midday", renewalDate: "2026-09-01", status: "Pending", autoRenew: false, notes: "New client. Contract pending signature. Production order submitted.", salesRep: "Tanya Brooks" },
  { id: "CTR-010", client: "Fayetteville Tech", contactName: "Dr. Mark Evans", startDate: "2026-04-01", endDate: "2026-08-31", totalValue: 16000, monthlyMinimum: 3200, spotsPerWeek: 10, daypartRestrictions: "Midday & Evening", renewalDate: "2026-08-01", status: "Pending", autoRenew: false, notes: "Seasonal enrollment campaign. Pending final budget approval.", salesRep: "Lisa Henderson" },
  { id: "CTR-011", client: "Walmart Skibo Rd", contactName: "Corporate Advertising", startDate: "2025-01-01", endDate: "2025-12-31", totalValue: 36000, monthlyMinimum: 3000, spotsPerWeek: 15, daypartRestrictions: "Midday & Afternoon", renewalDate: "2025-11-01", status: "Expired", autoRenew: false, notes: "Corporate did not renew. Local manager exploring independent buy.", salesRep: "Angela Davis" },
];

const STORAGE_KEY = "wccg:traffic-contracts";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContractsPage() {
  const [mounted, setMounted] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    setMounted(true);
    setContracts(loadOrSeed(STORAGE_KEY, SEED_CONTRACTS));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const active = contracts.filter((c) => c.status === "Active").length;
  const expiring = contracts.filter((c) => c.status === "Expiring").length;
  const expired = contracts.filter((c) => c.status === "Expired").length;
  const totalValue = contracts.filter((c) => c.status === "Active" || c.status === "Expiring").reduce((s, c) => s + c.totalValue, 0);

  // Renewal alerts: contracts expiring within 30 days
  const now = new Date();
  const renewalAlerts = contracts.filter((c) => {
    if (c.status === "Expired") return false;
    const renewal = new Date(c.renewalDate);
    const diff = (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  });

  const filtered = tab === "all" ? contracts : contracts.filter((c) => c.status.toLowerCase() === tab);

  const tabs = [
    { key: "all", label: "All Contracts", count: contracts.length },
    { key: "active", label: "Active", count: active },
    { key: "expiring", label: "Expiring", count: expiring },
    { key: "pending", label: "Pending", count: contracts.filter((c) => c.status === "Pending").length },
    { key: "expired", label: "Expired", count: expired },
  ];

  const columns: Column<Contract>[] = [
    { key: "id", label: "Contract #", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "client", label: "Client", sortable: true, sortKey: (r) => r.client, render: (r) => <span className="font-medium text-sm">{r.client}</span> },
    { key: "start", label: "Start", hideOnMobile: true, sortable: true, sortKey: (r) => r.startDate, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.startDate)}</span> },
    { key: "end", label: "End", sortable: true, sortKey: (r) => r.endDate, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.endDate)}</span> },
    { key: "value", label: "Total Value", align: "right", sortable: true, sortKey: (r) => r.totalValue, render: (r) => <span className="text-sm font-medium">{formatCurrency(r.totalValue)}</span> },
    { key: "monthly", label: "Monthly Min", align: "right", hideOnMobile: true, render: (r) => <span className="text-sm text-muted-foreground">{formatCurrency(r.monthlyMinimum)}</span> },
    { key: "spots", label: "Spots/Wk", align: "center", hideOnMobile: true, render: (r) => <span className="text-sm">{r.spotsPerWeek}</span> },
    { key: "renewal", label: "Renewal", hideOnMobile: true, render: (r) => {
      const renewal = new Date(r.renewalDate);
      const diff = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const urgent = diff <= 30 && diff >= 0;
      return <span className={`text-xs ${urgent ? "text-red-400 font-medium" : "text-muted-foreground"}`}>{formatDate(r.renewalDate)}{urgent ? ` (${diff}d)` : ""}</span>;
    }},
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={FileCheck} title="Contracts" description="Active advertising contracts, renewals and terms" badge="Contracts" badgeColor="bg-indigo-500/10 text-indigo-400 border-indigo-500/20" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Contracts" value={active} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Expiring Soon" value={expiring} icon={CalendarClock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Active Contract Value" value={formatCurrency(totalValue)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Expired" value={expired} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Renewal Alerts */}
      {renewalAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" /> Renewal Alerts (within 30 days)
          </h2>
          <div className="space-y-2">
            {renewalAlerts.map((c) => {
              const diff = Math.ceil((new Date(c.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="w-full text-left rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-center gap-4 hover:bg-yellow-500/10 transition-colors"
                >
                  <CalendarClock className="h-5 w-5 text-yellow-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.client}</p>
                    <p className="text-xs text-muted-foreground">{c.id} — Renewal in {diff} days ({formatDate(c.renewalDate)}){c.autoRenew ? " — Auto-renew" : ""}</p>
                  </div>
                  <span className="text-sm font-medium text-yellow-400">{formatCurrency(c.totalValue)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <TabsNav tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search client or contract..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${selected?.id} — ${selected?.client}`}
        subtitle={`Sales Rep: ${selected?.salesRep}`}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Contact</span><p className="text-sm">{selected.contactName}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-xs text-muted-foreground">Start Date</span><p className="text-sm">{formatDate(selected.startDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">End Date</span><p className="text-sm">{formatDate(selected.endDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Total Value</span><p className="text-sm font-bold">{formatCurrency(selected.totalValue)}</p></div>
              <div><span className="text-xs text-muted-foreground">Monthly Minimum</span><p className="text-sm">{formatCurrency(selected.monthlyMinimum)}</p></div>
              <div><span className="text-xs text-muted-foreground">Spots per Week</span><p className="text-sm">{selected.spotsPerWeek}</p></div>
              <div><span className="text-xs text-muted-foreground">Auto-Renew</span><p className="text-sm">{selected.autoRenew ? "Yes" : "No"}</p></div>
              <div><span className="text-xs text-muted-foreground">Renewal Date</span><p className="text-sm">{formatDate(selected.renewalDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Sales Rep</span><p className="text-sm">{selected.salesRep}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Daypart Restrictions</span><p className="text-sm text-muted-foreground mt-1">{selected.daypartRestrictions}</p></div>
            <div><span className="text-xs text-muted-foreground">Notes</span><p className="text-sm text-muted-foreground mt-1">{selected.notes}</p></div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
