"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Package,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface CartItem {
  productId: string;
  vendorId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const CART_KEY = "wccg_cart";
const DEFAULT_PLATFORM_FEE_RATE = 0.08;
const DEFAULT_SHIPPING = 5.99;

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function CheckoutPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [platformFeeRate, setPlatformFeeRate] = useState(DEFAULT_PLATFORM_FEE_RATE);
  const [vendorShipping, setVendorShipping] = useState<Record<string, number>>({});
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ---- Load cart from localStorage ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        setCart(parsed);
      }
    } catch {
      setCart([]);
    }
  }, []);

  /* ---- Sync cart back to localStorage ---- */
  function persistCart(items: CartItem[]) {
    setCart(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  /* ---- Fetch platform fee rate ---- */
  useEffect(() => {
    async function fetchFee() {
      const { data } = await supabase
        .from("platform_fees")
        .select("rate")
        .eq("fee_type", "marketplace")
        .single();
      if (data?.rate) {
        setPlatformFeeRate(Number(data.rate));
      }
    }
    fetchFee();
  }, [supabase]);

  /* ---- Fetch vendor shipping rates ---- */
  useEffect(() => {
    if (cart.length === 0) return;
    const vendorIds = [...new Set(cart.map((i) => i.vendorId))];

    async function fetchShipping() {
      const { data } = await supabase
        .from("vendor_shipping")
        .select("vendor_id, shipping_cost")
        .in("vendor_id", vendorIds);
      if (data) {
        const map: Record<string, number> = {};
        for (const row of data) {
          map[row.vendor_id] = Number(row.shipping_cost);
        }
        setVendorShipping(map);
      }
    }
    fetchShipping();
  }, [supabase, cart]);

  /* ---- Cart helpers ---- */
  function updateQuantity(productId: string, delta: number) {
    const updated = cart
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
      .filter((item) => item.quantity > 0);
    persistCart(updated);
  }

  function removeItem(productId: string) {
    persistCart(cart.filter((item) => item.productId !== productId));
  }

  /* ---- Calculations ---- */
  const vendorGroups = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
    if (!acc[item.vendorId]) acc[item.vendorId] = [];
    acc[item.vendorId].push(item);
    return acc;
  }, {});

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const platformFee = subtotal * platformFeeRate;

  const totalShipping = Object.keys(vendorGroups).reduce((sum, vendorId) => {
    return sum + (vendorShipping[vendorId] ?? DEFAULT_SHIPPING);
  }, 0);

  const total = subtotal + platformFee + totalShipping;

  /* ---- Place Order ---- */
  async function handlePlaceOrder() {
    if (!user) return;

    const { name, address, city, state, zip } = shippingAddress;
    if (!name || !address || !city || !state || !zip) {
      setError("Please fill in all shipping address fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const createdOrderIds: string[] = [];

    try {
      for (const [vendorId, items] of Object.entries(vendorGroups)) {
        const vendorSubtotal = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const vendorPlatformFee = vendorSubtotal * platformFeeRate;
        const vendorShippingCost = vendorShipping[vendorId] ?? DEFAULT_SHIPPING;
        const vendorTotal = vendorSubtotal + vendorPlatformFee + vendorShippingCost;

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            vendor_id: vendorId,
            subtotal: vendorSubtotal,
            platform_fee: vendorPlatformFee,
            shipping_cost: vendorShippingCost,
            total: vendorTotal,
            shipping_address: shippingAddress,
            status: "pending",
          })
          .select("id")
          .single();

        if (orderError || !order) {
          throw new Error(orderError?.message ?? "Failed to create order");
        }

        createdOrderIds.push(order.id);

        const orderItems = items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }

      // Clear cart
      localStorage.removeItem(CART_KEY);
      setCart([]);
      setOrderIds(createdOrderIds);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong placing your order.");
    } finally {
      setSubmitting(false);
    }
  }

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
        <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to checkout</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You need to be logged in to place an order.
        </p>
        <Link
          href="/login"
          className="mt-4 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          Sign In
        </Link>
      </div>
    );
  }

  /* ---- Success state ---- */
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle className="h-16 w-16 text-teal-500" />
        <h2 className="mt-4 text-2xl font-bold">Order Placed!</h2>
        <p className="mt-2 text-muted-foreground">
          Your {orderIds.length > 1 ? "orders have" : "order has"} been placed
          successfully.
        </p>
        <div className="mt-4 space-y-1">
          {orderIds.map((id) => (
            <p key={id} className="text-sm font-mono text-teal-600">
              Order #{id.slice(0, 8)}
            </p>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <Link
            href="/my/orders"
            className="rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
          >
            View Orders
          </Link>
          <Link
            href="/marketplace"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Empty cart ---- */
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the marketplace to find something you love.
        </p>
        <Link
          href="/marketplace"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Marketplace
        </Link>
      </div>
    );
  }

  /* ---- Main checkout ---- */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground">
          Review your order and complete your purchase
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Cart Items (left) ---- */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">
            Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
          </h2>

          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 rounded-xl border bg-card p-4"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.price.toFixed(2)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="w-20 text-right font-semibold text-sm">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-500 transition-colors hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* ---- Shipping Address ---- */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Shipping Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  value={shippingAddress.name}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="John Doe"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Address</label>
                <input
                  type="text"
                  value={shippingAddress.address}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      address: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">City</label>
                <input
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, city: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="Durham"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">State</label>
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        state: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="NC"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">ZIP</label>
                  <input
                    type="text"
                    value={shippingAddress.zip}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        zip: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="27701"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Order Summary (right) ---- */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Platform Fee ({(platformFeeRate * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping ({Object.keys(vendorGroups).length} vendor
                  {Object.keys(vendorGroups).length > 1 ? "s" : ""})
                </span>
                <span className="font-medium">${totalShipping.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-teal-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full rounded-lg bg-teal-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Place Order"
              )}
            </button>

            <Link
              href="/marketplace"
              className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
