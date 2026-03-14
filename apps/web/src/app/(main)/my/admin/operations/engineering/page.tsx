"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatDate, formatDateTime, genId } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngineeringRequest {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In-Progress" | "Completed" | "Cancelled";
  location: string;
  requestedBy: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_REQUESTS: EngineeringRequest[] = [
  { id: "eng1", title: "Studio B Console Fader 7 Intermittent", description: "Fader 7 on the Wheatstone E-6 in Studio B cuts out intermittently during use. Suspected dirty pot or loose ribbon cable.", priority: "High", status: "Open", location: "Studio B", requestedBy: "Chris Morgan", assignedTo: "James Carter", createdAt: "2026-03-12T10:30:00", updatedAt: "2026-03-12T10:30:00", notes: "Affecting production sessions. Workaround: use fader 8." },
  { id: "eng2", title: "UPS Battery Replacement", description: "Server room UPS runtime down to 12 minutes. Batteries approaching end of life. Need full battery pack replacement.", priority: "High", status: "In-Progress", location: "Server Room", requestedBy: "Devon Robinson", assignedTo: "James Carter", createdAt: "2026-03-10T09:00:00", updatedAt: "2026-03-13T14:00:00", notes: "Batteries ordered from APC — expected delivery Mar 16." },
  { id: "eng3", title: "HD2 Exporter Dropouts", description: "HD2 multicast signal experiencing intermittent dropouts. Exporter software may need update or reinstall.", priority: "Medium", status: "Open", location: "Transmitter Site", requestedBy: "James Carter", assignedTo: "James Carter", createdAt: "2026-03-11T16:00:00", updatedAt: "2026-03-11T16:00:00", notes: "Scheduled for next site visit on Mar 18." },
  { id: "eng4", title: "Studio A Headphone Amp Channel 3 Dead", description: "Channel 3 output on the headphone amp in Studio A has no audio. Other channels work fine.", priority: "Low", status: "Open", location: "Studio A", requestedBy: "DJ Smooth", assignedTo: "James Carter", createdAt: "2026-03-13T08:15:00", updatedAt: "2026-03-13T08:15:00", notes: "Spare amp available if needed." },
  { id: "eng5", title: "Generator Weekly Test Failure", description: "Diesel generator failed to start during bi-weekly test run on Mar 7. Fuel pump suspected.", priority: "Critical", status: "In-Progress", location: "Transmitter Site", requestedBy: "James Carter", assignedTo: "James Carter", createdAt: "2026-03-07T11:00:00", updatedAt: "2026-03-12T09:00:00", notes: "CAT dealer technician scheduled for Mar 14. Fuel pump and starter solenoid to be inspected." },
  { id: "eng6", title: "Install New Patch Bay in Studio B", description: "Need additional TT patch bay installed in Studio B production rack for new outboard gear.", priority: "Low", status: "Completed", location: "Studio B", requestedBy: "Chris Morgan", assignedTo: "James Carter", createdAt: "2026-02-20T10:00:00", updatedAt: "2026-03-05T16:00:00", completedAt: "2026-03-05T16:00:00", notes: "48-point TT patch bay installed and normalized. All connections tested." },
  { id: "eng7", title: "Tower Light Alarm Sensor Calibration", description: "Tower light monitoring alarm triggered false positive. Sensor may need recalibration.", priority: "Medium", status: "Completed", location: "Transmitter Site", requestedBy: "Devon Robinson", assignedTo: "James Carter", createdAt: "2026-02-15T09:00:00", updatedAt: "2026-02-22T14:00:00", completedAt: "2026-02-22T14:00:00", notes: "Sensor recalibrated and tested. False alarm cleared." },
  { id: "eng8", title: "Remote Broadcast Kit Audio Feedback", description: "Comrex ACCESS unit producing feedback loop when connecting to studio. Possible mix-minus configuration issue.", priority: "Medium", status: "Completed", location: "Equipment Storage", requestedBy: "Brandon Lee", assignedTo: "James Carter", createdAt: "2026-02-10T11:00:00", updatedAt: "2026-02-14T16:00:00", completedAt: "2026-02-14T16:00:00", notes: "Mix-minus reconfigured on Wheatstone console. Tested successfully with field reporter." },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EngineeringRequestsPage() {
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<EngineeringRequest[]>([]);
  const [selected, setSelected] = useState<EngineeringRequest | null>(null);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState<EngineeringRequest["priority"]>("Medium");
  const [formLocation, setFormLocation] = useState("");

  useEffect(() => {
    setRequests(loadOrSeed("ops_engineering", SEED_REQUESTS));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  const openCount = requests.filter((r) => r.status === "Open").length;
  const inProgressCount = requests.filter((r) => r.status === "In-Progress").length;
  const completedCount = requests.filter((r) => r.status === "Completed").length;
  const criticalCount = requests.filter((r) => r.priority === "Critical" && r.status !== "Completed" && r.status !== "Cancelled").length;

  const tabFiltered = tab === "all" ? requests : requests.filter((r) => r.status.toLowerCase() === tab);

  const priorityColor = (p: string) => {
    switch (p) {
      case "Critical": return "critical";
      case "High": return "warning";
      case "Medium": return "in-progress";
      case "Low": return "draft";
      default: return "draft";
    }
  };

  const handleSubmit = () => {
    if (!formTitle.trim() || !formLocation.trim()) return;
    const now = new Date().toISOString();
    const newReq: EngineeringRequest = {
      id: genId("eng"),
      title: formTitle,
      description: formDesc,
      priority: formPriority,
      status: "Open",
      location: formLocation,
      requestedBy: "Devon Robinson",
      assignedTo: "James Carter",
      createdAt: now,
      updatedAt: now,
      notes: "",
    };
    const updated = [newReq, ...requests];
    setRequests(updated);
    persist("ops_engineering", updated);
    setShowForm(false);
    setFormTitle("");
    setFormDesc("");
    setFormPriority("Medium");
    setFormLocation("");
  };

  const columns: Column<EngineeringRequest>[] = [
    {
      key: "title",
      label: "Request",
      sortable: true,
      sortKey: (r) => r.title,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.title}</p>
          <p className="text-[10px] text-muted-foreground">{r.id.toUpperCase()} — {r.location}</p>
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      sortKey: (r) => ({ Critical: 0, High: 1, Medium: 2, Low: 3 }[r.priority]),
      render: (r) => <StatusBadge status={priorityColor(r.priority)} />,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortKey: (r) => r.status,
      render: (r) => <StatusBadge status={r.status.toLowerCase()} />,
    },
    {
      key: "assignedTo",
      label: "Assigned",
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.assignedTo}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      sortKey: (r) => new Date(r.createdAt).getTime(),
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={Wrench}
        iconColor="text-orange-400"
        iconBg="bg-orange-500/10 border-orange-500/20"
        title="Engineering Requests"
        description="Submit and track maintenance & engineering tickets"
        badge={`${openCount + inProgressCount} Active`}
        badgeColor="bg-orange-500/10 text-orange-400 border-orange-500/20"
      >
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-medium text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open" value={openCount} icon={Clock} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="In Progress" value={inProgressCount} icon={Wrench} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Critical" value={criticalCount} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Tabs */}
      <TabsNav
        tabs={[
          { key: "all", label: "All", count: requests.length },
          { key: "open", label: "Open", count: openCount },
          { key: "in-progress", label: "In Progress", count: inProgressCount },
          { key: "completed", label: "Completed", count: completedCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={tabFiltered}
        keyField="id"
        searchable
        searchPlaceholder="Search requests..."
        searchFilter={(row, q) =>
          row.title.toLowerCase().includes(q) ||
          row.location.toLowerCase().includes(q) ||
          row.requestedBy.toLowerCase().includes(q) ||
          row.assignedTo.toLowerCase().includes(q)
        }
        onRowClick={(row) => setSelected(row)}
      />

      {/* New request form modal */}
      <DetailModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Engineering Request"
        subtitle="Submit a maintenance or engineering ticket"
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formTitle.trim() || !formLocation.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-[#74ddc7] text-[#0a0a0f] font-medium hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-50"
            >
              Submit Request
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Priority</label>
            <select
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value as EngineeringRequest["priority"])}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Location *</label>
            <input
              type="text"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="e.g., Studio A, Server Room, Transmitter Site"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={4}
              placeholder="Detailed description of the problem or request..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none"
            />
          </div>
        </div>
      </DetailModal>

      {/* Detail modal */}
      <DetailModal
        open={!!selected && !showForm}
        onClose={() => setSelected(null)}
        title={selected?.title || ""}
        subtitle={selected ? `${selected.id.toUpperCase()} — ${selected.location}` : ""}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                <StatusBadge status={priorityColor(selected.priority)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selected.status.toLowerCase()} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Requested By</p>
                <p className="text-sm text-foreground">{selected.requestedBy}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                <p className="text-sm text-foreground">{selected.assignedTo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm text-foreground">{formatDateTime(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-sm text-foreground">{formatDateTime(selected.updatedAt)}</p>
              </div>
              {selected.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-sm text-foreground">{formatDateTime(selected.completedAt)}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-foreground">{selected.description}</p>
            </div>
            {selected.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-foreground">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
