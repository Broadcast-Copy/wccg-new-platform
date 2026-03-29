"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  Loader2,
  BarChart3,
  UserPlus,
  UserCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  total_amount: number;
  status: string;
  customer_id: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  product_name?: string;
}

interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  label: string; // "Jan", "Feb" ...
  amount: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  order_count: number;
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="rounded-lg bg-amber-500/10 p-3">
          <Icon size={22} className="text-amber-500" />
        </div>
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-xl font-bold text-white mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bar Chart (div-based)
// ---------------------------------------------------------------------------

function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((d) => {
        const pct = (d.amount / max) * 100;
        return (
          <div
            key={d.month}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span className="text-[10px] text-zinc-400">
              ${Math.round(d.amount).toLocaleString()}
            </span>
            <div
              className="w-full rounded-t bg-amber-500/80 transition-all duration-500"
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <span className="text-xs text-zinc-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VendorAnalyticsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      // Fetch orders for this vendor
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, total_amount, status, customer_id, created_at")
        .eq("vendor_id", user.id);

      // Fetch order items
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("id, order_id, product_id, quantity, product_name")
        .in(
          "order_id",
          (ordersData ?? []).map((o) => o.id),
        );

      setOrders((ordersData as Order[]) ?? []);
      setOrderItems((itemsData as OrderItem[]) ?? []);
      setLoading(false);
    };

    load();
  }, [supabase, user]);

  // ---- Computed stats ----
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered"),
    [orders],
  );

  const totalRevenue = useMemo(
    () => deliveredOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
    [deliveredOrders],
  );

  const avgOrderValue = useMemo(
    () =>
      deliveredOrders.length > 0
        ? totalRevenue / deliveredOrders.length
        : 0,
    [totalRevenue, deliveredOrders],
  );

  const uniqueCustomers = useMemo(
    () => new Set(orders.map((o) => o.customer_id)).size,
    [orders],
  );

  // ---- Monthly revenue (last 6 months) ----
  const monthlyRevenue = useMemo<MonthlyRevenue[]>(() => {
    const now = new Date();
    const months: MonthlyRevenue[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: key,
        label: d.toLocaleString("en-US", { month: "short" }),
        amount: 0,
      });
    }

    for (const o of deliveredOrders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = months.find((m) => m.month === key);
      if (entry) entry.amount += o.total_amount ?? 0;
    }

    return months;
  }, [deliveredOrders]);

  // ---- Top products ----
  const topProducts = useMemo<TopProduct[]>(() => {
    const map = new Map<string, TopProduct>();
    for (const item of orderItems) {
      const existing = map.get(item.product_id);
      if (existing) {
        existing.order_count += item.quantity;
      } else {
        map.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name ?? item.product_id,
          order_count: item.quantity,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, 5);
  }, [orderItems]);

  // ---- Customer breakdown ----
  const customerBreakdown = useMemo(() => {
    const customerOrderCounts = new Map<string, number>();
    for (const o of orders) {
      customerOrderCounts.set(
        o.customer_id,
        (customerOrderCounts.get(o.customer_id) ?? 0) + 1,
      );
    }
    let newCustomers = 0;
    let returning = 0;
    for (const count of customerOrderCounts.values()) {
      if (count === 1) newCustomers++;
      else returning++;
    }
    return { newCustomers, returning };
  }, [orders]);

  // ---- Render ----
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Sign in to view your vendor analytics.
      </div>
    );
  }

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-amber-500" />
          Vendor Analytics
        </h1>
        <p className="text-zinc-400 mt-1">
          Performance overview for your storefront
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={fmt(totalRevenue)} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={String(orders.length)} />
        <StatCard icon={TrendingUp} label="Avg Order Value" value={fmt(avgOrderValue)} />
        <StatCard icon={Users} label="Total Customers" value={String(uniqueCustomers)} />
      </div>

      {/* Revenue chart */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
            Revenue by Month (Last 6 Months)
          </h2>
          <RevenueChart data={monthlyRevenue} />
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
              <Package size={16} className="text-amber-500" />
              Top Products
            </h2>
            {topProducts.length === 0 ? (
              <p className="text-zinc-500 text-sm">No order data yet.</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div
                    key={p.product_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-300">
                      <span className="text-amber-500 font-mono mr-2">
                        #{i + 1}
                      </span>
                      {p.product_name}
                    </span>
                    <span className="text-zinc-400">
                      {p.order_count} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Breakdown */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
              <Users size={16} className="text-amber-500" />
              Customer Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <UserPlus size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {customerBreakdown.newCustomers}
                  </p>
                  <p className="text-xs text-zinc-400">New Customers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <UserCheck size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {customerBreakdown.returning}
                  </p>
                  <p className="text-xs text-zinc-400">Returning Customers</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
