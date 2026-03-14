"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { Button } from "@/components/ui/button";
import { loadOrSeed, persist, genId, formatDate, formatDateTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

interface Meeting {
  id: string;
  title: string;
  date: string;
  category: "Staff Meeting" | "Sales Meeting" | "Programming" | "Department Head";
  attendees: string[];
  agenda: string;
  notes: string;
  actionItems: string[];
  status: "Scheduled" | "Completed" | "Cancelled";
}

const SEED_MEETINGS: Meeting[] = [
  {
    id: "mt1",
    title: "Weekly Department Heads Sync",
    date: "2026-03-14T10:00:00Z",
    category: "Department Head",
    attendees: ["Marcus Thompson", "Keisha Williams", "Devon Robinson", "Angela Davis", "Brandon Lee"],
    agenda: "Q1 review, staffing updates, budget allocation, upcoming FCC renewal",
    notes: "Discussed Q1 revenue shortfall of 6.3% against target. Angela reported strong pipeline for Q2. Brandon proposed Spring Fling festival sponsorship packages. FCC renewal paperwork needs to be filed by April 28.",
    actionItems: ["Angela: Finalize Q2 sales projections by 3/18", "Brandon: Draft Spring Fling proposal by 3/20", "Devon: Submit FCC renewal docs by 3/25"],
    status: "Completed",
  },
  {
    id: "mt2",
    title: "Sales Team Strategy Session",
    date: "2026-03-13T14:00:00Z",
    category: "Sales Meeting",
    attendees: ["Angela Davis", "Tanya Brooks", "Lisa Henderson"],
    agenda: "New prospect review, digital ad package pricing, Cross Creek Mall renewal",
    notes: "Cross Creek Mall wants to increase digital spend by 25%. New prospect Fayetteville Auto Mall looking at a 6-month package. Lisa pitched a bundled on-air + streaming package that resonated well.",
    actionItems: ["Tanya: Send Cross Creek Mall proposal by 3/17", "Lisa: Follow up with Auto Mall contact by 3/16", "Angela: Update pricing sheet for digital bundles"],
    status: "Completed",
  },
  {
    id: "mt3",
    title: "All-Staff Monthly Meeting",
    date: "2026-03-10T09:00:00Z",
    category: "Staff Meeting",
    attendees: ["All Staff"],
    agenda: "Station updates, listener engagement stats, upcoming events, employee spotlight",
    notes: "Listener reach up 5.2% month-over-month. DJ Smooth won the Employee of the Month award. Discussed the upcoming Fayetteville Spring Fest broadcast. New studio equipment arriving next week.",
    actionItems: ["Chris: Coordinate equipment installation with James", "Brandon: Finalize Spring Fest logistics", "Sarah: Update staff schedule for event coverage"],
    status: "Completed",
  },
  {
    id: "mt4",
    title: "Programming Review",
    date: "2026-03-18T10:00:00Z",
    category: "Programming",
    attendees: ["Keisha Williams", "DJ Smooth", "Lady Soul", "DJ Quick"],
    agenda: "Ratings analysis, playlist optimization, new show concepts, listener survey results",
    notes: "",
    actionItems: [],
    status: "Scheduled",
  },
  {
    id: "mt5",
    title: "Q2 Planning Session",
    date: "2026-03-21T09:00:00Z",
    category: "Department Head",
    attendees: ["Marcus Thompson", "Keisha Williams", "Devon Robinson", "Angela Davis", "James Carter"],
    agenda: "Q2 goals, budget review, capital expenditure approvals, summer programming slate",
    notes: "",
    actionItems: [],
    status: "Scheduled",
  },
];

const CATEGORIES = ["All", "Staff Meeting", "Sales Meeting", "Programming", "Department Head"] as const;
const STORAGE_KEY = "wccg:gm:meetings";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    setMeetings(loadOrSeed(STORAGE_KEY, SEED_MEETINGS));
  }, []);

  function save(data: Meeting[]) {
    setMeetings(data);
    persist(STORAGE_KEY, data);
  }

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState<Meeting["category"]>("Staff Meeting");
  const [formAttendees, setFormAttendees] = useState("");
  const [formAgenda, setFormAgenda] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formActions, setFormActions] = useState("");

  function resetForm() {
    setFormTitle("");
    setFormDate("");
    setFormCategory("Staff Meeting");
    setFormAttendees("");
    setFormAgenda("");
    setFormNotes("");
    setFormActions("");
  }

  function handleCreate() {
    if (!formTitle || !formDate) return;
    const m: Meeting = {
      id: genId("mt"),
      title: formTitle,
      date: new Date(formDate).toISOString(),
      category: formCategory,
      attendees: formAttendees.split(",").map((a) => a.trim()).filter(Boolean),
      agenda: formAgenda,
      notes: formNotes,
      actionItems: formActions.split("\n").map((a) => a.trim()).filter(Boolean),
      status: "Scheduled",
    };
    save([m, ...meetings]);
    resetForm();
    setShowForm(false);
  }

  const filtered = catFilter === "All" ? meetings : meetings.filter((m) => m.category === catFilter);
  const completedCount = meetings.filter((m) => m.status === "Completed").length;
  const scheduledCount = meetings.filter((m) => m.status === "Scheduled").length;
  const totalActions = meetings.reduce((s, m) => s + m.actionItems.length, 0);

  const columns: Column<Meeting>[] = [
    { key: "title", label: "Title", sortable: true, sortKey: (r) => r.title, render: (r) => <span className="font-medium text-foreground">{r.title}</span> },
    { key: "date", label: "Date", sortable: true, sortKey: (r) => r.date, render: (r) => <span className="text-muted-foreground text-xs">{formatDateTime(r.date)}</span> },
    { key: "category", label: "Category", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.category}</span> },
    { key: "attendees", label: "Attendees", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.attendees.length > 2 ? `${r.attendees.slice(0, 2).join(", ")} +${r.attendees.length - 2}` : r.attendees.join(", ")}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={CalendarDays}
        title="Meeting Notes"
        description="Track meetings, agendas, and action items"
        iconColor="text-purple-400"
        iconBg="bg-purple-500/10 border-purple-500/20"
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Meeting"}
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Completed" value={completedCount} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Scheduled" value={scheduledCount} icon={Clock} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Action Items" value={totalActions} icon={FileText} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Meeting</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Meeting title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            <input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as Meeting["category"])} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
              {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Attendees (comma-separated)" value={formAttendees} onChange={(e) => setFormAttendees(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <textarea placeholder="Agenda" value={formAgenda} onChange={(e) => setFormAgenda(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          <textarea placeholder="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          <textarea placeholder="Action items (one per line)" value={formActions} onChange={(e) => setFormActions(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreate} disabled={!formTitle || !formDate}>
              <Plus className="h-4 w-4" /> Create Meeting
            </Button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <TabsNav
        tabs={CATEGORIES.map((c) => ({
          key: c,
          label: c,
          count: c === "All" ? meetings.length : meetings.filter((m) => m.category === c).length,
        }))}
        active={catFilter}
        onChange={setCatFilter}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search meetings..."
        searchFilter={(r, q) => r.title.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      {/* Detail Modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={selected ? `${selected.category} — ${formatDateTime(selected.date)}` : ""}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Attendees</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.attendees.map((a) => (
                  <span key={a} className="text-xs bg-muted rounded-full px-2.5 py-1 text-foreground">{a}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Agenda</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.agenda || "No agenda set"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.notes || "No notes yet"}</p>
            </div>
            {selected.actionItems.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Action Items</p>
                <ul className="space-y-2">
                  {selected.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[#74ddc7] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
