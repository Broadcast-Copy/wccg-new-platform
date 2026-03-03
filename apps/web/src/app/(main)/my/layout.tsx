"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Star,
  Heart,
  Ticket,
  Clock,
  CalendarDays,
  Building2,
  Mic,
  Music,
  Menu,
  X,
  User,
  Shield,
} from "lucide-react";

const sidebarItems = [
  { href: "/my", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/my/points", label: "Points & Rewards", icon: Star },
  { href: "/my/favorites", label: "Favorites", icon: Heart },
  { href: "/my/tickets", label: "My Tickets", icon: Ticket },
  { href: "/my/history", label: "Listening History", icon: Clock },
  { href: "/my/events", label: "My Events", icon: CalendarDays },
  { href: "/my/directory", label: "My Directory", icon: Building2 },
  { href: "/my/podcasts", label: "My Podcasts", icon: Mic },
  { href: "/mixes", label: "My Mixes", icon: Music },
];

function SidebarContent({ pathname }: { pathname: string }) {
  const { user } = useAuth();

  return (
    <>
      {/* User info */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
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

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 p-2">
        {sidebarItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-foreground/[0.08] text-[#74ddc7]"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground/80"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-[#74ddc7]" : "text-muted-foreground"
                }`}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Admin divider + Station Control */}
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
        {/* Toggle button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#74ddc7] text-background shadow-lg"
          aria-label="Toggle dashboard menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed left-0 top-14 bottom-14 z-50 w-[260px] overflow-y-auto bg-sidebar border-r border-border shadow-2xl">
              <div onClick={() => setMobileOpen(false)}>
                <SidebarContent pathname={pathname} />
              </div>
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
