"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, type UserRole } from "@/hooks/use-user-roles";
import {
  LayoutDashboard,
  Star,
  Heart,
  Ticket,
  Clock,
  CalendarDays,
  Building2,
  Mic,
  FolderOpen,
  Menu,
  X,
  User,
  Shield,
  Clapperboard,
  Palette,
  Megaphone,
  Briefcase,
  BarChart3,
  DollarSign,
  Receipt,
  Calendar,
  Radio,
  Gift,
  ShoppingBag,
  Eye,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Navigation item type
// ---------------------------------------------------------------------------
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

// ---------------------------------------------------------------------------
// Base listener items — always shown for every role
// These live ABOVE the role-specific section.
// ---------------------------------------------------------------------------
const baseItems: NavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/my/overview", label: "Overview", icon: BarChart3 },
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/history", label: "Listening History", icon: Clock },
];

// ---------------------------------------------------------------------------
// Role-specific nav items — shown below Listening History in their own section
// ---------------------------------------------------------------------------
function getRoleItems(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isCreator: boolean;
  isHost: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}): { label: string; items: NavItem[] } {
  const {
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
  } = flags;

  if (isSuperAdmin || isAdmin) {
    return {
      label: "Administration",
      items: [
        { href: "/my/admin/campaigns", label: "Campaigns", icon: Megaphone },
        { href: "/my/admin/reports", label: "Reports", icon: BarChart3 },
        { href: "/my/admin/programming", label: "Programming", icon: Radio },
        { href: "/my/events", label: "Events Manager", icon: CalendarDays },
        { href: "/my/studio", label: "Broadcast Studio", icon: Clapperboard },
        { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
      ],
    };
  }

  if (isManagement) {
    return {
      label: "Management",
      items: [
        { href: "/my/admin/campaigns", label: "Campaigns", icon: Megaphone },
        { href: "/my/admin/reports", label: "Reports", icon: BarChart3 },
        { href: "/my/admin/programming", label: "Programming", icon: Radio },
        { href: "/my/events", label: "Events Manager", icon: CalendarDays },
        { href: "/my/studio", label: "Broadcast Studio", icon: Clapperboard },
      ],
    };
  }

  if (isSales) {
    return {
      label: "Sales",
      items: [
        { href: "/my/sales", label: "Sales Dashboard", icon: DollarSign },
        { href: "/my/sales/campaign-builder", label: "Campaign Builder", icon: Megaphone },
        { href: "/my/sales/spot-shop", label: "Spot Shop", icon: ShoppingBag },
        { href: "/my/sales/invoices", label: "Invoices", icon: Receipt },
        { href: "/my/admin/campaigns", label: "My Campaigns", icon: Briefcase },
      ],
    };
  }

  if (isProduction) {
    return {
      label: "Production",
      items: [
        { href: "/my/admin/production", label: "Production Queue", icon: Clapperboard },
        { href: "/studio/booking", label: "Studio Booking", icon: Calendar },
        { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
        { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
      ],
    };
  }

  if (isPromotions) {
    return {
      label: "Promotions",
      items: [
        { href: "/events/create", label: "Events Manager", icon: CalendarDays },
        { href: "/contests", label: "Contests", icon: Gift },
        { href: "/my/events", label: "My Events", icon: CalendarDays },
      ],
    };
  }

  if (isCreator || isHost) {
    return {
      label: isHost ? "Host Tools" : "Creator Tools",
      items: [
        { href: "/my/studio", label: "Broadcast Studio", icon: Clapperboard },
        { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
        { href: "/studio", label: "Studio Tools", icon: Mic },
        { href: "/creators", label: "Creator Hub", icon: Palette },
      ],
    };
  }

  // Default: listener
  return {
    label: "My Stuff",
    items: [
      { href: "/my/events", label: "My Events", icon: CalendarDays },
      { href: "/my/directory", label: "My Listings", icon: Building2 },
      { href: "/my/studio", label: "Broadcast Studio", icon: Clapperboard },
      { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
    ],
  };
}

// ---------------------------------------------------------------------------
// Role switcher options
// ---------------------------------------------------------------------------
const VIEWABLE_ROLES = [
  { value: "listener", label: "Listener" },
  { value: "sales", label: "Sales" },
  { value: "production", label: "Production" },
  { value: "management", label: "Management" },
  { value: "promotions", label: "Promotions" },
  { value: "content_creator", label: "Content Creator" },
  { value: "host", label: "Host" },
];

// ---------------------------------------------------------------------------
// NavLink helper — renders a single nav item
// ---------------------------------------------------------------------------
function NavLink({
  item,
  pathname,
  color = "#74ddc7",
}: {
  item: NavItem;
  pathname: string;
  color?: string;
}) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
        isActive
          ? `bg-foreground/[0.08] text-[${color}]`
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground/80"
      }`}
      style={isActive ? { color } : undefined}
    >
      <item.icon
        className="h-4 w-4 shrink-0"
        style={isActive ? { color } : undefined}
      />
      {item.label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SidebarContent
// ---------------------------------------------------------------------------
function SidebarContent({ pathname }: { pathname: string }) {
  const { user } = useAuth();
  const {
    isCreator,
    isHost,
    isEmployee,
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isAdmin,
    isSuperAdmin,
    realRoles,
    roleOverride,
    isOverrideActive,
    setRoleOverride,
  } = useUserRoles();

  const roleSection = getRoleItems({
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
  });

  return (
    <>
      {/* User info */}
      <div className="border-b border-border px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 border border-border">
            <User className="h-4 w-4 text-foreground/70" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.email?.split("@")[0] || "My Account"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email || ""}
            </p>
          </div>
        </div>

        {/* Role switcher */}
        <div className="space-y-2">
          {!isOverrideActive ? (
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-border bg-muted/50 px-3 py-1.5 pr-8 text-[12px] font-medium text-muted-foreground cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    setRoleOverride(e.target.value as UserRole);
                  }
                  e.target.value = "";
                }}
              >
                <option value="" disabled style={{ color: "#888", backgroundColor: "#1a1a2e" }}>
                  View as role…
                </option>
                {VIEWABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value} style={{ color: "#e0e0e0", backgroundColor: "#1a1a2e" }}>
                    {r.label}
                  </option>
                ))}
              </select>
              <Eye className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Eye className="h-3 w-3 shrink-0 text-[#f59e0b]" />
                <span className="truncate text-[11px] font-semibold text-[#f59e0b] capitalize">
                  {roleOverride?.replace("_", " ")}
                </span>
              </div>
              <button
                onClick={() => setRoleOverride(null)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors"
                aria-label="Reset role override"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2">
        {/* ── Base listener items ── */}
        {baseItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {/* ── Divider + Role-specific section ── */}
        <div className="my-2 border-t border-border" />
        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {roleSection.label}
        </p>
        {roleSection.items.map((item) => (
          <NavLink key={item.href + item.label} item={item} pathname={pathname} />
        ))}

        {/* ── Station Control (always at bottom) ── */}
        <div className="my-2 border-t border-border" />
        {(() => {
          const isAdminActive =
            pathname === "/my/admin" || pathname.startsWith("/my/admin/");
          return (
            <Link
              href="/my/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                isAdminActive
                  ? "bg-[#dc2626]/10 text-[#dc2626]"
                  : "text-muted-foreground hover:bg-[#dc2626]/5 hover:text-[#dc2626]/80"
              }`}
            >
              <Shield
                className={`h-4 w-4 shrink-0 ${
                  isAdminActive ? "text-[#dc2626]" : "text-[#dc2626]/50"
                }`}
              />
              Station Control
              <span className="ml-auto rounded bg-[#dc2626]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#dc2626]">
                Admin
              </span>
            </Link>
          );
        })()}
      </nav>
    </>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export default function MyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-0 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar toggle + overlay */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] shadow-lg"
          aria-label="Toggle dashboard menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className="fixed left-0 top-14 bottom-14 z-50 w-[260px] overflow-y-auto bg-sidebar border-r border-border shadow-2xl"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("a")) setMobileOpen(false);
              }}
            >
              <SidebarContent pathname={pathname} />
            </aside>
          </>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
