import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Search,
  Star,
  ShoppingCart,
  Zap,
  Shield,
  Tag,
  Headset,
  Shirt,
  Droplets,
  Headphones,
  Gift,
  Sticker,
  Package,
  Dumbbell,
  Usb,
} from "lucide-react";

export const metadata = {
  title: "Marketplace | WCCG 104.5 FM",
};

/* ------------------------------------------------------------------ */
/* Mock Data                                                           */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  gradient: string;
  icon: string;
  pointsEligible: boolean;
  category: string;
  badge?: string;
}

const CATEGORIES = [
  { name: "All", slug: "all" },
  { name: "Apparel", slug: "apparel" },
  { name: "Accessories", slug: "accessories" },
  { name: "Drinkware", slug: "drinkware" },
  { name: "Tech", slug: "tech" },
  { name: "Stickers & Prints", slug: "stickers" },
  { name: "Gift Cards", slug: "gift-cards" },
  { name: "Bundles", slug: "bundles" },
] as const;

const HOT_CATEGORIES = [
  {
    name: "Hoodies",
    icon: "hoodie",
    gradient: "from-violet-500 to-purple-600",
    count: 8,
  },
  {
    name: "Snap Backs",
    icon: "cap",
    gradient: "from-amber-500 to-orange-600",
    count: 12,
  },
  {
    name: "Water Bottles",
    icon: "bottle",
    gradient: "from-sky-500 to-blue-600",
    count: 5,
  },
  {
    name: "Headphones",
    icon: "headphones",
    gradient: "from-rose-500 to-pink-600",
    count: 4,
  },
  {
    name: "Tank Tops",
    icon: "tank",
    gradient: "from-emerald-500 to-green-600",
    count: 6,
  },
  {
    name: "Duffle Bags",
    icon: "bag",
    gradient: "from-slate-600 to-zinc-700",
    count: 3,
  },
  {
    name: "Flash Drives",
    icon: "usb",
    gradient: "from-indigo-500 to-blue-600",
    count: 4,
  },
] as const;

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "WCCG 104.5 Classic Tee",
    price: 24.99,
    rating: 4.8,
    reviews: 142,
    gradient: "from-primary/80 to-primary/40",
    icon: "shirt",
    pointsEligible: true,
    category: "apparel",
    badge: "Best Seller",
  },
  {
    id: "p2",
    name: "Gospel Vibes Hoodie",
    price: 49.99,
    rating: 4.9,
    reviews: 98,
    gradient: "from-violet-600/80 to-purple-400/40",
    icon: "hoodie",
    pointsEligible: true,
    category: "apparel",
    badge: "New",
  },
  {
    id: "p3",
    name: "Station Logo Snapback",
    price: 22.99,
    rating: 4.6,
    reviews: 67,
    gradient: "from-amber-600/80 to-yellow-400/40",
    icon: "cap",
    pointsEligible: false,
    category: "accessories",
  },
  {
    id: "p4",
    name: "Blessed & Hydrated Bottle",
    price: 18.99,
    rating: 4.7,
    reviews: 203,
    gradient: "from-sky-600/80 to-cyan-400/40",
    icon: "bottle",
    pointsEligible: true,
    category: "drinkware",
    badge: "Popular",
  },
  {
    id: "p5",
    name: "WCCG Sticker Pack (10pc)",
    price: 8.99,
    rating: 4.5,
    reviews: 312,
    gradient: "from-pink-600/80 to-rose-400/40",
    icon: "sticker",
    pointsEligible: false,
    category: "stickers",
  },
  {
    id: "p6",
    name: "Studio Monitor Headphones",
    price: 79.99,
    rating: 4.9,
    reviews: 54,
    gradient: "from-slate-700/80 to-zinc-500/40",
    icon: "headphones",
    pointsEligible: true,
    category: "tech",
    badge: "Premium",
  },
  {
    id: "p7",
    name: "WCCG Duffle Bag",
    price: 39.99,
    rating: 4.4,
    reviews: 41,
    gradient: "from-emerald-600/80 to-teal-400/40",
    icon: "bag",
    pointsEligible: false,
    category: "accessories",
  },
  {
    id: "p8",
    name: "Digital Gift Card",
    price: 25.0,
    rating: 5.0,
    reviews: 89,
    gradient: "from-indigo-600/80 to-blue-400/40",
    icon: "gift",
    pointsEligible: true,
    category: "gift-cards",
  },
  {
    id: "p9",
    name: "Faith Over Fear Tank Top",
    price: 19.99,
    rating: 4.6,
    reviews: 73,
    gradient: "from-orange-600/80 to-amber-400/40",
    icon: "tank",
    pointsEligible: false,
    category: "apparel",
  },
  {
    id: "p10",
    name: "WCCG USB Gospel Mix Drive",
    price: 14.99,
    rating: 4.3,
    reviews: 156,
    gradient: "from-blue-700/80 to-indigo-400/40",
    icon: "usb",
    pointsEligible: true,
    category: "tech",
  },
  {
    id: "p11",
    name: "Worship Sweatshirt",
    price: 44.99,
    rating: 4.8,
    reviews: 61,
    gradient: "from-fuchsia-600/80 to-pink-400/40",
    icon: "shirt",
    pointsEligible: true,
    category: "apparel",
    badge: "New",
  },
  {
    id: "p12",
    name: "Sports & Outdoors Bundle",
    price: 59.99,
    rating: 4.7,
    reviews: 28,
    gradient: "from-green-700/80 to-emerald-400/40",
    icon: "bundle",
    pointsEligible: true,
    category: "bundles",
    badge: "Value",
  },
];

const BENEFITS = [
  {
    icon: "local",
    title: "Local & Exclusive",
    description:
      "Official WCCG 104.5 FM merchandise designed for our Charlotte community.",
  },
  {
    icon: "quality",
    title: "Quality Assured",
    description:
      "Every item is crafted with premium materials built to last.",
  },
  {
    icon: "deals",
    title: "Shop with Points",
    description:
      "Use your mY1045 Listener Points for discounts on eligible items.",
  },
  {
    icon: "support",
    title: "Expert Support",
    description:
      "Our team is here to help with orders, sizing, and returns.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Helper: Star Rating                                                 */
/* ------------------------------------------------------------------ */

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i < Math.floor(rating)
                ? "fill-amber-400 text-amber-400"
                : i < rating
                  ? "fill-amber-400/50 text-amber-400"
                  : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {rating} ({reviews})
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper: Product icon by string key                                  */
/* ------------------------------------------------------------------ */

function ProductIcon({ icon, className }: { icon: string; className?: string }) {
  const base = className ?? "h-10 w-10 text-white/80";
  switch (icon) {
    case "shirt":
    case "tank":
    case "hoodie":
      return <Shirt className={base} />;
    case "cap":
      return <Package className={base} />;
    case "bottle":
      return <Droplets className={base} />;
    case "headphones":
      return <Headphones className={base} />;
    case "sticker":
      return <Sticker className={base} />;
    case "bag":
      return <ShoppingBag className={base} />;
    case "gift":
      return <Gift className={base} />;
    case "usb":
      return <Usb className={base} />;
    case "bundle":
      return <Dumbbell className={base} />;
    default:
      return <Package className={base} />;
  }
}

/* ------------------------------------------------------------------ */
/* Helper: Benefit icon by string key                                  */
/* ------------------------------------------------------------------ */

function BenefitIcon({ icon }: { icon: string }) {
  const base = "h-6 w-6";
  switch (icon) {
    case "local":
      return <ShoppingBag className={base} />;
    case "quality":
      return <Shield className={base} />;
    case "deals":
      return <Tag className={base} />;
    case "support":
      return <Headset className={base} />;
    default:
      return <ShoppingBag className={base} />;
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MarketplacePage() {
  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------- */}
      {/* Hero Section                                                */}
      {/* ---------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 py-12 text-primary-foreground sm:px-10 sm:py-16 lg:py-20">
        {/* Decorative background circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 text-xs">
            Official WCCG 104.5 FM Merch
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            The WCCG Marketplace
          </h1>
          <p className="mt-4 text-base text-primary-foreground/80 sm:text-lg">
            Rep Charlotte&apos;s #1 Gospel Station with exclusive apparel, gear,
            and collectibles. Earn and spend your mY1045 Listener Points on
            eligible items.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 font-semibold"
            >
              <ShoppingBag className="h-5 w-5" />
              Shop Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Zap className="h-5 w-5" />
              Shop with Points
            </Button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Hot Categories Grid                                         */}
      {/* ---------------------------------------------------------- */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Hot Categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {HOT_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${cat.gradient} transition-transform group-hover:scale-110`}
              >
                <ProductIcon
                  icon={cat.icon}
                  className="h-5 w-5 text-white"
                />
              </div>
              <span className="text-xs font-medium leading-tight text-center">
                {cat.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {cat.count} items
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Search + Filter + Products Grid                             */}
      {/* ---------------------------------------------------------- */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            Featured Products
          </h2>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              readOnly
            />
          </div>
        </div>

        {/* Horizontal Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.slug}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                idx === 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRODUCTS.map((product) => (
            <Card key={product.id} className="group overflow-hidden py-0">
              {/* Image placeholder with gradient */}
              <div
                className={`relative flex h-48 items-center justify-center bg-gradient-to-br ${product.gradient}`}
              >
                <ProductIcon
                  icon={product.icon}
                  className="h-16 w-16 text-white/70 transition-transform group-hover:scale-110"
                />

                {/* Badges */}
                <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                  {product.badge && (
                    <Badge variant="secondary" className="text-[10px]">
                      {product.badge}
                    </Badge>
                  )}
                  {product.pointsEligible && (
                    <Badge className="gap-1 bg-amber-500 text-[10px] text-white hover:bg-amber-500">
                      <Zap className="h-2.5 w-2.5" />
                      Shop with Points
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-sm leading-snug">
                  {product.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 pb-2">
                <StarRating rating={product.rating} reviews={product.reviews} />
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.pointsEligible && (
                    <span className="text-xs text-muted-foreground">
                      or {Math.round(product.price * 100)} pts
                    </span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pb-4 pt-0">
                <Button className="w-full gap-2" size="sm">
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Benefits Bar                                                */}
      {/* ---------------------------------------------------------- */}
      <section className="rounded-xl border bg-muted/50 p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BenefitIcon icon={benefit.icon} />
              </div>
              <div>
                <h3 className="font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
