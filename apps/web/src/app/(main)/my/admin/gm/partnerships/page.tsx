"use client";

import { useState, useEffect } from "react";
import {
  Handshake,
  Plus,
  X,
  Save,
  DollarSign,
  ArrowRight,
  Calendar,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { Button } from "@/components/ui/button";
import { loadOrSeed, persist, genId, formatCurrency, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

type PipelineStage = "Lead" | "Contacted" | "Proposal" | "Negotiation" | "Closed";

interface Partnership {
  id: string;
  company: string;
  contact: string;
  contactEmail: string;
  estimatedValue: number;
  stage: PipelineStage;
  probability: number;
  notes: string;
  nextActionDate: string;
  nextAction: string;
  createdDate: string;
}

const STAGES: PipelineStage[] = ["Lead", "Contacted", "Proposal", "Negotiation", "Closed"];

const STAGE_COLORS: Record<PipelineStage, string> = {
  Lead: "bg-foreground/[0.06] text-muted-foreground border-border",
  Contacted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Proposal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Negotiation: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Closed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const SEED_PARTNERSHIPS: Partnership[] = [
  { id: "p1", company: "Fayetteville Auto Mall", contact: "David Reynolds", contactEmail: "dreynolds@fayauto.com", estimatedValue: 48000, stage: "Negotiation", probability: 75, notes: "Interested in a 6-month package with morning and afternoon drive spots plus digital. They want exclusivity in auto category during morning show. Counter-offered at $42K.", nextActionDate: "2026-03-17", nextAction: "Final pricing meeting", createdDate: "2026-02-15" },
  { id: "p2", company: "Cape Fear Valley Health System", contact: "Michelle Torres", contactEmail: "mtorres@capefearvalley.com", estimatedValue: 72000, stage: "Proposal", probability: 60, notes: "Sent comprehensive proposal for annual health awareness campaign. Includes on-air sponsorships, digital banners, and event presence. They want to include podcast sponsorship too.", nextActionDate: "2026-03-19", nextAction: "Follow up on proposal review", createdDate: "2026-02-28" },
  { id: "p3", company: "Fort Liberty MWR", contact: "Sgt. First Class Angela Morrison", contactEmail: "angela.morrison@army.mil", estimatedValue: 36000, stage: "Contacted", probability: 40, notes: "Military appreciation programming sponsorship. Want to sponsor a weekly 'Fort Liberty Report' segment. Need to go through government procurement process.", nextActionDate: "2026-03-21", nextAction: "Submit formal RFQ response", createdDate: "2026-03-05" },
  { id: "p4", company: "Cross Creek Mall", contact: "Jennifer Park", contactEmail: "jpark@crosscreekmall.com", estimatedValue: 24000, stage: "Closed", probability: 100, notes: "Renewed annual sponsorship. Added digital streaming pre-roll ads. 10% increase over last year. Happy with ROI from holiday campaign.", nextActionDate: "2026-04-01", nextAction: "Q2 creative review", createdDate: "2026-01-10" },
  { id: "p5", company: "Fayetteville State University", contact: "Dr. Marcus Bryant", contactEmail: "mbryant@uncfsu.edu", estimatedValue: 18000, stage: "Lead", probability: 20, notes: "Potential partnership for university events promotion and recruitment advertising. Would include live broadcasts from campus events.", nextActionDate: "2026-03-22", nextAction: "Initial discovery call", createdDate: "2026-03-12" },
  { id: "p6", company: "Metro Chrysler Dodge", contact: "Phil Anderson", contactEmail: "panderson@metrochryslerdodge.com", estimatedValue: 30000, stage: "Proposal", probability: 55, notes: "Proposed 4-month spring sales campaign. They want weekend remote broadcasts from their lot. Competing with WZFX for this account.", nextActionDate: "2026-03-18", nextAction: "Competitive pricing comparison", createdDate: "2026-03-01" },
  { id: "p7", company: "Fayetteville Regional Chamber", contact: "Karen White", contactEmail: "kwhite@faychamber.com", estimatedValue: 15000, stage: "Contacted", probability: 35, notes: "Sponsorship for business spotlight segment. Would be a weekly 2-minute feature on local businesses. Good community engagement opportunity.", nextActionDate: "2026-03-20", nextAction: "Present segment concept mockup", createdDate: "2026-03-08" },
  { id: "p8", company: "Truist Bank (Fayetteville)", contact: "Robert Maxwell", contactEmail: "rmaxwell@truist.com", estimatedValue: 54000, stage: "Lead", probability: 15, notes: "Reached out about financial literacy programming sponsorship. Large potential but corporate approval chain is long. Local branch manager is champion.", nextActionDate: "2026-03-25", nextAction: "Introductory meeting with regional marketing", createdDate: "2026-03-13" },
];

const STORAGE_KEY = "wccg:gm:partnerships";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PartnershipsPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [stageFilter, setStageFilter] = useState("All");
  const [selected, setSelected] = useState<Partnership | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [fCompany, setFCompany] = useState("");
  const [fContact, setFContact] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fValue, setFValue] = useState("");
  const [fStage, setFStage] = useState<PipelineStage>("Lead");
  const [fProb, setFProb] = useState("20");
  const [fNotes, setFNotes] = useState("");
  const [fNextDate, setFNextDate] = useState("");
  const [fNextAction, setFNextAction] = useState("");

  useEffect(() => {
    setPartnerships(loadOrSeed(STORAGE_KEY, SEED_PARTNERSHIPS));
  }, []);

  function save(data: Partnership[]) {
    setPartnerships(data);
    persist(STORAGE_KEY, data);
  }

  function handleCreate() {
    if (!fCompany) return;
    const p: Partnership = {
      id: genId("p"),
      company: fCompany,
      contact: fContact,
      contactEmail: fEmail,
      estimatedValue: parseFloat(fValue) || 0,
      stage: fStage,
      probability: parseInt(fProb) || 20,
      notes: fNotes,
      nextActionDate: fNextDate,
      nextAction: fNextAction,
      createdDate: new Date().toISOString().slice(0, 10),
    };
    save([p, ...partnerships]);
    setFCompany(""); setFContact(""); setFEmail(""); setFValue("");
    setFStage("Lead"); setFProb("20"); setFNotes(""); setFNextDate(""); setFNextAction("");
    setShowForm(false);
  }

  const filtered = stageFilter === "All" ? partnerships : partnerships.filter((p) => p.stage === stageFilter);

  // Pipeline value summaries
  const pipelineByStage = STAGES.map((stage) => {
    const items = partnerships.filter((p) => p.stage === stage);
    const value = items.reduce((s, p) => s + p.estimatedValue, 0);
    const weighted = items.reduce((s, p) => s + p.estimatedValue * (p.probability / 100), 0);
    return { stage, count: items.length, value, weighted };
  });

  const totalPipeline = partnerships.reduce((s, p) => s + p.estimatedValue, 0);
  const totalWeighted = partnerships.reduce((s, p) => s + p.estimatedValue * (p.probability / 100), 0);
  const closedValue = partnerships.filter((p) => p.stage === "Closed").reduce((s, p) => s + p.estimatedValue, 0);

  const columns: Column<Partnership>[] = [
    { key: "company", label: "Company", sortable: true, sortKey: (r) => r.company, render: (r) => (
      <div>
        <span className="font-medium text-foreground">{r.company}</span>
        <p className="text-xs text-muted-foreground">{r.contact}</p>
      </div>
    )},
    { key: "value", label: "Value", align: "right", sortable: true, sortKey: (r) => r.estimatedValue, render: (r) => <span className="font-mono font-semibold text-foreground">{formatCurrency(r.estimatedValue)}</span> },
    { key: "stage", label: "Stage", render: (r) => (
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STAGE_COLORS[r.stage]}`}>
        {r.stage}
      </span>
    )},
    { key: "prob", label: "Prob.", align: "center", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.probability}%</span> },
    { key: "next", label: "Next Action", hideOnMobile: true, render: (r) => (
      <div>
        <span className="text-xs text-muted-foreground">{r.nextAction}</span>
        <p className="text-[10px] text-muted-foreground/60">{formatDate(r.nextActionDate)}</p>
      </div>
    )},
  ];

  const inputClass = "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40";

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={Handshake}
        title="Partnership Pipeline"
        description="Track potential partnerships and sponsors"
        iconColor="text-[#74ddc7]"
        iconBg="bg-[#74ddc7]/10 border-[#74ddc7]/20"
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add Partner"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Pipeline" value={formatCurrency(totalPipeline)} icon={DollarSign} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" trend={`${partnerships.length} opportunities`} trendUp={true} />
        <StatCard label="Weighted Value" value={formatCurrency(Math.round(totalWeighted))} icon={Building2} color="text-purple-400" bg="bg-purple-500/10" trend="Probability-adjusted" trendUp={true} />
        <StatCard label="Closed Won" value={formatCurrency(closedValue)} icon={Handshake} color="text-emerald-400" bg="bg-emerald-500/10" />
      </div>

      {/* Pipeline visual */}
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">Pipeline Stages</p>
        <div className="flex items-center gap-2">
          {pipelineByStage.map((s, i) => (
            <div key={s.stage} className="flex items-center flex-1 min-w-0">
              <div className="flex-1 text-center">
                <div className={`rounded-lg border p-3 ${STAGE_COLORS[s.stage]}`}>
                  <p className="text-xs font-bold uppercase">{s.stage}</p>
                  <p className="text-lg font-mono font-bold mt-1">{s.count}</p>
                  <p className="text-[10px] mt-0.5">{formatCurrency(s.value)}</p>
                </div>
              </div>
              {i < pipelineByStage.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Add Partnership</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input type="text" placeholder="Company name" value={fCompany} onChange={(e) => setFCompany(e.target.value)} className={inputClass} />
            <input type="text" placeholder="Contact name" value={fContact} onChange={(e) => setFContact(e.target.value)} className={inputClass} />
            <input type="email" placeholder="Contact email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Estimated value ($)" value={fValue} onChange={(e) => setFValue(e.target.value)} className={inputClass} />
            <select value={fStage} onChange={(e) => setFStage(e.target.value as PipelineStage)} className={inputClass}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="number" placeholder="Probability %" min="0" max="100" value={fProb} onChange={(e) => setFProb(e.target.value)} className={inputClass} />
            <input type="text" placeholder="Next action" value={fNextAction} onChange={(e) => setFNextAction(e.target.value)} className={inputClass} />
            <input type="date" value={fNextDate} onChange={(e) => setFNextDate(e.target.value)} className={inputClass} />
          </div>
          <textarea placeholder="Notes" value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} className={`w-full resize-none ${inputClass}`} />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={!fCompany}>
              <Save className="h-4 w-4" /> Add to Pipeline
            </Button>
          </div>
        </div>
      )}

      <TabsNav
        tabs={[{ key: "All", label: "All", count: partnerships.length }, ...STAGES.map((s) => ({ key: s, label: s, count: partnerships.filter((p) => p.stage === s).length }))]}
        active={stageFilter}
        onChange={setStageFilter}
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search partnerships..."
        searchFilter={(r, q) => r.company.toLowerCase().includes(q) || r.contact.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.company ?? ""}
        subtitle={selected ? `${selected.contact} — ${selected.contactEmail}` : ""}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Stage</p>
                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STAGE_COLORS[selected.stage]}`}>{selected.stage}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Value</p>
                <p className="text-sm font-mono font-bold text-foreground">{formatCurrency(selected.estimatedValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Probability</p>
                <p className="text-sm text-foreground">{selected.probability}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weighted Value</p>
                <p className="text-sm font-mono text-foreground">{formatCurrency(Math.round(selected.estimatedValue * selected.probability / 100))}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Next Action</p>
              <p className="text-sm text-foreground">{selected.nextAction} — <span className="text-muted-foreground">{formatDate(selected.nextActionDate)}</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.notes}</p>
            </div>
            <p className="text-xs text-muted-foreground">Created: {formatDate(selected.createdDate)}</p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
