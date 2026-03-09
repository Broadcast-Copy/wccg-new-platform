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

export default function SalesDashboardPage() {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);
  const [clients, setClients] = useState<SalesClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mounted, setMounted] = useState(false);

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
    { href: "/my/sales/campaign-builder", label: "Manage Clients", description: "Search and edit client accounts", icon: Users, bg: "bg-blue-500/10", color: "text-blue-400" },
  ];

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
    </div>
  );
}
