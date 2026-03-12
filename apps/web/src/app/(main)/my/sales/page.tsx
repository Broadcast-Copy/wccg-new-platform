"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Receipt,
  ArrowRight,
  Megaphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Search,
  Pencil,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalesClient {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
}

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

interface SavedCampaign {
  id: string;
  campaignName: string;
  client: SalesClient;
  flightStart: string;
  flightEnd: string;
  total: number;
  status: "draft" | "active" | "completed";
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  campaignName: string;
  client: SalesClient;
  total: number;
  status: InvoiceStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-foreground/[0.06] text-muted-foreground border-border",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Draft: "bg-foreground/[0.06] text-muted-foreground border-border",
  Sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

const CAMPAIGNS_KEY = "wccg_sales_campaigns";
const CLIENTS_KEY = "wccg_sales_clients";
const INVOICES_KEY = "wccg_sales_invoices";

// ---------------------------------------------------------------------------
// Mock seed data
// ---------------------------------------------------------------------------

const SEED_CLIENTS: SalesClient[] = [
  { id: "c1", businessName: "Cross Creek Mall", contactName: "Sarah Johnson", email: "sarah@crosscreekmall.com", phone: "(910) 555-0101", address: "419 Cross Creek Mall, Fayetteville, NC", category: "Retail" },
  { id: "c2", businessName: "Cape Fear Valley Health", contactName: "Dr. Michael Brown", email: "mbrown@capefearvalley.com", phone: "(910) 555-0202", address: "1638 Owen Dr, Fayetteville, NC", category: "Healthcare" },
  { id: "c3", businessName: "Fort Liberty Auto Group", contactName: "James Williams", email: "james@ftlibertyauto.com", phone: "(910) 555-0303", address: "5925 Yadkin Rd, Fayetteville, NC", category: "Automotive" },
  { id: "c4", businessName: "Mash House Brewing", contactName: "Kim Taylor", email: "kim@mashhouse.com", phone: "(910) 555-0404", address: "4150 Sycamore Dairy Rd, Fayetteville, NC", category: "Restaurant" },
  { id: "c5", businessName: "Cumberland County Schools", contactName: "Angela Davis", email: "adavis@ccs.k12.nc.us", phone: "(910) 555-0505", address: "2465 Gillespie St, Fayetteville, NC", category: "Education" },
];

const SEED_CAMPAIGNS: SavedCampaign[] = [
  { id: "camp1", campaignName: "Spring Auto Sale", client: SEED_CLIENTS[2], flightStart: "2026-03-09", flightEnd: "2026-04-06", total: 8400, status: "active", createdAt: "2026-03-01T10:00:00Z" },
  { id: "camp2", campaignName: "Health Fair 2026", client: SEED_CLIENTS[1], flightStart: "2026-04-01", flightEnd: "2026-04-30", total: 6200, status: "draft", createdAt: "2026-03-05T14:00:00Z" },
  { id: "camp3", campaignName: "Weekend Brunch Special", client: SEED_CLIENTS[3], flightStart: "2026-03-01", flightEnd: "2026-03-31", total: 3750, status: "active", createdAt: "2026-02-20T09:00:00Z" },
  { id: "camp4", campaignName: "Back to School Enrollment", client: SEED_CLIENTS[4], flightStart: "2026-07-15", flightEnd: "2026-08-15", total: 4500, status: "draft", createdAt: "2026-03-07T16:00:00Z" },
];

const SEED_INVOICES: Invoice[] = [
  { id: "inv1", invoiceNumber: "INV-2026-0001", campaignName: "Spring Auto Sale", client: SEED_CLIENTS[2], total: 8400, status: "Sent", createdAt: "2026-03-01T10:00:00Z" },
  { id: "inv2", invoiceNumber: "INV-2026-0002", campaignName: "Weekend Brunch Special", client: SEED_CLIENTS[3], total: 3750, status: "Paid", createdAt: "2026-02-20T09:00:00Z" },
  { id: "inv3", invoiceNumber: "INV-2026-0003", campaignName: "Health Fair 2026", client: SEED_CLIENTS[1], total: 6200, status: "Draft", createdAt: "2026-03-05T14:00:00Z" },
];

function loadOrSeed<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Client active-jobs mock data
// ---------------------------------------------------------------------------

interface ClientJob {
  id: string;
  title: string;
  type: string;
  status: "active" | "completed" | "pending";
  dueDate: string;
}

const CLIENT_JOBS: Record<string, ClientJob[]> = {
  c1: [
    { id: "j1", title: "Holiday Sale Radio Spot", type: "Audio Spot", status: "active", dueDate: "2026-03-20" },
    { id: "j2", title: "Spring Clearance Promo", type: "Promo", status: "pending", dueDate: "2026-04-01" },
  ],
  c2: [
    { id: "j3", title: "Health Fair 2026 PSA", type: "Audio Spot", status: "active", dueDate: "2026-04-15" },
  ],
  c3: [
    { id: "j4", title: "Spring Auto Sale TV Spot", type: "Video", status: "active", dueDate: "2026-03-25" },
    { id: "j5", title: "Service Center Audio Ad", type: "Audio Spot", status: "completed", dueDate: "2026-02-28" },
    { id: "j6", title: "Memorial Day Campaign", type: "Promo", status: "pending", dueDate: "2026-05-20" },
  ],
  c4: [
    { id: "j7", title: "Weekend Brunch Radio Spot", type: "Audio Spot", status: "active", dueDate: "2026-03-31" },
    { id: "j8", title: "New Menu Launch Video", type: "Video", status: "pending", dueDate: "2026-04-10" },
  ],
  c5: [
    { id: "j9", title: "Enrollment Drive PSA", type: "Audio Spot", status: "pending", dueDate: "2026-07-20" },
  ],
};

const CLIENT_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type SalesTab = "dashboard" | "clients";

export default function SalesDashboardPage() {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [clients, setClients] = useState<SalesClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mounted, setMounted] = useState(false);

  // Client Manager state
  const [activeTab, setActiveTab] = useState<SalesTab>("dashboard");
  const [clientSearch, setClientSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SalesClient>>({});

  useEffect(() => {
    setMounted(true);
    setCampaigns(loadOrSeed(CAMPAIGNS_KEY, SEED_CAMPAIGNS));
    setClients(loadOrSeed(CLIENTS_KEY, SEED_CLIENTS));
    setInvoices(loadOrSeed(INVOICES_KEY, SEED_INVOICES));
  }, []);

  if (!mounted) return null;

  // Stats
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const monthlyRevenue = campaigns
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.total, 0);
  const totalClients = clients.length;
  const pendingInvoices = invoices.filter(
    (i) => i.status === "Draft" || i.status === "Sent"
  ).length;

  const stats = [
    { label: "Active Campaigns", value: activeCampaigns.toString(), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Monthly Revenue", value: formatCurrency(monthlyRevenue), icon: DollarSign, color: "text-[#74ddc7]", bg: "bg-[#74ddc7]/10" },
    { label: "Total Clients", value: totalClients.toString(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Pending Invoices", value: pendingInvoices.toString(), icon: Receipt, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  const quickActions = [
    { href: "/my/sales/campaign-builder", label: "New Campaign", description: "Build a commercial campaign for a client", icon: Megaphone, bg: "bg-[#74ddc7]/10", color: "text-[#74ddc7]" },
    { href: "/my/sales/invoices", label: "View Invoices", description: "Manage invoices and billing", icon: Receipt, bg: "bg-yellow-500/10", color: "text-yellow-400" },
    { href: "/my/sales/spot-shop", label: "Spot Shop", description: "Browse and purchase ad spots quickly", icon: ShoppingBag, bg: "bg-purple-500/10", color: "text-purple-400" },
  ];

  // Client manager helpers
  const filteredClients = clients.filter((client) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      client.businessName.toLowerCase().includes(q) ||
      client.contactName.toLowerCase().includes(q) ||
      client.category.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q)
    );
  });

  function getClientCampaignCount(clientId: string) {
    return campaigns.filter((c) => c.client.id === clientId).length;
  }

  function getClientActiveCampaigns(clientId: string) {
    return campaigns.filter((c) => c.client.id === clientId && c.status === "active").length;
  }

  function getClientStatus(clientId: string): "active" | "inactive" {
    return campaigns.some((c) => c.client.id === clientId && c.status === "active")
      ? "active"
      : "inactive";
  }

  function handleStartEdit(client: SalesClient) {
    setEditingClient(client.id);
    setEditForm({ ...client });
    setExpandedClient(client.id);
  }

  function handleSaveEdit() {
    if (!editingClient || !editForm.businessName?.trim()) return;
    setClients((prev) =>
      prev.map((c) => (c.id === editingClient ? { ...c, ...editForm } as SalesClient : c))
    );
    setEditingClient(null);
    setEditForm({});
  }

  function handleCancelEdit() {
    setEditingClient(null);
    setEditForm({});
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-[#74ddc7]" />
          Sales Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage campaigns, clients, and invoices for WCCG 104.5 FM commercial advertising.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "dashboard"
              ? "border-[#74ddc7] text-[#74ddc7]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("clients")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "clients"
              ? "border-[#74ddc7] text-[#74ddc7]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Client Manager
          <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-bold">{clients.length}</span>
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input flex items-center gap-4"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} shrink-0`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors text-sm">
                      {action.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-foreground/20 group-hover:text-[#74ddc7] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Campaigns */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Recent Campaigns</h2>
              <Link
                href="/my/sales/campaign-builder"
                className="text-xs text-[#74ddc7] hover:text-[#74ddc7]/80 font-medium flex items-center gap-1 transition-colors"
              >
                New Campaign <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-3">Campaign</th>
                    <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Client</th>
                    <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Flight Dates</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-right font-medium px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                        <p className="text-sm font-medium">No campaigns yet</p>
                        <p className="text-xs mt-1">Create your first campaign to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    campaigns
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 10)
                      .map((camp) => (
                        <tr key={camp.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{camp.campaignName}</div>
                            <div className="text-[11px] text-muted-foreground sm:hidden">{camp.client.businessName}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {camp.client.businessName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {formatDate(camp.flightStart)} — {formatDate(camp.flightEnd)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[camp.status]}`}>
                              {camp.status === "active" && <CheckCircle2 className="h-3 w-3" />}
                              {camp.status === "draft" && <Clock className="h-3 w-3" />}
                              {camp.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                              {camp.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {formatCurrency(camp.total)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Client Manager Tab */}
      {activeTab === "clients" && (
        <>
          {/* Client Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients by name, company, or category..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 focus:border-[#74ddc7]/50"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredClients.length} of {clients.length} clients
            </span>
          </div>

          {/* Client List */}
          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-12">
                <Users className="h-8 w-8 text-foreground/20" />
                <p className="text-sm text-muted-foreground">No clients found</p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isExpanded = expandedClient === client.id;
                const isEditing = editingClient === client.id;
                const clientStatus = getClientStatus(client.id);
                const activeCampCount = getClientActiveCampaigns(client.id);
                const totalCampCount = getClientCampaignCount(client.id);
                const jobs = CLIENT_JOBS[client.id] || [];

                return (
                  <div
                    key={client.id}
                    className={`rounded-xl border bg-card transition-all ${
                      isExpanded ? "border-[#74ddc7]/30 shadow-lg shadow-black/5" : "border-border hover:border-input"
                    }`}
                  >
                    {/* Client Row */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => {
                        if (isEditing) return;
                        setExpandedClient(isExpanded ? null : client.id);
                      }}
                    >
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#74ddc7]/10 border border-[#74ddc7]/20">
                        <Building2 className="h-5 w-5 text-[#74ddc7]" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {client.businessName}
                          </h3>
                          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            clientStatus === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-foreground/[0.06] text-muted-foreground border-border"
                          }`}>
                            {clientStatus}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {client.contactName} · {client.category}
                        </p>
                      </div>

                      {/* Campaign count */}
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{activeCampCount}</p>
                          <p className="text-[10px]">Active</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{totalCampCount}</p>
                          <p className="text-[10px]">Total</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(client);
                          }}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
                          title="Edit client"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <div className="text-muted-foreground/40">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Client Details — view or edit */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Edit Client
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Business Name</label>
                                <input
                                  type="text"
                                  value={editForm.businessName || ""}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, businessName: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Contact Name</label>
                                <input
                                  type="text"
                                  value={editForm.contactName || ""}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, contactName: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Email</label>
                                <input
                                  type="email"
                                  value={editForm.email || ""}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Phone</label>
                                <input
                                  type="tel"
                                  value={editForm.phone || ""}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Address</label>
                                <input
                                  type="text"
                                  value={editForm.address || ""}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground font-medium">Category</label>
                                <input
                                  type="text"
                                  value={editForm.category || ""}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-3 py-1.5 text-xs font-medium text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
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
                        )}

                        {/* Active Jobs for this client */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active Jobs ({jobs.length})
                          </h4>
                          {jobs.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">No active jobs for this client.</p>
                          ) : (
                            <div className="rounded-lg border border-border overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/30 border-b border-border">
                                    <th className="text-left font-medium text-muted-foreground text-xs px-3 py-2">Job</th>
                                    <th className="text-left font-medium text-muted-foreground text-xs px-3 py-2 hidden sm:table-cell">Type</th>
                                    <th className="text-left font-medium text-muted-foreground text-xs px-3 py-2">Status</th>
                                    <th className="text-right font-medium text-muted-foreground text-xs px-3 py-2">Due</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {jobs.map((job) => (
                                    <tr key={job.id} className="border-b border-border last:border-0">
                                      <td className="px-3 py-2 font-medium text-foreground text-xs">{job.title}</td>
                                      <td className="px-3 py-2 text-muted-foreground text-xs hidden sm:table-cell">{job.type}</td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CLIENT_STATUS_STYLES[job.status]}`}>
                                          {job.status}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                                        {formatDate(job.dueDate)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Client campaigns */}
                        {totalCampCount > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Campaigns ({totalCampCount})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {campaigns
                                .filter((c) => c.client.id === client.id)
                                .map((camp) => (
                                  <div
                                    key={camp.id}
                                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5"
                                  >
                                    <span className="text-xs font-medium text-foreground">{camp.campaignName}</span>
                                    <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[camp.status]}`}>
                                      {camp.status}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatCurrency(camp.total)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
