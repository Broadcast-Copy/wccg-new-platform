"use client";

import { useState } from "react";
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Coins,
  ShoppingBag,
  CalendarDays,
  Repeat,
  TrendingUp,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PurchaseRecord {
  item: string;
  amount: number;
  date: string;
}

interface TokenLog {
  amount: number;
  reason: string;
  date: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  totalPurchases: number;
  tokensReceived: number;
  lastVisit: string;
  visitCount: number;
  purchases: PurchaseRecord[];
  tokenLog: TokenLog[];
}

type FilterOption = "All" | "Recent" | "Top Spenders" | "Token Recipients";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const FILTERS: FilterOption[] = ["All", "Recent", "Top Spenders", "Token Recipients"];

const SEED_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "James Walker",
    email: "james.walker@email.com",
    totalPurchases: 347.5,
    tokensReceived: 2500,
    lastVisit: "2026-03-26",
    visitCount: 12,
    purchases: [
      { item: "Crown City Hot Sauce", amount: 12.99, date: "2026-03-26" },
      { item: "WCCG Logo Tee", amount: 24.99, date: "2026-03-20" },
      { item: "Vinyl Sticker Pack", amount: 7.99, date: "2026-03-10" },
    ],
    tokenLog: [
      { amount: 500, reason: "Purchase Reward", date: "2026-03-26" },
      { amount: 1000, reason: "Event Attendance", date: "2026-03-15" },
      { amount: 1000, reason: "Loyalty Bonus", date: "2026-02-28" },
    ],
  },
  {
    id: "c2",
    name: "Tasha Brown",
    email: "tasha.brown@email.com",
    totalPurchases: 289.0,
    tokensReceived: 1800,
    lastVisit: "2026-03-24",
    visitCount: 8,
    purchases: [
      { item: "DJ Workshop Pass", amount: 49.99, date: "2026-03-24" },
      { item: "Crown City Hot Sauce x2", amount: 25.98, date: "2026-03-18" },
      { item: "Gift Card $50", amount: 50.0, date: "2026-03-05" },
    ],
    tokenLog: [
      { amount: 1000, reason: "Event Attendance", date: "2026-03-24" },
      { amount: 800, reason: "Purchase Reward", date: "2026-03-18" },
    ],
  },
  {
    id: "c3",
    name: "Derek Miles",
    email: "derek.miles@email.com",
    totalPurchases: 156.25,
    tokensReceived: 900,
    lastVisit: "2026-03-22",
    visitCount: 5,
    purchases: [
      { item: "WCCG Logo Tee", amount: 24.99, date: "2026-03-22" },
      { item: "Festival Ticket", amount: 35.0, date: "2026-03-10" },
      { item: "Snack Bundle", amount: 18.5, date: "2026-02-28" },
    ],
    tokenLog: [
      { amount: 500, reason: "Promotion", date: "2026-03-22" },
      { amount: 400, reason: "Purchase Reward", date: "2026-03-10" },
    ],
  },
  {
    id: "c4",
    name: "Keisha Johnson",
    email: "keisha.johnson@email.com",
    totalPurchases: 512.0,
    tokensReceived: 3200,
    lastVisit: "2026-03-25",
    visitCount: 18,
    purchases: [
      { item: "Premium Package", amount: 99.99, date: "2026-03-25" },
      { item: "WCCG Logo Tee x3", amount: 74.97, date: "2026-03-15" },
      { item: "DJ Workshop Pass", amount: 49.99, date: "2026-03-01" },
      { item: "Gift Card $100", amount: 100.0, date: "2026-02-20" },
    ],
    tokenLog: [
      { amount: 1500, reason: "Loyalty Bonus", date: "2026-03-25" },
      { amount: 1000, reason: "Purchase Reward", date: "2026-03-15" },
      { amount: 700, reason: "Event Attendance", date: "2026-03-01" },
    ],
  },
  {
    id: "c5",
    name: "Marcus Davis",
    email: "marcus.davis@email.com",
    totalPurchases: 78.5,
    tokensReceived: 300,
    lastVisit: "2026-03-15",
    visitCount: 2,
    purchases: [
      { item: "Crown City Hot Sauce", amount: 12.99, date: "2026-03-15" },
      { item: "Vinyl Sticker Pack", amount: 7.99, date: "2026-03-01" },
    ],
    tokenLog: [{ amount: 300, reason: "Purchase Reward", date: "2026-03-15" }],
  },
  {
    id: "c6",
    name: "Aliyah Carter",
    email: "aliyah.carter@email.com",
    totalPurchases: 195.75,
    tokensReceived: 1400,
    lastVisit: "2026-03-23",
    visitCount: 7,
    purchases: [
      { item: "Festival VIP Pass", amount: 75.0, date: "2026-03-23" },
      { item: "WCCG Logo Tee", amount: 24.99, date: "2026-03-12" },
      { item: "Crown City Hot Sauce", amount: 12.99, date: "2026-02-25" },
    ],
    tokenLog: [
      { amount: 800, reason: "Event Attendance", date: "2026-03-23" },
      { amount: 600, reason: "Promotion", date: "2026-03-12" },
    ],
  },
  {
    id: "c7",
    name: "Terrence White",
    email: "terrence.white@email.com",
    totalPurchases: 410.0,
    tokensReceived: 2100,
    lastVisit: "2026-03-21",
    visitCount: 10,
    purchases: [
      { item: "DJ Workshop Pass", amount: 49.99, date: "2026-03-21" },
      { item: "Premium Package", amount: 99.99, date: "2026-03-08" },
      { item: "Gift Card $50", amount: 50.0, date: "2026-02-18" },
    ],
    tokenLog: [
      { amount: 1000, reason: "Loyalty Bonus", date: "2026-03-21" },
      { amount: 600, reason: "Purchase Reward", date: "2026-03-08" },
      { amount: 500, reason: "Promotion", date: "2026-02-18" },
    ],
  },
  {
    id: "c8",
    name: "Nina Simmons",
    email: "nina.simmons@email.com",
    totalPurchases: 62.0,
    tokensReceived: 200,
    lastVisit: "2026-03-10",
    visitCount: 1,
    purchases: [
      { item: "WCCG Logo Tee", amount: 24.99, date: "2026-03-10" },
      { item: "Snack Bundle", amount: 18.5, date: "2026-03-10" },
    ],
    tokenLog: [{ amount: 200, reason: "Purchase Reward", date: "2026-03-10" }],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorCustomersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter + search logic
  const filtered = SEED_CUSTOMERS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case "Recent":
        return c.lastVisit >= "2026-03-20";
      case "Top Spenders":
        return c.totalPurchases >= 250;
      case "Token Recipients":
        return c.tokensReceived >= 1000;
      default:
        return true;
    }
  });

  const totalCustomers = SEED_CUSTOMERS.length;
  const repeatCustomers = SEED_CUSTOMERS.filter((c) => c.visitCount >= 3).length;
  const repeatRate = Math.round((repeatCustomers / totalCustomers) * 100);
  const avgTokens = Math.round(
    SEED_CUSTOMERS.reduce((sum, c) => sum + c.tokensReceived, 0) / totalCustomers
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Customer Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage your customer relationships
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Row                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Customers", value: totalCustomers.toString(), icon: Users, color: "text-amber-500" },
          { label: "Repeat Rate", value: `${repeatRate}%`, icon: Repeat, color: "text-green-500" },
          { label: "Avg Tokens Per Customer", value: avgTokens.toLocaleString(), icon: Coins, color: "text-blue-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <div className={`rounded-xl bg-muted p-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Search + Filter                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            className="appearance-none rounded-xl border border-border bg-background px-4 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Customer List                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-3">
        {filtered.map((customer) => {
          const isExpanded = expandedId === customer.id;
          const isRepeat = customer.visitCount >= 3;

          return (
            <div
              key={customer.id}
              className="rounded-2xl border border-border bg-card transition-shadow hover:shadow-sm"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{customer.name}</span>
                      {isRepeat && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Repeat
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm text-muted-foreground">Purchases</p>
                    <p className="font-semibold">${customer.totalPurchases.toFixed(2)}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm text-muted-foreground">Tokens</p>
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      {customer.tokensReceived.toLocaleString()}
                    </p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-sm text-muted-foreground">Visits</p>
                    <p className="font-semibold">{customer.visitCount}</p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-sm text-muted-foreground">Last Visit</p>
                    <p className="font-semibold">{customer.lastVisit}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Purchase history */}
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <ShoppingBag className="h-4 w-4 text-amber-500" />
                        Purchase History
                      </h4>
                      <div className="space-y-2">
                        {customer.purchases.map((p, i) => (
                          <div key={i} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                            <span>{p.item}</span>
                            <div className="flex gap-4">
                              <span className="font-medium">${p.amount.toFixed(2)}</span>
                              <span className="text-muted-foreground">{p.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Token log */}
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Coins className="h-4 w-4 text-amber-500" />
                        Token Distribution Log
                      </h4>
                      <div className="space-y-2">
                        {customer.tokenLog.map((t, i) => (
                          <div key={i} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              {t.reason}
                            </span>
                            <div className="flex gap-4">
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                +{t.amount.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">{t.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            No customers match your search or filter.
          </div>
        )}
      </div>
    </div>
  );
}
