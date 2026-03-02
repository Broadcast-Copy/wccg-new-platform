"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Radio,
  Mic,
  Users as UsersIcon,
  Calendar,
  CalendarClock,
  Gift,
  Menu,
  ArrowLeft,
  MapPin,
  Disc3,
  Shield,
  ScrollText,
  BarChart3,
  Settings,
  UserCog,
  FileText,
  Megaphone,
  Navigation,
  LogOut,
  Podcast,
  ListMusic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Content Management",
    items: [
      { href: "/admin/content", label: "Site Content", icon: FileText },
      { href: "/admin/ads", label: "Ad Placements", icon: Megaphone },
      { href: "/admin/navigation", label: "Navigation", icon: Navigation },
    ],
  },
  {
    label: "Station",
    items: [
      { href: "/admin/streams", label: "Streams", icon: Radio },
      { href: "/admin/shows", label: "Shows", icon: Mic },
      { href: "/admin/hosts", label: "Hosts", icon: UsersIcon },
      { href: "/admin/schedule", label: "Schedule", icon: CalendarClock },
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/directory", label: "Directory", icon: MapPin },
      { href: "/admin/mixes", label: "DJ Mixes", icon: Disc3 },
    ],
  },
  {
    label: "Creator Studio",
    items: [
      { href: "/admin/podcasts", label: "Podcasts", icon: Podcast },
      { href: "/admin/podcasts/episodes", label: "Episodes", icon: ListMusic },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/points", label: "Points & Rewards", icon: Gift },
      { href: "/admin/moderation", label: "Moderation", icon: Shield },
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/roles", label: "Roles & Testing", icon: UserCog },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 p-4">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#74ddc7]/15 text-[#74ddc7] border border-[#74ddc7]/30"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#0d0d14] md:block">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#74ddc7] to-[#0d9488]">
              <Radio className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">WCCG Admin</span>
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <SidebarNav />
          <div className="border-t border-white/[0.06] p-4 space-y-2">
            {user && (
              <div className="px-3 py-2">
                <p className="text-xs text-white/30 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/70 transition-colors"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl px-6">
          {/* Mobile menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-white/50 hover:text-white">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-[#0d0d14] border-white/[0.06]">
              <SheetHeader className="border-b border-white/[0.06] px-6 py-4">
                <SheetTitle className="text-white">WCCG Admin</SheetTitle>
              </SheetHeader>
              <div onClick={() => setSheetOpen(false)}>
                <SidebarNav />
              </div>
            </SheetContent>
          </Sheet>
          <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-2.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">Admin V2</span>
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
