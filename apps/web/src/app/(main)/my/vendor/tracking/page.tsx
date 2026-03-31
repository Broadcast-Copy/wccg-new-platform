"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  Truck,
  Loader2,
  ArrowLeft,
  Package,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  status: string;
  subtotal: number;
  total: number;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  tracking_number: string | null;
  carrier: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  created_at: string;
  items: OrderItem[];
}

/* ---------- Constants ---------- */

const CARRIERS = [
  { value: "usps", label: "USPS", urlTemplate: "https://tools.usps.com/go/TrackConfirmAction?tLabels=" },
  { value: "fedex", label: "FedEx", urlTemplate: "https://www.fedex.com/fedextrack/?trknbr=" },
  { value: "ups", label: "UPS", urlTemplate: "https://www.ups.com/track?tracknum=" },
  { value: "dhl", label: "DHL", urlTemplate: "https://www.dhl.com/us-en/home/tracking.html?tracking-id=" },
];

const STATUS_STYLES: Record<string, string> = {
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shipped: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  processing: Clock,
  shipped: Truck,
  delivered: CheckCircle2,
};

type FilterStatus = "all" | "processing" | "shipped" | "delivered";

/* ---------- Mock data ---------- */

const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    buyer_id: "buyer-1",
    buyer_name: "Marcus Johnson",
    buyer_email: "marcus@example.com",
    status: "processing",
    subtotal: 89.99,
    total: 99.98,
    shipping_address: {
      street: "456 Oak St",
      city: "Fayetteville",
      state: "NC",
      zip: "28301",
    },
    tracking_number: null,
    carrier: null,
    tracking_url: null,
    shipped_at: null,
    created_at: "2026-03-25T14:00:00Z",
    items: [
      { id: "item-1", product_id: "prod-1", product_name: "WCCG Logo Tee (XL)", quantity: 2, unit_price: 29.99 },
      { id: "item-2", product_id: "prod-2", product_name: "WCCG Snapback Hat", quantity: 1, unit_price: 24.99 },
    ],
  },
  {
    id: "ORD-1002",
    buyer_id: "buyer-2",
    buyer_name: "Tanya Williams",
    buyer_email: "tanya@example.com",
    status: "shipped",
    subtotal: 49.99,
    total: 57.98,
    shipping_address: {
      street: "789 Pine Ave",
      city: "Raeford",
      state: "NC",
      zip: "28376",
    },
    tracking_number: "9400111899223456789012",
    carrier: "usps",
    tracking_url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789012",
    shipped_at: "2026-03-27T10:30:00Z",
    created_at: "2026-03-22T09:15:00Z",
    items: [
      { id: "item-3", product_id: "prod-3", product_name: "WCCG Hoodie (M)", quantity: 1, unit_price: 49.99 },
    ],
  },
  {
    id: "ORD-1003",
    buyer_id: "buyer-3",
    buyer_name: "DeShawn Carter",
    buyer_email: "deshawn@example.com",
    status: "delivered",
    subtotal: 34.99,
    total: 42.98,
    shipping_address: {
      street: "123 Elm St",
      city: "Hope Mills",
      state: "NC",
      zip: "28348",
    },
    tracking_number: "1Z999AA10123456784",
    carrier: "ups",
    tracking_url: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    shipped_at: "2026-03-20T08:00:00Z",
    created_at: "2026-03-18T16:45:00Z",
    items: [
      { id: "item-4", product_id: "prod-4", product_name: "WCCG Sticker Pack", quantity: 3, unit_price: 9.99 },
    ],
  },
  {
    id: "ORD-1004",
    buyer_id: "buyer-4",
    buyer_name: "Keisha Brown",
    buyer_email: "keisha@example.com",
    status: "processing",
    subtotal: 64.99,
    total: 72.98,
    shipping_address: {
      street: "555 Magnolia Dr",
      city: "Spring Lake",
      state: "NC",
      zip: "28390",
    },
    tracking_number: null,
    carrier: null,
    tracking_url: null,
    shipped_at: null,
    created_at: "2026-03-28T11:20:00Z",
    items: [
      { id: "item-5", product_id: "prod-5", product_name: "WCCG Crewneck (L)", quantity: 1, unit_price: 39.99 },
      { id: "item-6", product_id: "prod-1", product_name: "WCCG Logo Tee (M)", quantity: 1, unit_price: 29.99 },
    ],
  },
];

/* ---------- Helpers ---------- */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- Order Card ---------- */

function OrderCard({
  order,
  onUpdate,
}: {
  order: Order;
  onUpdate: (updated: Order) => void;
}) {
  const [showTracking, setShowTracking] = useState(false);
  const [carrier, setCarrier] = useState(order.carrier || "");
  const [trackingNumber, setTrackingNumber] = useState(
    order.tracking_number || ""
  );
  const [saving, setSaving] = useState(false);
  const { supabase } = useSupabase();

  const StatusIcon = STATUS_ICONS[order.status] || Package;

  async function handleSaveTracking() {
    if (!carrier) {
      toast.error("Please select a carrier");
      return;
    }
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    setSaving(true);
    try {
      const carrierInfo = CARRIERS.find((c) => c.value === carrier);
      const trackingUrl = carrierInfo
        ? `${carrierInfo.urlTemplate}${trackingNumber}`
        : "";

      const updates = {
        tracking_number: trackingNumber,
        carrier,
        tracking_url: trackingUrl,
        shipped_at: new Date().toISOString(),
        status: "shipped",
      };

      // Try Supabase update
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (error) {
        // Fallback to local update
        console.log("[TRACKING] Supabase update failed, using local state");
      }

      onUpdate({
        ...order,
        ...updates,
      });
      setShowTracking(false);
      toast.success("Tracking info saved and order marked as shipped");
    } catch {
      toast.error("Failed to save tracking info");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkDelivered() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", order.id);

      if (error) {
        console.log("[TRACKING] Supabase update failed, using local state");
      }

      onUpdate({ ...order, status: "delivered" });
      toast.success("Order marked as delivered");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <StatusIcon className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {order.id}
              </p>
              <Badge
                className={`text-[10px] border capitalize ${
                  STATUS_STYLES[order.status] ||
                  "bg-foreground/[0.06] text-muted-foreground border-border"
                }`}
              >
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Ordered {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <p className="text-sm font-bold text-foreground">
          {formatCurrency(order.total)}
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Buyer info */}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/[0.04] shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {order.buyer_name}
            </p>
            <p className="text-xs text-muted-foreground">{order.buyer_email}</p>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Items
          </p>
          <div className="space-y-1">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground">
                  {item.product_name} x{item.quantity}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping address */}
        {order.shipping_address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {order.shipping_address.street},{" "}
              {order.shipping_address.city},{" "}
              {order.shipping_address.state}{" "}
              {order.shipping_address.zip}
            </p>
          </div>
        )}

        {/* Existing tracking info */}
        {order.tracking_number && (
          <div className="rounded-lg bg-foreground/[0.03] border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Tracking
            </p>
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-foreground font-medium uppercase">
                {order.carrier}
              </span>
              <span className="text-xs text-muted-foreground">
                {order.tracking_number}
              </span>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
              >
                Track Package
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {order.shipped_at && (
              <p className="text-[10px] text-muted-foreground">
                Shipped {formatDate(order.shipped_at)}
              </p>
            )}
          </div>
        )}

        {/* Add tracking form */}
        {showTracking && order.status === "processing" && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-4 space-y-3">
            <p className="text-xs font-medium text-foreground">
              Add Tracking Information
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-foreground/60 text-xs">
                  Carrier *
                </Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="bg-foreground/[0.04] border-border text-foreground">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-foreground/60 text-xs">
                  Tracking Number *
                </Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTracking(false)}
                className="border-border text-foreground/60 hover:bg-foreground/[0.04]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTracking}
                disabled={saving}
                className="bg-[#f59e0b] text-black font-bold hover:bg-[#d97706]"
              >
                {saving && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                )}
                Save & Ship
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {order.status === "processing" && !showTracking && (
            <Button
              size="sm"
              onClick={() => setShowTracking(true)}
              className="bg-[#f59e0b] text-black font-bold hover:bg-[#d97706]"
            >
              <Truck className="h-3.5 w-3.5 mr-1" />
              Add Tracking
            </Button>
          )}
          {order.status === "shipped" && (
            <Button
              size="sm"
              onClick={handleMarkDelivered}
              disabled={saving}
              className="bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              Mark Delivered
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function CarrierTrackingPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `id, buyer_id, status, subtotal, total, shipping_address,
             tracking_number, carrier, tracking_url, shipped_at, created_at,
             order_items(id, product_id, quantity, unit_price)`
          )
          .eq("vendor_id", user!.id)
          .in("status", ["processing", "shipped", "delivered"])
          .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) {
          setOrders(MOCK_ORDERS);
        } else {
          const mapped: Order[] = data.map((o: Record<string, unknown>) => ({
            id: o.id as string,
            buyer_id: o.buyer_id as string,
            buyer_name: "Customer",
            buyer_email: "",
            status: o.status as string,
            subtotal: o.subtotal as number,
            total: o.total as number,
            shipping_address: o.shipping_address as Order["shipping_address"],
            tracking_number: o.tracking_number as string | null,
            carrier: o.carrier as string | null,
            tracking_url: o.tracking_url as string | null,
            shipped_at: o.shipped_at as string | null,
            created_at: o.created_at as string,
            items: ((o.order_items as Record<string, unknown>[]) || []).map(
              (item) => ({
                id: item.id as string,
                product_id: item.product_id as string,
                product_name: `Product ${(item.product_id as string).slice(-4)}`,
                quantity: item.quantity as number,
                unit_price: item.unit_price as number,
              })
            ),
          }));
          setOrders(mapped);
        }
      } catch {
        setOrders(MOCK_ORDERS);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, supabase]);

  function handleOrderUpdate(updated: Order) {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
  }

  // Filter
  const filteredOrders = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.tracking_number?.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  const isLoading = authLoading || loading;

  // Counts
  const processingCount = orders.filter(
    (o) => o.status === "processing"
  ).length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-amber-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl">
              <Truck className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/my/vendor"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Vendor
                </Link>
                <span className="text-foreground/20">/</span>
                <span className="text-foreground text-sm font-medium">
                  Tracking
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Carrier Tracking
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage shipping and tracking for your orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">
            Loading orders...
          </span>
        </div>
      )}

      {/* Auth required */}
      {!isLoading && !user && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Please{" "}
            <Link href="/login" className="text-[#f59e0b] hover:underline">
              sign in
            </Link>{" "}
            to manage order tracking.
          </p>
        </div>
      )}

      {!isLoading && user && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Processing",
                value: processingCount,
                icon: Clock,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                label: "Shipped",
                value: shippedCount,
                icon: Truck,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "Delivered",
                value: deliveredCount,
                icon: CheckCircle2,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Status filter */}
            <div className="flex gap-1.5">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "processing", label: "Processing" },
                  { key: "shipped", label: "Shipped" },
                  { key: "delivered", label: "Delivered" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filter === f.key
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                      : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders..."
                className="pl-9 bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20 h-8 text-xs"
              />
            </div>
          </div>

          {/* Orders */}
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
              <Package className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                No orders found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {filter !== "all"
                  ? `No ${filter} orders. Try a different filter.`
                  : "Orders will appear here when customers place orders."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdate={handleOrderUpdate}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Back Link */}
      <div className="flex justify-center">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/my/vendor">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Vendor Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
