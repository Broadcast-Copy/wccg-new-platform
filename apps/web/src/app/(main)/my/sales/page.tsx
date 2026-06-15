"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  ArrowRight,
  Layers,
  ShoppingBag,
  FileText,
  Building2,
  Mail,
  Phone,
  Search,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types (Supabase-direct: sales_deals + crm_clients)
// ---------------------------------------------------------------------------

type DealStatus = "lead" | "quoted" | "won" | "lost" | "invoiced" | "paid";

interface DealRow {
  id: string;
  title: string;
  status: DealStatus;
  subtotal: number | null;
  created_at: string;
  client: { id: string; name: string } | null;
}

interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
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

const DEAL_STATUS_STYLES: Record<DealStatus, string> = {
  lead: "bg-foreground/[0.06] text-muted-foreground border-border",
  quoted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
  invoiced: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const OPEN_STATUSES: DealStatus[] = ["lead", "quoted"];
const REVENUE_STATUSES: DealStatus[] = ["won", "invoiced", "paid"];

type SalesTab = "dashboard" | "clients";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesDashboardPage() {
  const [deals, setDeals] = useState<DealRow[] | null>(null);
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [activeTab, setActiveTab] = useState<SalesTab>("dashboard");
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const [dealsRes, clientsRes] = await Promise.all([
        supabase
          .from("sales_deals")
          .select("id, title, status, subtotal, created_at, client:crm_clients(id, name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("crm_clients")
          .select("id, name, company, contact_name, contact_email, contact_phone, status")
          .order("name"),
      ]);
      if (!active) return;
      setDeals((dealsRes.data ?? []) as unknown as DealRow[]);
      setClients((clientsRes.data ?? []) as unknown as ClientRow[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const loading = deals === null || clients === null;
  const dealList = deals ?? [];
  const clientList = clients ?? [];

  // Stats — all derived from real data
  const openDeals = dealList.filter((d) => OPEN_STATUSES.includes(d.status)).length;
  const wonRevenue = dealList
    .filter((d) => REVENUE_STATUSES.includes(d.status))
    .reduce((sum, d) => sum + (d.subtotal ?? 0), 0);
  const totalClients = clientList.length;
  const pendingInvoices = dealList.filter((d) => d.status === "invoiced").length;

  const stats = [
    { label: "Open Deals", value: openDeals.toString(), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Won Revenue", value: formatCurrency(wonRevenue), icon: DollarSign, color: "text-[#74ddc7]", bg: "bg-[#74ddc7]/10" },
    { label: "Clients", value: totalClients.toString(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Pending Invoices", value: pendingInvoices.toString(), icon: Receipt, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  const quickActions = [
    { href: "/my/sales/deals", label: "Deal Pipeline", description: "Build deals, add line items, advance the pipeline", icon: Layers, bg: "bg-[#74ddc7]/10", color: "text-[#74ddc7]" },
    { href: "/my/sales/invoices", label: "Invoices", description: "Generate and track invoices", icon: Receipt, bg: "bg-yellow-500/10", color: "text-yellow-400" },
    { href: "/my/sales/rate-card", label: "Rate Card", description: "Manage products and pricing", icon: ShoppingBag, bg: "bg-purple-500/10", color: "text-purple-400" },
  ];

  // Per-client deal counts
  function dealsForClient(clientId: string) {
    return dealList.filter((d) => d.client?.id === clientId);
  }

  const filteredClients = clientList.filter((client) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      client.name.toLowerCase().includes(q) ||
      (client.company ?? "").toLowerCase().includes(q) ||
      (client.contact_name ?? "").toLowerCase().includes(q) ||
      (client.contact_email ?? "").toLowerCase().includes(q)
    );
  });

  const recentDeals = dealList.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-[#74ddc7]" />
            Sales Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sell airtime, sponsorships, production, and DJ/events for WCCG 104.5 FM.
          </p>
        </div>
        <Link
          href="/my/sales/deals"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors self-start"
        >
          <Plus className="h-4 w-4" />
          New Deal
        </Link>
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
          Clients
          <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-bold">
            {loading ? "·" : clientList.length}
          </span>
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
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <span className="text-muted-foreground/40">—</span> : stat.value}
                </p>
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

          {/* Recent Deals */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Recent Deals</h2>
              <Link
                href="/my/sales/deals"
                className="text-xs text-[#74ddc7] hover:text-[#74ddc7]/80 font-medium flex items-center gap-1 transition-colors"
              >
                View pipeline <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-3">Deal</th>
                    <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Client</th>
                    <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Created</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-right font-medium px-4 py-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        Loading deals…
                      </td>
                    </tr>
                  ) : recentDeals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                        <p className="text-sm font-medium">No deals yet</p>
                        <p className="text-xs mt-1">
                          Create your first deal to start the pipeline.
                        </p>
                        <Link
                          href="/my/sales/deals"
                          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#74ddc7] hover:underline"
                        >
                          <Plus className="h-3 w-3" /> New Deal
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    recentDeals.map((deal) => (
                      <tr
                        key={deal.id}
                        className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/my/sales/deals?id=${deal.id}`}
                            className="font-medium text-foreground hover:text-[#74ddc7] transition-colors"
                          >
                            {deal.title}
                          </Link>
                          <div className="text-[11px] text-muted-foreground sm:hidden">
                            {deal.client?.name ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {deal.client?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                          {formatDate(deal.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${DEAL_STATUS_STYLES[deal.status]}`}
                          >
                            {deal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {formatCurrency(deal.subtotal ?? 0)}
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

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients by name, company, or contact…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 focus:border-[#74ddc7]/50"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${filteredClients.length} of ${clientList.length} clients`}
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
                Loading clients…
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-12">
                <Users className="h-8 w-8 text-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  {clientList.length === 0 ? "No clients in the CRM yet" : "No clients match your search"}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const cdeals = dealsForClient(client.id);
                const openCount = cdeals.filter((d) => OPEN_STATUSES.includes(d.status)).length;
                return (
                  <div
                    key={client.id}
                    className="rounded-xl border border-border bg-card p-4 transition-all hover:border-input"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#74ddc7]/10 border border-[#74ddc7]/20">
                        <Building2 className="h-5 w-5 text-[#74ddc7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {client.name}
                          {client.company && client.company !== client.name && (
                            <span className="text-muted-foreground font-normal"> · {client.company}</span>
                          )}
                        </h3>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {client.contact_name && <span>{client.contact_name}</span>}
                          {client.contact_email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {client.contact_email}
                            </span>
                          )}
                          {client.contact_phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {client.contact_phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{openCount}</p>
                          <p className="text-[10px]">Open</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{cdeals.length}</p>
                          <p className="text-[10px]">Deals</p>
                        </div>
                      </div>
                      <Link
                        href={`/my/sales/deals?client=${client.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-[#74ddc7] hover:border-[#74ddc7]/40 transition-colors shrink-0"
                        title="New deal for this client"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Deal</span>
                      </Link>
                    </div>
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
