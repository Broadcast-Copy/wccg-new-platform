"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Bell,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatDate, formatDateTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Makegood {
  id: string;
  originalDate: string;
  originalTime: string;
  client: string;
  spotTitle: string;
  duration: ":15" | ":30" | ":60";
  reasonMissed: "Tech Failure" | "Scheduling Error" | "Breaking News" | "Operator Error" | "Equipment Malfunction";
  makegoodDate: string;
  makegoodTime: string;
  status: "Pending" | "Scheduled" | "Aired";
  clientNotified: boolean;
  notifiedDate: string;
  notifiedBy: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_MAKEGOODS: Makegood[] = [
  { id: "mg1", originalDate: "2026-03-14", originalTime: "08:22", client: "Cape Fear Auto Group", spotTitle: "Spring Clearance - Trucks :30", duration: ":30", reasonMissed: "Scheduling Error", makegoodDate: "2026-03-15", makegoodTime: "08:15", status: "Scheduled", clientNotified: true, notifiedDate: "2026-03-14", notifiedBy: "Sarah Mitchell", notes: "Scheduling conflict with network break. Moved to Saturday morning drive." },
  { id: "mg2", originalDate: "2026-03-14", originalTime: "11:35", client: "Lowe's Home Improvement", spotTitle: "Spring Garden Sale :30", duration: ":30", reasonMissed: "Tech Failure", makegoodDate: "", makegoodTime: "", status: "Pending", clientNotified: false, notifiedDate: "", notifiedBy: "", notes: "Audio server glitch caused 2-minute dead air. Spot did not fire." },
  { id: "mg3", originalDate: "2026-03-14", originalTime: "16:22", client: "Cape Fear Auto Group", spotTitle: "Spring Clearance - SUVs :30", duration: ":30", reasonMissed: "Operator Error", makegoodDate: "2026-03-16", makegoodTime: "16:15", status: "Scheduled", clientNotified: true, notifiedDate: "2026-03-14", notifiedBy: "Mike Johnson", notes: "Operator accidentally played wrong spot in this slot." },
  { id: "mg4", originalDate: "2026-03-13", originalTime: "07:45", client: "Fort Bragg FCU", spotTitle: "Mortgage Refinance :60", duration: ":60", reasonMissed: "Breaking News", makegoodDate: "2026-03-14", makegoodTime: "07:45", status: "Aired", clientNotified: true, notifiedDate: "2026-03-13", notifiedBy: "Sarah Mitchell", notes: "Breaking news coverage of severe weather alert displaced commercial break." },
  { id: "mg5", originalDate: "2026-03-12", originalTime: "12:15", client: "McDonald's Fayetteville", spotTitle: "McRib Limited Time :30", duration: ":30", reasonMissed: "Equipment Malfunction", makegoodDate: "2026-03-13", makegoodTime: "12:15", status: "Aired", clientNotified: true, notifiedDate: "2026-03-12", notifiedBy: "Mike Johnson", notes: "Audio board channel 3 malfunction. Repaired same day." },
  { id: "mg6", originalDate: "2026-03-11", originalTime: "17:30", client: "NC Lottery", spotTitle: "Powerball Jackpot :30", duration: ":30", reasonMissed: "Scheduling Error", makegoodDate: "2026-03-12", makegoodTime: "17:30", status: "Aired", clientNotified: true, notifiedDate: "2026-03-11", notifiedBy: "Sarah Mitchell", notes: "Double-booked time slot. Resolved for next day." },
  { id: "mg7", originalDate: "2026-03-10", originalTime: "09:15", client: "Crown Complex", spotTitle: "Kirk Franklin Live :60", duration: ":60", reasonMissed: "Tech Failure", makegoodDate: "2026-03-11", makegoodTime: "09:15", status: "Aired", clientNotified: true, notifiedDate: "2026-03-10", notifiedBy: "Sarah Mitchell", notes: "Automation system freeze. Required manual restart." },
  { id: "mg8", originalDate: "2026-03-09", originalTime: "14:00", client: "Fayetteville Kia", spotTitle: "Employee Pricing :30", duration: ":30", reasonMissed: "Operator Error", makegoodDate: "2026-03-10", makegoodTime: "14:00", status: "Aired", clientNotified: true, notifiedDate: "2026-03-09", notifiedBy: "Mike Johnson", notes: "Wrong copy version aired. Correct version rescheduled." },
  { id: "mg9", originalDate: "2026-03-14", originalTime: "19:45", client: "Carolina Ale House", spotTitle: "Lunch Combos $9.99 :15", duration: ":15", reasonMissed: "Breaking News", makegoodDate: "", makegoodTime: "", status: "Pending", clientNotified: false, notifiedDate: "", notifiedBy: "", notes: "Extended news break for weather coverage." },
];

const STORAGE_KEY = "wccg:traffic-makegoods";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MakegoodTrackerPage() {
  const [mounted, setMounted] = useState(false);
  const [makegoods, setMakegoods] = useState<Makegood[]>([]);
  const [selected, setSelected] = useState<Makegood | null>(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    setMounted(true);
    setMakegoods(loadOrSeed(STORAGE_KEY, SEED_MAKEGOODS));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const updateStatus = (id: string, status: Makegood["status"]) => {
    const updated = makegoods.map((m) => m.id === id ? { ...m, status } : m);
    setMakegoods(updated);
    persist(STORAGE_KEY, updated);
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const markNotified = (id: string) => {
    const updated = makegoods.map((m) => m.id === id ? { ...m, clientNotified: true, notifiedDate: new Date().toISOString().slice(0, 10), notifiedBy: "Sarah Mitchell" } : m);
    setMakegoods(updated);
    persist(STORAGE_KEY, updated);
    if (selected?.id === id) setSelected({ ...selected, clientNotified: true, notifiedDate: new Date().toISOString().slice(0, 10), notifiedBy: "Sarah Mitchell" });
  };

  const pending = makegoods.filter((m) => m.status === "Pending").length;
  const scheduled = makegoods.filter((m) => m.status === "Scheduled").length;
  const aired = makegoods.filter((m) => m.status === "Aired").length;
  const unnotified = makegoods.filter((m) => !m.clientNotified).length;

  const filtered = tab === "all" ? makegoods : makegoods.filter((m) => m.status.toLowerCase() === tab);

  const tabs = [
    { key: "all", label: "All", count: makegoods.length },
    { key: "pending", label: "Pending", count: pending },
    { key: "scheduled", label: "Scheduled", count: scheduled },
    { key: "aired", label: "Aired", count: aired },
  ];

  const reasonBadge = (reason: string) => {
    const styles: Record<string, string> = {
      "Tech Failure": "bg-red-500/10 text-red-400 border-red-500/20",
      "Scheduling Error": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      "Breaking News": "bg-blue-500/10 text-blue-400 border-blue-500/20",
      "Operator Error": "bg-orange-500/10 text-orange-400 border-orange-500/20",
      "Equipment Malfunction": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
    return <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[reason] || ""}`}>{reason}</span>;
  };

  const columns: Column<Makegood>[] = [
    { key: "origDate", label: "Original Date", sortable: true, sortKey: (r) => r.originalDate, render: (r) => <div className="text-xs"><p className="font-medium">{formatDate(r.originalDate)}</p><p className="text-muted-foreground">{r.originalTime}</p></div> },
    { key: "client", label: "Client", sortable: true, sortKey: (r) => r.client, render: (r) => <span className="font-medium text-sm">{r.client}</span> },
    { key: "spot", label: "Spot Title", render: (r) => <span className="text-sm">{r.spotTitle}</span> },
    { key: "reason", label: "Reason", render: (r) => reasonBadge(r.reasonMissed) },
    { key: "mgDate", label: "Makegood Date", hideOnMobile: true, render: (r) => r.makegoodDate ? <div className="text-xs"><p className="font-medium">{formatDate(r.makegoodDate)}</p><p className="text-muted-foreground">{r.makegoodTime}</p></div> : <span className="text-xs text-muted-foreground">Not scheduled</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "notified", label: "Notified", align: "center", render: (r) => r.clientNotified ? <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto" /> : <Bell className="h-4 w-4 text-yellow-400 mx-auto" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={AlertTriangle} title="Makegood Tracker" description="Track missed spots and schedule makegoods" badge="Makegoods" badgeColor="bg-rose-500/10 text-rose-400 border-rose-500/20" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={pending} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Scheduled" value={scheduled} icon={Calendar} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Completed" value={aired} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Unnotified Clients" value={unnotified} icon={Bell} color="text-red-400" bg="bg-red-500/10" />
      </div>

      <TabsNav tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search client or spot..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.spotTitle.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.spotTitle || ""}
        subtitle={selected?.client}
        maxWidth="max-w-lg"
        actions={
          selected && (
            <>
              {!selected.clientNotified && <button onClick={() => markNotified(selected.id)} className="px-4 py-2 text-sm rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">Mark Client Notified</button>}
              {selected.status === "Pending" && <button onClick={() => updateStatus(selected.id, "Scheduled")} className="px-4 py-2 text-sm rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors">Mark Scheduled</button>}
              {selected.status === "Scheduled" && <button onClick={() => updateStatus(selected.id, "Aired")} className="px-4 py-2 text-sm rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Mark Aired</button>}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Original Air Date</span><p className="text-sm">{formatDate(selected.originalDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Original Time</span><p className="text-sm">{selected.originalTime}</p></div>
              <div><span className="text-xs text-muted-foreground">Duration</span><p className="text-sm">{selected.duration}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Reason Missed</span>
              <p className="mt-0.5">{reasonBadge(selected.reasonMissed)}</p>
            </div>
            {selected.makegoodDate && (
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-muted-foreground">Makegood Date</span><p className="text-sm">{formatDate(selected.makegoodDate)}</p></div>
                <div><span className="text-xs text-muted-foreground">Makegood Time</span><p className="text-sm">{selected.makegoodTime}</p></div>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Client Notification</span>
              <p className="text-sm mt-0.5">
                {selected.clientNotified
                  ? `Notified on ${formatDate(selected.notifiedDate)} by ${selected.notifiedBy}`
                  : "Client has not been notified yet"}
              </p>
            </div>
            {selected.notes && (
              <div><span className="text-xs text-muted-foreground">Notes</span><p className="text-sm text-muted-foreground mt-1">{selected.notes}</p></div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
