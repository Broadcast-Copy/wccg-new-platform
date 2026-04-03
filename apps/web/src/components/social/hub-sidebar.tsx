"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Heart, Star, Ticket, Gift, ShoppingBag, Clock, Headphones,
  Mic, Palette, FolderOpen, CalendarDays, Radio, BarChart3,
  Store, Package, Receipt, Users, DollarSign, MapPin, Megaphone,
  Menu, X, User, Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const LISTENER_ITEMS: NavItem[] = [
  { href: "/listeners", label: "Listener Hub", icon: Headphones },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/perks", label: "My Perks", icon: Gift },
  { href: "/my/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/my/history", label: "Listening History", icon: Clock },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

const CREATOR_ITEMS: NavItem[] = [
  { href: "/creators", label: "Creator Hub", icon: Palette },
  { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/my/blog", label: "Blog Manager", icon: Palette },
  { href: "/my/events", label: "Events Manager", icon: CalendarDays },
  { href: "/my/podcast-rss", label: "Podcast RSS", icon: Radio },
  { href: "/my/vendor/media", label: "Creator Marketing", icon: BarChart3 },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

const VENDOR_ITEMS: NavItem[] = [
  { href: "/vendors/hub", label: "Vendor Hub", icon: Store },
  { href: "/my/vendor/orders", label: "Orders", icon: Receipt },
  { href: "/my/vendor/storefront", label: "Storefront Manager", icon: Store },
  { href: "/my/vendor/products", label: "Products", icon: Package },
  { href: "/my/vendor/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/my/vendor/events", label: "Events Manager", icon: Megaphone },
  { href: "/my/vendor/customers", label: "Customers", icon: Users },
  { href: "/my/vendor/payouts", label: "Payouts", icon: DollarSign },
  { href: "/my/vendor/shipping", label: "Shipping", icon: Package },
  { href: "/my/vendor/tracking", label: "Tracking", icon: MapPin },
  { href: "/my/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/my/vendor/media", label: "Marketing", icon: Megaphone },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

function NavLink({ item, pathname, color }: { item: NavItem; pathname: string; color: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
        isActive
          ? "bg-foreground/[0.08]"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground/80"
      }`}
      style={isActive ? { color } : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" style={isActive ? { color } : undefined} />
      {item.label}
    </Link>
  );
}

function SidebarContent({
  hubType,
  color,
  pathname,
}: {
  hubType: "listener" | "creator" | "vendor";
  color: string;
  pathname: string;
}) {
  const { user } = useAuth();
  const items = hubType === "listener" ? LISTENER_ITEMS : hubType === "creator" ? CREATOR_ITEMS : VENDOR_ITEMS;
  const hubLabel = hubType === "listener" ? "LISTENER" : hubType === "creator" ? "CREATOR" : "VENDOR";

  return (
    <>
      {/* User info */}
      <div className="border-b border-border px-4 py-4 space-y-1">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border"
            style={{ background: `linear-gradient(135deg, ${color}30, ${color}10)` }}
          >
            <User className="h-4 w-4 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.user_metadata?.display_name || user?.email?.split("@")[0] || "My Account"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email || ""}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2">
        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {hubLabel}
        </p>
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} color={color} />
        ))}
      </nav>
    </>
  );
}

/**
 * Sidebar wrapper for hub pages. Renders a desktop sidebar + mobile FAB toggle.
 * Wrap your hub member content with this component.
 */
export function HubSidebar({
  hubType,
  color,
  children,
}: {
  hubType: "listener" | "creator" | "vendor";
  color: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-0 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
        <SidebarContent hubType={hubType} color={color} pathname={pathname} />
      </aside>

      {/* Mobile sidebar toggle + overlay */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg text-white"
          style={{ backgroundColor: color }}
          aria-label="Toggle hub menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside
              className="fixed left-0 top-14 bottom-14 z-50 w-[240px] overflow-y-auto bg-sidebar border-r border-border shadow-2xl"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setMobileOpen(false);
              }}
            >
              <SidebarContent hubType={hubType} color={color} pathname={pathname} />
            </aside>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
