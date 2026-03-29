"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Store,
  DollarSign,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  buyer_id: string;
  vendor_id: string;
  subtotal: number;
  platform_fee: number;
  shipping_cost: number;
  total: number;
  status: string;
  shipping_address: Record<string, string> | null;
  tracking_number: string | null;
  created_at: string;
  order_items: OrderItem[];
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        STATUS_STYLES[status] || "bg-gray-500/10 text-gray-600 border-gray-500/20"
      }`}
    >
      {status}
    </span>
  );
}

const STATUS_FLOW = ["pending", "processing", "shipped", "delivered"];

function nextStatuses(current: string): string[] {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return [];
  return STATUS_FLOW.slice(idx + 1);
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function VendorOrdersPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
      }
      setLoading(false);
    }

    fetchOrders();
  }, [supabase, user]);

  /* ---- Update order status ---- */
  async function handleStatusUpdate(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    const tracking = trackingInputs[orderId] || null;

    const updatePayload: Record<string, any> = { status: newStatus };
    if (tracking) updatePayload.tracking_number = tracking;

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus, tracking_number: tracking || o.tracking_number }
            : o
        )
      );
    }
    setUpdatingId(null);
  }

  /* ---- Earnings summary ---- */
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const totalPlatformFees = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.platform_fee, 0);

  /* ---- Auth guard ---- */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to manage orders</h2>
        <Link
          href="/login"
          className="mt-4 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Orders</h1>
        <p className="text-muted-foreground">
          Manage incoming orders and fulfill shipments
        </p>
      </div>

      {/* ---- Earnings Summary ---- */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
            <TrendingUp className="h-5 w-5 text-teal-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending Orders</p>
            <p className="text-xl font-bold">{pendingCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <DollarSign className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Platform Fees Paid</p>
            <p className="text-xl font-bold">${totalPlatformFees.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ---- Orders ---- */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border bg-card p-6 space-y-3"
            >
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Store className="h-16 w-16 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders from customers will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const available = nextStatuses(order.status);
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* Order header */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : order.id)
                  }
                  className="flex w-full items-center justify-between p-4 sm:p-6 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-teal-600">
                        #{order.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold">
                        ${order.total.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        {order.order_items.length} item
                        {order.order_items.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Buyer: {order.buyer_id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t px-4 sm:px-6 py-4 space-y-4 bg-muted/20">
                    {/* Shipping address */}
                    {order.shipping_address && (
                      <div>
                        <h4 className="text-sm font-semibold mb-1">
                          Ship To
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {order.shipping_address.name},{" "}
                          {order.shipping_address.address},{" "}
                          {order.shipping_address.city},{" "}
                          {order.shipping_address.state}{" "}
                          {order.shipping_address.zip}
                        </p>
                      </div>
                    )}

                    {/* Order breakdown */}
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Platform Fee
                        </span>
                        <span className="text-red-500">
                          -${order.platform_fee.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>${order.shipping_cost.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Items</h4>
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg bg-background p-3 border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Product #{item.product_id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} x $
                                {item.unit_price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold">
                            ${item.total_price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Status update controls */}
                    {available.length > 0 && (
                      <div className="border-t pt-4 space-y-3">
                        <h4 className="text-sm font-semibold">Update Status</h4>

                        {/* Tracking number input for shipped */}
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Tracking Number (optional)
                          </label>
                          <input
                            type="text"
                            value={trackingInputs[order.id] || ""}
                            onChange={(e) =>
                              setTrackingInputs({
                                ...trackingInputs,
                                [order.id]: e.target.value,
                              })
                            }
                            placeholder="Enter tracking number"
                            className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {available.map((status) => (
                            <button
                              key={status}
                              onClick={() =>
                                handleStatusUpdate(order.id, status)
                              }
                              disabled={isUpdating}
                              className="rounded-lg border border-teal-500/30 bg-teal-500/5 px-4 py-2 text-sm font-medium text-teal-600 transition-colors hover:bg-teal-500/10 disabled:opacity-50 capitalize"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                `Mark as ${status}`
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
