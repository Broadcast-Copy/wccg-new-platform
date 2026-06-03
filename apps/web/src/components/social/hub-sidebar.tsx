"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, type UserRole } from "@/hooks/use-user-roles";
import { useRouter } from "next/navigation";
import {
  Menu, X, User, Lock, Shield,
  type LucideIcon,
} from "lucide-react";
import { listenerNav, creatorNav, vendorNav, type RoleNavItem } from "@/lib/role-nav";

// Shared nav (single source of truth) keeps this sidebar identical to the
// /my dashboard sidebar — see apps/web/src/lib/role-nav.ts.
type NavItem = RoleNavItem;
const LISTENER_ITEMS = listenerNav;
const CREATOR_ITEMS = creatorNav;
const VENDOR_ITEMS = vendorNav;

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

function ModeToggle() {
  const { roleOverride, isOverrideActive, setRoleOverride } = useUserRoles();
  const router = useRouter();

  const activeMode = isOverrideActive && roleOverride === "content_creator"
    ? "creator"
    : isOverrideActive && roleOverride === "vendor"
      ? "vendor"
      : "listener";

  const modes: { value: string; label: string; role: string | null; activeColor: string; textColor: string; href: string }[] = [
    { value: "creator", label: "Creator", role: "content_creator", activeColor: "#7401df", textColor: "#fff", href: "/creators" },
    { value: "listener", label: "Listener", role: null, activeColor: "#74ddc7", textColor: "#0a0a0f", href: "/listeners" },
    { value: "vendor", label: "Vendor", role: "vendor", activeColor: "#f59e0b", textColor: "#0a0a0f", href: "/vendors/hub" },
  ];

  return (
    <div className="inline-flex w-full items-center rounded-full border border-border bg-muted/50 p-px">
      {modes.map(({ value, label, role, activeColor, textColor, href }) => {
        const isActive = activeMode === value;
        const needsLock = value !== "listener" && !isActive;
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              setRoleOverride(role as UserRole | null);
              router.push(href);
            }}
            className="flex-1 rounded-full px-2 py-px text-[9px] font-semibold transition-all text-center inline-flex items-center justify-center gap-0.5"
            style={isActive ? { backgroundColor: activeColor, color: textColor } : undefined}
          >
            {needsLock && <Lock className="h-2.5 w-2.5 opacity-40" />}
            {label}
          </button>
        );
      })}
    </div>
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
  const { isRealAdmin } = useUserRoles();
  const items = hubType === "listener" ? LISTENER_ITEMS : hubType === "creator" ? CREATOR_ITEMS : VENDOR_ITEMS;
  const hubLabel = hubType === "listener" ? "LISTENER" : hubType === "creator" ? "CREATOR" : "VENDOR";

  return (
    <>
      {/* User info + Toggle */}
      <div className="border-b border-border px-4 py-4 space-y-2">
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
        <ModeToggle />
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

      {/* Admin link — mirrors the /my dashboard so the left menu stays
          consistent when navigating between hub pages and /my/* pages. */}
      {isRealAdmin && (
        <div className="mt-auto border-t border-border p-2">
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
