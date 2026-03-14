"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  Eye,
  Plus,
  X,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { Button } from "@/components/ui/button";
import { loadOrSeed, persist, genId } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

interface Competitor {
  id: string;
  callLetters: string;
  frequency: string;
  format: string;
  owner: string;
  estimatedShare: number;
  keyShows: string[];
  notes: string;
  lastUpdated: string;
}

const SEED_COMPETITORS: Competitor[] = [
  {
    id: "comp1",
    callLetters: "WQSM",
    frequency: "98.1 FM",
    format: "Urban Contemporary",
    owner: "Cumulus Media",
    estimatedShare: 8.1,
    keyShows: ["Morning Takeover w/ Big Mike", "Afternoon Drive w/ DJ Sway", "Friday Night Live Mix"],
    notes: "Strongest competitor in target demo. Recently upgraded studio equipment and added a new morning host. Running aggressive digital ad campaigns on social media. Their morning show pulled a 9.4 share last book.",
    lastUpdated: "2026-03-10",
  },
  {
    id: "comp2",
    callLetters: "WFNC",
    frequency: "640 AM",
    format: "News/Talk",
    owner: "iHeartMedia",
    estimatedShare: 5.8,
    keyShows: ["Fayetteville Morning News", "The Midday Report", "Drive Time Talk"],
    notes: "Different format but competes for ad dollars in the market. Strong with 35+ demo and local business advertisers. Added a local sports talk block on weekends. iHeart trying to bundle with their FM properties for package deals.",
    lastUpdated: "2026-03-08",
  },
  {
    id: "comp3",
    callLetters: "WZFX",
    frequency: "99.1 FM",
    format: "Hip-Hop/R&B",
    owner: "Cumulus Media",
    estimatedShare: 7.6,
    keyShows: ["The Beat Down Morning Show", "Afternoon Jams", "Saturday Night Street Mix"],
    notes: "Direct format competitor. Skews younger (18-34) than WCCG. Strong social media presence with 45K Instagram followers. Recently signed a syndication deal for evenings. Watch for their summer concert series announcements.",
    lastUpdated: "2026-03-12",
  },
  {
    id: "comp4",
    callLetters: "WRCQ",
    frequency: "103.5 FM",
    format: "Classic Hip-Hop",
    owner: "Beasley Broadcast Group",
    estimatedShare: 7.2,
    keyShows: ["Old School at Noon", "The Throwback Show", "Weekend Classics"],
    notes: "Overlapping audience with our Classic R&B hours. Their nostalgia programming pulls well in 35-54 demo. Beasley has been investing in their digital streaming platform. Recently lost their afternoon host to a bigger market.",
    lastUpdated: "2026-03-11",
  },
  {
    id: "comp5",
    callLetters: "WKML",
    frequency: "95.7 FM",
    format: "Country",
    owner: "Cumulus Media",
    estimatedShare: 5.5,
    keyShows: ["Country Morning Wake-Up", "New Country Countdown", "Honky Tonk Saturday Night"],
    notes: "Not a direct format competitor but fights for the same local ad budgets. Strong event presence with regular concert sponsorships. Fort Liberty military audience is a shared demo. Recently renovated their broadcast studio.",
    lastUpdated: "2026-03-05",
  },
];

const STORAGE_KEY = "wccg:gm:competitors";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<Competitor | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [formCall, setFormCall] = useState("");
  const [formFreq, setFormFreq] = useState("");
  const [formFormat, setFormFormat] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formShare, setFormShare] = useState("");
  const [formShows, setFormShows] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    setCompetitors(loadOrSeed(STORAGE_KEY, SEED_COMPETITORS));
  }, []);

  function save(data: Competitor[]) {
    setCompetitors(data);
    persist(STORAGE_KEY, data);
  }

  function resetForm() {
    setFormCall(""); setFormFreq(""); setFormFormat(""); setFormOwner("");
    setFormShare(""); setFormShows(""); setFormNotes("");
  }

  function handleCreate() {
    if (!formCall || !formFreq) return;
    const c: Competitor = {
      id: genId("comp"),
      callLetters: formCall,
      frequency: formFreq,
      format: formFormat,
      owner: formOwner,
      estimatedShare: parseFloat(formShare) || 0,
      keyShows: formShows.split(",").map((s) => s.trim()).filter(Boolean),
      notes: formNotes,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    save([...competitors, c]);
    resetForm();
    setShowForm(false);
  }

  const avgShare = competitors.length > 0 ? (competitors.reduce((s, c) => s + c.estimatedShare, 0) / competitors.length).toFixed(1) : "0";
  const topComp = [...competitors].sort((a, b) => b.estimatedShare - a.estimatedShare)[0];

  const columns: Column<Competitor>[] = [
    { key: "call", label: "Station", render: (r) => (
      <div>
        <span className="font-semibold text-foreground">{r.callLetters}</span>
        <span className="text-xs text-muted-foreground ml-2">{r.frequency}</span>
      </div>
    )},
    { key: "format", label: "Format", render: (r) => <span className="text-sm text-muted-foreground">{r.format}</span> },
    { key: "owner", label: "Owner", hideOnMobile: true, render: (r) => <span className="text-sm text-muted-foreground">{r.owner}</span> },
    { key: "share", label: "Est. Share", align: "right", sortable: true, sortKey: (r) => r.estimatedShare, render: (r) => <span className="font-mono font-semibold text-foreground">{r.estimatedShare.toFixed(1)}</span> },
    { key: "shows", label: "Key Shows", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.keyShows.slice(0, 2).join(", ")}{r.keyShows.length > 2 ? ` +${r.keyShows.length - 2}` : ""}</span> },
    { key: "actions", label: "", align: "right", render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(r); }} className="text-muted-foreground hover:text-foreground transition-colors">
        <Eye className="h-4 w-4" />
      </button>
    )},
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={Radio}
        title="Competitor Monitoring"
        description="Fayetteville market competitive intelligence"
        iconColor="text-orange-400"
        iconBg="bg-orange-500/10 border-orange-500/20"
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add Station"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Stations Tracked" value={competitors.length} icon={Radio} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard label="Avg Market Share" value={avgShare} icon={Eye} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Top Competitor" value={topComp?.callLetters ?? "--"} icon={Radio} color="text-red-400" bg="bg-red-500/10" trend={topComp ? `${topComp.estimatedShare} share` : ""} trendUp={false} />
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Add Competitor Station</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input type="text" placeholder="Call Letters" value={formCall} onChange={(e) => setFormCall(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            <input type="text" placeholder="Frequency (e.g. 98.1 FM)" value={formFreq} onChange={(e) => setFormFreq(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            <input type="text" placeholder="Format" value={formFormat} onChange={(e) => setFormFormat(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            <input type="text" placeholder="Owner" value={formOwner} onChange={(e) => setFormOwner(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="number" step="0.1" placeholder="Est. Share" value={formShare} onChange={(e) => setFormShare(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            <input type="text" placeholder="Key Shows (comma-separated)" value={formShows} onChange={(e) => setFormShows(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <textarea placeholder="Competitive intelligence notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={!formCall || !formFreq}>
              <Save className="h-4 w-4" /> Add Station
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={competitors}
        keyField="id"
        searchable
        searchPlaceholder="Search stations..."
        searchFilter={(r, q) => r.callLetters.toLowerCase().includes(q) || r.format.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.callLetters} ${selected.frequency}` : ""}
        subtitle={selected?.format}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Owner</p>
                <p className="text-sm font-medium text-foreground">{selected.owner}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Est. Share</p>
                <p className="text-sm font-mono font-bold text-foreground">{selected.estimatedShare.toFixed(1)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Key Shows</p>
              <div className="space-y-1.5">
                {selected.keyShows.map((show) => (
                  <div key={show} className="flex items-center gap-2 text-sm text-foreground">
                    <Radio className="h-3 w-3 text-[#74ddc7] shrink-0" />
                    {show}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Intelligence Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.notes}</p>
            </div>
            <p className="text-xs text-muted-foreground">Last updated: {selected.lastUpdated}</p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
