"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  X,
  DollarSign,
  Calendar,
  Building2,
  Trash2,
  Eye,
  Save,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { DataTable, type Column } from "@/components/admin/data-table";
import { loadOrSeed, persist, genId, formatCurrency, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DayPart = "Morning Drive" | "Midday" | "Afternoon Drive" | "Evening" | "Overnight" | "Weekend";
type SpotType = ":30 Spot" | ":60 Spot" | "Sponsorship";

interface LineItem {
  id: string;
  spotType: SpotType;
  dayPart: DayPart;
  quantity: number;
  rate: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

interface Proposal {
  id: string;
  clientName: string;
  campaignName: string;
  flightStart: string;
  flightEnd: string;
  lineItems: LineItem[];
  addOns: AddOn[];
  subtotal: number;
  addOnTotal: number;
  total: number;
  status: "Draft" | "Sent" | "Accepted" | "Declined";
  createdAt: string;
  notes: string;
}

const SPOT_TYPES: SpotType[] = [":30 Spot", ":60 Spot", "Sponsorship"];
const DAYPARTS: DayPart[] = ["Morning Drive", "Midday", "Afternoon Drive", "Evening", "Overnight", "Weekend"];

const DEFAULT_RATES: Record<SpotType, Record<DayPart, number>> = {
  ":30 Spot": { "Morning Drive": 75, Midday: 45, "Afternoon Drive": 65, Evening: 35, Overnight: 15, Weekend: 50 },
  ":60 Spot": { "Morning Drive": 125, Midday: 75, "Afternoon Drive": 110, Evening: 55, Overnight: 25, Weekend: 85 },
  Sponsorship: { "Morning Drive": 250, Midday: 150, "Afternoon Drive": 225, Evening: 100, Overnight: 50, Weekend: 175 },
};

const DEFAULT_ADDONS: AddOn[] = [
  { id: "ao1", name: "Website Banner Ad (Monthly)", price: 500, selected: false },
  { id: "ao2", name: "Social Media Package (10 Posts)", price: 750, selected: false },
  { id: "ao3", name: "Live Remote Event", price: 1500, selected: false },
  { id: "ao4", name: "Email Newsletter Mention", price: 300, selected: false },
  { id: "ao5", name: "Streaming Audio Pre-Roll", price: 400, selected: false },
];

const KEY = "wccg_sales_proposals";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_PROPOSALS: Proposal[] = [
  {
    id: "prop1", clientName: "Fort Liberty Auto Group", campaignName: "Summer Blowout Sale",
    flightStart: "2026-06-01", flightEnd: "2026-06-30",
    lineItems: [
      { id: "li1", spotType: ":30 Spot", dayPart: "Morning Drive", quantity: 40, rate: 75 },
      { id: "li2", spotType: ":60 Spot", dayPart: "Afternoon Drive", quantity: 20, rate: 110 },
    ],
    addOns: [
      { ...DEFAULT_ADDONS[0], selected: true },
      { ...DEFAULT_ADDONS[1], selected: true },
      { ...DEFAULT_ADDONS[2], selected: false },
    ],
    subtotal: 5200, addOnTotal: 1250, total: 6450,
    status: "Sent", createdAt: "2026-03-05T10:00:00Z", notes: "Emphasize Memorial Day weekend tie-in.",
  },
  {
    id: "prop2", clientName: "Cape Fear Valley Health", campaignName: "Wellness Awareness Month",
    flightStart: "2026-04-01", flightEnd: "2026-04-30",
    lineItems: [
      { id: "li3", spotType: "Sponsorship", dayPart: "Morning Drive", quantity: 20, rate: 250 },
      { id: "li4", spotType: ":30 Spot", dayPart: "Midday", quantity: 30, rate: 45 },
    ],
    addOns: [{ ...DEFAULT_ADDONS[3], selected: true }],
    subtotal: 6350, addOnTotal: 300, total: 6650,
    status: "Accepted", createdAt: "2026-02-20T14:00:00Z", notes: "PSA format approved by hospital board.",
  },
  {
    id: "prop3", clientName: "Cross Creek Mall", campaignName: "Spring Fashion Preview",
    flightStart: "2026-03-15", flightEnd: "2026-04-15",
    lineItems: [
      { id: "li5", spotType: ":30 Spot", dayPart: "Afternoon Drive", quantity: 50, rate: 65 },
    ],
    addOns: [{ ...DEFAULT_ADDONS[1], selected: true }, { ...DEFAULT_ADDONS[2], selected: true }],
    subtotal: 3250, addOnTotal: 2250, total: 5500,
    status: "Draft", createdAt: "2026-03-10T09:00:00Z", notes: "",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  // Builder state
  const [clientName, setClientName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [flightStart, setFlightStart] = useState("");
  const [flightEnd, setFlightEnd] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>(DEFAULT_ADDONS.map((a) => ({ ...a })));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setMounted(true);
    setProposals(loadOrSeed(KEY, SEED_PROPOSALS));
  }, []);

  if (!mounted) return null;

  // Stats
  const totalProposals = proposals.length;
  const totalValue = proposals.reduce((s, p) => s + p.total, 0);
  const accepted = proposals.filter((p) => p.status === "Accepted").length;
  const pending = proposals.filter((p) => p.status === "Sent").length;

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: genId("li"), spotType: ":30 Spot", dayPart: "Morning Drive", quantity: 10, rate: 75 },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  function updateLineItem(id: string, field: string, value: string | number) {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: value };
        if (field === "spotType" || field === "dayPart") {
          const st = field === "spotType" ? (value as SpotType) : li.spotType;
          const dp = field === "dayPart" ? (value as DayPart) : li.dayPart;
          updated.rate = DEFAULT_RATES[st]?.[dp] || 0;
        }
        return updated;
      })
    );
  }

  function toggleAddOn(id: string) {
    setAddOns((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  }

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.rate, 0);
  const addOnTotal = addOns.filter((a) => a.selected).reduce((s, a) => s + a.price, 0);
  const total = subtotal + addOnTotal;

  function handleSaveProposal() {
    if (!clientName.trim() || !campaignName.trim() || lineItems.length === 0) return;
    const proposal: Proposal = {
      id: genId("prop"),
      clientName,
      campaignName,
      flightStart,
      flightEnd,
      lineItems: [...lineItems],
      addOns: addOns.filter((a) => a.selected),
      subtotal,
      addOnTotal,
      total,
      status: "Draft",
      createdAt: new Date().toISOString(),
      notes,
    };
    const updated = [...proposals, proposal];
    setProposals(updated);
    persist(KEY, updated);
    resetBuilder();
  }

  function resetBuilder() {
    setShowBuilder(false);
    setClientName("");
    setCampaignName("");
    setFlightStart("");
    setFlightEnd("");
    setLineItems([]);
    setAddOns(DEFAULT_ADDONS.map((a) => ({ ...a })));
    setNotes("");
  }

  const columns: Column<Proposal>[] = [
    {
      key: "campaign",
      label: "Campaign",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.campaignName}</p>
          <p className="text-[11px] text-muted-foreground">{row.clientName}</p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.campaignName,
    },
    {
      key: "flight",
      label: "Flight Dates",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.flightStart && row.flightEnd ? `${formatDate(row.flightStart)} - ${formatDate(row.flightEnd)}` : "TBD"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      sortable: true,
      sortKey: (row) => row.total,
      render: (row) => <span className="font-semibold text-foreground">{formatCurrency(row.total)}</span>,
    },
    {
      key: "actions",
      label: "",
      align: "center",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPreviewProposal(row); }}
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={FileText}
        title="Proposal Builder"
        description="Build and manage formal advertising proposals for clients."
      >
        <button
          type="button"
          onClick={() => setShowBuilder(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#74ddc7] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Proposal
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Proposals" value={totalProposals.toString()} icon={FileText} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Total Value" value={formatCurrency(totalValue)} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Accepted" value={accepted.toString()} icon={FileText} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Pending" value={pending.toString()} icon={FileText} color="text-yellow-400" bg="bg-yellow-500/10" />
      </div>

      {/* Proposals Table */}
      <DataTable
        columns={columns}
        data={proposals}
        keyField="id"
        searchable
        searchPlaceholder="Search proposals..."
        searchFilter={(row, q) => row.campaignName.toLowerCase().includes(q) || row.clientName.toLowerCase().includes(q)}
        onRowClick={setPreviewProposal}
        emptyIcon={<FileText className="h-8 w-8 text-foreground/20" />}
        emptyTitle="No proposals yet"
        emptyDescription="Create your first proposal to get started."
      />

      {/* Builder Modal */}
      <DetailModal
        open={showBuilder}
        onClose={resetBuilder}
        title="Build Proposal"
        subtitle="Create a new advertising proposal"
        maxWidth="max-w-2xl"
        actions={
          <>
            <button type="button" onClick={resetBuilder} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="button" onClick={handleSaveProposal} className="px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-[#74ddc7] rounded-lg hover:bg-[#74ddc7]/90 transition-colors inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />Save Proposal</button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Client & Campaign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Client Name *</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Fort Liberty Auto Group" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Campaign Name *</label>
              <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Summer Sale" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Flight Start</label>
              <input type="date" value={flightStart} onChange={(e) => setFlightStart(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Flight End</label>
              <input type="date" value={flightEnd} onChange={(e) => setFlightEnd(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Line Items</h4>
              <button type="button" onClick={addLineItem} className="inline-flex items-center gap-1 text-xs font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors">
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">No line items. Click &quot;Add Item&quot; to start.</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((li) => (
                  <div key={li.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <select value={li.spotType} onChange={(e) => updateLineItem(li.id, "spotType", e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                        {SPOT_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <select value={li.dayPart} onChange={(e) => updateLineItem(li.id, "dayPart", e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                        {DAYPARTS.map((dp) => <option key={dp} value={dp}>{dp}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" value={li.quantity} onChange={(e) => updateLineItem(li.id, "quantity", Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="Qty" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" value={li.rate} onChange={(e) => updateLineItem(li.id, "rate", Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="Rate" />
                    </div>
                    <div className="col-span-1 text-right text-xs font-semibold text-foreground py-1.5">
                      {formatCurrency(li.quantity * li.rate)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeLineItem(li.id)} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add-Ons */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add-Ons</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {addOns.map((ao) => (
                <label key={ao.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${ao.selected ? "border-[#74ddc7]/30 bg-[#74ddc7]/5" : "border-border hover:border-input"}`}>
                  <input type="checkbox" checked={ao.selected} onChange={() => toggleAddOn(ao.id)} className="rounded border-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{ao.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatCurrency(ao.price)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-4 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Add-Ons</span><span className="text-foreground">{formatCurrency(addOnTotal)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2"><span className="text-foreground">Total</span><span className="text-[#74ddc7]">{formatCurrency(total)}</span></div>
          </div>
        </div>
      </DetailModal>

      {/* Preview Modal */}
      <DetailModal
        open={!!previewProposal}
        onClose={() => setPreviewProposal(null)}
        title="Proposal Preview"
        subtitle={previewProposal ? `${previewProposal.clientName} — ${previewProposal.campaignName}` : ""}
        maxWidth="max-w-lg"
      >
        {previewProposal && (
          <div className="space-y-6">
            <div className="text-center space-y-1 pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">WCCG 104.5 FM</h2>
              <p className="text-xs text-muted-foreground">Fayetteville, NC — Advertising Proposal</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Client</p><p className="font-medium text-foreground">{previewProposal.clientName}</p></div>
              <div><p className="text-xs text-muted-foreground">Campaign</p><p className="font-medium text-foreground">{previewProposal.campaignName}</p></div>
              <div><p className="text-xs text-muted-foreground">Flight Dates</p><p className="font-medium text-foreground">{previewProposal.flightStart && previewProposal.flightEnd ? `${formatDate(previewProposal.flightStart)} - ${formatDate(previewProposal.flightEnd)}` : "TBD"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={previewProposal.status} /></div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/30 border-b border-border"><th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th><th className="text-left px-3 py-2 font-medium text-muted-foreground">Daypart</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate</th><th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th></tr></thead>
                <tbody>
                  {previewProposal.lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-foreground">{li.spotType}</td>
                      <td className="px-3 py-2 text-muted-foreground">{li.dayPart}</td>
                      <td className="px-3 py-2 text-right text-foreground">{li.quantity}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(li.rate)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(li.quantity * li.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewProposal.addOns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add-Ons</h4>
                {previewProposal.addOns.filter((a) => a.selected).map((a) => (
                  <div key={a.id} className="flex justify-between text-sm"><span className="text-foreground">{a.name}</span><span className="text-muted-foreground">{formatCurrency(a.price)}</span></div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(previewProposal.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Add-Ons</span><span>{formatCurrency(previewProposal.addOnTotal)}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2"><span>Total</span><span className="text-[#74ddc7]">{formatCurrency(previewProposal.total)}</span></div>
            </div>

            {previewProposal.notes && (
              <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{previewProposal.notes}</p></div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
