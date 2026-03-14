"use client";

import { useState, useEffect } from "react";
import {
  Target,
  Plus,
  X,
  Save,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { Button } from "@/components/ui/button";
import { loadOrSeed, persist, genId, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

type GoalCategory = "Revenue" | "Audience" | "Community" | "Digital";
type GoalStatus = "On Track" | "At Risk" | "Behind" | "Completed";

interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  targetMetric: string;
  currentValue: number;
  targetValue: number;
  status: GoalStatus;
  owner: string;
  deadline: string;
  notes: string;
}

const SEED_GOALS: Goal[] = [
  { id: "g1", title: "Increase Q1 On-Air Revenue", category: "Revenue", targetMetric: "On-Air Ad Revenue", currentValue: 278500, targetValue: 315000, status: "At Risk", owner: "Angela Davis", deadline: "2026-03-31", notes: "Need to close 3 more accounts to hit target. Focus on auto dealers and healthcare vertical." },
  { id: "g2", title: "Grow Digital Streaming Revenue", category: "Digital", targetMetric: "Digital Revenue", currentValue: 118400, targetValue: 150000, status: "On Track", owner: "Angela Davis", deadline: "2026-06-30", notes: "New bundled packages driving growth. Podcast ad insertion platform launching in April." },
  { id: "g3", title: "Increase Morning Show Ratings", category: "Audience", targetMetric: "Morning Drive Share", currentValue: 8.2, targetValue: 9.5, status: "On Track", owner: "Keisha Williams", deadline: "2026-06-30", notes: "New contest segment driving P1 listening. Social media integration boosting engagement." },
  { id: "g4", title: "Community Events Sponsorship", category: "Community", targetMetric: "Events Sponsored", currentValue: 8, targetValue: 12, status: "On Track", owner: "Brandon Lee", deadline: "2026-06-30", notes: "Spring Fling, MLK Day Celebration, and 3 others confirmed. Pursuing Fort Liberty family day." },
  { id: "g5", title: "Reach 50K Weekly Listeners", category: "Audience", targetMetric: "Weekly Cume", currentValue: 48200, targetValue: 50000, status: "On Track", owner: "Keisha Williams", deadline: "2026-03-31", notes: "Only 1,800 listeners away. Streaming growth and new afternoon programming should push us over." },
  { id: "g6", title: "Launch Mobile App v2", category: "Digital", targetMetric: "App Downloads", currentValue: 2800, targetValue: 5000, status: "Behind", owner: "Devon Robinson", deadline: "2026-04-30", notes: "Development delayed by 3 weeks. Push notification system needs additional testing. Targeting late April soft launch." },
  { id: "g7", title: "Annual Revenue Target", category: "Revenue", targetMetric: "Total Annual Revenue", currentValue: 540500, targetValue: 2400000, status: "On Track", owner: "Marcus Thompson", deadline: "2026-12-31", notes: "22.5% of annual target achieved through Q1. Historically strong Q2-Q3 performance expected." },
  { id: "g8", title: "Scholarship Fund Drive", category: "Community", targetMetric: "Funds Raised", currentValue: 18500, targetValue: 25000, status: "At Risk", owner: "Brandon Lee", deadline: "2026-05-31", notes: "Need to ramp up on-air mentions and secure matching sponsor. Considering a radiothon in May." },
];

const CATEGORIES: GoalCategory[] = ["Revenue", "Audience", "Community", "Digital"];
const STATUSES: GoalStatus[] = ["On Track", "At Risk", "Behind", "Completed"];
const STORAGE_KEY = "wccg:gm:goals";

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  Revenue: "text-emerald-400",
  Audience: "text-blue-400",
  Community: "text-purple-400",
  Digital: "text-[#74ddc7]",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [selected, setSelected] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [fTitle, setFTitle] = useState("");
  const [fCat, setFCat] = useState<GoalCategory>("Revenue");
  const [fMetric, setFMetric] = useState("");
  const [fCurrent, setFCurrent] = useState("");
  const [fTarget, setFTarget] = useState("");
  const [fStatus, setFStatus] = useState<GoalStatus>("On Track");
  const [fOwner, setFOwner] = useState("");
  const [fDeadline, setFDeadline] = useState("");
  const [fNotes, setFNotes] = useState("");

  useEffect(() => {
    setGoals(loadOrSeed(STORAGE_KEY, SEED_GOALS));
  }, []);

  function save(data: Goal[]) {
    setGoals(data);
    persist(STORAGE_KEY, data);
  }

  function resetForm() {
    setFTitle(""); setFCat("Revenue"); setFMetric(""); setFCurrent(""); setFTarget("");
    setFStatus("On Track"); setFOwner(""); setFDeadline(""); setFNotes("");
    setEditingId(null);
  }

  function startEdit(g: Goal) {
    setFTitle(g.title); setFCat(g.category); setFMetric(g.targetMetric);
    setFCurrent(String(g.currentValue)); setFTarget(String(g.targetValue));
    setFStatus(g.status); setFOwner(g.owner); setFDeadline(g.deadline); setFNotes(g.notes);
    setEditingId(g.id);
    setShowForm(true);
    setSelected(null);
  }

  function handleSave() {
    if (!fTitle || !fDeadline) return;
    const goal: Goal = {
      id: editingId || genId("g"),
      title: fTitle,
      category: fCat,
      targetMetric: fMetric,
      currentValue: parseFloat(fCurrent) || 0,
      targetValue: parseFloat(fTarget) || 0,
      status: fStatus,
      owner: fOwner,
      deadline: fDeadline,
      notes: fNotes,
    };
    if (editingId) {
      save(goals.map((g) => g.id === editingId ? goal : g));
    } else {
      save([goal, ...goals]);
    }
    resetForm();
    setShowForm(false);
  }

  const filtered = catFilter === "All" ? goals : goals.filter((g) => g.category === catFilter);
  const onTrack = goals.filter((g) => g.status === "On Track").length;
  const atRisk = goals.filter((g) => g.status === "At Risk").length;
  const behind = goals.filter((g) => g.status === "Behind").length;
  const completed = goals.filter((g) => g.status === "Completed").length;

  const inputClass = "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40";

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={Target}
        title="Strategic Goals"
        description="Quarterly and annual goal tracking"
        iconColor="text-yellow-400"
        iconBg="bg-yellow-500/10 border-yellow-500/20"
      >
        <Button size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Goal"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="On Track" value={onTrack} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="At Risk" value={atRisk} icon={AlertTriangle} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Behind" value={behind} icon={Clock} color="text-red-400" bg="bg-red-500/10" />
        <StatCard label="Completed" value={completed} icon={TrendingUp} color="text-blue-400" bg="bg-blue-500/10" />
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit Goal" : "New Goal"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Goal title" value={fTitle} onChange={(e) => setFTitle(e.target.value)} className={inputClass} />
            <select value={fCat} onChange={(e) => setFCat(e.target.value as GoalCategory)} className={inputClass}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Target metric name" value={fMetric} onChange={(e) => setFMetric(e.target.value)} className={inputClass} />
            <input type="text" placeholder="Owner" value={fOwner} onChange={(e) => setFOwner(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Current value" value={fCurrent} onChange={(e) => setFCurrent(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Target value" value={fTarget} onChange={(e) => setFTarget(e.target.value)} className={inputClass} />
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value as GoalStatus)} className={inputClass}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={fDeadline} onChange={(e) => setFDeadline(e.target.value)} className={inputClass} />
          </div>
          <textarea placeholder="Notes" value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} className={`w-full resize-none ${inputClass}`} />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!fTitle || !fDeadline}>
              <Save className="h-4 w-4" /> {editingId ? "Update" : "Create"} Goal
            </Button>
          </div>
        </div>
      )}

      <TabsNav
        tabs={[{ key: "All", label: "All Goals", count: goals.length }, ...CATEGORIES.map((c) => ({ key: c, label: c, count: goals.filter((g) => g.category === c).length }))]}
        active={catFilter}
        onChange={setCatFilter}
      />

      <div className="space-y-4">
        {filtered.map((goal) => {
          const pct = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;
          const isMonetary = goal.currentValue > 1000;
          const fmtVal = (v: number) => isMonetary ? `$${(v / 1000).toFixed(0)}K` : v.toLocaleString();
          return (
            <div
              key={goal.id}
              className="rounded-xl border border-border bg-card p-5 hover:border-input transition-colors cursor-pointer"
              onClick={() => setSelected(goal)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{goal.title}</h3>
                    <StatusBadge status={goal.status.toLowerCase().replace(/ /g, "-")} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className={CATEGORY_COLORS[goal.category]}>{goal.category}</span>
                    <span>Owner: {goal.owner}</span>
                    <span>Due: {formatDate(goal.deadline)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startEdit(goal); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      goal.status === "Completed" ? "bg-emerald-400" :
                      goal.status === "On Track" ? "bg-[#74ddc7]" :
                      goal.status === "At Risk" ? "bg-yellow-400" :
                      "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono w-28 text-right">
                  {fmtVal(goal.currentValue)} / {fmtVal(goal.targetValue)} ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={selected ? `${selected.category} Goal` : ""}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selected.status.toLowerCase().replace(/ /g, "-")} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm font-medium text-foreground">{selected.owner}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Metric</p>
                <p className="text-sm text-foreground">{selected.targetMetric}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm text-foreground">{formatDate(selected.deadline)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Progress</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-[#74ddc7]" style={{ width: `${Math.min(Math.round((selected.currentValue / selected.targetValue) * 100), 100)}%` }} />
                </div>
                <span className="text-sm font-mono">{Math.round((selected.currentValue / selected.targetValue) * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.notes}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
