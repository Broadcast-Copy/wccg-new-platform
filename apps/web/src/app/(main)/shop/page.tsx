"use client";

/**
 * Shop — WCCG Marketplace storefront. Phase B6.
 *
 * The new hybrid cash + WP catalog. Distinct from /marketplace (legacy vendor
 * directory) and /deals (local-business deals page) — those stay as-is.
 * Each card shows BOTH prices so listeners see what they can already afford.
 *
 * Data layer: queries Supabase `vendor_products` directly (no API server).
 * Products are keyed by `id` (there is no slug column); the detail route uses
 * that id as its `[slug]` param. Prices are stored as dollars (numeric) and
 * converted to cents for the existing UI. There is no per-product WP price
 * column, so `pointsPrice` is left null and the WP balance display stays for
 * context only.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ShoppingBag, Ticket, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getListeningPoints, usePointsSync } from "@/hooks/use-listening-points";

const supabase = createClient();

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

/** Row shape as returned from `vendor_products`. */
interface VendorProductRow {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  image_url: string | null;
  inventory: number | null;
  status: string | null;
}

const ALL = "all";

function mapProduct(row: VendorProductRow): Product {
  return {
    id: row.id,
    slug: row.id, // no slug column — the detail route keys off id
    title: row.name,
    kind: "merch", // catalog is physical merch; drives the card icon only
    coverUrl: row.image_url,
    cashPriceCents: row.price != null ? Math.round(Number(row.price) * 100) : null,
    pointsPrice: null, // no WP price column in the catalog
    stock: row.inventory,
  };
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<string>(ALL);

  // Points start at 0 to match prerendered/hydrated markup (avoids a static-
  // export hydration mismatch), then read from the synchronous store after
  // mount. Deferred to a microtask so it is not a synchronous setState in the
  // effect body.
  const [points, setPoints] = useState(0);
  usePointsSync(() => setPoints(getListeningPoints()));
  useEffect(() => {
    queueMicrotask(() => setPoints(getListeningPoints()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Deferred so these resets are not synchronous setState in the effect body.
    // Behavior-neutral: loading already starts true on mount and this only
    // re-shows the loading/clears the error a microtask earlier than the fetch.
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    let query = supabase
      .from("vendor_products")
      .select("id, name, price, category, image_url, inventory, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);

    if (kind !== ALL) query = query.eq("category", kind);

    query.then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        setError("We couldn't load the shop right now. Please try again shortly.");
        setProducts([]);
      } else {
        const rows = (data ?? []) as VendorProductRow[];
        setProducts(rows.map(mapProduct));
        // Build the filter pills from the categories actually present.
        if (kind === ALL) {
          const cats = Array.from(
            new Set(rows.map((r) => r.category).filter((c): c is string => !!c)),
          ).sort();
          setCategories(cats);
        }
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  const pills: Array<{ id: string; label: string }> = [
    { id: ALL, label: "All" },
    ...categories.map((c) => ({ id: c, label: c })),
  ];

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
        {pills.map((k) => (
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
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-base text-muted-foreground">{error}</p>
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
