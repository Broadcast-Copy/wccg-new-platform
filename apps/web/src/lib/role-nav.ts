/**
 * Single source of truth for the Creator / Listener / Vendor dashboard
 * sidebars. Imported by BOTH the /my dashboard layout and the social
 * HubSidebar so the left menu stays identical no matter which page you're
 * on (fixes the bug where /vendors/hub etc. showed a different menu than
 * /my).
 *
 * Each list starts with a "Dashboard" link to /my — the role-specific
 * overview rendered by getRoleDashboardConfig in /my/page.tsx.
 */

import {
  LayoutDashboard,
  Users,
  Heart,
  Star,
  Ticket,
  Gift,
  ShoppingBag,
  Clock,
  Settings,
  Palette,
  Mic,
  FolderOpen,
  FileText,
  CalendarDays,
  Radio,
  BarChart3,
  Store,
  Receipt,
  Package,
  DollarSign,
  MapPin,
  Megaphone,
  Film,
  type LucideIcon,
} from "lucide-react";

export interface RoleNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the pathname exactly (used for the /my Dashboard link). */
  exact?: boolean;
}

export const listenerNav: RoleNavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/listeners", label: "Listener Hub", icon: Users },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/perks", label: "My Perks", icon: Gift },
  { href: "/my/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/my/history", label: "Listening History", icon: Clock },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

export const creatorNav: RoleNavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/creators", label: "Creator Hub", icon: Palette },
  { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
  { href: "/my/studio/publish", label: "Publish Video", icon: Film },
  { href: "/videos", label: "Video Wall", icon: Film },
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/my/blog", label: "Blog Manager", icon: FileText },
  { href: "/my/events", label: "Events Manager", icon: CalendarDays },
  { href: "/my/podcast-rss", label: "Podcast RSS", icon: Radio },
  { href: "/my/vendor/media", label: "Creator Marketing", icon: BarChart3 },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

export const vendorNav: RoleNavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/vendors/hub", label: "Vendor Hub", icon: Store },
  { href: "/my/vendor/storefront", label: "Storefront Manager", icon: Store },
  { href: "/my/vendor/orders", label: "Orders", icon: Receipt },
  { href: "/my/vendor/products", label: "Products", icon: Package },
  { href: "/my/vendor/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/my/vendor/events", label: "Events Manager", icon: Megaphone },
  { href: "/my/vendor/customers", label: "Customer Manager", icon: Users },
  { href: "/my/vendor/payouts", label: "Payouts", icon: DollarSign },
  { href: "/my/vendor/shipping", label: "Shipping", icon: Package },
  { href: "/my/vendor/tracking", label: "Tracking", icon: MapPin },
  { href: "/my/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/my/vendor/media", label: "Marketing", icon: Megaphone },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

/** Pick the nav list for the active role-toggle mode. */
export function navForMode(mode: "creator" | "vendor" | "listener"): RoleNavItem[] {
  if (mode === "creator") return creatorNav;
  if (mode === "vendor") return vendorNav;
  return listenerNav;
}
