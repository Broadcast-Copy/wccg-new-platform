"use client";

import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useSpotCart } from "@/hooks/use-spot-cart";
import { formatCurrency, formatHour } from "@/lib/sales-shared";
import Link from "next/link";

export function SpotCartDrawer() {
  const router = useRouter();
  const {
    items,
    removeItem,
    updateQuantity,
    updateRate,
    clearCart,
    itemCount,
    cartSubtotal,
    isCartOpen,
    setCartOpen,
  } = useSpotCart();

  function handleCheckout() {
    setCartOpen(false);
    router.push("/my/sales/spot-shop/checkout");
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col border-border bg-card p-0"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5 text-[#74ddc7]" />
            Spot Cart
            {itemCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#74ddc7] px-1.5 text-[10px] font-bold text-[#0a0a0f]">
                {itemCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/[0.04]">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Your spot cart is empty
            </p>
            <Link
              href="/my/sales/spot-shop"
              onClick={() => setCartOpen(false)}
              className="flex items-center gap-1 text-sm font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors"
            >
              Browse Spot Shop <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.daypartId}
                    className="rounded-lg border border-border bg-background/50 p-4"
                  >
                    {/* Daypart name + remove */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {item.label}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatHour(item.startHour)} –{" "}
                          {formatHour(item.endHour)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.daypartId)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${item.label}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Rate + Quantity */}
                    <div className="flex items-end gap-4">
                      {/* Rate */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                          Rate/Spot
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <input
                            type="number"
                            min={0}
                            value={item.rate}
                            onChange={(e) =>
                              updateRate(
                                item.daypartId,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-20 rounded-md border border-border bg-background pl-6 pr-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                          />
                        </div>
                      </div>

                      {/* Quantity stepper */}
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                          Spots/Wk
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.daypartId,
                                item.quantity - 1
                              )
                            }
                            disabled={item.quantity <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-foreground/5 disabled:opacity-30 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.daypartId,
                                Number(e.target.value) || 1
                              )
                            }
                            className="w-12 rounded-md border border-border bg-background px-1 py-1.5 text-center text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                          />
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.daypartId,
                                item.quantity + 1
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-foreground/5 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Line total */}
                      <div className="ml-auto text-right pb-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Weekly
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(item.rate * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Weekly Subtotal ({itemCount} daypart
                  {itemCount !== 1 ? "s" : ""})
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(cartSubtotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Final total calculated at checkout with flight dates and tax.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-foreground/[0.04] transition-colors"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handleCheckout}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
                >
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
