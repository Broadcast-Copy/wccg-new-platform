"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import {
  ShoppingBag,
  Search,
  Shield,
  Tag,
  Heart,
  Gift,
  Coins,
  ChevronRight,
  Usb,
  Shirt,
  Droplets,
  Headphones,
  Dumbbell,
  Package,
  MapPin,
  Award,
  Star,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface VendorProduct {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  status: string;
  token_eligible: boolean;
  gift_card_eligible: boolean;
  image_url: string | null;
  created_at: string;
  vendorName: string;
}

/* ------------------------------------------------------------------ */
/* Hero Slides                                                         */
/* ------------------------------------------------------------------ */

const HERO_SLIDES = [
  {
    image: "/images/marketplace/bag-promo.png",
    title: "Classic 104.5 FM Duffle Bag",
    subtitle: "Fresh design when you travel",
  },
  {
    image: "/images/marketplace/shirt-slide-1.png",
    title: "Classic Hip Hop Shirt",
    subtitle: "Available with Listener Points",
  },
  {
    image: "/images/marketplace/male-headphones.png",
    title: "104.5 FM Headphones",
    subtitle: "New Drops for 2026",
  },
];

/* ------------------------------------------------------------------ */
/* Hot Categories                                                      */
/* ------------------------------------------------------------------ */

const HOT_CATEGORIES = [
  { name: "Flash Drives", image: "/images/marketplace/hot-categories/usbdrive.png", gradient: "from-indigo-500 to-blue-600" },
  { name: "Tank Tops", image: "/images/marketplace/hot-categories/tanktop.png", gradient: "from-emerald-500 to-green-600" },
  { name: "Water Bottles", image: "/images/marketplace/hot-categories/waterbottle.png", gradient: "from-sky-500 to-blue-600" },
  { name: "Hoodies", image: "/images/marketplace/hot-categories/hoodie.png", gradient: "from-violet-500 to-purple-600" },
  { name: "Outdoors & Sports", image: "/images/marketplace/hot-categories/skigoggles.png", gradient: "from-orange-500 to-red-600" },
  { name: "Snap Backs", image: "/images/marketplace/hot-categories/hat.png", gradient: "from-amber-500 to-orange-600" },
  { name: "Sweatshirts", image: "/images/marketplace/hot-categories/sweatshirt.png", gradient: "from-rose-500 to-pink-600" },
];

// Map product categories to images for product cards
const CATEGORY_IMAGES: Record<string, string> = {
  "Bags": "/images/marketplace/bag-promo.png",
  "Apparel": "/images/marketplace/shirt-slide-1.png",
  "Electronics": "/images/marketplace/male-headphones.png",
  "Water Bottles": "/images/marketplace/hot-categories/waterbottle.png",
  "Hoodies": "/images/marketplace/hot-categories/hoodie.png",
  "Snap Backs": "/images/marketplace/hot-categories/hat.png",
  "Tank Tops": "/images/marketplace/hot-categories/tanktop.png",
  "Sweatshirts": "/images/marketplace/hot-categories/sweatshirt.png",
  "Flash Drives": "/images/marketplace/hot-categories/usbdrive.png",
  "Outdoors & Sports": "/images/marketplace/hot-categories/skigoggles.png",
};

/* ------------------------------------------------------------------ */
/* Trust Bar Items                                                     */
/* ------------------------------------------------------------------ */

const TRUST_ITEMS = [
  { icon: MapPin, title: "Local & Exclusive" },
  { icon: Shield, title: "Quality Assured" },
  { icon: Star, title: "Listener Points" },
  { icon: Users, title: "Support Local" },
];

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function MarketplacePage() {
  const { supabase } = useSupabase();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Fetch products + vendor names ---- */
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);

      const { data: rawProducts, error } = await supabase
        .from("vendor_products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error || !rawProducts || rawProducts.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Collect unique vendor IDs
      const vendorIds = [...new Set(rawProducts.map((p: any) => p.vendor_id))];

      // Fetch vendor display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", vendorIds);

      const vendorMap: Record<string, string> = {};
      if (profiles) {
        for (const p of profiles) {
          vendorMap[p.id] = p.display_name || "Unknown Vendor";
        }
      }

      const enriched: VendorProduct[] = rawProducts.map((p: any) => ({
        ...p,
        vendorName: vendorMap[p.vendor_id] || "Unknown Vendor",
      }));

      setProducts(enriched);
      setLoading(false);
    }

    fetchProducts();
  }, [supabase]);

  /* ---- Hero auto-advance ---- */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  function goToSlide(index: number) {
    setCurrentSlide(index);
    resetTimer();
  }

  /* ---- Derived categories from product data ---- */
  const categoryPills = [
    "All",
    ...Array.from(
      new Set(products.map((p) => p.category).filter(Boolean) as string[])
    ),
  ];

  /* ---- Filtered products ---- */
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  /* ---- Category click from hot categories grid ---- */
  function handleHotCategory(name: string) {
    setSelectedCategory(name);
    document
      .getElementById("products-section")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      {/* ============================================================ */}
      {/* Hero Slider                                                   */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="relative h-[320px] sm:h-[400px] lg:h-[480px]">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === currentSlide
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Background image */}
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              {/* Text content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 px-6 text-center text-white">
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl drop-shadow-lg">
                  {slide.title}
                </h2>
                <p className="mt-2 text-base text-white/80 sm:text-lg">
                  {slide.subtitle}
                </p>
                <button
                  onClick={() =>
                    document
                      .getElementById("products-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
                >
                  Shop Now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                index === currentSlide
                  ? "bg-amber-500 w-6"
                  : "bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Hot Categories Grid                                           */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Hot Categories</h2>
        <div className="flex flex-wrap gap-3">
          {HOT_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleHotCategory(cat.name)}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-3 transition-all hover:border-amber-500/40 hover:shadow-md w-[100px]"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${cat.gradient} overflow-hidden transition-transform group-hover:scale-110`}>
                  <img src={cat.image} alt={cat.name} className="h-12 w-12 object-contain" />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">{cat.name}</span>
              </button>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Search + Category Filter Bar                                  */}
      {/* ============================================================ */}
      <section id="products-section" className="space-y-6">
        {/* Search input */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {categoryPills.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "border-amber-500 bg-amber-500 text-black"
                  : "border-border bg-background text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ========================================================== */}
        {/* Product Grid                                                */}
        {/* ========================================================== */}
        {loading ? (
          /* Loading skeleton */
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <div className="h-48 animate-pulse bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                    <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold">No products found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or selecting a different category.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-4 text-sm font-medium text-amber-500 hover:text-amber-400"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Product cards */
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg"
              >
                {/* Product image */}
                <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  {(product.image_url || (product.category && CATEGORY_IMAGES[product.category])) ? (
                    <img
                      src={product.image_url || CATEGORY_IMAGES[product.category!]}
                      alt={product.name}
                      className="h-full w-full object-contain p-4 transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {product.category && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium text-white">
                      {product.category}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="space-y-2 p-4">
                  <h3 className="font-bold leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    by {product.vendorName}
                  </p>
                  <p className="text-lg font-bold text-amber-500">
                    ${product.price.toFixed(2)}
                  </p>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1.5">
                    {product.token_eligible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                        <Coins className="h-3 w-3" />
                        Token Eligible
                      </span>
                    )}
                    {product.gift_card_eligible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                        <Gift className="h-3 w-3" />
                        Gift Card
                      </span>
                    )}
                  </div>

                  {/* View Store link */}
                  <Link
                    href={`/vendors?id=${product.vendor_id}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
                  >
                    View Store
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* Trust Bar                                                     */}
      {/* ============================================================ */}
      <section className="rounded-xl border bg-muted/50 p-6 sm:p-8">
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold">{item.title}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
