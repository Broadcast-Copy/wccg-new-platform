"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Send,
  CreditCard,
  Megaphone,
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

interface InvoiceLineItem {
  daypartLabel: string;
  orderType: string;
  slotsPerDay: number;
  spotsPerWeek: number;
  weeks: number;
  ratePerSpot: number;
  lineTotal: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  campaignName: string;
  client: SalesClient;
  flightStart?: string;
  flightEnd?: string;
  lineItems?: InvoiceLineItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
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

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft: "bg-foreground/[0.06] text-muted-foreground border-border",
  Sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<InvoiceStatus, React.ComponentType<{ className?: string }>> = {
  Draft: Clock,
  Sent: Send,
  Paid: CheckCircle2,
  Overdue: AlertCircle,
};

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

const INVOICES_KEY = "wccg_sales_invoices";

const SEED_CLIENTS: SalesClient[] = [
  { id: "c1", businessName: "Cross Creek Mall", contactName: "Sarah Johnson", email: "sarah@crosscreekmall.com", phone: "(910) 555-0101", address: "419 Cross Creek Mall, Fayetteville, NC", category: "Retail" },
  { id: "c2", businessName: "Cape Fear Valley Health", contactName: "Dr. Michael Brown", email: "mbrown@capefearvalley.com", phone: "(910) 555-0202", address: "1638 Owen Dr, Fayetteville, NC", category: "Healthcare" },
  { id: "c3", businessName: "Fort Liberty Auto Group", contactName: "James Williams", email: "james@ftlibertyauto.com", phone: "(910) 555-0303", address: "5925 Yadkin Rd, Fayetteville, NC", category: "Automotive" },
  { id: "c4", businessName: "Mash House Brewing", contactName: "Kim Taylor", email: "kim@mashhouse.com", phone: "(910) 555-0404", address: "4150 Sycamore Dairy Rd, Fayetteville, NC", category: "Restaurant" },
];

const SEED_INVOICES: Invoice[] = [
  {
    id: "inv1",
    invoiceNumber: "INV-2026-0001",
    campaignName: "Spring Auto Sale",
    client: SEED_CLIENTS[2],
    flightStart: "2026-03-09",
    flightEnd: "2026-04-06",
    lineItems: [
      { daypartLabel: "Morning Drive", orderType: "ROS", slotsPerDay: 0, spotsPerWeek: 10, weeks: 4, ratePerSpot: 75, lineTotal: 3000 },
      { daypartLabel: "Afternoon Drive", orderType: "ROS", slotsPerDay: 0, spotsPerWeek: 12, weeks: 4, ratePerSpot: 65, lineTotal: 3120 },
      { daypartLabel: "Evening", orderType: "ROS", slotsPerDay: 0, spotsPerWeek: 15, weeks: 4, ratePerSpot: 40, lineTotal: 2400 },
    ],
    subtotal: 8520,
    taxRate: 7,
    taxAmount: 596,
    total: 9116,
    status: "Sent",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "inv2",
    invoiceNumber: "INV-2026-0002",
    campaignName: "Weekend Brunch Special",
    client: SEED_CLIENTS[3],
    flightStart: "2026-03-01",
    flightEnd: "2026-03-31",
    lineItems: [
      { daypartLabel: "Morning Drive", orderType: "Specific", slotsPerDay: 4, spotsPerWeek: 28, weeks: 4, ratePerSpot: 75, lineTotal: 8400 },
    ],
    subtotal: 8400,
    taxRate: 7,
    taxAmount: 588,
    total: 8988,
    status: "Paid",
    createdAt: "2026-02-20T09:00:00Z",
  },
  {
    id: "inv3",
    invoiceNumber: "INV-2026-0003",
    campaignName: "Health Fair 2026",
    client: SEED_CLIENTS[1],
    flightStart: "2026-04-01",
    flightEnd: "2026-04-30",
    lineItems: [
      { daypartLabel: "Midday", orderType: "ROS", slotsPerDay: 0, spotsPerWeek: 8, weeks: 4, ratePerSpot: 50, lineTotal: 1600 },
      { daypartLabel: "Afternoon Drive", orderType: "ROS", slotsPerDay: 0, spotsPerWeek: 10, weeks: 4, ratePerSpot: 65, lineTotal: 2600 },
    ],
    subtotal: 4200,
    taxRate: 7,
    taxAmount: 294,
    total: 4494,
    status: "Draft",
    createdAt: "2026-03-05T14:00:00Z",
  },
  {
    id: "inv4",
    invoiceNumber: "INV-2026-0004",
    campaignName: "Summer Enrollment Drive",
    client: { id: "c5", businessName: "Cumberland County Schools", contactName: "Angela Davis", email: "adavis@ccs.k12.nc.us", phone: "(910) 555-0505", address: "2465 Gillespie St, Fayetteville, NC", category: "Education" },
    flightStart: "2026-01-15",
    flightEnd: "2026-02-15",
    lineItems: [
      { daypartLabel: "Morning Drive", orderType: "ROS", slotsPerDay: 0, spotsPerWeek: 6, weeks: 4, ratePerSpot: 75, lineTotal: 1800 },
    ],
    subtotal: 1800,
    taxRate: 7,
    taxAmount: 126,
    total: 1926,
    status: "Overdue",
    createdAt: "2026-01-10T12:00:00Z",
  },
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

function persist<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setInvoices(loadOrSeed(INVOICES_KEY, SEED_INVOICES));
  }, []);

  // Stats
  const totalRevenue = useMemo(
    () => invoices.filter((i) => i.status === "Paid").reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );
  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "Sent" || i.status === "Overdue")
        .reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );
  const draftCount = invoices.filter((i) => i.status === "Draft").length;
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

  // Filtered list
  const filtered = useMemo(
    () =>
      activeFilter === "All"
        ? invoices
        : invoices.filter((i) => i.status === activeFilter),
    [invoices, activeFilter]
  );

  // Status actions
  const updateStatus = (id: string, status: InvoiceStatus) => {
    const updated = invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv));
    setInvoices(updated);
    persist(INVOICES_KEY, updated);
  };

  if (!mounted) return null;

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Outstanding", value: formatCurrency(outstanding), icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Drafts", value: draftCount.toString(), icon: FileText, color: "text-muted-foreground", bg: "bg-foreground/[0.06]" },
    { label: "Overdue", value: overdueCount.toString(), icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  const FILTERS: (InvoiceStatus | "All")[] = ["All", "Draft", "Sent", "Paid", "Overdue"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/my/sales"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-yellow-400" />
            Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage invoices and billing for advertising campaigns.
          </p>
        </div>
        <Link
          href="/my/sales/campaign-builder"
          className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Megaphone className="h-3.5 w-3.5" />
          New Campaign
        </Link>
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

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === f
                ? "bg-foreground/[0.08] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
          >
            {f}
            {f !== "All" && (
              <span className="ml-1 opacity-60">
                ({invoices.filter((i) => i.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-3 w-8"></th>
              <th className="text-left font-medium px-4 py-3">Invoice #</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Client</th>
              <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Campaign</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-right font-medium px-4 py-3">Amount</th>
              <th className="text-right font-medium px-4 py-3 hidden lg:table-cell">Date</th>
              <th className="text-right font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                  <p className="text-sm font-medium">No invoices found</p>
                  <p className="text-xs mt-1">
                    {activeFilter === "All"
                      ? "Create a campaign to generate invoices."
                      : `No ${activeFilter.toLowerCase()} invoices.`}
                  </p>
                </td>
              </tr>
            ) : (
              filtered
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((inv) => {
                  const expanded = expandedId === inv.id;
                  const StatusIcon = STATUS_ICONS[inv.status];
                  return (
                    <tbody key={inv.id}>
                      <tr
                        className={`border-b border-border hover:bg-foreground/[0.02] cursor-pointer ${
                          expanded ? "bg-foreground/[0.02]" : ""
                        }`}
                        onClick={() => setExpandedId(expanded ? null : inv.id)}
                      >
                        <td className="px-4 py-3">
                          {inv.lineItems && inv.lineItems.length > 0 ? (
                            expanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{inv.invoiceNumber}</div>
                          <div className="text-[11px] text-muted-foreground sm:hidden">
                            {inv.client.businessName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {inv.client.businessName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {inv.campaignName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[inv.status]}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden lg:table-cell">
                          {formatDate(inv.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {inv.status === "Draft" && (
                              <button
                                onClick={() => updateStatus(inv.id, "Sent")}
                                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                title="Mark as Sent"
                              >
                                <Send className="h-3 w-3" />
                                Send
                              </button>
                            )}
                            {(inv.status === "Sent" || inv.status === "Overdue") && (
                              <button
                                onClick={() => updateStatus(inv.id, "Paid")}
                                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title="Mark as Paid"
                              >
                                <CreditCard className="h-3 w-3" />
                                Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Line Items */}
                      {expanded && inv.lineItems && inv.lineItems.length > 0 && (
                        <tr className="border-b border-border">
                          <td colSpan={8} className="px-4 py-0">
                            <div className="py-4 pl-8">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground border-b border-border/50">
                                    <th className="text-left font-medium py-1.5">Daypart</th>
                                    <th className="text-left font-medium py-1.5">Type</th>
                                    <th className="text-right font-medium py-1.5">Slots/Day</th>
                                    <th className="text-right font-medium py-1.5">Spots/Wk</th>
                                    <th className="text-right font-medium py-1.5">Weeks</th>
                                    <th className="text-right font-medium py-1.5">Rate</th>
                                    <th className="text-right font-medium py-1.5">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.lineItems.map((li, idx) => (
                                    <tr key={idx} className="border-b border-border/30 last:border-0">
                                      <td className="py-1.5 text-foreground">{li.daypartLabel}</td>
                                      <td className="py-1.5">
                                        <span
                                          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                            li.orderType === "ROS"
                                              ? "bg-blue-500/10 text-blue-400"
                                              : "bg-purple-500/10 text-purple-400"
                                          }`}
                                        >
                                          {li.orderType}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-right text-muted-foreground">
                                        {li.orderType === "Specific" ? li.slotsPerDay : "—"}
                                      </td>
                                      <td className="py-1.5 text-right text-muted-foreground">
                                        {li.spotsPerWeek}
                                      </td>
                                      <td className="py-1.5 text-right text-muted-foreground">
                                        {li.weeks}
                                      </td>
                                      <td className="py-1.5 text-right text-muted-foreground">
                                        {formatCurrency(li.ratePerSpot)}
                                      </td>
                                      <td className="py-1.5 text-right font-semibold text-foreground">
                                        {formatCurrency(li.lineTotal)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Totals in expanded */}
                              {inv.subtotal !== undefined && (
                                <div className="flex justify-end mt-3 pt-2 border-t border-border/50">
                                  <div className="space-y-1 text-xs w-48">
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Subtotal</span>
                                      <span>{formatCurrency(inv.subtotal)}</span>
                                    </div>
                                    {inv.taxAmount !== undefined && (
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Tax ({inv.taxRate}%)</span>
                                        <span>{formatCurrency(inv.taxAmount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-1">
                                      <span>Total</span>
                                      <span>{formatCurrency(inv.total)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Flight dates */}
                              {inv.flightStart && inv.flightEnd && (
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  Flight: {formatDate(inv.flightStart)} — {formatDate(inv.flightEnd)}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
