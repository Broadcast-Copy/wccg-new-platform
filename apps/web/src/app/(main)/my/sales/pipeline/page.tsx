"use client";

import { useState, useEffect } from "react";
import {
  Target,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  X,
  GripVertical,
  Building2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, persist, genId, formatCurrency } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStage = "Prospecting" | "Qualification" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";

interface PipelineDeal {
  id: string;
  clientName: string;
  dealName: string;
  value: number;
  probability: number;
  stage: PipelineStage;
  daysInStage: number;
  contactName: string;
  notes: string;
  createdAt: string;
}

const STAGES: PipelineStage[] = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_COLORS: Record<PipelineStage, string> = {
  Prospecting: "border-blue-500/30 bg-blue-500/5",
  Qualification: "border-purple-500/30 bg-purple-500/5",
  Proposal: "border-yellow-500/30 bg-yellow-500/5",
  Negotiation: "border-orange-500/30 bg-orange-500/5",
  "Closed Won": "border-emerald-500/30 bg-emerald-500/5",
  "Closed Lost": "border-red-500/30 bg-red-500/5",
};

const STAGE_HEADER_COLORS: Record<PipelineStage, string> = {
  Prospecting: "text-blue-400",
  Qualification: "text-purple-400",
  Proposal: "text-yellow-400",
  Negotiation: "text-orange-400",
  "Closed Won": "text-emerald-400",
  "Closed Lost": "text-red-400",
};

const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  Prospecting: 10,
  Qualification: 25,
  Proposal: 50,
  Negotiation: 75,
  "Closed Won": 100,
  "Closed Lost": 0,
};

const KEY = "wccg_sales_pipeline";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_DEALS: PipelineDeal[] = [
  { id: "pd1", clientName: "Fort Liberty Auto Group", dealName: "Summer Blowout Campaign", value: 15000, probability: 10, stage: "Prospecting", daysInStage: 3, contactName: "James Williams", notes: "Initial outreach via phone. Interested in morning drive.", createdAt: "2026-03-10T10:00:00Z" },
  { id: "pd2", clientName: "Fayetteville Woodpeckers", dealName: "2026 Season Sponsorship", value: 24000, probability: 10, stage: "Prospecting", daysInStage: 7, contactName: "Mark Thompson", notes: "Wants multi-platform package with in-game mentions.", createdAt: "2026-03-07T14:00:00Z" },
  { id: "pd3", clientName: "Cape Fear Valley Health", dealName: "Health Awareness Series", value: 18000, probability: 25, stage: "Qualification", daysInStage: 5, contactName: "Dr. Michael Brown", notes: "Budget confirmed. Needs PSA format approval from board.", createdAt: "2026-03-05T09:00:00Z" },
  { id: "pd4", clientName: "Cross Creek Mall", dealName: "Spring Fashion Event", value: 9500, probability: 50, stage: "Proposal", daysInStage: 4, contactName: "Sarah Johnson", notes: "Proposal sent. Awaiting marketing director review.", createdAt: "2026-03-03T11:00:00Z" },
  { id: "pd5", clientName: "Huske Hardware House", dealName: "Weekend Brunch Promo", value: 4200, probability: 50, stage: "Proposal", daysInStage: 2, contactName: "Tom Davis", notes: "Wants :30 spots during weekend morning drive.", createdAt: "2026-03-08T15:00:00Z" },
  { id: "pd6", clientName: "Crown Complex", dealName: "Concert Series Advertising", value: 12000, probability: 75, stage: "Negotiation", daysInStage: 6, contactName: "Lisa Martinez", notes: "Negotiating package rate. Close to agreement.", createdAt: "2026-02-28T10:00:00Z" },
  { id: "pd7", clientName: "Mash House Brewing", dealName: "Trivia Night Sponsorship", value: 6800, probability: 75, stage: "Negotiation", daysInStage: 3, contactName: "Kim Taylor", notes: "Wants 6-month commitment at reduced rate.", createdAt: "2026-03-04T13:00:00Z" },
  { id: "pd8", clientName: "Cumberland County Schools", dealName: "Back to School Drive", value: 8500, probability: 100, stage: "Closed Won", daysInStage: 0, contactName: "Angela Davis", notes: "Contract signed. Flights start July 15.", createdAt: "2026-02-15T09:00:00Z" },
  { id: "pd9", clientName: "Fayetteville State University", dealName: "Homecoming Package", value: 11000, probability: 100, stage: "Closed Won", daysInStage: 0, contactName: "Kevin Moore", notes: "Full package with live remote.", createdAt: "2026-02-20T10:00:00Z" },
  { id: "pd10", clientName: "Joe's Pizza Palace", dealName: "Grand Opening Campaign", value: 3200, probability: 0, stage: "Closed Lost", daysInStage: 0, contactName: "Joe Romano", notes: "Budget constraints. May revisit Q3.", createdAt: "2026-02-10T08:00:00Z" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesPipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const [newDeal, setNewDeal] = useState({
    clientName: "",
    dealName: "",
    value: "",
    contactName: "",
    notes: "",
    stage: "Prospecting" as PipelineStage,
  });

  useEffect(() => {
    setMounted(true);
    setDeals(loadOrSeed(KEY, SEED_DEALS));
  }, []);

  if (!mounted) return null;

  // Stats
  const activeDeals = deals.filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  const totalPipelineValue = activeDeals.reduce((s, d) => s + d.value, 0);
  const weightedValue = activeDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const avgDealSize = activeDeals.length > 0 ? totalPipelineValue / activeDeals.length : 0;
  const closedWon = deals.filter((d) => d.stage === "Closed Won").length;
  const closedLost = deals.filter((d) => d.stage === "Closed Lost").length;
  const winRate = closedWon + closedLost > 0 ? Math.round((closedWon / (closedWon + closedLost)) * 100) : 0;

  function handleAddDeal() {
    if (!newDeal.clientName.trim() || !newDeal.dealName.trim() || !newDeal.value) return;
    const deal: PipelineDeal = {
      id: genId("pd"),
      clientName: newDeal.clientName,
      dealName: newDeal.dealName,
      value: Number(newDeal.value),
      probability: STAGE_PROBABILITY[newDeal.stage],
      stage: newDeal.stage,
      daysInStage: 0,
      contactName: newDeal.contactName,
      notes: newDeal.notes,
      createdAt: new Date().toISOString(),
    };
    const updated = [...deals, deal];
    setDeals(updated);
    persist(KEY, updated);
    setNewDeal({ clientName: "", dealName: "", value: "", contactName: "", notes: "", stage: "Prospecting" });
    setShowAdd(false);
  }

  function moveDeal(dealId: string, newStage: PipelineStage) {
    const updated = deals.map((d) =>
      d.id === dealId
        ? { ...d, stage: newStage, probability: STAGE_PROBABILITY[newStage], daysInStage: 0 }
        : d
    );
    setDeals(updated);
    persist(KEY, updated);
    setSelectedDeal(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Target}
        title="Sales Pipeline"
        description="Track deals through every stage from prospecting to close."
      >
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#74ddc7] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Deal
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pipeline" value={formatCurrency(totalPipelineValue)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Weighted Value" value={formatCurrency(weightedValue)} icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Avg Deal Size" value={formatCurrency(avgDealSize)} icon={DollarSign} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Win Rate" value={`${winRate}%`} icon={Percent} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage} className={`rounded-xl border ${STAGE_COLORS[stage]} p-4 space-y-3 min-h-[200px]`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${STAGE_HEADER_COLORS[stage]}`}>
                  {stage}
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {stageDeals.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{formatCurrency(stageTotal)}</p>

              <div className="space-y-2">
                {stageDeals.map((deal) => (
                  <button
                    key={deal.id}
                    type="button"
                    onClick={() => setSelectedDeal(deal)}
                    className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-input transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-tight">{deal.dealName}</p>
                      <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground truncate">{deal.clientName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">{formatCurrency(deal.value)}</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {deal.daysInStage}d
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-[#74ddc7] h-1 rounded-full transition-all"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{deal.probability}% probability</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Deal Modal */}
      <DetailModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Deal"
        subtitle="Add a deal to the sales pipeline"
        maxWidth="max-w-md"
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDeal}
              className="px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-[#74ddc7] rounded-lg hover:bg-[#74ddc7]/90 transition-colors"
            >
              Add Deal
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Client Name *</label>
            <input type="text" value={newDeal.clientName} onChange={(e) => setNewDeal((p) => ({ ...p, clientName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Fort Liberty Auto Group" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Deal Name *</label>
            <input type="text" value={newDeal.dealName} onChange={(e) => setNewDeal((p) => ({ ...p, dealName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Summer Sale Campaign" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Deal Value ($) *</label>
              <input type="number" value={newDeal.value} onChange={(e) => setNewDeal((p) => ({ ...p, value: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="15000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Stage</label>
              <select value={newDeal.stage} onChange={(e) => setNewDeal((p) => ({ ...p, stage: e.target.value as PipelineStage }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                {STAGES.filter((s) => s !== "Closed Won" && s !== "Closed Lost").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Contact Name</label>
            <input type="text" value={newDeal.contactName} onChange={(e) => setNewDeal((p) => ({ ...p, contactName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={newDeal.notes} onChange={(e) => setNewDeal((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          </div>
        </div>
      </DetailModal>

      {/* Deal Detail Modal */}
      <DetailModal
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        title={selectedDeal?.dealName || ""}
        subtitle={selectedDeal?.clientName}
        maxWidth="max-w-md"
      >
        {selectedDeal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Deal Value</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(selectedDeal.value)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Probability</p>
                <p className="text-lg font-bold text-foreground">{selectedDeal.probability}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Stage</p>
                <p className="text-sm font-semibold text-foreground">{selectedDeal.stage}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days in Stage</p>
                <p className="text-sm font-semibold text-foreground">{selectedDeal.daysInStage}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="text-sm text-foreground">{selectedDeal.contactName}</p>
              </div>
            </div>
            {selectedDeal.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{selectedDeal.notes}</p>
              </div>
            )}
            {selectedDeal.stage !== "Closed Won" && selectedDeal.stage !== "Closed Lost" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Move to Stage</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.filter((s) => s !== selectedDeal.stage).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => moveDeal(selectedDeal.id, s)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:border-[#74ddc7]/30 hover:bg-[#74ddc7]/5 transition-colors"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
