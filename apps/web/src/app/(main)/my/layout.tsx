"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Star,
  Heart,
  Ticket,
  Clock,
  BarChart3,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Listener nav items
// ---------------------------------------------------------------------------
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const listenerItems: NavItem[] = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/my/overview", label: "Overview", icon: BarChart3 },
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/history", label: "Listening History", icon: Clock },
];

// ---------------------------------------------------------------------------
// NavLink
// ---------------------------------------------------------------------------
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
        isActive
          ? "bg-foreground/[0.08] text-[#74ddc7]"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground/80"
      }`}
      style={isActive ? { color: "#74ddc7" } : undefined}
    >
      <item.icon
        className="h-4 w-4 shrink-0"
        style={isActive ? { color: "#74ddc7" } : undefined}
      />
      {item.label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SidebarContent — listener items only
// ---------------------------------------------------------------------------
function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {listenerItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
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
      <aside className="hidden lg:flex w-[200px] shrink-0 flex-col border-r border-border bg-sidebar pt-4">
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
              className="fixed left-0 top-14 bottom-14 z-50 w-[220px] overflow-y-auto bg-sidebar border-r border-border shadow-2xl pt-4"
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
