"use client";

import Link from "next/link";
import {
  Store, Package, ShoppingBag, Wallet, Truck, BarChart3, CalendarDays,
  Users, Image as ImageIcon, Music, Coins, MapPin, ArrowRight,
} from "lucide-react";

const TOOLS: { href: string; title: string; desc: string; icon: React.ElementType }[] = [
  { href: "/my/vendor/storefront", title: "Storefront", desc: "Your public shop page & branding", icon: Store },
  { href: "/my/vendor/products", title: "Products", desc: "Add, edit and price what you sell", icon: Package },
  { href: "/my/vendor/orders", title: "Orders", desc: "Incoming orders & fulfillment", icon: ShoppingBag },
  { href: "/my/vendor/payouts", title: "Payouts", desc: "Balance, transfers & payout history", icon: Wallet },
  { href: "/my/vendor/shipping", title: "Shipping", desc: "Rates, labels & tracking", icon: Truck },
  { href: "/my/vendor/analytics", title: "Analytics", desc: "Sales, views & conversion", icon: BarChart3 },
  { href: "/my/vendor/bookings", title: "Bookings", desc: "Appointments & reservations", icon: CalendarDays },
  { href: "/my/vendor/customers", title: "Customers", desc: "Your buyers & contacts", icon: Users },
  { href: "/my/vendor/events", title: "Events", desc: "Pop-ups, shows & ticketing", icon: CalendarDays },
  { href: "/my/vendor/media", title: "Media", desc: "Photos & creative assets", icon: ImageIcon },
  { href: "/my/vendor/songs", title: "Music", desc: "Tracks for sale or licensing", icon: Music },
  { href: "/my/vendor/tokens", title: "Tokens", desc: "Loyalty & rewards tokens", icon: Coins },
  { href: "/my/vendor/tracking", title: "Tracking", desc: "Shipment tracking lookups", icon: MapPin },
];

export default function VendorHubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Vendor dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your storefront, products, orders and payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-[#74ddc7]/50 hover:bg-card/80"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#74ddc7]/10 text-[#74ddc7]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-medium">{t.title}</h2>
                  <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{t.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
