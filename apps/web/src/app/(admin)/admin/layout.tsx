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
  Home,
  ExternalLink,
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

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/streams", label: "Streams", icon: Radio },
  { href: "/admin/shows", label: "Shows", icon: Mic },
  { href: "/admin/hosts", label: "Hosts", icon: UsersIcon },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/directory", label: "Directory", icon: MapPin },
  { href: "/admin/mixes", label: "DJ Mixes", icon: Disc3 },
  { href: "/admin/points", label: "Points & Rewards", icon: Gift },
  { href: "/admin/moderation", label: "Moderation", icon: Shield },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/roles", label: "Roles & Testing", icon: UserCog },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 p-4">
      {adminNavItems.map((item) => {
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
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="text-lg font-bold">
            WCCG Admin
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <SidebarNav />
          <div className="border-t p-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to site
            </Link>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="flex h-16 items-center gap-4 border-b px-6">
          {/* Mobile menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>WCCG Admin</SheetTitle>
              </SheetHeader>
              <div onClick={() => setSheetOpen(false)}>
                <SidebarNav />
              </div>
              <div className="border-t p-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setSheetOpen(false)}
                >
                  <ArrowLeft className="size-4" />
                  Back to site
                </Link>
              </div>
            </SheetContent>
          </Sheet>
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href="/">
                <Home className="size-4" />
                <span className="hidden sm:inline">Homepage</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
              <Link href="/portal">
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Portal</span>
              </Link>
            </Button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
