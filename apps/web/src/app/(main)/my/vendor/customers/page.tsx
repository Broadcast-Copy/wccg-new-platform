"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
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
// Mock data (commented fallback)
// ---------------------------------------------------------------------------

const FILTERS: FilterOption[] = ["All", "Recent", "Top Spenders", "Token Recipients"];

// const SEED_CUSTOMERS: Customer[] = [
//   { id: "c1", name: "James Walker", email: "james.walker@email.com", totalPurchases: 347.5, tokensReceived: 2500, lastVisit: "2026-03-26", visitCount: 12, purchases: [...], tokenLog: [...] },
//   { id: "c2", name: "Tasha Brown", ... },
//   { id: "c3", name: "Derek Miles", ... },
//   { id: "c4", name: "Keisha Johnson", ... },
//   { id: "c5", name: "Marcus Davis", ... },
//   { id: "c6", name: "Aliyah Carter", ... },
//   { id: "c7", name: "Terrence White", ... },
//   { id: "c8", name: "Nina Simmons", ... },
// ];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorCustomersPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch customers from Supabase
  useEffect(() => {
    if (!user) return;
    async function fetchCustomers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_customers')
        .select('*')
        .eq('vendor_id', user!.id)
        .order('last_visit', { ascending: false });
      if (!error && data) {
        setCustomers(data.map((row: any) => ({
          id: row.id,
          name: row.name ?? '',
          email: row.email ?? '',
          totalPurchases: row.total_purchases ?? 0,
          tokensReceived: row.tokens_received ?? 0,
          lastVisit: row.last_visit ?? '',
          visitCount: row.visit_count ?? 0,
          purchases: row.purchases ?? [],
          tokenLog: row.token_log ?? [],
        })));
      }
      setLoading(false);
    }
    fetchCustomers();
  }, [user, supabase]);

  // Auth guard
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  // CRUD helpers
  async function handleAddCustomer(customerData: Omit<Customer, 'id'>) {
    const { data, error } = await supabase
      .from('vendor_customers')
      .insert({
        vendor_id: user!.id,
        name: customerData.name,
        email: customerData.email,
        total_purchases: customerData.totalPurchases,
        tokens_received: customerData.tokensReceived,
        last_visit: customerData.lastVisit,
        visit_count: customerData.visitCount,
        purchases: customerData.purchases,
        token_log: customerData.tokenLog,
      })
      .select();
    if (!error && data?.[0]) {
      const row = data[0];
      setCustomers((prev) => [{
        id: row.id,
        name: row.name ?? '',
        email: row.email ?? '',
        totalPurchases: row.total_purchases ?? 0,
        tokensReceived: row.tokens_received ?? 0,
        lastVisit: row.last_visit ?? '',
        visitCount: row.visit_count ?? 0,
        purchases: row.purchases ?? [],
        tokenLog: row.token_log ?? [],
      }, ...prev]);
    }
  }

  async function handleUpdateCustomer(id: string, updates: Partial<Customer>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.totalPurchases !== undefined) dbUpdates.total_purchases = updates.totalPurchases;
    if (updates.tokensReceived !== undefined) dbUpdates.tokens_received = updates.tokensReceived;
    if (updates.lastVisit !== undefined) dbUpdates.last_visit = updates.lastVisit;
    if (updates.visitCount !== undefined) dbUpdates.visit_count = updates.visitCount;
    if (updates.purchases !== undefined) dbUpdates.purchases = updates.purchases;
    if (updates.tokenLog !== undefined) dbUpdates.token_log = updates.tokenLog;

    const { error } = await supabase
      .from('vendor_customers')
      .update(dbUpdates)
      .eq('id', id)
      .eq('vendor_id', user!.id);
    if (!error) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    }
  }

  async function handleDeleteCustomer(id: string) {
    const { error } = await supabase
      .from('vendor_customers')
      .delete()
      .eq('id', id)
      .eq('vendor_id', user!.id);
    if (!error) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  }

  // Filter + search logic
  const filtered = customers.filter((c) => {
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

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.visitCount >= 3).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
  const avgTokens = totalCustomers > 0 ? Math.round(
    customers.reduce((sum, c) => sum + c.tokensReceived, 0) / totalCustomers
  ) : 0;

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
