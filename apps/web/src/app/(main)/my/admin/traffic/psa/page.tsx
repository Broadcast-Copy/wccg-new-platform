"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Heart,
  GraduationCap,
  Shield,
  Users,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, persist, genId, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PSA {
  id: string;
  title: string;
  organization: string;
  category: "Health" | "Education" | "Safety" | "Community" | "Environment" | "Veterans";
  duration: ":15" | ":30" | ":60";
  rotationPriority: "High" | "Medium" | "Low";
  startDate: string;
  endDate: string;
  totalPlaysMonth: number;
  totalPlaysAll: number;
  status: "Active" | "Scheduled" | "Expired" | "Paused";
  contactName: string;
  contactPhone: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_PSAS: PSA[] = [
  { id: "psa1", title: "Blood Drive Awareness", organization: "American Red Cross", category: "Health", duration: ":30", rotationPriority: "High", startDate: "2026-03-01", endDate: "2026-03-31", totalPlaysMonth: 45, totalPlaysAll: 180, status: "Active", contactName: "Maria Sanchez", contactPhone: "(910) 555-4001", description: "Promotes upcoming blood drive at Cape Fear Valley Medical Center." },
  { id: "psa2", title: "Flu Vaccination Campaign", organization: "Cumberland County Health Dept", category: "Health", duration: ":30", rotationPriority: "Medium", startDate: "2026-01-15", endDate: "2026-04-30", totalPlaysMonth: 30, totalPlaysAll: 210, status: "Active", contactName: "Dr. Tanya Harper", contactPhone: "(910) 555-4002", description: "Encourages residents to get flu vaccinations at local health clinics." },
  { id: "psa3", title: "Voter Registration Drive", organization: "NAACP Fayetteville Branch", category: "Community", duration: ":15", rotationPriority: "High", startDate: "2026-03-01", endDate: "2026-05-15", totalPlaysMonth: 60, totalPlaysAll: 120, status: "Active", contactName: "Rev. Thomas Wade", contactPhone: "(910) 555-4003", description: "Voter registration awareness ahead of primary elections." },
  { id: "psa4", title: "Smoke Detector Check", organization: "Fayetteville Fire Department", category: "Safety", duration: ":15", rotationPriority: "Medium", startDate: "2026-03-01", endDate: "2026-03-31", totalPlaysMonth: 35, totalPlaysAll: 35, status: "Active", contactName: "Chief Marcus Byrd", contactPhone: "(910) 555-4004", description: "Reminds residents to check and replace smoke detector batteries." },
  { id: "psa5", title: "Literacy Program Enrollment", organization: "Cumberland County Library", category: "Education", duration: ":30", rotationPriority: "Medium", startDate: "2026-02-01", endDate: "2026-06-30", totalPlaysMonth: 25, totalPlaysAll: 100, status: "Active", contactName: "Linda Foster", contactPhone: "(910) 555-4005", description: "Adult literacy tutoring program at main library branch." },
  { id: "psa6", title: "Veterans Resource Fair", organization: "Veterans Affairs - Fayetteville", category: "Veterans", duration: ":30", rotationPriority: "High", startDate: "2026-03-15", endDate: "2026-04-05", totalPlaysMonth: 15, totalPlaysAll: 15, status: "Scheduled", contactName: "Col. David Price (Ret.)", contactPhone: "(910) 555-4006", description: "Annual veterans resource and job fair at Crown Coliseum." },
  { id: "psa7", title: "Child Safety Seat Check", organization: "Fayetteville Police Dept", category: "Safety", duration: ":30", rotationPriority: "Low", startDate: "2026-04-01", endDate: "2026-04-30", totalPlaysMonth: 0, totalPlaysAll: 0, status: "Scheduled", contactName: "Sgt. Rita Collins", contactPhone: "(910) 555-4007", description: "Free child safety seat installation check events." },
  { id: "psa8", title: "Adopt-a-Pet Saturday", organization: "Cumberland County Animal Control", category: "Community", duration: ":15", rotationPriority: "Low", startDate: "2026-01-01", endDate: "2026-02-28", totalPlaysMonth: 0, totalPlaysAll: 90, status: "Expired", contactName: "Amy Watkins", contactPhone: "(910) 555-4008", description: "Monthly pet adoption events at the animal shelter." },
  { id: "psa9", title: "Mental Health Awareness", organization: "NAMI Cumberland County", category: "Health", duration: ":60", rotationPriority: "Medium", startDate: "2026-03-01", endDate: "2026-05-31", totalPlaysMonth: 20, totalPlaysAll: 40, status: "Active", contactName: "Dr. Karen Moore", contactPhone: "(910) 555-4009", description: "Mental health resources and crisis hotline promotion." },
  { id: "psa10", title: "Cape Fear River Cleanup", organization: "Keep Fayetteville Beautiful", category: "Environment", duration: ":30", rotationPriority: "Low", startDate: "2026-04-01", endDate: "2026-04-15", totalPlaysMonth: 0, totalPlaysAll: 0, status: "Scheduled", contactName: "James Allen", contactPhone: "(910) 555-4010", description: "Annual Cape Fear River cleanup volunteer event." },
];

const STORAGE_KEY = "wccg:traffic-psa";

// Category icons
const CAT_ICONS: Record<string, typeof Heart> = {
  Health: Heart,
  Education: GraduationCap,
  Safety: Shield,
  Community: Users,
  Environment: Activity,
  Veterans: Shield,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PSARotationPage() {
  const [mounted, setMounted] = useState(false);
  const [psas, setPsas] = useState<PSA[]>([]);
  const [selected, setSelected] = useState<PSA | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // New PSA form
  const [newTitle, setNewTitle] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newCat, setNewCat] = useState<PSA["category"]>("Community");
  const [newDur, setNewDur] = useState<PSA["duration"]>(":30");
  const [newPriority, setNewPriority] = useState<PSA["rotationPriority"]>("Medium");
  const [newStart, setNewStart] = useState("2026-04-01");
  const [newEnd, setNewEnd] = useState("2026-04-30");
  const [newDesc, setNewDesc] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    setMounted(true);
    setPsas(loadOrSeed(STORAGE_KEY, SEED_PSAS));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const addPSA = () => {
    if (!newTitle.trim() || !newOrg.trim()) return;
    const psa: PSA = {
      id: genId("psa"),
      title: newTitle,
      organization: newOrg,
      category: newCat,
      duration: newDur,
      rotationPriority: newPriority,
      startDate: newStart,
      endDate: newEnd,
      totalPlaysMonth: 0,
      totalPlaysAll: 0,
      status: "Scheduled",
      contactName: newContact,
      contactPhone: newPhone,
      description: newDesc,
    };
    const updated = [psa, ...psas];
    setPsas(updated);
    persist(STORAGE_KEY, updated);
    setShowAdd(false);
    setNewTitle(""); setNewOrg(""); setNewDesc(""); setNewContact(""); setNewPhone("");
  };

  const activePSAs = psas.filter((p) => p.status === "Active").length;
  const scheduledPSAs = psas.filter((p) => p.status === "Scheduled").length;
  const totalPlays = psas.reduce((s, p) => s + p.totalPlaysMonth, 0);
  const categories = [...new Set(psas.map((p) => p.category))].length;

  const priorityBadge = (p: string) => {
    const styles: Record<string, string> = {
      High: "bg-red-500/10 text-red-400 border-red-500/20",
      Medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      Low: "bg-foreground/[0.06] text-muted-foreground border-border",
    };
    return <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[p] || styles.Medium}`}>{p}</span>;
  };

  const columns: Column<PSA>[] = [
    { key: "title", label: "PSA Title", sortable: true, sortKey: (r) => r.title, render: (r) => <span className="font-medium text-sm">{r.title}</span> },
    { key: "org", label: "Organization", sortable: true, sortKey: (r) => r.organization, render: (r) => <span className="text-sm text-muted-foreground">{r.organization}</span> },
    { key: "cat", label: "Category", render: (r) => {
      const Icon = CAT_ICONS[r.category] || Users;
      return <div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs">{r.category}</span></div>;
    }},
    { key: "dur", label: "Duration", align: "center", render: (r) => <span className="font-mono text-xs">{r.duration}</span> },
    { key: "priority", label: "Rotation", render: (r) => priorityBadge(r.rotationPriority) },
    { key: "dates", label: "Run Dates", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.startDate)} - {formatDate(r.endDate)}</span> },
    { key: "plays", label: "Plays (Mo)", align: "center", sortable: true, sortKey: (r) => r.totalPlaysMonth, render: (r) => <span className="text-sm font-medium">{r.totalPlaysMonth}</span> },
    { key: "status", label: "Status", sortable: true, sortKey: (r) => r.status, render: (r) => <StatusBadge status={r.status === "Paused" ? "Pending" : r.status === "Expired" ? "Cancelled" : r.status === "Scheduled" ? "Scheduled" : "Active"} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={Megaphone} title="PSA Rotation" description="Public Service Announcement management and rotation scheduling" badge="PSA" badgeColor="bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">
          <Plus className="h-4 w-4" /> Add PSA
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active PSAs" value={activePSAs} icon={Megaphone} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Scheduled" value={scheduledPSAs} icon={Activity} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Plays This Month" value={totalPlays} icon={Activity} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Categories" value={categories} icon={Users} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      <DataTable
        columns={columns}
        data={psas}
        keyField="id"
        searchable
        searchPlaceholder="Search PSA title or organization..."
        searchFilter={(r, q) => r.title.toLowerCase().includes(q) || r.organization.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      {/* Detail */}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || ""} subtitle={selected?.organization} maxWidth="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Category</span><p className="text-sm">{selected.category}</p></div>
              <div><span className="text-xs text-muted-foreground">Duration</span><p className="text-sm">{selected.duration}</p></div>
              <div><span className="text-xs text-muted-foreground">Rotation Priority</span><p className="mt-0.5">{priorityBadge(selected.rotationPriority)}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-xs text-muted-foreground">Start Date</span><p className="text-sm">{formatDate(selected.startDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">End Date</span><p className="text-sm">{formatDate(selected.endDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Plays This Month</span><p className="text-sm font-medium">{selected.totalPlaysMonth}</p></div>
              <div><span className="text-xs text-muted-foreground">Total Plays</span><p className="text-sm font-medium">{selected.totalPlaysAll}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm text-muted-foreground mt-1">{selected.description}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Contact</span><p className="text-sm">{selected.contactName}</p></div>
              <div><span className="text-xs text-muted-foreground">Phone</span><p className="text-sm">{selected.contactPhone}</p></div>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Add PSA Modal */}
      <DetailModal open={showAdd} onClose={() => setShowAdd(false)} title="Add New PSA" subtitle="Public Service Announcement" maxWidth="max-w-lg"
        actions={<button onClick={addPSA} className="px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">Add PSA</button>}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">PSA Title</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="PSA title" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Organization</label>
            <input type="text" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} placeholder="Organization name" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <select value={newCat} onChange={(e) => setNewCat(e.target.value as PSA["category"])} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>Health</option><option>Education</option><option>Safety</option><option>Community</option><option>Environment</option><option>Veterans</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duration</label>
              <select value={newDur} onChange={(e) => setNewDur(e.target.value as PSA["duration"])} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>:15</option><option>:30</option><option>:60</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as PSA["rotationPriority"])} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground">Start Date</label><input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
            <div><label className="text-xs text-muted-foreground">End Date</label><input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Description</label><textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Description..." className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground">Contact Name</label><input type="text" value={newContact} onChange={(e) => setNewContact(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
            <div><label className="text-xs text-muted-foreground">Contact Phone</label><input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" /></div>
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
