"use client";

import { useState, useEffect } from "react";
import {
  CalendarCheck,
  Users,
  Plus,
  Clock,
  CheckCircle2,
  MessageSquare,
  Phone,
  Presentation,
  FileText,
  Target,
  Save,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DetailModal } from "@/components/admin/detail-modal";
import { StatusBadge } from "@/components/admin/status-badge";
import { loadOrSeed, persist, genId, formatDate, formatDateTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RepReport {
  repName: string;
  callsMade: number;
  presentations: number;
  proposalsSent: number;
  closedDeals: number;
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  completed: boolean;
}

interface SalesMeeting {
  id: string;
  date: string;
  title: string;
  attendees: string[];
  agenda: string;
  notes: string;
  repReports: RepReport[];
  actionItems: ActionItem[];
  pipelineNotes: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  createdAt: string;
}

const REPS = ["Marcus Jefferson", "Danielle Brooks", "Tony Ramirez", "Ashley Chen", "David Patterson"];

const KEY = "wccg_sales_meetings";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_MEETINGS: SalesMeeting[] = [
  {
    id: "mtg1",
    date: "2026-03-14T09:00:00Z",
    title: "Weekly Sales Meeting - Week 11",
    attendees: ["Marcus Jefferson", "Danielle Brooks", "Tony Ramirez", "Ashley Chen", "David Patterson"],
    agenda: "1. Pipeline review\n2. Q1 pacing update\n3. New co-op opportunities\n4. Upcoming client renewals",
    notes: "Team is pacing 8% ahead of Q1 target. Morning drive inventory tight for April. Need to focus on digital upsells.",
    repReports: [
      { repName: "Marcus Jefferson", callsMade: 22, presentations: 4, proposalsSent: 2, closedDeals: 1 },
      { repName: "Danielle Brooks", callsMade: 18, presentations: 3, proposalsSent: 3, closedDeals: 0 },
      { repName: "Tony Ramirez", callsMade: 15, presentations: 2, proposalsSent: 1, closedDeals: 1 },
      { repName: "Ashley Chen", callsMade: 20, presentations: 3, proposalsSent: 2, closedDeals: 0 },
      { repName: "David Patterson", callsMade: 12, presentations: 1, proposalsSent: 1, closedDeals: 0 },
    ],
    actionItems: [
      { id: "ai1", description: "Follow up on Crown Complex concert series proposal", assignee: "Marcus Jefferson", completed: false },
      { id: "ai2", description: "Send revised rate card to Fort Liberty Auto Group", assignee: "Tony Ramirez", completed: true },
      { id: "ai3", description: "Schedule lunch with Fayetteville Woodpeckers contact", assignee: "Danielle Brooks", completed: false },
      { id: "ai4", description: "Prepare Q1 commission report for GM review", assignee: "Ashley Chen", completed: false },
    ],
    pipelineNotes: "Total pipeline: $112K. 3 deals expected to close this month. Fort Liberty Auto deal moved to negotiation. Crown Complex proposal submitted.",
    status: "Completed",
    createdAt: "2026-03-13T16:00:00Z",
  },
  {
    id: "mtg2",
    date: "2026-03-07T09:00:00Z",
    title: "Weekly Sales Meeting - Week 10",
    attendees: ["Marcus Jefferson", "Danielle Brooks", "Tony Ramirez", "David Patterson"],
    agenda: "1. Pipeline review\n2. New business development\n3. February close-out\n4. March targets",
    notes: "February closed strong with 3 new clients. March looks promising. Ashley out sick.",
    repReports: [
      { repName: "Marcus Jefferson", callsMade: 19, presentations: 3, proposalsSent: 2, closedDeals: 2 },
      { repName: "Danielle Brooks", callsMade: 16, presentations: 2, proposalsSent: 1, closedDeals: 1 },
      { repName: "Tony Ramirez", callsMade: 14, presentations: 3, proposalsSent: 2, closedDeals: 0 },
      { repName: "David Patterson", callsMade: 10, presentations: 1, proposalsSent: 0, closedDeals: 0 },
    ],
    actionItems: [
      { id: "ai5", description: "Finalize Cape Fear Valley Health proposal", assignee: "Danielle Brooks", completed: true },
      { id: "ai6", description: "Create package deal for Mash House Brewing renewal", assignee: "Marcus Jefferson", completed: true },
    ],
    pipelineNotes: "Pipeline at $98K. Two deals closed last week totaling $19.5K. New prospecting push needed for Q2.",
    status: "Completed",
    createdAt: "2026-03-06T16:00:00Z",
  },
  {
    id: "mtg3",
    date: "2026-03-21T09:00:00Z",
    title: "Weekly Sales Meeting - Week 12",
    attendees: REPS,
    agenda: "1. Pipeline review\n2. Q1 final push\n3. April avails review\n4. Co-op fund check-in",
    notes: "",
    repReports: [],
    actionItems: [],
    pipelineNotes: "",
    status: "Scheduled",
    createdAt: "2026-03-14T10:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesMeetingsPage() {
  const [meetings, setMeetings] = useState<SalesMeeting[]>([]);
  const [mounted, setMounted] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    date: "",
    title: "",
    attendees: [] as string[],
    agenda: "",
  });

  useEffect(() => {
    setMounted(true);
    setMeetings(loadOrSeed(KEY, SEED_MEETINGS));
  }, []);

  if (!mounted) return null;

  // Stats
  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter((m) => m.status === "Completed").length;
  const totalCalls = meetings.reduce((s, m) => s + m.repReports.reduce((ss, r) => ss + r.callsMade, 0), 0);
  const totalClosed = meetings.reduce((s, m) => s + m.repReports.reduce((ss, r) => ss + r.closedDeals, 0), 0);

  function toggleAttendee(name: string) {
    setNewMeeting((p) => ({
      ...p,
      attendees: p.attendees.includes(name)
        ? p.attendees.filter((a) => a !== name)
        : [...p.attendees, name],
    }));
  }

  function handleAddMeeting() {
    if (!newMeeting.title.trim() || !newMeeting.date) return;
    const meeting: SalesMeeting = {
      id: genId("mtg"),
      date: new Date(newMeeting.date).toISOString(),
      title: newMeeting.title,
      attendees: newMeeting.attendees,
      agenda: newMeeting.agenda,
      notes: "",
      repReports: [],
      actionItems: [],
      pipelineNotes: "",
      status: "Scheduled",
      createdAt: new Date().toISOString(),
    };
    const updated = [...meetings, meeting];
    setMeetings(updated);
    persist(KEY, updated);
    setNewMeeting({ date: "", title: "", attendees: [], agenda: "" });
    setShowAdd(false);
  }

  function toggleActionItem(meetingId: string, itemId: string) {
    const updated = meetings.map((m) => {
      if (m.id !== meetingId) return m;
      return {
        ...m,
        actionItems: m.actionItems.map((ai) =>
          ai.id === itemId ? { ...ai, completed: !ai.completed } : ai
        ),
      };
    });
    setMeetings(updated);
    persist(KEY, updated);
  }

  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CalendarCheck}
        title="Sales Meetings"
        description="Weekly sales meeting tracker and activity reports."
      >
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#74ddc7] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Meetings" value={totalMeetings.toString()} icon={CalendarCheck} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Completed" value={completedMeetings.toString()} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Total Calls Reported" value={totalCalls.toString()} icon={Phone} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Deals Closed" value={totalClosed.toString()} icon={Target} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Meeting List */}
      <div className="space-y-3">
        {sortedMeetings.map((meeting) => {
          const isExpanded = expandedMeeting === meeting.id;
          return (
            <div key={meeting.id} className={`rounded-xl border bg-card transition-all ${isExpanded ? "border-[#74ddc7]/30 shadow-lg shadow-black/5" : "border-border hover:border-input"}`}>
              {/* Header */}
              <button
                type="button"
                onClick={() => setExpandedMeeting(isExpanded ? null : meeting.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${meeting.status === "Completed" ? "bg-emerald-500/10 border border-emerald-500/20" : meeting.status === "Scheduled" ? "bg-blue-500/10 border border-blue-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  <CalendarCheck className={`h-5 w-5 ${meeting.status === "Completed" ? "text-emerald-400" : meeting.status === "Scheduled" ? "text-blue-400" : "text-red-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm truncate">{meeting.title}</h3>
                    <StatusBadge status={meeting.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(meeting.date)} · {meeting.attendees.length} attendees
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                  {meeting.repReports.length > 0 && (
                    <>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{meeting.repReports.reduce((s, r) => s + r.callsMade, 0)}</p>
                        <p className="text-[10px]">Calls</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{meeting.repReports.reduce((s, r) => s + r.closedDeals, 0)}</p>
                        <p className="text-[10px]">Closed</p>
                      </div>
                    </>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground/40 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Agenda */}
                  {meeting.agenda && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Agenda</h4>
                      <pre className="text-sm text-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap font-sans">{meeting.agenda}</pre>
                    </div>
                  )}

                  {/* Attendees */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Attendees</h4>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted border border-border text-foreground">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rep Reports */}
                  {meeting.repReports.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Rep Activity Reports</h4>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground">
                              <th className="text-left font-medium px-3 py-2">Rep</th>
                              <th className="text-center font-medium px-3 py-2">Calls</th>
                              <th className="text-center font-medium px-3 py-2 hidden sm:table-cell">Presentations</th>
                              <th className="text-center font-medium px-3 py-2 hidden sm:table-cell">Proposals</th>
                              <th className="text-center font-medium px-3 py-2">Closed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meeting.repReports.map((rr) => (
                              <tr key={rr.repName} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 font-medium text-foreground text-xs">{rr.repName}</td>
                                <td className="px-3 py-2 text-center text-foreground">{rr.callsMade}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground hidden sm:table-cell">{rr.presentations}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground hidden sm:table-cell">{rr.proposalsSent}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`font-semibold ${rr.closedDeals > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>{rr.closedDeals}</span>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-muted/20 font-semibold text-xs">
                              <td className="px-3 py-2 text-foreground">Total</td>
                              <td className="px-3 py-2 text-center text-foreground">{meeting.repReports.reduce((s, r) => s + r.callsMade, 0)}</td>
                              <td className="px-3 py-2 text-center text-foreground hidden sm:table-cell">{meeting.repReports.reduce((s, r) => s + r.presentations, 0)}</td>
                              <td className="px-3 py-2 text-center text-foreground hidden sm:table-cell">{meeting.repReports.reduce((s, r) => s + r.proposalsSent, 0)}</td>
                              <td className="px-3 py-2 text-center text-emerald-400">{meeting.repReports.reduce((s, r) => s + r.closedDeals, 0)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {meeting.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Action Items</h4>
                      <div className="space-y-2">
                        {meeting.actionItems.map((ai) => (
                          <label key={ai.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${ai.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-border hover:border-input"}`}>
                            <input
                              type="checkbox"
                              checked={ai.completed}
                              onChange={() => toggleActionItem(meeting.id, ai.id)}
                              className="mt-0.5 rounded border-border"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${ai.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{ai.description}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Assigned to: {ai.assignee}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pipeline Notes */}
                  {meeting.pipelineNotes && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pipeline Review</h4>
                      <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{meeting.pipelineNotes}</p>
                    </div>
                  )}

                  {/* Meeting Notes */}
                  {meeting.notes && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Meeting Notes</h4>
                      <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{meeting.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Meeting Modal */}
      <DetailModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Schedule Meeting"
        subtitle="Create a new weekly sales meeting"
        maxWidth="max-w-md"
        actions={
          <>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="button" onClick={handleAddMeeting} className="px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-[#74ddc7] rounded-lg hover:bg-[#74ddc7]/90 transition-colors inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />Schedule</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Meeting Title *</label>
            <input type="text" value={newMeeting.title} onChange={(e) => setNewMeeting((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Weekly Sales Meeting - Week 13" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date & Time *</label>
            <input type="datetime-local" value={newMeeting.date} onChange={(e) => setNewMeeting((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Attendees</label>
            <div className="flex flex-wrap gap-2">
              {REPS.map((rep) => (
                <label key={rep} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 cursor-pointer transition-colors text-xs ${newMeeting.attendees.includes(rep) ? "border-[#74ddc7]/30 bg-[#74ddc7]/5 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <input type="checkbox" checked={newMeeting.attendees.includes(rep)} onChange={() => toggleAttendee(rep)} className="sr-only" />
                  {rep}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Agenda</label>
            <textarea value={newMeeting.agenda} onChange={(e) => setNewMeeting((p) => ({ ...p, agenda: e.target.value }))} rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" placeholder="1. Pipeline review&#10;2. New business&#10;3. Action items" />
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
