"use client";

/**
 * Shop — WCCG Marketplace storefront. Phase B6.
 *
 * The new hybrid cash + WP catalog. Distinct from /marketplace (legacy vendor
 * directory) and /deals (local-business deals page) — those stay as-is.
 * Each card shows BOTH prices so listeners see what they can already afford.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ShoppingBag, Ticket, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getListeningPoints, usePointsSync } from "@/hooks/use-listening-points";

interface Product {
  id: string;
  slug: string;
  title: string;
  kind: "merch" | "ticket" | "experience" | "deal";
  coverUrl: string | null;
  cashPriceCents: number | null;
  pointsPrice: number | null;
  stock: number | null;
}

const KINDS: Array<{ id: "all" | Product["kind"]; label: string }> = [
  { id: "all", label: "All" },
  { id: "merch", label: "Merch" },
  { id: "ticket", label: "Tickets" },
  { id: "experience", label: "Experiences" },
  { id: "deal", label: "Local Deals" },
];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"all" | Product["kind"]>("all");

  const [points, setPoints] = useState(0);
  usePointsSync(() => setPoints(getListeningPoints()));
  useEffect(() => setPoints(getListeningPoints()), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (kind !== "all") params.set("kind", kind);
    params.set("limit", "60");
    apiClient<Product[]>(`/marketplace/products?${params}`)
      .then((r) => {
        if (!cancelled) setProducts(r);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            WCCG Shop
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Spend WP, cash, or both. Merch, tickets, experiences, and local deals from WCCG and our partners.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
          <Sparkles className="h-4 w-4 text-[#74ddc7]" />
          <span className="font-bold tabular-nums">{points.toLocaleString()}</span>
          <span className="text-muted-foreground">WP available</span>
        </div>
      </header>

      <div className="flex w-fit flex-wrap gap-1 rounded-full bg-muted p-0.5 text-xs">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
              kind === k.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-base text-muted-foreground">
            Nothing here yet — vendors are loading deals. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} userPoints={points} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, userPoints }: { product: Product; userPoints: number }) {
  const Icon =
    product.kind === "ticket"
      ? Ticket
      : product.kind === "experience"
        ? Star
        : ShoppingBag;
  const canAffordWP = product.pointsPrice != null && userPoints >= product.pointsPrice;
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-input hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.coverUrl} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
          <Icon className="h-3 w-3" /> {product.kind}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-bold text-foreground group-hover:text-[#74ddc7]">
          {product.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            {product.cashPriceCents != null && (
              <p className="text-base font-black text-foreground">
                ${(product.cashPriceCents / 100).toFixed(2)}
              </p>
            )}
            {product.pointsPrice != null && (
              <p className={`text-xs font-bold ${canAffordWP ? "text-[#74ddc7]" : "text-muted-foreground"}`}>
                or {product.pointsPrice.toLocaleString()} WP
              </p>
            )}
          </div>
          {canAffordWP && (
            <span className="rounded-full bg-[#74ddc7]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">
              You can afford
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
