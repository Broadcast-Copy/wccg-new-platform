"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Mic,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, genId, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductionOrder {
  id: string;
  client: string;
  title: string;
  format: ":15" | ":30" | ":60";
  talent: string;
  scriptStatus: "No Script" | "Draft" | "Approved";
  scriptText: string;
  dueDate: string;
  status: "Pending" | "Recording" | "Editing" | "Complete" | "Delivered";
  priority: "Low" | "Normal" | "High" | "Rush";
  assignedTo: string;
  notes: string;
  createdDate: string;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_ORDERS: ProductionOrder[] = [
  { id: "PO-001", client: "Cape Fear Auto Group", title: "Summer Clearance Event", format: ":30", talent: "DJ Smooth", scriptStatus: "Approved", scriptText: "Cape Fear Auto Group Summer Clearance starts this Saturday! Save thousands on new and used vehicles...", dueDate: "2026-03-20", status: "Recording", priority: "High", assignedTo: "Chris Morgan", notes: "Client wants upbeat energy, similar to last year's spot.", createdDate: "2026-03-10" },
  { id: "PO-002", client: "Carolina Ale House", title: "New Menu Launch", format: ":30", talent: "Lady Soul", scriptStatus: "Draft", scriptText: "Carolina Ale House is proud to introduce our brand new menu...", dueDate: "2026-03-25", status: "Pending", priority: "Normal", assignedTo: "Chris Morgan", notes: "Client sending final menu details by 3/18.", createdDate: "2026-03-12" },
  { id: "PO-003", client: "Fort Bragg FCU", title: "Auto Loan Special", format: ":60", talent: "Marcus Thompson", scriptStatus: "Approved", scriptText: "Fort Bragg Federal Credit Union is offering rates as low as 3.9% APR on new auto loans...", dueDate: "2026-03-18", status: "Editing", priority: "High", assignedTo: "Chris Morgan", notes: "First cut done, client requesting minor rate change.", createdDate: "2026-03-08" },
  { id: "PO-004", client: "Crown Complex", title: "Comedy Night Promo", format: ":30", talent: "DJ Quick", scriptStatus: "No Script", scriptText: "", dueDate: "2026-03-28", status: "Pending", priority: "Normal", assignedTo: "Chris Morgan", notes: "Waiting on event details from promoter.", createdDate: "2026-03-13" },
  { id: "PO-005", client: "Fayetteville Tech", title: "Summer Registration", format: ":30", talent: "Lady Soul", scriptStatus: "Approved", scriptText: "Summer semester at Fayetteville Tech — classes start May 18th! Register now...", dueDate: "2026-03-15", status: "Complete", priority: "Normal", assignedTo: "Chris Morgan", notes: "Completed ahead of schedule.", createdDate: "2026-03-05" },
  { id: "PO-006", client: "Lowe's Home Improvement", title: "Spring Garden Sale V2", format: ":30", talent: "Chris Morgan", scriptStatus: "Approved", scriptText: "Lowe's Spring Garden Sale — now through April 15th! Save big on mulch, plants, and outdoor living...", dueDate: "2026-03-16", status: "Delivered", priority: "Normal", assignedTo: "Chris Morgan", notes: "Delivered to traffic on 3/14.", createdDate: "2026-03-03" },
  { id: "PO-007", client: "State Farm - J. Williams", title: "Local Agent Intro", format: ":30", talent: "Marcus Thompson", scriptStatus: "Draft", scriptText: "Hi, I'm Justin Williams, your local State Farm agent here in Fayetteville...", dueDate: "2026-04-01", status: "Pending", priority: "Low", assignedTo: "Chris Morgan", notes: "New client — first spot.", createdDate: "2026-03-14" },
  { id: "PO-008", client: "Cross Creek Mall", title: "Easter Egg Hunt Event", format: ":15", talent: "Lady Soul", scriptStatus: "Approved", scriptText: "Cross Creek Mall's Annual Easter Egg Hunt — Saturday, April 4th at 10 AM!", dueDate: "2026-03-22", status: "Recording", priority: "Rush", assignedTo: "Chris Morgan", notes: "Rush — event is soon. Client approved script same day.", createdDate: "2026-03-13" },
  { id: "PO-009", client: "NC Lottery", title: "Mega Millions Update", format: ":30", talent: "DJ Smooth", scriptStatus: "Approved", scriptText: "The Mega Millions jackpot just hit $300 million! Pick up your ticket today...", dueDate: "2026-03-14", status: "Delivered", priority: "Rush", assignedTo: "Chris Morgan", notes: "Rush turnaround completed.", createdDate: "2026-03-13" },
  { id: "PO-010", client: "McDonald's Fayetteville", title: "Breakfast Menu Refresh", format: ":30", talent: "DJ Quick", scriptStatus: "No Script", scriptText: "", dueDate: "2026-04-05", status: "Pending", priority: "Low", assignedTo: "Chris Morgan", notes: "Awaiting corporate copy approval.", createdDate: "2026-03-14" },
];

const STORAGE_KEY = "wccg:traffic-production-orders";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductionOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selected, setSelected] = useState<ProductionOrder | null>(null);
  const [tab, setTab] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  // New order form
  const [newClient, setNewClient] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFormat, setNewFormat] = useState<":30">(":30");
  const [newTalent, setNewTalent] = useState("DJ Smooth");
  const [newDue, setNewDue] = useState("2026-04-01");
  const [newPriority, setNewPriority] = useState<"Normal">("Normal");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    setMounted(true);
    setOrders(loadOrSeed(STORAGE_KEY, SEED_ORDERS));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const updateStatus = (id: string, newStatus: ProductionOrder["status"]) => {
    const updated = orders.map((o) => o.id === id ? { ...o, status: newStatus } : o);
    setOrders(updated);
    persist(STORAGE_KEY, updated);
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
  };

  const addOrder = () => {
    if (!newClient.trim() || !newTitle.trim()) return;
    const order: ProductionOrder = {
      id: `PO-${String(orders.length + 1).padStart(3, "0")}`,
      client: newClient,
      title: newTitle,
      format: newFormat,
      talent: newTalent,
      scriptStatus: "No Script",
      scriptText: "",
      dueDate: newDue,
      status: "Pending",
      priority: newPriority,
      assignedTo: "Chris Morgan",
      notes: newNotes,
      createdDate: new Date().toISOString().slice(0, 10),
    };
    const updated = [order, ...orders];
    setOrders(updated);
    persist(STORAGE_KEY, updated);
    setShowAdd(false);
    setNewClient("");
    setNewTitle("");
    setNewNotes("");
  };

  const pending = orders.filter((o) => o.status === "Pending").length;
  const inProgress = orders.filter((o) => ["Recording", "Editing"].includes(o.status)).length;
  const complete = orders.filter((o) => o.status === "Complete" || o.status === "Delivered").length;
  const rush = orders.filter((o) => o.priority === "Rush" && o.status !== "Delivered" && o.status !== "Complete").length;

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status.toLowerCase() === tab);

  const tabs = [
    { key: "all", label: "All", count: orders.length },
    { key: "pending", label: "Pending", count: orders.filter((o) => o.status === "Pending").length },
    { key: "recording", label: "Recording", count: orders.filter((o) => o.status === "Recording").length },
    { key: "editing", label: "Editing", count: orders.filter((o) => o.status === "Editing").length },
    { key: "complete", label: "Complete", count: orders.filter((o) => o.status === "Complete").length },
    { key: "delivered", label: "Delivered", count: orders.filter((o) => o.status === "Delivered").length },
  ];

  const priorityBadge = (p: string) => {
    const styles: Record<string, string> = {
      Rush: "bg-red-500/10 text-red-400 border-red-500/20",
      High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      Normal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Low: "bg-foreground/[0.06] text-muted-foreground border-border",
    };
    return (
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[p] || styles.Normal}`}>
        {p}
      </span>
    );
  };

  const columns: Column<ProductionOrder>[] = [
    { key: "id", label: "Order #", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "client", label: "Client", sortable: true, sortKey: (r) => r.client, render: (r) => <span className="font-medium text-sm">{r.client}</span> },
    { key: "title", label: "Spot Title", render: (r) => <span className="text-sm">{r.title}</span> },
    { key: "format", label: "Format", align: "center", render: (r) => <span className="font-mono text-xs">{r.format}</span> },
    { key: "talent", label: "Talent", hideOnMobile: true, render: (r) => <span className="text-sm text-muted-foreground">{r.talent}</span> },
    { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority) },
    { key: "status", label: "Status", sortable: true, sortKey: (r) => r.status, render: (r) => <StatusBadge status={r.status === "Recording" ? "In-Progress" : r.status === "Editing" ? "In-Progress" : r.status === "Delivered" ? "Completed" : r.status} /> },
    { key: "due", label: "Due Date", sortable: true, sortKey: (r) => r.dueDate, render: (r) => {
      const overdue = new Date(r.dueDate) < new Date() && r.status !== "Complete" && r.status !== "Delivered";
      return <span className={`text-xs ${overdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>{formatDate(r.dueDate)}{overdue ? " (overdue)" : ""}</span>;
    }},
    { key: "assigned", label: "Assigned", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.assignedTo}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={ClipboardList} title="Production Orders" description="Track commercial production requests and status" badge="Production" badgeColor="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">
          <Plus className="h-4 w-4" /> New Order
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={pending} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="In Progress" value={inProgress} icon={Mic} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Completed" value={complete} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Rush Orders" value={rush} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      <TabsNav tabs={tabs} active={tab} onChange={setTab} />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search client or title..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      {/* Detail Modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${selected?.id} — ${selected?.title}`}
        subtitle={selected?.client}
        maxWidth="max-w-2xl"
        actions={
          selected && (
            <>
              {selected.status === "Pending" && <button onClick={() => updateStatus(selected.id, "Recording")} className="px-4 py-2 text-sm rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">Start Recording</button>}
              {selected.status === "Recording" && <button onClick={() => updateStatus(selected.id, "Editing")} className="px-4 py-2 text-sm rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors">Move to Editing</button>}
              {selected.status === "Editing" && <button onClick={() => updateStatus(selected.id, "Complete")} className="px-4 py-2 text-sm rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Mark Complete</button>}
              {selected.status === "Complete" && <button onClick={() => updateStatus(selected.id, "Delivered")} className="px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">Mark Delivered</button>}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Format</span><p className="text-sm">{selected.format}</p></div>
              <div><span className="text-xs text-muted-foreground">Talent</span><p className="text-sm">{selected.talent}</p></div>
              <div><span className="text-xs text-muted-foreground">Priority</span><p className="mt-0.5">{priorityBadge(selected.priority)}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-xs text-muted-foreground">Due Date</span><p className="text-sm">{formatDate(selected.dueDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Assigned To</span><p className="text-sm">{selected.assignedTo}</p></div>
              <div><span className="text-xs text-muted-foreground">Script Status</span><p className="mt-0.5"><StatusBadge status={selected.scriptStatus === "Approved" ? "Active" : selected.scriptStatus === "Draft" ? "Draft" : "Pending"} /></p></div>
              <div><span className="text-xs text-muted-foreground">Created</span><p className="text-sm">{formatDate(selected.createdDate)}</p></div>
            </div>
            {selected.scriptText && (
              <div>
                <span className="text-xs text-muted-foreground">Script</span>
                <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed">{selected.scriptText}</div>
              </div>
            )}
            {selected.notes && (
              <div>
                <span className="text-xs text-muted-foreground">Notes</span>
                <p className="text-sm text-muted-foreground mt-1">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Add Order Modal */}
      <DetailModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Production Order"
        subtitle="Create a commercial production request"
        maxWidth="max-w-lg"
        actions={
          <button onClick={addOrder} className="px-4 py-2 text-sm rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20 transition-colors">
            Create Order
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Client</label>
            <input type="text" value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Client name" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Spot Title</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Spot title" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Format</label>
              <select value={newFormat} onChange={(e) => setNewFormat(e.target.value as ":30")} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option value=":15">:15</option>
                <option value=":30">:30</option>
                <option value=":60">:60</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Talent</label>
              <select value={newTalent} onChange={(e) => setNewTalent(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>DJ Smooth</option>
                <option>Lady Soul</option>
                <option>DJ Quick</option>
                <option>Marcus Thompson</option>
                <option>Chris Morgan</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Due Date</label>
              <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as "Normal")} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40">
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
                <option>Rush</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Production notes..." rows={3} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
