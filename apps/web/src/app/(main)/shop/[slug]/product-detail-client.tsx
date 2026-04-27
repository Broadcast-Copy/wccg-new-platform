"use client";

/**
 * Shop product detail + checkout. Phase B6.
 *
 * Three payment modes:
 *   - cash   → Stripe Checkout
 *   - points → instant WP debit (server validates balance + caps)
 *   - split  → 50/50 (cash + points)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ShoppingBag, Sparkles, Ticket, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { getListeningPoints, usePointsSync } from "@/hooks/use-listening-points";

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
  variants: Variant[];
}

type Mode = "cash" | "points" | "split";

export default function ProductDetailClient() {
  const params = useParams();
  const slug = (Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string)) ?? "";
  const [product, setProduct] = useState<Product | null>(null);
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
    apiClient<Product>(`/marketplace/products/${slug}`)
      .then((p) => {
        setProduct(p);
        // Pick the first variant by default if any.
        if (p.variants?.length) setVariantId(p.variants[0].id);
        // Default to whichever payment mode is supported.
        if (p.pointsPrice != null && p.cashPriceCents == null) setMode("points");
      })
      .catch((e) => setError(e.message));
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
      const r = await apiClient<{
        orderId: string;
        stripeUrl: string | null;
        totalPoints: number;
        redemptions: Array<{ qrCode: string }>;
      }>("/marketplace/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: [{ productSlug: product.slug, variantId, qty }],
          paymentMode: mode,
          fulfillment: product.kind === "merch" ? "ship" : "digital",
        }),
      });
      if (r.stripeUrl) {
        // Cash or split — redirect to Stripe.
        window.location.href = r.stripeUrl;
        return;
      }
      // Points-only — instant.
      setSuccess({
        orderId: r.orderId,
        stripeUrl: null,
        pointsAwarded: r.totalPoints,
        redemptions: r.redemptions,
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          {success && (
            <div className="rounded-2xl border border-[#74ddc7]/40 bg-[#74ddc7]/10 p-4">
              <p className="text-sm font-bold text-foreground">Order confirmed.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Order ID: <span className="font-mono">{success.orderId.slice(0, 8)}</span>
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
