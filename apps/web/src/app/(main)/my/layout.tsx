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
  MapPin,
  Shield,
  Wrench,
  Building2,
  FileText,
  Truck,
  Store,
  Music,
  Users,
  Package,
  Lock,
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
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/places", label: "My Places", icon: MapPin },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/history", label: "Listening History", icon: Clock },
];

// ---------------------------------------------------------------------------
// Creator nav items (used when toggle is set to Creator)
// ---------------------------------------------------------------------------
const creatorItems: NavItem[] = [
  { href: "/my/admin/production", label: "Production Queue", icon: Clapperboard },
  { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/creators", label: "Creator Hub", icon: Palette },
];

const creatorEventsItems: NavItem[] = [
  { href: "/my/events", label: "Events Manager", icon: CalendarDays },
];

// ---------------------------------------------------------------------------
// Vendor nav items (used when toggle is set to Vendor)
// ---------------------------------------------------------------------------
const vendorItems: NavSection[] = [
  {
    sectionLabel: "STOREFRONT",
    items: [
      { href: "/my/vendor/storefront", label: "Storefront Manager", icon: Store, exact: true },
      { href: "/my/vendor/products", label: "Products", icon: Package },
      { href: "/my/vendor/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/my/vendor/events", label: "Events", icon: Megaphone },
      { href: "/my/vendor/tokens", label: "Listener Tokens", icon: Gift },
    ],
  },
  {
    sectionLabel: "TRACKING & ANALYTICS",
    items: [
      { href: "/my/vendor/customers", label: "Customers", icon: Users },
      { href: "/my/vendor/media", label: "Media Tracking", icon: FolderOpen },
      { href: "/my/vendor/songs", label: "Song Tracking", icon: Music },
    ],
  },
];

// ---------------------------------------------------------------------------
// Advertising nav items (combined Sales + Marketing)
// ---------------------------------------------------------------------------
interface NavSection {
  sectionLabel: string;
  items: NavItem[];
}

const advertisingItems: NavSection[] = [
  {
    sectionLabel: "SALES",
    items: [
      { href: "/my/sales", label: "Sales Dashboard", icon: DollarSign },
      { href: "/my/sales/pipeline", label: "Pipeline", icon: BarChart3 },
      { href: "/my/sales/clients", label: "Client Manager", icon: Briefcase },
      { href: "/my/sales/invoices", label: "Invoices", icon: Receipt },
      { href: "/my/sales/rate-cards", label: "Rate Cards", icon: FileText },
      { href: "/my/sales/commissions", label: "Commissions", icon: DollarSign },
    ],
  },
  {
    sectionLabel: "MARKETING",
    items: [
      { href: "/my/marketing/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/my/marketing/campaign-builder", label: "Campaign Builder", icon: Briefcase },
      { href: "/my/events", label: "Events Manager", icon: CalendarDays },
      { href: "/contests", label: "Contests", icon: Gift },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role-specific nav items
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Operations nav items
// ---------------------------------------------------------------------------
const operationsItems: NavItem[] = [
  { href: "/my/admin/operations", label: "Ops Dashboard", icon: Wrench, exact: true },
  { href: "/my/admin/operations/master-control", label: "Master Control", icon: Radio },
  { href: "/my/admin/operations/fcc-compliance", label: "FCC Compliance", icon: Shield },
  { href: "/my/admin/operations/equipment", label: "Equipment", icon: Wrench },
  { href: "/my/admin/operations/engineering", label: "Engineering", icon: Wrench },
  { href: "/my/admin/operations/backup", label: "Backup & DR", icon: Shield },
  { href: "/my/admin/operations/sop", label: "SOP Library", icon: FileText },
  { href: "/my/admin/operations/shifts", label: "Shift Schedule", icon: CalendarDays },
];

// ---------------------------------------------------------------------------
// GM nav items
// ---------------------------------------------------------------------------
const gmItems: NavItem[] = [
  { href: "/my/admin/gm", label: "Executive Dashboard", icon: Building2, exact: true },
  { href: "/my/admin/gm/revenue", label: "Revenue", icon: DollarSign },
  { href: "/my/admin/gm/staff", label: "Staff Directory", icon: Building2 },
  { href: "/my/admin/gm/meetings", label: "Meeting Notes", icon: FileText },
  { href: "/my/admin/gm/ratings", label: "Ratings", icon: BarChart3 },
  { href: "/my/admin/gm/competitors", label: "Competitors", icon: Radio },
  { href: "/my/admin/gm/goals", label: "Strategic Goals", icon: Star },
  { href: "/my/admin/gm/feedback", label: "Listener Feedback", icon: Heart },
  { href: "/my/admin/gm/partnerships", label: "Partnerships", icon: Briefcase },
  { href: "/my/admin/gm/board-reports", label: "Board Reports", icon: FileText },
];

// ---------------------------------------------------------------------------
// Traffic nav items
// ---------------------------------------------------------------------------
const trafficItems: NavItem[] = [
  { href: "/my/admin/traffic", label: "Traffic Dashboard", icon: Truck, exact: true },
  { href: "/my/admin/traffic/log", label: "Traffic Log", icon: FileText },
  { href: "/my/admin/traffic/copy", label: "Copy Management", icon: FileText },
  { href: "/my/admin/traffic/billing", label: "Billing", icon: DollarSign },
  { href: "/my/admin/traffic/ar", label: "Accounts Receivable", icon: Receipt },
  { href: "/my/admin/traffic/production-orders", label: "Production Orders", icon: Clapperboard },
  { href: "/my/admin/traffic/continuity", label: "Continuity Log", icon: FileText },
  { href: "/my/admin/traffic/psa", label: "PSA Rotation", icon: Megaphone },
  { href: "/my/admin/traffic/makegoods", label: "Makegoods", icon: CalendarDays },
  { href: "/my/admin/traffic/contracts", label: "Contracts", icon: Briefcase },
  { href: "/my/admin/traffic/expenses", label: "Expenses", icon: Receipt },
  { href: "/my/admin/traffic/deadlines", label: "Deadlines", icon: CalendarDays },
];

function getRoleItems(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isCreator: boolean;
  isHost: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}, roleOverride: string | null): { label: string; items: NavItem[]; sections?: NavSection[] } {
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

  // Department-specific role overrides
  if (roleOverride === "operations") {
    return { label: "Operations", items: operationsItems };
  }
  if (roleOverride === "gm") {
    return { label: "General Manager", items: gmItems };
  }
  if (roleOverride === "traffic") {
    return { label: "Traffic & Office", items: trafficItems };
  }

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
        { href: "/my/admin/operations", label: "Operations", icon: Wrench },
        { href: "/my/admin/gm", label: "GM Dashboard", icon: Building2 },
        { href: "/my/admin/traffic", label: "Traffic & Office", icon: Truck },
      ],
    };
  }

  if (isManagement || isProduction || isCreator || isHost) {
    return {
      label: "Creator",
      items: [
        { href: "/my/admin/production", label: "Production Queue", icon: Clapperboard },
        { href: "/my/studio", label: "Broadcast Studio", icon: Mic },
        { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
        { href: "/my/events", label: "Events Manager", icon: CalendarDays },
        { href: "/creators", label: "Creator Hub", icon: Palette },
      ],
    };
  }

  // Advertising: combined Sales + Marketing
  if (isPromotions || isSales) {
    return {
      label: "Advertising",
      items: [],
      sections: advertisingItems,
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
  { value: "promotions", label: "Advertising" },
  { value: "operations", label: "Operations" },
  { value: "gm", label: "General Manager" },
  { value: "traffic", label: "Traffic & Office" },
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
// Creator / Listener / Vendor Toggle (pill in the sidebar header)
// ---------------------------------------------------------------------------
function SidebarModeToggle() {
  const { roleOverride, isOverrideActive, setRoleOverride } = useUserRoles();

  const activeMode = isOverrideActive && roleOverride === "content_creator"
    ? "creator"
    : isOverrideActive && roleOverride === "vendor"
      ? "vendor"
      : "listener";

  const modes: { value: string; label: string; role: string | null; activeColor: string; textColor: string }[] = [
    { value: "creator", label: "Creator", role: "content_creator", activeColor: "#7401df", textColor: "#fff" },
    { value: "listener", label: "Listener", role: null, activeColor: "#74ddc7", textColor: "#0a0a0f" },
    { value: "vendor", label: "Vendor", role: "vendor", activeColor: "#f59e0b", textColor: "#0a0a0f" },
  ];

  return (
    <div className="inline-flex w-full items-center rounded-full border border-border bg-muted/50 p-px">
      {modes.map(({ value, label, role, activeColor, textColor }) => {
        const isActive = activeMode === value;
        const needsLock = value !== "listener" && !isActive;
        return (
        <button
          key={value}
          type="button"
          onClick={() => setRoleOverride(role as UserRole | null)}
          className="flex-1 rounded-full px-2 py-px text-[9px] font-semibold transition-all text-center inline-flex items-center justify-center gap-0.5"
          style={
            isActive
              ? { backgroundColor: activeColor, color: textColor }
              : undefined
          }
        >
          {needsLock && <Lock className="h-2.5 w-2.5 opacity-40" />}
          {label}
        </button>
        );
      })}
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
    realRoles,
    roleOverride,
    isOverrideActive,
    setRoleOverride,
  } = useUserRoles();

  // Check real admin status (not affected by role override)
  const isRealAdmin = realRoles.includes("admin") || realRoles.includes("super_admin");

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
  }, roleOverride);

  // Determine if the toggle is set to Creator mode
  const isCreatorToggleActive = isOverrideActive && roleOverride === "content_creator";
  const isVendorToggleActive = isOverrideActive && roleOverride === "vendor";

  // Determine if the override is a non-toggle role (Marketing, Sales, Admin, etc.)
  // These are roles OTHER than "content_creator", "vendor", and "listener"
  const isNonToggleOverride =
    isOverrideActive &&
    roleOverride !== null &&
    roleOverride !== "content_creator" &&
    roleOverride !== "vendor" &&
    roleOverride !== "listener";

  return (
    <>
      {/* User info + Toggle */}
      <div className="border-b border-border px-4 py-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#74ddc7]/30 to-[#7401df]/30 border border-border">
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
        <SidebarModeToggle />
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
              <NavLink key={item.href + item.label} item={item} pathname={pathname} color="#7401df" />
            ))}

            {/* Events section with divider */}
            <div className="my-2 border-t border-border" />
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Events
            </p>
            {creatorEventsItems.map((item) => (
              <NavLink key={item.href + item.label} item={item} pathname={pathname} color="#7401df" />
            ))}
          </>
        ) : isVendorToggleActive ? (
          <>
            {vendorItems.map((section) => (
              <div key={section.sectionLabel}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.sectionLabel}
                </p>
                {section.items.map((item) => (
                  <NavLink key={item.href + item.label} item={item} pathname={pathname} color="#f59e0b" />
                ))}
                <div className="my-2 border-t border-border" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Listener label */}
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Listener
            </p>
            {/* Listener items — shown when in Listener mode or non-toggle override */}
            {listenerItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}

            {/* Role-specific items (for Advertising/Admin overrides or natural roles) */}
            {roleSection.sections ? (
              <>
                <div className="my-2 border-t border-border" />
                {roleSection.sections.map((section) => (
                  <div key={section.sectionLabel}>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.sectionLabel}
                    </p>
                    {section.items.map((item) => (
                      <NavLink key={item.href + item.label} item={item} pathname={pathname} />
                    ))}
                  </div>
                ))}
              </>
            ) : roleSection.items.length > 0 ? (
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
            ) : null}
          </>
        )}
      </nav>

      {/* Role switcher — bottom of sidebar */}
      <div className="border-t border-border px-3 py-2">
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
              <div className="absolute left-0 right-0 bottom-full mb-1 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
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

      {/* Spacer pushes admin controls to bottom */}
      <div className="flex-1" />

      {/* Admin controls — very bottom of sidebar */}
      {isRealAdmin && (
        <div className="border-t border-border px-2 py-2">
          <NavLink
            item={{ href: "/my/admin", label: "Station Control", icon: Shield, exact: true }}
            pathname={pathname}
            color="#dc2626"
          />
        </div>
      )}
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
        {/* Page content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
