"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { TabsNav } from "@/components/admin/tabs-nav";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, persist, genId, formatDate, formatDateTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type POPStatus = "Aired" | "Missed" | "Make-Good" | "Scheduled";

interface POPRecord {
  id: string;
  clientName: string;
  campaignName: string;
  spotTitle: string;
  spotLength: string;
  scheduledDate: string;
  scheduledTime: string;
  actualDate: string | null;
  actualTime: string | null;
  status: POPStatus;
  dayPart: string;
  notes: string;
}

const KEY = "wccg_sales_pop";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_POP: POPRecord[] = [
  { id: "pop1", clientName: "Fort Liberty Auto Group", campaignName: "Spring Auto Sale", spotTitle: "Spring Blowout :30", spotLength: ":30", scheduledDate: "2026-03-10", scheduledTime: "07:15 AM", actualDate: "2026-03-10", actualTime: "07:16 AM", status: "Aired", dayPart: "Morning Drive", notes: "" },
  { id: "pop2", clientName: "Fort Liberty Auto Group", campaignName: "Spring Auto Sale", spotTitle: "Spring Blowout :30", spotLength: ":30", scheduledDate: "2026-03-10", scheduledTime: "08:45 AM", actualDate: "2026-03-10", actualTime: "08:44 AM", status: "Aired", dayPart: "Morning Drive", notes: "" },
  { id: "pop3", clientName: "Fort Liberty Auto Group", campaignName: "Spring Auto Sale", spotTitle: "Truck Month :60", spotLength: ":60", scheduledDate: "2026-03-10", scheduledTime: "04:30 PM", actualDate: "2026-03-10", actualTime: "04:32 PM", status: "Aired", dayPart: "Afternoon Drive", notes: "" },
  { id: "pop4", clientName: "Fort Liberty Auto Group", campaignName: "Spring Auto Sale", spotTitle: "Spring Blowout :30", spotLength: ":30", scheduledDate: "2026-03-11", scheduledTime: "07:15 AM", actualDate: null, actualTime: null, status: "Missed", dayPart: "Morning Drive", notes: "Technical issue. Make-good scheduled for 3/13." },
  { id: "pop5", clientName: "Fort Liberty Auto Group", campaignName: "Spring Auto Sale", spotTitle: "Spring Blowout :30 (MG)", spotLength: ":30", scheduledDate: "2026-03-13", scheduledTime: "07:30 AM", actualDate: "2026-03-13", actualTime: "07:31 AM", status: "Make-Good", dayPart: "Morning Drive", notes: "Make-good for missed 3/11 spot." },
  { id: "pop6", clientName: "Mash House Brewing", campaignName: "Weekend Brunch Special", spotTitle: "Brunch at Mash House :30", spotLength: ":30", scheduledDate: "2026-03-08", scheduledTime: "08:00 AM", actualDate: "2026-03-08", actualTime: "08:01 AM", status: "Aired", dayPart: "Weekend", notes: "" },
  { id: "pop7", clientName: "Mash House Brewing", campaignName: "Weekend Brunch Special", spotTitle: "Brunch at Mash House :30", spotLength: ":30", scheduledDate: "2026-03-08", scheduledTime: "10:30 AM", actualDate: "2026-03-08", actualTime: "10:29 AM", status: "Aired", dayPart: "Weekend", notes: "" },
  { id: "pop8", clientName: "Mash House Brewing", campaignName: "Weekend Brunch Special", spotTitle: "Brunch at Mash House :30", spotLength: ":30", scheduledDate: "2026-03-09", scheduledTime: "09:00 AM", actualDate: "2026-03-09", actualTime: "09:02 AM", status: "Aired", dayPart: "Weekend", notes: "" },
  { id: "pop9", clientName: "Cape Fear Valley Health", campaignName: "Health Fair 2026", spotTitle: "Health Fair PSA :60", spotLength: ":60", scheduledDate: "2026-03-12", scheduledTime: "11:00 AM", actualDate: "2026-03-12", actualTime: "11:01 AM", status: "Aired", dayPart: "Midday", notes: "" },
  { id: "pop10", clientName: "Cape Fear Valley Health", campaignName: "Health Fair 2026", spotTitle: "Health Fair PSA :60", spotLength: ":60", scheduledDate: "2026-03-12", scheduledTime: "02:00 PM", actualDate: null, actualTime: null, status: "Missed", dayPart: "Midday", notes: "Spot ran in wrong slot. Make-good pending." },
  { id: "pop11", clientName: "Cross Creek Mall", campaignName: "Spring Fashion Preview", spotTitle: "Spring Fashion :30", spotLength: ":30", scheduledDate: "2026-03-15", scheduledTime: "04:00 PM", actualDate: null, actualTime: null, status: "Scheduled", dayPart: "Afternoon Drive", notes: "" },
  { id: "pop12", clientName: "Cross Creek Mall", campaignName: "Spring Fashion Preview", spotTitle: "Spring Fashion :30", spotLength: ":30", scheduledDate: "2026-03-15", scheduledTime: "05:30 PM", actualDate: null, actualTime: null, status: "Scheduled", dayPart: "Afternoon Drive", notes: "" },
  { id: "pop13", clientName: "Cumberland County Schools", campaignName: "Back to School Enrollment", spotTitle: "CCS Enrollment PSA :30", spotLength: ":30", scheduledDate: "2026-03-14", scheduledTime: "07:30 AM", actualDate: "2026-03-14", actualTime: "07:30 AM", status: "Aired", dayPart: "Morning Drive", notes: "" },
  { id: "pop14", clientName: "Cumberland County Schools", campaignName: "Back to School Enrollment", spotTitle: "CCS Enrollment PSA :30", spotLength: ":30", scheduledDate: "2026-03-14", scheduledTime: "03:15 PM", actualDate: "2026-03-14", actualTime: "03:17 PM", status: "Aired", dayPart: "Afternoon Drive", notes: "" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProofOfPerformancePage() {
  const [records, setRecords] = useState<POPRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filterClient, setFilterClient] = useState<string>("All");
  const [reportModal, setReportModal] = useState(false);
  const [reportClient, setReportClient] = useState("");

  useEffect(() => {
    setMounted(true);
    setRecords(loadOrSeed(KEY, SEED_POP));
  }, []);

  if (!mounted) return null;

  // Stats
  const totalSpots = records.length;
  const airedSpots = records.filter((r) => r.status === "Aired").length;
  const missedSpots = records.filter((r) => r.status === "Missed").length;
  const makeGoods = records.filter((r) => r.status === "Make-Good").length;
  const airRate = totalSpots > 0 ? Math.round(((airedSpots + makeGoods) / (airedSpots + makeGoods + missedSpots)) * 100) : 0;

  const clients = Array.from(new Set(records.map((r) => r.clientName)));

  const filteredRecords = records.filter((r) => {
    if (filterClient !== "All" && r.clientName !== filterClient) return false;
    if (activeTab === "aired") return r.status === "Aired";
    if (activeTab === "missed") return r.status === "Missed";
    if (activeTab === "makegood") return r.status === "Make-Good";
    if (activeTab === "scheduled") return r.status === "Scheduled";
    return true;
  });

  // Report data
  const reportRecords = reportClient
    ? records.filter((r) => r.clientName === reportClient)
    : [];

  const columns: Column<POPRecord>[] = [
    {
      key: "client",
      label: "Client / Campaign",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground text-xs">{row.clientName}</p>
          <p className="text-[11px] text-muted-foreground">{row.campaignName}</p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.clientName,
    },
    {
      key: "spot",
      label: "Spot",
      hideOnMobile: true,
      render: (row) => (
        <div>
          <p className="text-xs text-foreground">{row.spotTitle}</p>
          <p className="text-[10px] text-muted-foreground">{row.spotLength} · {row.dayPart}</p>
        </div>
      ),
    },
    {
      key: "scheduled",
      label: "Scheduled",
      render: (row) => (
        <div className="text-xs">
          <p className="text-foreground">{formatDate(row.scheduledDate)}</p>
          <p className="text-muted-foreground">{row.scheduledTime}</p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.scheduledDate,
    },
    {
      key: "actual",
      label: "Actual",
      hideOnMobile: true,
      render: (row) => row.actualDate ? (
        <div className="text-xs">
          <p className="text-foreground">{formatDate(row.actualDate)}</p>
          <p className="text-muted-foreground">{row.actualTime}</p>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/50">—</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={ClipboardCheck}
        title="Proof of Performance"
        description="Track aired spots for client verification and reporting."
      >
        <button
          type="button"
          onClick={() => setReportModal(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" />
          Generate Report
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Spots" value={totalSpots.toString()} icon={Radio} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Aired" value={airedSpots.toString()} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Missed" value={missedSpots.toString()} icon={XCircle} color="text-red-400" bg="bg-red-500/10" />
        <StatCard label="Air Rate" value={`${airRate}%`} icon={ClipboardCheck} color="text-blue-400" bg="bg-blue-500/10" />
      </div>

      {/* Client Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          type="button"
          onClick={() => setFilterClient("All")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterClient === "All" ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          All Clients
        </button>
        {clients.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilterClient(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterClient === c ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <TabsNav
        tabs={[
          { key: "all", label: "All", count: records.filter((r) => filterClient === "All" || r.clientName === filterClient).length },
          { key: "aired", label: "Aired", count: records.filter((r) => r.status === "Aired" && (filterClient === "All" || r.clientName === filterClient)).length },
          { key: "missed", label: "Missed", count: records.filter((r) => r.status === "Missed" && (filterClient === "All" || r.clientName === filterClient)).length },
          { key: "makegood", label: "Make-Good", count: records.filter((r) => r.status === "Make-Good" && (filterClient === "All" || r.clientName === filterClient)).length },
          { key: "scheduled", label: "Scheduled", count: records.filter((r) => r.status === "Scheduled" && (filterClient === "All" || r.clientName === filterClient)).length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredRecords}
        keyField="id"
        searchable
        searchPlaceholder="Search by client, campaign, or spot..."
        searchFilter={(row, q) =>
          row.clientName.toLowerCase().includes(q) ||
          row.campaignName.toLowerCase().includes(q) ||
          row.spotTitle.toLowerCase().includes(q)
        }
        emptyIcon={<ClipboardCheck className="h-8 w-8 text-foreground/20" />}
        emptyTitle="No records found"
        emptyDescription="No spots match the current filters."
      />

      {/* Report Modal */}
      <DetailModal
        open={reportModal}
        onClose={() => { setReportModal(false); setReportClient(""); }}
        title="Proof of Performance Report"
        subtitle="Generate a POP report for a client"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Select Client</label>
            <select
              value={reportClient}
              onChange={(e) => setReportClient(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            >
              <option value="">Choose a client...</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {reportClient && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="text-center space-y-1 pb-3 border-b border-border">
                <h3 className="font-bold text-foreground">WCCG 104.5 FM — Proof of Performance</h3>
                <p className="text-xs text-muted-foreground">Client: {reportClient}</p>
                <p className="text-xs text-muted-foreground">Generated: {formatDate(new Date().toISOString())}</p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-muted/30 p-2">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-foreground">{reportRecords.length}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 p-2">
                  <p className="text-xs text-emerald-400">Aired</p>
                  <p className="text-lg font-bold text-emerald-400">{reportRecords.filter((r) => r.status === "Aired").length}</p>
                </div>
                <div className="rounded-lg bg-red-500/5 p-2">
                  <p className="text-xs text-red-400">Missed</p>
                  <p className="text-lg font-bold text-red-400">{reportRecords.filter((r) => r.status === "Missed").length}</p>
                </div>
                <div className="rounded-lg bg-orange-500/5 p-2">
                  <p className="text-xs text-orange-400">Make-Good</p>
                  <p className="text-lg font-bold text-orange-400">{reportRecords.filter((r) => r.status === "Make-Good").length}</p>
                </div>
              </div>

              {/* Spot List */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left font-medium px-2 py-1.5 text-muted-foreground">Spot</th>
                      <th className="text-left font-medium px-2 py-1.5 text-muted-foreground">Scheduled</th>
                      <th className="text-left font-medium px-2 py-1.5 text-muted-foreground">Actual</th>
                      <th className="text-left font-medium px-2 py-1.5 text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRecords.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-1.5 text-foreground">{r.spotTitle}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{formatDate(r.scheduledDate)} {r.scheduledTime}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.actualDate ? `${formatDate(r.actualDate)} ${r.actualTime}` : "—"}</td>
                        <td className="px-2 py-1.5"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DetailModal>
    </div>
  );
}
