"use client";

import { useState, useEffect } from "react";
import {
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Zap,
  Music,
  Fuel,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { loadOrSeed, loadSingle, persist, formatDate, formatDateTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupScheduleEntry {
  id: string;
  system: string;
  type: "Full" | "Incremental" | "Differential";
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: "Success" | "Warning" | "Failed";
  size: string;
  destination: string;
}

interface DRChecklistItem {
  id: string;
  category: string;
  task: string;
  checked: boolean;
  lastVerified: string;
  verifiedBy: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

interface BackupStatus {
  lastFullBackup: string;
  lastFullStatus: "Success" | "Warning" | "Failed";
  automationStatus: "Online" | "Degraded" | "Offline";
  emergencyPlaylistLoaded: boolean;
  emergencyPlaylistSongs: number;
  generatorLastTest: string;
  generatorTestResult: "Pass" | "Fail";
  generatorFuelLevel: number;
}

const SEED_STATUS: BackupStatus = {
  lastFullBackup: "2026-03-14T02:00:00",
  lastFullStatus: "Success",
  automationStatus: "Online",
  emergencyPlaylistLoaded: true,
  emergencyPlaylistSongs: 240,
  generatorLastTest: "2026-03-07T14:00:00",
  generatorTestResult: "Fail",
  generatorFuelLevel: 82,
};

const SEED_SCHEDULE: BackupScheduleEntry[] = [
  { id: "bk1", system: "Automation Server (Zetta)", type: "Full", schedule: "Daily 2:00 AM", lastRun: "2026-03-14T02:00:00", nextRun: "2026-03-15T02:00:00", status: "Success", size: "128 GB", destination: "NAS — Rack 2" },
  { id: "bk2", system: "Automation Server (Zetta)", type: "Incremental", schedule: "Every 4 hours", lastRun: "2026-03-14T10:00:00", nextRun: "2026-03-14T14:00:00", status: "Success", size: "2.1 GB", destination: "NAS — Rack 2" },
  { id: "bk3", system: "Audio Library", type: "Full", schedule: "Weekly — Sun 1:00 AM", lastRun: "2026-03-09T01:00:00", nextRun: "2026-03-16T01:00:00", status: "Success", size: "1.8 TB", destination: "External RAID" },
  { id: "bk4", system: "Traffic & Billing DB", type: "Full", schedule: "Daily 3:00 AM", lastRun: "2026-03-14T03:00:00", nextRun: "2026-03-15T03:00:00", status: "Success", size: "4.2 GB", destination: "Cloud — Backblaze B2" },
  { id: "bk5", system: "Email Server", type: "Full", schedule: "Daily 4:00 AM", lastRun: "2026-03-14T04:00:00", nextRun: "2026-03-15T04:00:00", status: "Success", size: "22 GB", destination: "Cloud — Backblaze B2" },
  { id: "bk6", system: "Streaming Server Config", type: "Full", schedule: "Weekly — Mon 2:00 AM", lastRun: "2026-03-10T02:00:00", nextRun: "2026-03-17T02:00:00", status: "Success", size: "450 MB", destination: "NAS — Rack 2" },
  { id: "bk7", system: "EAS Logs & Config", type: "Full", schedule: "Daily 5:00 AM", lastRun: "2026-03-14T05:00:00", nextRun: "2026-03-15T05:00:00", status: "Warning", size: "180 MB", destination: "NAS — Rack 2" },
  { id: "bk8", system: "Website & CMS", type: "Full", schedule: "Weekly — Tue 3:00 AM", lastRun: "2026-03-11T03:00:00", nextRun: "2026-03-18T03:00:00", status: "Success", size: "8.5 GB", destination: "Cloud — Backblaze B2" },
];

const SEED_CHECKLIST: DRChecklistItem[] = [
  { id: "dr1", category: "Power", task: "Generator starts and runs under load for 30 minutes", checked: false, lastVerified: "2026-03-07", verifiedBy: "James Carter", notes: "Failed last test — fuel pump issue. CAT technician scheduled." },
  { id: "dr2", category: "Power", task: "UPS batteries provide minimum 15 minutes runtime", checked: false, lastVerified: "2026-02-10", verifiedBy: "James Carter", notes: "Currently at 12 min. Battery replacement in progress." },
  { id: "dr3", category: "Power", task: "Generator fuel tank above 75%", checked: true, lastVerified: "2026-03-12", verifiedBy: "James Carter", notes: "Fuel at 82%. Last fill: Feb 28." },
  { id: "dr4", category: "Audio", task: "Emergency playlist loaded and tested in Zetta", checked: true, lastVerified: "2026-03-10", verifiedBy: "Devon Robinson", notes: "240 songs, ~16 hours of content. Mix of gospel, R&B, community." },
  { id: "dr5", category: "Audio", task: "Backup automation server synced and ready", checked: true, lastVerified: "2026-03-14", verifiedBy: "James Carter", notes: "Hot standby — auto-failover configured." },
  { id: "dr6", category: "Audio", task: "Satellite receiver backup feed available", checked: true, lastVerified: "2026-03-01", verifiedBy: "James Carter", notes: "ABC Radio backup feed on Satellite 2. Auto-switch on silence detect." },
  { id: "dr7", category: "Transmitter", task: "Backup transmitter operational and tested", checked: true, lastVerified: "2026-03-05", verifiedBy: "James Carter", notes: "Nautel VS2.5 tested at 2.5 kW. Switchover time: ~30 seconds." },
  { id: "dr8", category: "Transmitter", task: "STL backup link (T1) tested", checked: true, lastVerified: "2026-03-08", verifiedBy: "James Carter", notes: "T1 backup tested. Failover time: 1.2 seconds." },
  { id: "dr9", category: "IT", task: "Off-site backup verified and restorable", checked: true, lastVerified: "2026-03-03", verifiedBy: "Devon Robinson", notes: "Test restore from Backblaze B2 — successful." },
  { id: "dr10", category: "IT", task: "Network switches have redundant power", checked: true, lastVerified: "2026-02-15", verifiedBy: "James Carter", notes: "All critical switches on UPS." },
  { id: "dr11", category: "Communications", task: "Emergency contact list updated and distributed", checked: true, lastVerified: "2026-03-01", verifiedBy: "Devon Robinson", notes: "Updated with new cell numbers. Copies in Studios A, B, and transmitter site." },
  { id: "dr12", category: "Communications", task: "FCC emergency contact information current", checked: true, lastVerified: "2026-02-28", verifiedBy: "Devon Robinson", notes: "FCC Field Office: Washington, DC. Local contact current." },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BackupPage() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<BackupStatus>(SEED_STATUS);
  const [schedule, setSchedule] = useState<BackupScheduleEntry[]>([]);
  const [checklist, setChecklist] = useState<DRChecklistItem[]>([]);

  useEffect(() => {
    setStatus(loadSingle("ops_backup_status", SEED_STATUS));
    setSchedule(loadOrSeed("ops_backup_schedule", SEED_SCHEDULE));
    setChecklist(loadOrSeed("ops_dr_checklist", SEED_CHECKLIST));
    setMounted(true);
  }, []);

  const toggleCheck = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    persist("ops_dr_checklist", updated);
  };

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  const checkedCount = checklist.filter((c) => c.checked).length;

  const scheduleColumns: Column<BackupScheduleEntry>[] = [
    {
      key: "system",
      label: "System",
      sortable: true,
      sortKey: (r) => r.system,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.system}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.type}</p>
        </div>
      ),
    },
    {
      key: "schedule",
      label: "Schedule",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.schedule}</span>,
    },
    {
      key: "lastRun",
      label: "Last Run",
      sortable: true,
      sortKey: (r) => new Date(r.lastRun).getTime(),
      render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.lastRun)}</span>,
    },
    {
      key: "nextRun",
      label: "Next Run",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.nextRun)}</span>,
    },
    {
      key: "size",
      label: "Size",
      hideOnMobile: true,
      align: "right",
      render: (r) => <span className="text-xs text-muted-foreground font-mono">{r.size}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status === "Success" ? "operational" : r.status === "Warning" ? "warning" : "critical"} />,
    },
    {
      key: "destination",
      label: "Destination",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{r.destination}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={HardDrive}
        iconColor="text-red-400"
        iconBg="bg-red-500/10 border-red-500/20"
        title="Backup & Disaster Recovery"
        description="System backups, emergency readiness & DR verification"
        badge={status.generatorTestResult === "Fail" ? "Alert" : "OK"}
        badgeColor={status.generatorTestResult === "Fail" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}
      />

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Last Full Backup</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Database className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{formatDateTime(status.lastFullBackup)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400">{status.lastFullStatus}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Automation System</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{status.automationStatus}</p>
          <p className="text-xs text-muted-foreground mt-2">RCS Zetta — Primary + Hot Standby</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Emergency Playlist</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#74ddc7]/10">
              <Music className="h-4 w-4 text-[#74ddc7]" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{status.emergencyPlaylistLoaded ? "Loaded" : "Not Loaded"}</p>
          <p className="text-xs text-muted-foreground mt-2">{status.emergencyPlaylistSongs} songs (~16 hours)</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Generator Status</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${status.generatorTestResult === "Fail" ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
              <Fuel className={`h-4 w-4 ${status.generatorTestResult === "Fail" ? "text-red-400" : "text-emerald-400"}`} />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">Last Test: {status.generatorTestResult}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{formatDate(status.generatorLastTest)}</span>
            <span className="text-xs text-muted-foreground">Fuel: {status.generatorFuelLevel}%</span>
          </div>
        </div>
      </div>

      {/* Backup schedule */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Backup Schedule</h2>
        <DataTable
          columns={scheduleColumns}
          data={schedule}
          keyField="id"
          searchable
          searchPlaceholder="Search backups..."
          searchFilter={(row, q) => row.system.toLowerCase().includes(q) || row.destination.toLowerCase().includes(q)}
        />
      </div>

      {/* DR Checklist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Disaster Recovery Checklist</h2>
          <span className="text-sm text-muted-foreground">{checkedCount}/{checklist.length} verified</span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <button
                type="button"
                onClick={() => toggleCheck(item.id)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  item.checked
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "border-border text-transparent hover:border-muted-foreground"
                }`}
              >
                {item.checked && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.task}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.category}</span>
                  <span className="text-[10px] text-muted-foreground">Verified: {formatDate(item.lastVerified)} by {item.verifiedBy}</span>
                </div>
                {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
              </div>
              {!item.checked && item.category === "Power" && (
                <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
