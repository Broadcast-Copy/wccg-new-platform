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
  Disc3,
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
  Wand2,
  Frame,
  BookOpen,
  MessageCircle,
  Shield,
  Globe,
  Eye,
  Briefcase,
  Clapperboard,
  Mail,
  UserCheck,
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
  { href: "/my/messages", label: "Messages", icon: MessageCircle },
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
  { href: "/my/messages", label: "Messages", icon: MessageCircle },
  { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
  { href: "/my/dj", label: "DJ Portal", icon: Disc3 },
  { href: "/videos", label: "Video Wall", icon: Film },
  { href: "/studio/image-generator", label: "Image Generator", icon: Wand2 },
  { href: "/studio/hyperframes", label: "Hyperframes", icon: Frame },
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/my/blog", label: "Blog Manager", icon: FileText },
  { href: "/my/events", label: "Events Manager", icon: CalendarDays },
  { href: "/my/podcast-rss", label: "Podcast RSS", icon: Radio },
  { href: "/my/vendor/media", label: "Creator Marketing", icon: BarChart3 },
  { href: "/brand", label: "Brand Kit", icon: BookOpen },
  { href: "/my/settings", label: "Settings", icon: Settings },
];

export const vendorNav: RoleNavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/vendors/hub", label: "Vendor Hub", icon: Store },
  { href: "/my/messages", label: "Messages", icon: MessageCircle },
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

// ---------------------------------------------------------------------------
// Admin "view as" navigation (real admins only). These mirror the staff
// consoles surfaced when an admin flips the Admin toggle into one of the
// operations / production / sales modes. Kept here so the dropdown menu and
// any future admin shell share ONE definition instead of inlining JSX.
// ---------------------------------------------------------------------------

export type AdminMode = "operations" | "production" | "sales";

export const adminOperationsNav: RoleNavItem[] = [
  { href: "/my/admin", label: "Admin Dashboard", icon: Shield },
  { href: "/my/admin/cms", label: "Web Editor / CMS", icon: Globe },
  { href: "/my/directory", label: "Listings", icon: Store },
  { href: "/my/admin/users", label: "User Management", icon: Users },
  { href: "/my/admin/access-requests", label: "Access Requests", icon: UserCheck },
  { href: "/my/admin/fees", label: "Platform Fees", icon: DollarSign },
  { href: "/my/admin/moderation", label: "Moderation", icon: Eye },
  { href: "/my/admin/push", label: "Push Notifications", icon: Megaphone },
  { href: "/my/admin/email-campaigns", label: "Email Campaigns", icon: Mail },
  { href: "/my/admin/audit-log", label: "Audit Log", icon: Clock },
  { href: "/my/admin/operations", label: "System Control", icon: Settings },
];

export const adminSalesNav: RoleNavItem[] = [
  { href: "/my/sales", label: "Sales Dashboard", icon: BarChart3 },
  { href: "/advertise/portal/campaign-builder", label: "Campaign Builder", icon: Megaphone },
  { href: "/advertise/portal/dashboard", label: "Campaign Dashboard", icon: BarChart3 },
  { href: "/my/admin/segments", label: "Audience Segments", icon: Users },
  { href: "/my/admin/inventory", label: "Ad Inventory", icon: Package },
  { href: "/my/admin/advertisers", label: "Advertisers", icon: Briefcase },
  { href: "/my/admin/gm/revenue", label: "Revenue", icon: DollarSign },
];

export const adminProductionNav: RoleNavItem[] = [
  { href: "/my/admin/production", label: "Production Queue", icon: Clapperboard },
  { href: "/my/admin/studios", label: "Studio Manager", icon: Mic },
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/my/admin/creators", label: "Creator Manager", icon: Palette },
  { href: "/my/admin/video-moderation", label: "Video Moderation", icon: Film },
];

/** Pick the admin console nav for the active admin override (production default). */
export function adminNavForMode(mode: string | null): RoleNavItem[] {
  if (mode === "operations") return adminOperationsNav;
  if (mode === "sales") return adminSalesNav;
  return adminProductionNav;
}
