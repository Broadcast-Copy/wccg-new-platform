"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { TabsNav } from "@/components/admin/tabs-nav";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceItem {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  status: "Compliant" | "Due Soon" | "Overdue";
  lastCompleted: string;
  notes: string;
  frequency: string;
}

interface EASTestEntry {
  id: string;
  testType: "RWT" | "RMT" | "Live Alert";
  dateTime: string;
  duration: string;
  originCode: string;
  eventCode: string;
  result: "Pass" | "Fail";
  notes: string;
  operator: string;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_COMPLIANCE: ComplianceItem[] = [
  { id: "fcc1", title: "Quarterly Issues/Programs List", category: "Public File", dueDate: "2026-04-10", status: "Compliant", lastCompleted: "2026-01-08", notes: "Q1 2026 list filed on time. Covers Jan–Mar programming.", frequency: "Quarterly" },
  { id: "fcc2", title: "Annual EEO Public File Report", category: "EEO", dueDate: "2026-06-01", status: "Compliant", lastCompleted: "2025-06-01", notes: "Annual EEO report filed. Outreach efforts documented.", frequency: "Annually" },
  { id: "fcc3", title: "License Renewal Application", category: "License", dueDate: "2027-12-01", status: "Compliant", lastCompleted: "2019-12-01", notes: "Next renewal due Dec 2027 for NC stations. 8-year cycle.", frequency: "Every 8 years" },
  { id: "fcc4", title: "Tower Registration (ASR)", category: "Tower", dueDate: "2026-03-20", status: "Due Soon", lastCompleted: "2025-03-20", notes: "Annual tower registration and lighting certification due.", frequency: "Annually" },
  { id: "fcc5", title: "RF Exposure Compliance", category: "Safety", dueDate: "2026-05-15", status: "Compliant", lastCompleted: "2025-05-10", notes: "Annual RF exposure study completed by consulting engineer.", frequency: "Annually" },
  { id: "fcc6", title: "Political File Updates", category: "Public File", dueDate: "2026-03-15", status: "Due Soon", lastCompleted: "2026-02-28", notes: "Election year — political ad records must be uploaded within 24 hours.", frequency: "As needed" },
  { id: "fcc7", title: "Ownership Report (Form 323)", category: "Ownership", dueDate: "2025-12-01", status: "Overdue", lastCompleted: "2023-11-30", notes: "Biennial ownership report — last filing was 2023. Due Nov 2025.", frequency: "Biennially" },
  { id: "fcc8", title: "Children's Programming Report", category: "Public File", dueDate: "2026-04-10", status: "Compliant", lastCompleted: "2026-01-10", notes: "Not applicable — WCCG is not a commercial TV station. Filed waiver.", frequency: "Quarterly" },
  { id: "fcc9", title: "Station Identification", category: "On-Air", dueDate: "2026-03-14", status: "Compliant", lastCompleted: "2026-03-14", notes: "Legal ID airs at top of every hour. Automated in RCS Zetta.", frequency: "Hourly" },
  { id: "fcc10", title: "Public Inspection File", category: "Public File", dueDate: "2026-03-31", status: "Compliant", lastCompleted: "2026-03-01", notes: "All required documents uploaded to FCC online public file.", frequency: "Ongoing" },
];

const SEED_EAS: EASTestEntry[] = [
  { id: "eas1", testType: "RWT", dateTime: "2026-03-12T09:00:00", duration: "8 sec", originCode: "CIV", eventCode: "RWT", result: "Pass", notes: "Weekly test — sent and received confirmation.", operator: "James Carter" },
  { id: "eas2", testType: "RMT", dateTime: "2026-03-01T10:30:00", duration: "30 sec", originCode: "CIV", eventCode: "RMT", result: "Pass", notes: "Monthly test — audio and EAS header verified.", operator: "James Carter" },
  { id: "eas3", testType: "Live Alert", dateTime: "2026-03-10T14:22:00", duration: "45 sec", originCode: "WXR", eventCode: "TOR", result: "Pass", notes: "Tornado Warning — Cumberland County. Auto-forwarded via Dasdec.", operator: "Auto" },
  { id: "eas4", testType: "RWT", dateTime: "2026-03-05T09:00:00", duration: "8 sec", originCode: "CIV", eventCode: "RWT", result: "Pass", notes: "Weekly test — nominal.", operator: "Devon Robinson" },
  { id: "eas5", testType: "Live Alert", dateTime: "2026-02-28T16:45:00", duration: "60 sec", originCode: "CIV", eventCode: "AMB", result: "Pass", notes: "AMBER Alert — child abduction, Robeson County. Forwarded.", operator: "Auto" },
  { id: "eas6", testType: "RWT", dateTime: "2026-02-26T09:00:00", duration: "8 sec", originCode: "CIV", eventCode: "RWT", result: "Pass", notes: "Weekly test.", operator: "James Carter" },
  { id: "eas7", testType: "RMT", dateTime: "2026-02-01T10:30:00", duration: "30 sec", originCode: "CIV", eventCode: "RMT", result: "Pass", notes: "Monthly test — all systems verified.", operator: "James Carter" },
  { id: "eas8", testType: "RWT", dateTime: "2026-02-19T09:00:00", duration: "8 sec", originCode: "CIV", eventCode: "RWT", result: "Fail", notes: "Dasdec encoder locked up. Rebooted and re-ran test successfully at 09:15.", operator: "James Carter" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FCCCompliancePage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState("filings");
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [easLog, setEasLog] = useState<EASTestEntry[]>([]);
  const [selected, setSelected] = useState<ComplianceItem | null>(null);

  useEffect(() => {
    setItems(loadOrSeed("ops_fcc_compliance", SEED_COMPLIANCE));
    setEasLog(loadOrSeed("ops_eas_log", SEED_EAS));
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-64" /></div>;
  }

  const compliantCount = items.filter((i) => i.status === "Compliant").length;
  const dueSoonCount = items.filter((i) => i.status === "Due Soon").length;
  const overdueCount = items.filter((i) => i.status === "Overdue").length;
  const score = items.length > 0 ? Math.round((compliantCount / items.length) * 100) : 100;

  const complianceColumns: Column<ComplianceItem>[] = [
    {
      key: "title",
      label: "Filing / Requirement",
      sortable: true,
      sortKey: (r) => r.title,
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.title}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.category} — {r.frequency}</p>
        </div>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      sortKey: (r) => r.dueDate,
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-foreground">{formatDate(r.dueDate)}</span>,
    },
    {
      key: "lastCompleted",
      label: "Last Completed",
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-muted-foreground">{formatDate(r.lastCompleted)}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortKey: (r) => r.status,
      render: (r) => <StatusBadge status={r.status === "Due Soon" ? "warning" : r.status === "Overdue" ? "overdue" : "compliant"} />,
    },
  ];

  const easColumns: Column<EASTestEntry>[] = [
    {
      key: "dateTime",
      label: "Date/Time",
      sortable: true,
      sortKey: (r) => new Date(r.dateTime).getTime(),
      render: (r) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.dateTime)}</span>,
    },
    {
      key: "testType",
      label: "Type",
      render: (r) => {
        const color = r.testType === "Live Alert" ? "text-red-400" : "text-foreground";
        return <span className={`font-medium ${color}`}>{r.testType}</span>;
      },
    },
    {
      key: "eventCode",
      label: "Event Code",
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.eventCode}</span>,
    },
    {
      key: "duration",
      label: "Duration",
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.duration}</span>,
    },
    {
      key: "result",
      label: "Result",
      render: (r) => <StatusBadge status={r.result === "Pass" ? "compliant" : "critical"} />,
    },
    {
      key: "operator",
      label: "Operator",
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.operator}</span>,
    },
    {
      key: "notes",
      label: "Notes",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{r.notes}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        icon={ShieldCheck}
        iconColor="text-blue-400"
        iconBg="bg-blue-500/10 border-blue-500/20"
        title="FCC Compliance Tracker"
        description="Filing deadlines, EAS test logs & public file requirements"
        badge={`${score}%`}
        badgeColor={score >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Compliance Score" value={`${score}%`} icon={ShieldCheck} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Compliant Items" value={compliantCount} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Due Soon" value={dueSoonCount} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Tabs */}
      <TabsNav
        tabs={[
          { key: "filings", label: "FCC Filings & Requirements", count: items.length },
          { key: "eas", label: "EAS Test Log", count: easLog.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "filings" && (
        <DataTable
          columns={complianceColumns}
          data={items}
          keyField="id"
          searchable
          searchPlaceholder="Search filings..."
          searchFilter={(row, q) => row.title.toLowerCase().includes(q) || row.category.toLowerCase().includes(q)}
          onRowClick={(row) => setSelected(row)}
        />
      )}

      {tab === "eas" && (
        <DataTable
          columns={easColumns}
          data={easLog}
          keyField="id"
          searchable
          searchPlaceholder="Search EAS logs..."
          searchFilter={(row, q) => row.testType.toLowerCase().includes(q) || row.notes.toLowerCase().includes(q) || row.eventCode.toLowerCase().includes(q)}
        />
      )}

      {/* Detail modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ""}
        subtitle={selected ? `${selected.category} — ${selected.frequency}` : ""}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selected.status === "Due Soon" ? "warning" : selected.status === "Overdue" ? "overdue" : "compliant"} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
                <p className="text-sm font-medium text-foreground">{formatDate(selected.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Completed</p>
                <p className="text-sm font-medium text-foreground">{formatDate(selected.lastCompleted)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Frequency</p>
                <p className="text-sm font-medium text-foreground">{selected.frequency}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-foreground">{selected.notes}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
