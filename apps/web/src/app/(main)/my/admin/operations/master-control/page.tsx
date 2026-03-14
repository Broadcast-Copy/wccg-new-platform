"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  Zap,
  Volume2,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { loadOrSeed, formatDateTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemStatus {
  id: string;
  system: string;
  category: string;
  status: "Operational" | "Warning" | "Critical";
  metrics: { label: string; value: string }[];
  lastChecked: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

interface SystemLogEntry {
  id: string;
  timestamp: string;
  system: string;
  event: string;
  severity: "info" | "warning" | "critical";
  details: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_SYSTEMS: SystemStatus[] = [
  {
    id: "sys1",
    system: "Main Transmitter",
    category: "Transmitter",
    status: "Operational",
    metrics: [
      { label: "Frequency", value: "104.5 MHz" },
      { label: "Power Output", value: "25 kW" },
      { label: "Modulation", value: "98.2%" },
      { label: "VSWR", value: "1.1:1" },
      { label: "PA Temperature", value: "142°F" },
    ],
    lastChecked: new Date(Date.now() - 5 * 60000).toISOString(),
    icon: Radio,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    id: "sys2",
    system: "EAS System",
    category: "Emergency Alert",
    status: "Operational",
    metrics: [
      { label: "Last Weekly Test", value: "Mar 12, 2026 09:00" },
      { label: "Next Required Test", value: "Mar 19, 2026" },
      { label: "Last Monthly Test", value: "Mar 1, 2026 10:30" },
      { label: "CAP Server", value: "Connected" },
      { label: "Dasdec Unit", value: "Online" },
    ],
    lastChecked: new Date(Date.now() - 15 * 60000).toISOString(),
    icon: AlertTriangle,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/10",
  },
  {
    id: "sys3",
    system: "Audio Processing",
    category: "Audio",
    status: "Operational",
    metrics: [
      { label: "Processor", value: "Orban Optimod 8700i" },
      { label: "Input Level", value: "-18 dBFS" },
      { label: "Output Level", value: "-1.2 dBFS" },
      { label: "Limiter Activity", value: "2.1 dB" },
      { label: "Composite Level", value: "100%" },
    ],
    lastChecked: new Date(Date.now() - 2 * 60000).toISOString(),
    icon: Volume2,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
  },
  {
    id: "sys4",
    system: "HD Radio",
    category: "Transmitter",
    status: "Warning",
    metrics: [
      { label: "HD1 Status", value: "Active" },
      { label: "HD2 Status", value: "Degraded" },
      { label: "Injection Level", value: "-14 dBc" },
      { label: "MPS Sync", value: "OK" },
      { label: "PAD Data", value: "Sending" },
    ],
    lastChecked: new Date(Date.now() - 10 * 60000).toISOString(),
    icon: Radio,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-500/10",
  },
  {
    id: "sys5",
    system: "Online Stream",
    category: "Streaming",
    status: "Operational",
    metrics: [
      { label: "Bitrate", value: "128 kbps AAC" },
      { label: "Current Listeners", value: "847" },
      { label: "Peak Today", value: "1,234" },
      { label: "Server Uptime", value: "99.97%" },
      { label: "Buffer Health", value: "Good" },
    ],
    lastChecked: new Date(Date.now() - 1 * 60000).toISOString(),
    icon: Wifi,
    iconColor: "text-[#74ddc7]",
    iconBg: "bg-[#74ddc7]/10",
  },
  {
    id: "sys6",
    system: "STL Link",
    category: "Transmitter",
    status: "Operational",
    metrics: [
      { label: "Primary Link", value: "Microwave — Active" },
      { label: "Backup Link", value: "T1 — Standby" },
      { label: "Signal Strength", value: "-32 dBm" },
      { label: "BER", value: "< 10⁻⁹" },
      { label: "Latency", value: "4.2 ms" },
    ],
    lastChecked: new Date(Date.now() - 3 * 60000).toISOString(),
    icon: Activity,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
];

const SEED_LOG: SystemLogEntry[] = [
  { id: "log1", timestamp: new Date(Date.now() - 5 * 60000).toISOString(), system: "Main Transmitter", event: "Power output stable", severity: "info", details: "25 kW output confirmed. VSWR nominal at 1.1:1." },
  { id: "log2", timestamp: new Date(Date.now() - 22 * 60000).toISOString(), system: "HD Radio", event: "HD2 signal degraded", severity: "warning", details: "HD2 multicast experiencing intermittent dropouts. Exporter restarted." },
  { id: "log3", timestamp: new Date(Date.now() - 45 * 60000).toISOString(), system: "EAS System", event: "Weekly test completed", severity: "info", details: "RWT sent and logged successfully. Duration: 8 seconds." },
  { id: "log4", timestamp: new Date(Date.now() - 90 * 60000).toISOString(), system: "Audio Processing", event: "Preset changed", severity: "info", details: "Switched to 'Urban Contemporary' preset per PD request." },
  { id: "log5", timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), system: "Online Stream", event: "Listener spike detected", severity: "info", details: "Listener count jumped from 600 to 1,234 during morning drive." },
  { id: "log6", timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), system: "STL Link", event: "Backup link test", severity: "info", details: "T1 backup link tested — failover successful in 1.2 seconds." },
  { id: "log7", timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), system: "Main Transmitter", event: "PA temperature alert", severity: "warning", details: "PA temp reached 158°F briefly. Cooling fan speed increased." },
  { id: "log8", timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), system: "EAS System", event: "Amber Alert received", severity: "info", details: "AMBER Alert forwarded — child abduction, Cumberland County. Auto-aired per protocol." },
  { id: "log9", timestamp: new Date(Date.now() - 30 * 3600000).toISOString(), system: "Online Stream", event: "Server restart", severity: "warning", details: "Icecast server restarted for memory leak patch. Downtime: 12 seconds." },
  { id: "log10", timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), system: "Audio Processing", event: "Limiter clip event", severity: "warning", details: "Brief clip event on commercial break. Source audio was hot — notified production." },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MasterControlPage() {
  const [mounted, setMounted] = useState(false);
  const [logEntries, setLogEntries] = useState<SystemLogEntry[]>([]);

  useEffect(() => {
    setLogEntries(loadOrSeed("ops_system_log", SEED_LOG));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "Operational": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "Warning": return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "Critical": return <XCircle className="h-4 w-4 text-red-400" />;
      default: return null;
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-400";
      case "warning": return "text-yellow-400";
      default: return "text-muted-foreground";
    }
  };

  const logColumns: Column<SystemLogEntry>[] = [
    {
      key: "timestamp",
      label: "Time",
      sortable: true,
      sortKey: (r) => new Date(r.timestamp).getTime(),
      render: (r) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.timestamp)}</span>,
    },
    {
      key: "severity",
      label: "Severity",
      render: (r) => <StatusBadge status={r.severity} />,
    },
    {
      key: "system",
      label: "System",
      sortable: true,
      sortKey: (r) => r.system,
      render: (r) => <span className="font-medium text-foreground">{r.system}</span>,
    },
    {
      key: "event",
      label: "Event",
      render: (r) => <span className="text-foreground">{r.event}</span>,
    },
    {
      key: "details",
      label: "Details",
      hideOnMobile: true,
      render: (r) => <span className="text-muted-foreground text-xs">{r.details}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={Radio}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/10 border-emerald-500/20"
        title="Master Control Dashboard"
        description="Real-time monitoring of all WCCG 104.5 FM broadcast systems"
        badge="Live"
        badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      />

      {/* System status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SEED_SYSTEMS.map((sys) => {
          const Icon = sys.icon;
          return (
            <div key={sys.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${sys.iconBg}`}>
                    <Icon className={`h-5 w-5 ${sys.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{sys.system}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{sys.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {statusIcon(sys.status)}
                  <StatusBadge status={sys.status} />
                </div>
              </div>

              <div className="space-y-2">
                {sys.metrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium text-foreground">{m.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border">
                <Clock className="h-3 w-3" />
                Last checked: {formatDateTime(sys.lastChecked)}
              </div>
            </div>
          );
        })}
      </div>

      {/* System log */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">System Log</h2>
        <DataTable
          columns={logColumns}
          data={logEntries}
          keyField="id"
          searchable
          searchPlaceholder="Search logs..."
          searchFilter={(row, q) =>
            row.system.toLowerCase().includes(q) ||
            row.event.toLowerCase().includes(q) ||
            row.details.toLowerCase().includes(q)
          }
        />
      </div>
    </div>
  );
}
