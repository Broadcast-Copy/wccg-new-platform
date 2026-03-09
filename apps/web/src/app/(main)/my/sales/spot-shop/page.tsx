"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  Clock,
  Radio,
  Zap,
} from "lucide-react";
import { useSpotCart } from "@/hooks/use-spot-cart";
import {
  DAYPARTS,
  DAYPART_DESCRIPTIONS,
  DAYPART_COLORS,
  formatCurrency,
  formatHour,
  type DaypartId,
} from "@/lib/sales-shared";

// ---------------------------------------------------------------------------
// Spot Shop Page
// ---------------------------------------------------------------------------

export default function SpotShopPage() {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateRate,
    clearCart,
    itemCount,
    totalSpots,
    cartSubtotal,
    isCartOpen,
    setCartOpen,
  } = useSpotCart();

  // Per-card local state for quantity and rate before adding to cart
  const [quantities, setQuantities] = useState<Record<DaypartId, number>>(
    () =>
      Object.fromEntries(
        DAYPARTS.map((dp) => [dp.id, 10])
      ) as Record<DaypartId, number>
  );
  const [rates, setRates] = useState<Record<DaypartId, number>>(
    () =>
      Object.fromEntries(
        DAYPARTS.map((dp) => [dp.id, dp.defaultRate])
      ) as Record<DaypartId, number>
  );

  const hasCartItems = itemCount > 0;

  function handleQuantityChange(daypartId: DaypartId, value: number) {
    setQuantities((prev) => ({
      ...prev,
      [daypartId]: Math.max(1, value),
    }));
  }

  function handleRateChange(daypartId: DaypartId, value: number) {
    setRates((prev) => ({
      ...prev,
      [daypartId]: Math.max(0, value),
    }));
  }

  function handleAddOrUpdate(daypartId: DaypartId) {
    const inCart = items.find((i) => i.daypartId === daypartId);
    if (inCart) {
      updateQuantity(daypartId, quantities[daypartId]);
      updateRate(daypartId, rates[daypartId]);
    } else {
      addItem(daypartId, quantities[daypartId]);
      updateRate(daypartId, rates[daypartId]);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={`min-h-screen space-y-8 ${hasCartItems ? "pb-20" : ""}`}>
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/my/sales"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sales Portal
          </Link>

          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-[#74ddc7]" />
            Spot Shop
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Browse and add ad spots to your cart for quick purchasing.
          </p>
        </div>

        {/* Cart badge button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#74ddc7] px-1.5 text-xs font-bold text-[#0a0a0f]">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Info Banner                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-[#74ddc7]/5 border border-[#74ddc7]/20 rounded-xl p-4 flex items-start gap-3">
        <Zap className="h-5 w-5 text-[#74ddc7] mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Quick buy workflow:</span>{" "}
          Select dayparts below, set your rate and quantity, then add to cart.
          Proceed to checkout to assign a client and flight dates.
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Daypart Cards Grid                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DAYPARTS.map((dp) => {
          const colors = DAYPART_COLORS[dp.id];
          const description = DAYPART_DESCRIPTIONS[dp.id];
          const inCart = items.find((i) => i.daypartId === dp.id);
          const qty = quantities[dp.id];
          const rate = rates[dp.id];
          const weeklySubtotal = rate * qty;

          return (
            <div
              key={dp.id}
              className="rounded-xl border border-border bg-card p-5 space-y-4 flex flex-col"
            >
              {/* Top accent stripe */}
              <div
                className={`h-1.5 w-16 rounded-full ${colors.bg} ${colors.border} border`}
                aria-hidden
              />

              {/* Daypart name + time */}
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${colors.text}`} />
                  {dp.label}
                </h2>
                <p className={`text-sm font-medium ${colors.text}`}>
                  {formatHour(dp.startHour)} &ndash; {formatHour(dp.endHour)}
                </p>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Rate input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Rate / Spot
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={rate}
                    onChange={(e) =>
                      handleRateChange(dp.id, Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 focus:border-[#74ddc7]/60 transition-colors"
                  />
                </div>
              </div>

              {/* Quantity input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Spots / Week
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) =>
                    handleQuantityChange(dp.id, Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 focus:border-[#74ddc7]/60 transition-colors"
                />
              </div>

              {/* Weekly subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Weekly subtotal</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(weeklySubtotal)}
                </span>
              </div>

              {/* Spacer to push button to bottom */}
              <div className="flex-1" />

              {/* Add to Cart / Update button */}
              {inCart ? (
                <button
                  onClick={() => handleAddOrUpdate(dp.id)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  In Cart &mdash; Update
                </button>
              ) : (
                <button
                  onClick={() => handleAddOrUpdate(dp.id)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#74ddc7] text-[#0a0a0f] px-4 py-2.5 text-sm font-semibold hover:bg-[#74ddc7]/90 transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Sticky Bottom Bar                                                 */}
      {/* ----------------------------------------------------------------- */}
      {hasCartItems && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            {/* Summary */}
            <div className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4 text-[#74ddc7]" />
              <span className="text-foreground font-medium">
                {itemCount} item{itemCount !== 1 ? "s" : ""} in cart
              </span>
              <span className="text-muted-foreground">&mdash;</span>
              <span className="text-muted-foreground">
                Weekly subtotal:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(cartSubtotal)}
                </span>
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCartOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                View Cart
              </button>
              <Link
                href="/my/sales/spot-shop/checkout"
                className="inline-flex items-center gap-2 rounded-lg bg-[#74ddc7] text-[#0a0a0f] px-5 py-2 text-sm font-semibold hover:bg-[#74ddc7]/90 transition-colors"
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
