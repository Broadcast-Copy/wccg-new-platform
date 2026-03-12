"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Clapperboard,
  Clock,
  CalendarDays,
  Radio,
  Music,
  Video,
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatus = "Pending" | "In Progress" | "Review" | "Completed" | "Archived";
type StudioStatus = "In Use" | "Available" | "Booked";

interface ProductionJob {
  id: string;
  client: string;
  type: string;
  due: string;
  status: JobStatus;
  assignedTo: string;
  project?: string; // Broadcast Studio project name
}

interface Studio {
  name: string;
  activity: string;
  status: StudioStatus;
  color: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// Mock broadcast studio projects for the dropdown
const STUDIO_PROJECTS = [
  { id: "proj_1", name: "Spring Auto Campaign Mix" },
  { id: "proj_2", name: "Morning Show Bumpers" },
  { id: "proj_3", name: "BBQ Fest Jingles" },
  { id: "proj_4", name: "Bank Holiday Promo" },
  { id: "proj_5", name: "Event Recap Video" },
];

const initialJobs: ProductionJob[] = [
  { id: "PQ-1042", client: "Metro Auto Group", type: "Audio Spot", due: "2026-03-05", status: "In Progress", assignedTo: "Marcus T.", project: "Spring Auto Campaign Mix" },
  { id: "PQ-1043", client: "City Health Clinic", type: "Audio Spot", due: "2026-03-06", status: "Pending", assignedTo: "Unassigned" },
  { id: "PQ-1044", client: "WCCG Internal", type: "Promo", due: "2026-03-05", status: "Review", assignedTo: "Keisha W.", project: "Morning Show Bumpers" },
  { id: "PQ-1045", client: "Carolina BBQ Fest", type: "Audio Spot", due: "2026-03-08", status: "In Progress", assignedTo: "Marcus T.", project: "BBQ Fest Jingles" },
  { id: "PQ-1046", client: "First National Bank", type: "Video", due: "2026-03-10", status: "Pending", assignedTo: "Devon R.", project: "Bank Holiday Promo" },
  { id: "PQ-1047", client: "WCCG Morning Show", type: "Promo", due: "2026-03-04", status: "Completed", assignedTo: "Keisha W.", project: "Morning Show Bumpers" },
  { id: "PQ-1048", client: "Johnson Law Firm", type: "Audio Spot", due: "2026-03-07", status: "In Progress", assignedTo: "Marcus T." },
  { id: "PQ-1049", client: "WCCG Events", type: "Video", due: "2026-03-12", status: "Pending", assignedTo: "Devon R.", project: "Event Recap Video" },
];

const initialStudios: Studio[] = [
  { name: "Studio A", activity: "Recording", status: "In Use", color: "from-[#dc2626] to-[#b91c1c]" },
  { name: "Studio B", activity: "Available", status: "Available", color: "from-[#22c55e] to-[#16a34a]" },
  { name: "Studio C", activity: "Mastering", status: "In Use", color: "from-[#f59e0b] to-[#d97706]" },
];

const quickActions: { icon: LucideIcon; title: string; href: string; color: string }[] = [
  { icon: CalendarDays, title: "Studio Booking", href: "/studio/booking", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: Radio, title: "Content Library", href: "/studio", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: Music, title: "Audio Editor", href: "/studio/audio-editor", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: Video, title: "Video Editor", href: "/studio/video-editor", color: "from-[#ec4899] to-[#be185d]" },
];

// ---------------------------------------------------------------------------
// Status progression
// ---------------------------------------------------------------------------

const STATUS_ORDER: JobStatus[] = ["Pending", "In Progress", "Review", "Completed", "Archived"];

function nextStatus(current: JobStatus): JobStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES: Record<JobStatus, string> = {
  Pending: "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]",
  "In Progress": "bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]",
  Review: "bg-[#7401df]/10 border-[#7401df]/20 text-[#7401df]",
  Completed: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
  Archived: "bg-muted border-border text-muted-foreground",
};

function JobStatusBadge({ status, onClick }: { status: JobStatus; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BADGE_STYLES[status]}`}
      title="Click to advance status"
    >
      {status}
    </button>
  );
}

function StudioStatusBadge({ status }: { status: StudioStatus }) {
  const styles: Record<StudioStatus, string> = {
    "In Use": "bg-[#dc2626]/10 border-[#dc2626]/20 text-[#dc2626]",
    Available: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
    Booked: "bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status filter options
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: (JobStatus | "All")[] = ["All", ...STATUS_ORDER];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductionPage() {
  const { user } = useAuth();

  // -- State ----------------------------------------------------------------
  const [jobs, setJobs] = useState<ProductionJob[]>(initialJobs);
  const [studios, setStudios] = useState<Studio[]>(initialStudios);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "All">("All");
  const [showNewForm, setShowNewForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // New job form
  const [newClient, setNewClient] = useState("");
  const [newType, setNewType] = useState("Audio Spot");
  const [newDue, setNewDue] = useState("");
  const [newAssigned, setNewAssigned] = useState("");
  const [newProject, setNewProject] = useState("");

  // -- Helpers --------------------------------------------------------------
  const showToast = useCallback((msg: string) => {
    setStatusMsg(msg);
    toast.success(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const nextJobId = useCallback(() => {
    const maxNum = jobs.reduce((max, j) => {
      const num = parseInt(j.id.replace("PQ-", ""), 10);
      return num > max ? num : max;
    }, 0);
    return `PQ-${maxNum + 1}`;
  }, [jobs]);

  // -- Filtered / searched jobs ---------------------------------------------
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchQuery === "" ||
      job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // -- Handlers -------------------------------------------------------------
  function handleToggleStatus(id: string) {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const ns = nextStatus(j.status);
        showToast(`${j.id} status changed to ${ns}`);
        return { ...j, status: ns };
      })
    );
  }

  function handleDeleteJob(id: string) {
    const job = jobs.find((j) => j.id === id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    showToast(`Deleted job ${job?.id ?? id}`);
  }

  function handleAddJob() {
    if (!newClient.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (!newDue) {
      toast.error("Due date is required");
      return;
    }
    const job: ProductionJob = {
      id: nextJobId(),
      client: newClient.trim(),
      type: newType,
      due: newDue,
      status: "Pending",
      assignedTo: newAssigned.trim() || "Unassigned",
      project: newProject || undefined,
    };
    setJobs((prev) => [job, ...prev]);
    setShowNewForm(false);
    setNewClient("");
    setNewType("Audio Spot");
    setNewDue("");
    setNewAssigned("");
    setNewProject("");
    showToast(`Created job ${job.id}`);
  }

  function handleBookStudio(studioName: string) {
    setStudios((prev) =>
      prev.map((s) => {
        if (s.name !== studioName) return s;
        if (s.status === "Available") {
          showToast(`${studioName} booked successfully`);
          return { ...s, status: "Booked" as StudioStatus, activity: "Booked" };
        }
        if (s.status === "Booked") {
          showToast(`${studioName} booking cancelled`);
          return { ...s, status: "Available" as StudioStatus, activity: "Available" };
        }
        toast.error(`${studioName} is currently in use`);
        return s;
      })
    );
  }

  // -- Render ---------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Status Message Bar */}
      {statusMsg && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-medium text-[#0a0a0f] shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {statusMsg}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20">
            <Clapperboard className="h-7 w-7 text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Production Queue</h1>
            <p className="text-sm text-muted-foreground">
              Active jobs, studio status, and production workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#5ec4af] transition-colors"
          >
            {showNewForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {showNewForm ? "Cancel" : "New Job"}
          </Button>
          <span className="rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">
            Production
          </span>
        </div>
      </div>

      {/* New Job Form */}
      {showNewForm && (
        <div className="rounded-xl border border-[#74ddc7]/30 bg-[#74ddc7]/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold text-foreground">Add New Production Job</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Client Name *</label>
              <Input
                placeholder="e.g. Metro Auto Group"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Audio Spot">Audio Spot</option>
                <option value="Video">Video</option>
                <option value="Promo">Promo</option>
                <option value="Jingle">Jingle</option>
                <option value="Voiceover">Voiceover</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Due Date *</label>
              <Input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Assigned To</label>
              <Input
                placeholder="e.g. Marcus T."
                value={newAssigned}
                onChange={(e) => setNewAssigned(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Studio Project</label>
              <select
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None (no linked project)</option>
                {STUDIO_PROJECTS.map((proj) => (
                  <option key={proj.id} value={proj.name}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Final Mixdown</label>
              <Link
                href="/my/mixes"
                className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground hover:text-[#74ddc7] hover:border-[#74ddc7]/30 transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                Open Media Manager
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddJob} className="bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#5ec4af]">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Job
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by client, ID, type, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatusFilter(opt)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === opt
                  ? "bg-[#74ddc7] text-[#0a0a0f]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Active Jobs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#f59e0b]" />
          Active Jobs
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ({filteredJobs.length} of {jobs.length})
          </span>
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned To</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No jobs found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#74ddc7]">{job.id}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{job.client}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.type}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {job.project ? (
                          <Link
                            href="/my/studio"
                            className="inline-flex items-center gap-1 text-xs text-[#7401df] hover:text-[#7401df]/80 transition-colors font-medium"
                            title={`Open project: ${job.project}`}
                          >
                            <Clapperboard className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{job.project}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(job.due).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge
                          status={job.status}
                          onClick={() => handleToggleStatus(job.id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{job.assignedTo}</td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        {job.project && (
                          <Link
                            href="/my/mixes"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-all"
                            title="Open in Media Manager"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id)}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-[#dc2626] hover:bg-[#dc2626]/10 transition-all"
                          title="Delete job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Studio Status */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Radio className="h-5 w-5 text-[#74ddc7]" />
          Studio Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {studios.map((studio) => (
            <div
              key={studio.name}
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${studio.color}`}
                  >
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground">{studio.name}</h3>
                </div>
                <StudioStatusBadge status={studio.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Current Activity: <span className="text-foreground font-medium">{studio.activity}</span>
              </p>
              <Button
                size="sm"
                variant={studio.status === "In Use" ? "secondary" : "default"}
                disabled={studio.status === "In Use"}
                onClick={() => handleBookStudio(studio.name)}
                className={
                  studio.status === "Booked"
                    ? "bg-[#dc2626] text-white hover:bg-[#b91c1c] w-full"
                    : studio.status === "Available"
                    ? "bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#5ec4af] w-full"
                    : "w-full"
                }
              >
                {studio.status === "In Use"
                  ? "Currently In Use"
                  : studio.status === "Booked"
                  ? "Cancel Booking"
                  : "Book Studio"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.color}`}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                  {action.title}
                </h3>
              </div>
              <div
                className={`absolute -inset-1 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
