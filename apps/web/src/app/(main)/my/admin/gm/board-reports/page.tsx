"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  X,
  Save,
  Eye,
  Calendar,
  Download,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { Button } from "@/components/ui/button";
import { loadOrSeed, persist, genId, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

interface BoardReport {
  id: string;
  title: string;
  period: string;
  createdDate: string;
  status: "Draft" | "Final" | "Presented";
  author: string;
  financialSummary: string;
  audienceMetrics: string;
  salesPerformance: string;
  communityEngagement: string;
  strategicUpdates: string;
  keyDecisions: string;
}

const SEED_REPORTS: BoardReport[] = [
  {
    id: "br1",
    title: "February 2026 Board Report",
    period: "February 2026",
    createdDate: "2026-03-05",
    status: "Presented",
    author: "Marcus Thompson",
    financialSummary: "February revenue of $181,000 represents a 1.7% increase over January. On-air advertising remains the strongest revenue stream at $94,000. Digital revenue grew 11% to $40,000, driven by new streaming ad packages. Overall, we are tracking at 93.6% of our monthly target. Cash reserves remain healthy at $245,000.",
    audienceMetrics: "Total weekly cume reached 47,500, up from 46,200 in January. Morning drive share held steady at 8.0. Streaming audience grew 15% with average concurrent listeners of 1,200. App downloads reached 2,650 total. Social media following grew by 380 across all platforms.",
    salesPerformance: "Closed 3 new accounts totaling $18,500 in monthly billing. Renewed Cross Creek Mall at a 10% rate increase. Pipeline has $297,000 in active opportunities. Sales team hit 91% of February quota. Digital bundles are the fastest-growing product category.",
    communityEngagement: "Hosted the MLK Day Community Celebration with 2,500 attendees. Partnered with Fayetteville Urban Ministry for a food drive collecting 3,200 lbs. Sponsored 2 local high school basketball games. The scholarship fund has raised $12,000 toward our $25,000 goal.",
    strategicUpdates: "Mobile app v2 development is 60% complete with an April target launch. Evaluated new transmitter equipment options for improved Spring Lake coverage. Began negotiations with a potential syndication partner for weekend programming. The FCC license renewal process has been initiated with all documentation on track.",
    keyDecisions: "1. Approve capital expenditure of $45,000 for transmitter upgrade\n2. Authorize hiring of part-time digital content producer\n3. Review and approve Q2 programming schedule changes\n4. Discuss potential studio renovation timeline and budget",
  },
  {
    id: "br2",
    title: "January 2026 Board Report",
    period: "January 2026",
    createdDate: "2026-02-04",
    status: "Presented",
    author: "Marcus Thompson",
    financialSummary: "January revenue of $172,000 reflects typical post-holiday softness. On-air revenue dipped to $88,000 as holiday campaigns concluded. Digital held steady at $36,000. Production services generated $18,000 from 4 commercial projects. Year started on pace for annual target.",
    audienceMetrics: "Weekly cume at 46,200. Morning drive share improved to 8.1 from December's 7.8. Afternoon drive strong at 7.4. Streaming metrics continue upward trajectory with 18% year-over-year growth. New podcast content driving app engagement.",
    salesPerformance: "January is historically our slowest sales month. Closed 2 new accounts. Renewed 4 existing clients. Pipeline building for Q2 spring campaigns. Sales team focused on prospecting and relationship building.",
    communityEngagement: "Sponsored the Fayetteville Winter Warmth Drive, collecting 500 coats. On-air partnership with United Way for their annual campaign. DJ Smooth spoke at 3 local schools for Career Day events.",
    strategicUpdates: "Completed year-end financial audit with clean results. Initiated mobile app v2 project. Began competitive analysis of new market entrant. Staff training program launched for digital sales skills.",
    keyDecisions: "1. Approved 2026 operating budget\n2. Authorized mobile app v2 development contract\n3. Approved new sales commission structure\n4. Tabled studio renovation discussion pending Q1 results",
  },
  {
    id: "br3",
    title: "March 2026 Board Report",
    period: "March 2026",
    createdDate: "2026-03-14",
    status: "Draft",
    author: "Marcus Thompson",
    financialSummary: "March revenue tracking at $187,500 as of mid-month (projected $195,000 at month end). On-air at $98,500. Digital revenue strong at $42,300. Events revenue of $31,200 boosted by Spring Fling sponsorship sales. Production services at $15,500.",
    audienceMetrics: "Weekly cume at 48,200, approaching our 50K goal. Morning drive share up to 8.2. Streaming audience at all-time high with 1,450 average concurrent listeners. App engagement up 22% since adding contest entry feature.",
    salesPerformance: "Strong month with 4 new accounts. Fayetteville Auto Mall in final negotiation ($48K annual). Cape Fear Valley Health proposal submitted ($72K). Pipeline at highest level in 18 months. Digital bundle adoption rate at 65% of new deals.",
    communityEngagement: "Spring Community Fair drew 3,000+ attendees. Scholarship fund at $18,500. Planning Juneteenth partnership. Ongoing Fort Liberty MWR discussions for military appreciation programming.",
    strategicUpdates: "App v2 development at 70% completion. FCC renewal documentation on track for April filing. Transmitter upgrade proposals received from 2 vendors. New afternoon show concept in testing phase.",
    keyDecisions: "1. Finalize transmitter upgrade vendor selection\n2. Approve Summer programming schedule\n3. Review Juneteenth partnership proposal\n4. Discuss Q2 revenue targets and sales incentives",
  },
];

const STORAGE_KEY = "wccg:gm:board-reports";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BoardReportsPage() {
  const [reports, setReports] = useState<BoardReport[]>([]);
  const [selected, setSelected] = useState<BoardReport | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [fTitle, setFTitle] = useState("");
  const [fPeriod, setFPeriod] = useState("");
  const [fFinancial, setFFinancial] = useState("");
  const [fAudience, setFAudience] = useState("");
  const [fSales, setFSales] = useState("");
  const [fCommunity, setFCommunity] = useState("");
  const [fStrategic, setFStrategic] = useState("");
  const [fDecisions, setFDecisions] = useState("");

  useEffect(() => {
    setReports(loadOrSeed(STORAGE_KEY, SEED_REPORTS));
  }, []);

  function save(data: BoardReport[]) {
    setReports(data);
    persist(STORAGE_KEY, data);
  }

  function resetForm() {
    setFTitle(""); setFPeriod(""); setFFinancial(""); setFAudience("");
    setFSales(""); setFCommunity(""); setFStrategic(""); setFDecisions("");
  }

  function handleCreate() {
    if (!fTitle || !fPeriod) return;
    const r: BoardReport = {
      id: genId("br"),
      title: fTitle,
      period: fPeriod,
      createdDate: new Date().toISOString().slice(0, 10),
      status: "Draft",
      author: "Marcus Thompson",
      financialSummary: fFinancial,
      audienceMetrics: fAudience,
      salesPerformance: fSales,
      communityEngagement: fCommunity,
      strategicUpdates: fStrategic,
      keyDecisions: fDecisions,
    };
    save([r, ...reports]);
    resetForm();
    setShowForm(false);
  }

  const draftCount = reports.filter((r) => r.status === "Draft").length;
  const finalCount = reports.filter((r) => r.status === "Final").length;
  const presentedCount = reports.filter((r) => r.status === "Presented").length;

  const columns: Column<BoardReport>[] = [
    { key: "title", label: "Report", sortable: true, sortKey: (r) => r.title, render: (r) => (
      <div>
        <span className="font-medium text-foreground">{r.title}</span>
        <p className="text-xs text-muted-foreground">{r.period}</p>
      </div>
    )},
    { key: "author", label: "Author", hideOnMobile: true, render: (r) => <span className="text-sm text-muted-foreground">{r.author}</span> },
    { key: "created", label: "Created", hideOnMobile: true, sortable: true, sortKey: (r) => r.createdDate, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.createdDate)}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status.toLowerCase()} /> },
    { key: "view", label: "", align: "right", render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(r); }} className="text-muted-foreground hover:text-foreground transition-colors">
        <Eye className="h-4 w-4" />
      </button>
    )},
  ];

  const inputClass = "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40";
  const textareaClass = `w-full resize-none ${inputClass}`;

  const SECTIONS = [
    { label: "Financial Summary", key: "financialSummary" },
    { label: "Audience Metrics", key: "audienceMetrics" },
    { label: "Sales Performance", key: "salesPerformance" },
    { label: "Community Engagement", key: "communityEngagement" },
    { label: "Strategic Updates", key: "strategicUpdates" },
    { label: "Key Decisions Needed", key: "keyDecisions" },
  ] as const;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={FileText}
        title="Board Reports"
        description="Monthly board reports and executive summaries"
        iconColor="text-indigo-400"
        iconBg="bg-indigo-500/10 border-indigo-500/20"
      >
        <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Report"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Drafts" value={draftCount} icon={FileText} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Finalized" value={finalCount} icon={CheckCircle2} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Presented" value={presentedCount} icon={Calendar} color="text-emerald-400" bg="bg-emerald-500/10" />
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Board Report</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Report title (e.g. April 2026 Board Report)" value={fTitle} onChange={(e) => setFTitle(e.target.value)} className={inputClass} />
            <input type="text" placeholder="Period (e.g. April 2026)" value={fPeriod} onChange={(e) => setFPeriod(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Financial Summary</label>
              <textarea value={fFinancial} onChange={(e) => setFFinancial(e.target.value)} rows={3} className={textareaClass} placeholder="Revenue performance, budget status, cash position..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Audience Metrics</label>
              <textarea value={fAudience} onChange={(e) => setFAudience(e.target.value)} rows={3} className={textareaClass} placeholder="Ratings, cume, streaming stats, app downloads..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Sales Performance</label>
              <textarea value={fSales} onChange={(e) => setFSales(e.target.value)} rows={3} className={textareaClass} placeholder="New accounts, renewals, pipeline, quota attainment..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Community Engagement</label>
              <textarea value={fCommunity} onChange={(e) => setFCommunity(e.target.value)} rows={3} className={textareaClass} placeholder="Events, partnerships, outreach, community impact..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Strategic Updates</label>
              <textarea value={fStrategic} onChange={(e) => setFStrategic(e.target.value)} rows={3} className={textareaClass} placeholder="Key initiatives, technology, regulatory, competitive..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Key Decisions Needed</label>
              <textarea value={fDecisions} onChange={(e) => setFDecisions(e.target.value)} rows={3} className={textareaClass} placeholder="Items requiring board approval or discussion..." />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={!fTitle || !fPeriod}>
              <Save className="h-4 w-4" /> Create Report
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={reports}
        keyField="id"
        searchable
        searchPlaceholder="Search reports..."
        searchFilter={(r, q) => r.title.toLowerCase().includes(q) || r.period.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      {/* Full Report View */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={selected ? `By ${selected.author} — ${formatDate(selected.createdDate)}` : ""}
        maxWidth="max-w-3xl"
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status.toLowerCase()} />
              <span className="text-xs text-muted-foreground">{selected.period}</span>
            </div>

            {SECTIONS.map(({ label, key }) => (
              <div key={key}>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
                  {label}
                </h4>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selected[key] || "No content yet."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
