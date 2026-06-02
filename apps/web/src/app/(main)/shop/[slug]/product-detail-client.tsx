"use client";

/**
 * Shop product detail + checkout. Phase B6.
 *
 * Data layer: queries Supabase directly (no API server).
 *   - Product comes from `vendor_products`, keyed by `id` (the `[slug]` route
 *     param carries the product id — there is no slug column). Price is stored
 *     in dollars and shown as cents in the existing UI.
 *   - Reviews come from `product_reviews` (public read).
 *
 * Checkout: there is NO payment processor wired up. Checking out records the
 * intent — it inserts an `orders` row (status 'pending') plus `order_items`
 * for the cart — and tells the buyer payment will be collected separately.
 * Ordering requires a signed-in user (orders.buyer_id is gated by RLS), so the
 * button prompts sign-in when there is no session.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ShoppingBag, Sparkles, Ticket, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { getListeningPoints, usePointsSync } from "@/hooks/use-listening-points";

const supabase = createClient();

interface Variant {
  id: string;
  name: string;
  cashPriceCents: number | null;
  pointsPrice: number | null;
  stock: number | null;
}

interface Product {
  id: string;
  slug: string;
  title: string;
  kind: "merch" | "ticket" | "experience" | "deal";
  description: string | null;
  coverUrl: string | null;
  cashPriceCents: number | null;
  pointsPrice: number | null;
  stock: number | null;
  vendorId: string;
  variants: Variant[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** Row shape as returned from `vendor_products`. */
interface VendorProductRow {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  inventory: number | null;
}

type Mode = "cash" | "points" | "split";

function mapProduct(row: VendorProductRow): Product {
  return {
    id: row.id,
    slug: row.id,
    title: row.name,
    kind: "merch",
    description: row.description,
    coverUrl: row.image_url,
    cashPriceCents: row.price != null ? Math.round(Number(row.price) * 100) : null,
    pointsPrice: null,
    stock: row.inventory,
    vendorId: row.vendor_id,
    variants: [], // catalog has no variants
  };
}

export default function ProductDetailClient() {
  const params = useParams();
  const slug = (Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string)) ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [variantId, setVariantId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<Mode>("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderId: string;
    stripeUrl: string | null;
    pointsAwarded?: number;
    redemptions: Array<{ qrCode: string }>;
  } | null>(null);

  const [points, setPoints] = useState(0);
  usePointsSync(() => setPoints(getListeningPoints()));
  useEffect(() => setPoints(getListeningPoints()), []);

  useEffect(() => {
    if (!slug || slug === "_placeholder") return;
    let cancelled = false;

    supabase
      .from("vendor_products")
      .select("id, vendor_id, name, description, price, image_url, inventory")
      .eq("id", slug)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError(err ? "We couldn't load this product." : "Product not found.");
          return;
        }
        const p = mapProduct(data as VendorProductRow);
        setProduct(p);
        // Pick the first variant by default if any.
        if (p.variants?.length) setVariantId(p.variants[0].id);
        // Default to whichever payment mode is supported.
        if (p.pointsPrice != null && p.cashPriceCents == null) setMode("points");
      });

    supabase
      .from("product_reviews")
      .select("id, rating, comment, created_at")
      .eq("product_id", slug)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) setReviews((data ?? []) as Review[]);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error && !product)
    return (
      <div className="space-y-3 py-8">
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to shop
        </Link>
      </div>
    );
  if (!product) return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;

  const variant = product.variants.find((v) => v.id === variantId);
  const cashUnit = variant?.cashPriceCents ?? product.cashPriceCents;
  const pointsUnit = variant?.pointsPrice ?? product.pointsPrice;
  const cashLine = cashUnit != null ? cashUnit * qty : null;
  const pointsLine = pointsUnit != null ? pointsUnit * qty : null;

  const Icon =
    product.kind === "ticket" ? Ticket : product.kind === "experience" ? Star : ShoppingBag;

  const checkout = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      // Ordering is gated on a signed-in user (orders.buyer_id RLS).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in to place your order.");
        return;
      }

      const unitPrice = cashUnit != null ? cashUnit / 100 : 0; // dollars
      const lineTotal = unitPrice * qty;

      // No payment processor: record the order as 'pending' and collect
      // payment separately. We do NOT call any payment API.
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          vendor_id: product.vendorId,
          status: "pending",
          subtotal: lineTotal,
          total: lineTotal,
          payment_method: "pending",
          notes: "Placed via WCCG Shop. Payment to be collected separately (online payments coming soon).",
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        throw new Error(orderErr?.message ?? "Could not place your order.");
      }

      const { error: itemErr } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: product.id,
        name: product.title,
        quantity: qty,
        unit_price: unitPrice,
        total: lineTotal,
      });

      if (itemErr) {
        throw new Error(itemErr.message);
      }

      setSuccess({
        orderId: order.id,
        stripeUrl: null,
        redemptions: [],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="space-y-8">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card aspect-square">
          {product.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.coverUrl} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Icon className="h-3 w-3" /> {product.kind}
            </span>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              {product.title}
            </h1>
          </div>
          {product.description && (
            <p className="text-base text-muted-foreground">{product.description}</p>
          )}

          {product.variants.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Variant
              </label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
            />
          </div>

          {/* Payment mode toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Pay with
            </label>
            <div className="flex gap-2">
              {cashUnit != null && (
                <ModeButton current={mode} mode="cash" onClick={() => setMode("cash")}>
                  Cash · ${(cashLine! / 100).toFixed(2)}
                </ModeButton>
              )}
              {pointsUnit != null && (
                <ModeButton
                  current={mode}
                  mode="points"
                  disabled={pointsLine != null && pointsLine > points}
                  onClick={() => setMode("points")}
                >
                  WP · {pointsLine!.toLocaleString()}
                </ModeButton>
              )}
              {cashUnit != null && pointsUnit != null && (
                <ModeButton current={mode} mode="split" onClick={() => setMode("split")}>
                  Split
                </ModeButton>
              )}
            </div>
            {mode === "points" && pointsLine! > points && (
              <p className="text-xs text-red-500">
                You need {(pointsLine! - points).toLocaleString()} more WP.
              </p>
            )}
          </div>

          <Button
            size="lg"
            disabled={busy}
            onClick={checkout}
            className="w-full rounded-full bg-[#dc2626] text-base font-black text-white hover:bg-[#b91c1c] disabled:opacity-60"
          >
            {busy ? "Processing…" : "Check out"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Online payments are coming soon. Place your order now and our team will reach out to
            collect payment and arrange fulfillment.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {success && (
            <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/10 p-4">
              <p className="text-sm font-bold text-foreground">Order placed.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Order ID: <span className="font-mono">{success.orderId.slice(0, 8)}</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Payment will be collected separately — online checkout is coming soon. We&apos;ll
                follow up to finalize your order.
              </p>
              {success.redemptions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Redemption codes
                  </p>
                  <ul className="space-y-0.5 font-mono text-xs">
                    {success.redemptions.map((r) => (
                      <li key={r.qrCode}>{r.qrCode}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[#74ddc7]" />
            You have <span className="font-bold tabular-nums text-foreground">{points.toLocaleString()}</span> WP
          </div>
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-lg font-black tracking-tight text-foreground">Reviews</h2>
          <ul className="space-y-3">
            {reviews.map((rev) => (
              <li key={rev.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-1 text-[#74ddc7]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-current" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                {rev.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{rev.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function ModeButton({
  current,
  mode,
  onClick,
  disabled,
  children,
}: {
  current: Mode;
  mode: Mode;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
        current === mode
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
