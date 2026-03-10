"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, type UserRole } from "@/hooks/use-user-roles";
import {
  LayoutDashboard,
  Star,
  Heart,
  Ticket,
  Clock,
  BarChart3,
  Menu,
  X,
  User,
  Eye,
  ChevronDown,
  RotateCcw,
  CalendarDays,
  Clapperboard,
  FolderOpen,
  Megaphone,
  Radio,
  DollarSign,
  ShoppingBag,
  Receipt,
  Briefcase,
  Calendar,
  Mic,
  Gift,
  Palette,
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
// Listener nav items
// ---------------------------------------------------------------------------
const listenerItems: NavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/my/overview", label: "Overview", icon: BarChart3 },
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/history", label: "Listening History", icon: Clock },
];

// ---------------------------------------------------------------------------
// Creator nav items (used when toggle is set to Creator)
// ---------------------------------------------------------------------------
const creatorItems: NavItem[] = [
  { href: "/my/admin/programming", label: "Programming", icon: Radio },
  { href: "/my/admin/production", label: "Production Queue", icon: Clapperboard },
  { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/my/events", label: "Events Manager", icon: CalendarDays },
  { href: "/creators", label: "Creator Hub", icon: Palette },
];

// ---------------------------------------------------------------------------
// Role-specific nav items
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

  if (isManagement || isProduction || isCreator || isHost) {
    return {
      label: "Creator",
      items: [
        { href: "/my/admin/programming", label: "Programming", icon: Radio },
        { href: "/my/admin/production", label: "Production Queue", icon: Clapperboard },
        { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
        { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
        { href: "/my/events", label: "Events Manager", icon: CalendarDays },
        { href: "/creators", label: "Creator Hub", icon: Palette },
      ],
    };
  }

  if (isPromotions) {
    return {
      label: "Marketing",
      items: [
        { href: "/my/marketing/campaigns", label: "Campaigns", icon: Megaphone },
        { href: "/my/marketing/campaign-builder", label: "Campaign Builder", icon: Briefcase },
        { href: "/my/events", label: "Events Manager", icon: CalendarDays },
        { href: "/contests", label: "Contests", icon: Gift },
      ],
    };
  }

  if (isSales) {
    return {
      label: "Sales",
      items: [
        { href: "/my/sales", label: "Sales Dashboard", icon: DollarSign },
        { href: "/my/admin/reports", label: "Reports", icon: BarChart3 },
        { href: "/my/sales/invoices", label: "Invoices", icon: Receipt },
        { href: "/my/events", label: "Events Manager", icon: CalendarDays },
      ],
    };
  }

  // Listener — no role items
  return { label: "", items: [] };
}

// ---------------------------------------------------------------------------
// Role switcher options (for the sidebar dropdown — Marketing/Sales/Admin)
// ---------------------------------------------------------------------------
const VIEWABLE_ROLES = [
  { value: "listener", label: "Listener" },
  { value: "content_creator", label: "Creator" },
  { value: "promotions", label: "Marketing" },
  { value: "sales", label: "Sales" },
];

// ---------------------------------------------------------------------------
// NavLink
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
// Listener / Creator Toggle (pill in the content area header)
// ---------------------------------------------------------------------------
function ListenerCreatorToggle() {
  const { roleOverride, isOverrideActive, setRoleOverride } = useUserRoles();

  const isCreatorMode = isOverrideActive && roleOverride === "content_creator";

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5">
      <button
        type="button"
        onClick={() => {
          if (isCreatorMode) {
            setRoleOverride(null);
          }
        }}
        className="rounded-full px-3.5 py-1 text-[12px] font-semibold transition-all"
        style={
          !isCreatorMode
            ? { backgroundColor: "#74ddc7", color: "#0a0a0f" }
            : undefined
        }
      >
        Listener
      </button>
      <button
        type="button"
        onClick={() => {
          if (!isCreatorMode) {
            setRoleOverride("content_creator");
          }
        }}
        className="rounded-full px-3.5 py-1 text-[12px] font-semibold transition-all"
        style={
          isCreatorMode
            ? { backgroundColor: "#74ddc7", color: "#0a0a0f" }
            : undefined
        }
      >
        Creator
      </button>
    </div>
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
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isAdmin,
    isSuperAdmin,
    roleOverride,
    isOverrideActive,
    setRoleOverride,
  } = useUserRoles();

  // Custom dropdown state for role switcher
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roleSwitcherOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setRoleSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [roleSwitcherOpen]);

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

  // Determine if the toggle is set to Creator mode
  const isCreatorToggleActive = isOverrideActive && roleOverride === "content_creator";

  // Determine if the override is a non-toggle role (Marketing, Sales, Admin, etc.)
  // These are roles OTHER than "content_creator" and "listener"
  const isNonToggleOverride =
    isOverrideActive &&
    roleOverride !== null &&
    roleOverride !== "content_creator" &&
    roleOverride !== "listener";

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
              {user?.user_metadata?.display_name || user?.email?.split("@")[0] || "My Account"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email || ""}
            </p>
          </div>
        </div>

        {/* Role switcher dropdown — for Marketing/Sales/Admin overrides */}
        <div className="space-y-2">
          {!isNonToggleOverride ? (
            <div className="relative" ref={roleSwitcherRef}>
              <button
                type="button"
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] font-medium text-muted-foreground cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3 shrink-0" />
                  View as role...
                </span>
                <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${roleSwitcherOpen ? "rotate-180" : ""}`} />
              </button>

              {roleSwitcherOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
                  {VIEWABLE_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRoleOverride(r.value as UserRole);
                        setRoleSwitcherOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-[12px] font-medium text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground transition-colors text-left"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
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
        {/* When Creator toggle is active, show ONLY creator items */}
        {isCreatorToggleActive ? (
          <>
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Creator
            </p>
            {creatorItems.map((item) => (
              <NavLink key={item.href + item.label} item={item} pathname={pathname} />
            ))}
          </>
        ) : (
          <>
            {/* Listener items — shown when in Listener mode or non-toggle override */}
            {listenerItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}

            {/* Role-specific items (for Marketing/Sales/Admin overrides or natural roles) */}
            {roleSection.items.length > 0 && (
              <>
                <div className="my-2 border-t border-border" />
                {roleSection.label && (
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {roleSection.label}
                  </p>
                )}
                {roleSection.items.map((item) => (
                  <NavLink key={item.href + item.label} item={item} pathname={pathname} />
                ))}
              </>
            )}
          </>
        )}
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
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
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
              className="fixed left-0 top-14 bottom-14 z-50 w-[240px] overflow-y-auto bg-sidebar border-r border-border shadow-2xl"
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
      <div className="flex-1 min-w-0">
        {/* Content area header with Listener/Creator toggle */}
        <div className="flex items-center justify-end px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          <ListenerCreatorToggle />
        </div>

        {/* Page content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
