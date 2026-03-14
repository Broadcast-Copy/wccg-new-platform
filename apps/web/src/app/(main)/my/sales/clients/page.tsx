"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  TrendingUp,
  Save,
  X,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, persist, genId, formatCurrency, formatDate, relativeTime } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactActivity {
  id: string;
  type: "call" | "email" | "meeting" | "proposal" | "note";
  description: string;
  date: string;
}

interface CRMClient {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  totalRevenue: number;
  lastContactDate: string;
  nextTouchpoint: string | null;
  nextTouchpointDate: string | null;
  status: "Active" | "Prospect" | "Inactive" | "At Risk";
  notes: string;
  activities: ContactActivity[];
  campaigns: { name: string; status: string; value: number }[];
}

const KEY = "wccg_sales_crm_clients";

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const SEED_CLIENTS: CRMClient[] = [
  {
    id: "crm1", businessName: "Fort Liberty Auto Group", contactName: "James Williams", email: "james@ftlibertyauto.com", phone: "(910) 555-0303", address: "5925 Yadkin Rd, Fayetteville, NC", category: "Automotive",
    totalRevenue: 45200, lastContactDate: "2026-03-12T14:00:00Z", nextTouchpoint: "Review Q2 campaign proposal", nextTouchpointDate: "2026-03-18",
    status: "Active", notes: "Largest automotive advertiser. Prefers morning drive slots. Toyota and Ford co-op funds available.",
    activities: [
      { id: "a1", type: "meeting", description: "Lunch meeting to discuss Q2 campaign strategy", date: "2026-03-12T12:00:00Z" },
      { id: "a2", type: "proposal", description: "Sent Summer Blowout Sale proposal ($15K)", date: "2026-03-10T10:00:00Z" },
      { id: "a3", type: "call", description: "Follow-up on Spring Auto Sale performance", date: "2026-03-05T09:00:00Z" },
      { id: "a4", type: "email", description: "Sent March avails report", date: "2026-03-01T08:00:00Z" },
    ],
    campaigns: [
      { name: "Spring Auto Sale", status: "Active", value: 8400 },
      { name: "Summer Blowout (Proposed)", status: "Pending", value: 15000 },
    ],
  },
  {
    id: "crm2", businessName: "Cape Fear Valley Health", contactName: "Dr. Michael Brown", email: "mbrown@capefearvalley.com", phone: "(910) 555-0202", address: "1638 Owen Dr, Fayetteville, NC", category: "Healthcare",
    totalRevenue: 32800, lastContactDate: "2026-03-08T10:00:00Z", nextTouchpoint: "Board approval follow-up", nextTouchpointDate: "2026-03-20",
    status: "Active", notes: "Prefers PSA format for health campaigns. Board approval required for budgets over $5K.",
    activities: [
      { id: "a5", type: "call", description: "Discussed Health Fair 2026 campaign details", date: "2026-03-08T10:00:00Z" },
      { id: "a6", type: "proposal", description: "Submitted Wellness Month proposal ($6,650)", date: "2026-02-20T14:00:00Z" },
      { id: "a7", type: "email", description: "Sent creative concepts for PSA spots", date: "2026-02-15T11:00:00Z" },
    ],
    campaigns: [
      { name: "Health Fair 2026", status: "Draft", value: 6200 },
      { name: "Wellness Month", status: "Active", value: 6650 },
    ],
  },
  {
    id: "crm3", businessName: "Cross Creek Mall", contactName: "Sarah Johnson", email: "sarah@crosscreekmall.com", phone: "(910) 555-0101", address: "419 Cross Creek Mall, Fayetteville, NC", category: "Retail",
    totalRevenue: 28500, lastContactDate: "2026-03-10T15:00:00Z", nextTouchpoint: "Spring Fashion event planning", nextTouchpointDate: "2026-03-16",
    status: "Active", notes: "Marketing director makes buying decisions. Strong Q4 advertiser for holiday shopping.",
    activities: [
      { id: "a8", type: "meeting", description: "Spring Fashion Preview campaign kickoff", date: "2026-03-10T15:00:00Z" },
      { id: "a9", type: "call", description: "Discussed afternoon drive inventory", date: "2026-03-03T11:00:00Z" },
    ],
    campaigns: [
      { name: "Spring Fashion Preview", status: "Draft", value: 5500 },
    ],
  },
  {
    id: "crm4", businessName: "Mash House Brewing", contactName: "Kim Taylor", email: "kim@mashhouse.com", phone: "(910) 555-0404", address: "4150 Sycamore Dairy Rd, Fayetteville, NC", category: "Restaurant",
    totalRevenue: 18900, lastContactDate: "2026-03-04T13:00:00Z", nextTouchpoint: "Renewal discussion for brunch campaign", nextTouchpointDate: "2026-03-25",
    status: "Active", notes: "Weekend brunch campaign performing well. Interested in trivia night sponsorship. AB InBev co-op available.",
    activities: [
      { id: "a10", type: "call", description: "Negotiating 6-month trivia night sponsorship", date: "2026-03-04T13:00:00Z" },
      { id: "a11", type: "note", description: "Client mentioned expanding to new location in Q3", date: "2026-02-28T10:00:00Z" },
    ],
    campaigns: [
      { name: "Weekend Brunch Special", status: "Active", value: 3750 },
      { name: "Trivia Night Sponsorship", status: "Pending", value: 6800 },
    ],
  },
  {
    id: "crm5", businessName: "Cumberland County Schools", contactName: "Angela Davis", email: "adavis@ccs.k12.nc.us", phone: "(910) 555-0505", address: "2465 Gillespie St, Fayetteville, NC", category: "Education",
    totalRevenue: 12000, lastContactDate: "2026-02-28T16:00:00Z", nextTouchpoint: "Enrollment campaign creative review", nextTouchpointDate: "2026-04-01",
    status: "Active", notes: "Government/education client. Payment via PO system — allow 45 days. Back to school is peak season.",
    activities: [
      { id: "a12", type: "meeting", description: "Discussed enrollment drive campaign timeline", date: "2026-02-28T16:00:00Z" },
      { id: "a13", type: "email", description: "Sent enrollment PSA scripts for approval", date: "2026-02-20T09:00:00Z" },
    ],
    campaigns: [
      { name: "Back to School Enrollment", status: "Draft", value: 4500 },
    ],
  },
  {
    id: "crm6", businessName: "Fayetteville Woodpeckers", contactName: "Mark Thompson", email: "mthompson@milb.com", phone: "(910) 555-0606", address: "460 Hay St, Fayetteville, NC", category: "Sports/Entertainment",
    totalRevenue: 8200, lastContactDate: "2026-03-07T14:00:00Z", nextTouchpoint: "Season sponsorship package review", nextTouchpointDate: "2026-03-21",
    status: "Prospect", notes: "Minor league baseball team. Wants multi-platform package with in-game PA mentions and radio spots.",
    activities: [
      { id: "a14", type: "call", description: "Initial outreach about 2026 season sponsorship", date: "2026-03-07T14:00:00Z" },
    ],
    campaigns: [],
  },
  {
    id: "crm7", businessName: "Crown Complex", contactName: "Lisa Martinez", email: "lisa@crowncenter.com", phone: "(910) 555-0707", address: "1960 Coliseum Dr, Fayetteville, NC", category: "Entertainment",
    totalRevenue: 22400, lastContactDate: "2026-02-28T10:00:00Z", nextTouchpoint: "Finalize concert series contract", nextTouchpointDate: "2026-03-15",
    status: "Active", notes: "Large venue. Concert series and event advertising. Close to finalizing $12K deal.",
    activities: [
      { id: "a15", type: "proposal", description: "Submitted concert series advertising proposal", date: "2026-02-28T10:00:00Z" },
      { id: "a16", type: "call", description: "Negotiated package rate for Q2 events", date: "2026-02-22T11:00:00Z" },
    ],
    campaigns: [
      { name: "Concert Series Advertising", status: "Pending", value: 12000 },
    ],
  },
  {
    id: "crm8", businessName: "Joe's Pizza Palace", contactName: "Joe Romano", email: "joe@joespizza.com", phone: "(910) 555-0808", address: "312 Person St, Fayetteville, NC", category: "Restaurant",
    totalRevenue: 0, lastContactDate: "2026-02-10T08:00:00Z", nextTouchpoint: "Re-engage in Q3 when budget opens", nextTouchpointDate: "2026-07-01",
    status: "Inactive", notes: "Grand opening campaign fell through due to budget constraints. May revisit Q3 2026.",
    activities: [
      { id: "a17", type: "call", description: "Budget constraints — cannot commit to campaign", date: "2026-02-10T08:00:00Z" },
      { id: "a18", type: "proposal", description: "Sent grand opening campaign proposal ($3,200)", date: "2026-01-28T10:00:00Z" },
    ],
    campaigns: [],
  },
];

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  proposal: DollarSign,
  note: MessageSquare,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "text-blue-400 bg-blue-500/10",
  email: "text-purple-400 bg-purple-500/10",
  meeting: "text-[#74ddc7] bg-[#74ddc7]/10",
  proposal: "text-yellow-400 bg-yellow-500/10",
  note: "text-muted-foreground bg-muted",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientManagerPage() {
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({
    businessName: "", contactName: "", email: "", phone: "", address: "", category: "", notes: "",
  });

  useEffect(() => {
    setMounted(true);
    setClients(loadOrSeed(KEY, SEED_CLIENTS));
  }, []);

  if (!mounted) return null;

  // Stats
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Active").length;
  const totalRevenue = clients.reduce((s, c) => s + c.totalRevenue, 0);
  const avgRevenue = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  const statuses = ["All", "Active", "Prospect", "Inactive", "At Risk"];

  const filteredClients = clients.filter((c) => {
    if (filterStatus !== "All" && c.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  function handleAddClient() {
    if (!newClient.businessName.trim() || !newClient.contactName.trim()) return;
    const client: CRMClient = {
      id: genId("crm"),
      ...newClient,
      totalRevenue: 0,
      lastContactDate: new Date().toISOString(),
      nextTouchpoint: null,
      nextTouchpointDate: null,
      status: "Prospect",
      activities: [],
      campaigns: [],
    };
    const updated = [...clients, client];
    setClients(updated);
    persist(KEY, updated);
    setNewClient({ businessName: "", contactName: "", email: "", phone: "", address: "", category: "", notes: "" });
    setShowAdd(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Users}
        title="Client Manager"
        description="Enhanced CRM — manage contacts, track activity, and monitor opportunities."
        badge={`${totalClients} Clients`}
      >
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#74ddc7] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Clients" value={totalClients.toString()} icon={Users} color="text-[#74ddc7]" bg="bg-[#74ddc7]/10" />
        <StatCard label="Active Clients" value={activeClients.toString()} icon={Building2} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Avg Revenue/Client" value={formatCurrency(avgRevenue)} icon={TrendingUp} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, company, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterStatus === s ? "border-[#74ddc7]/50 bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Client Cards */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-12">
            <Users className="h-8 w-8 text-foreground/20" />
            <p className="text-sm text-muted-foreground">No clients found</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const isExpanded = expandedClient === client.id;
            return (
              <div key={client.id} className={`rounded-xl border bg-card transition-all ${isExpanded ? "border-[#74ddc7]/30 shadow-lg shadow-black/5" : "border-border hover:border-input"}`}>
                {/* Client Row */}
                <button
                  type="button"
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#74ddc7]/10 border border-[#74ddc7]/20">
                    <Building2 className="h-5 w-5 text-[#74ddc7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">{client.businessName}</h3>
                      <StatusBadge status={client.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {client.contactName} · {client.category} · Last contact: {relativeTime(client.lastContactDate)}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(client.totalRevenue)}</p>
                      <p className="text-[10px]">Revenue</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{client.campaigns.length}</p>
                      <p className="text-[10px]">Campaigns</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground/40 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Contact Info */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{client.address}</span>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(client.totalRevenue)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaigns</p>
                        <p className="text-lg font-bold text-foreground">{client.campaigns.length}</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Activities</p>
                        <p className="text-lg font-bold text-foreground">{client.activities.length}</p>
                      </div>
                    </div>

                    {/* Next Touchpoint */}
                    {client.nextTouchpoint && (
                      <div className="flex items-start gap-3 rounded-lg border border-[#74ddc7]/20 bg-[#74ddc7]/5 p-3">
                        <Calendar className="h-4 w-4 text-[#74ddc7] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-[#74ddc7]">Next Touchpoint</p>
                          <p className="text-xs text-foreground mt-0.5">{client.nextTouchpoint}</p>
                          {client.nextTouchpointDate && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(client.nextTouchpointDate)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Campaigns */}
                    {client.campaigns.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Campaigns</h4>
                        <div className="flex flex-wrap gap-2">
                          {client.campaigns.map((camp) => (
                            <div key={camp.name} className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
                              <span className="text-xs font-medium text-foreground">{camp.name}</span>
                              <StatusBadge status={camp.status} />
                              <span className="text-xs text-muted-foreground">{formatCurrency(camp.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activity Timeline */}
                    {client.activities.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Activity Timeline</h4>
                        <div className="space-y-2">
                          {client.activities.map((act) => {
                            const ActIcon = ACTIVITY_ICONS[act.type] || MessageSquare;
                            const colorClass = ACTIVITY_COLORS[act.type] || "text-muted-foreground bg-muted";
                            return (
                              <div key={act.id} className="flex items-start gap-3">
                                <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${colorClass}`}>
                                  <ActIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground">{act.description}</p>
                                  <p className="text-[11px] text-muted-foreground">{relativeTime(act.date)} · {formatDate(act.date)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {client.notes && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                        <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{client.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Client Modal */}
      <DetailModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Client"
        subtitle="Add a client to the CRM"
        maxWidth="max-w-md"
        actions={
          <>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="button" onClick={handleAddClient} className="px-4 py-2 text-sm font-semibold text-[#0a0a0f] bg-[#74ddc7] rounded-lg hover:bg-[#74ddc7]/90 transition-colors inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />Add Client</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Business Name *</label>
            <input type="text" value={newClient.businessName} onChange={(e) => setNewClient((p) => ({ ...p, businessName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Fayetteville Motors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Contact Name *</label>
            <input type="text" value={newClient.contactName} onChange={(e) => setNewClient((p) => ({ ...p, contactName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <input type="tel" value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <input type="text" value={newClient.address} onChange={(e) => setNewClient((p) => ({ ...p, address: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <input type="text" value={newClient.category} onChange={(e) => setNewClient((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40" placeholder="e.g. Automotive, Retail, Healthcare" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={newClient.notes} onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none" />
          </div>
        </div>
      </DetailModal>
    </div>
  );
}
