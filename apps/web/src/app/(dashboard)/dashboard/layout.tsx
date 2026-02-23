"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  User,
  Radio,
  Music,
  Upload,
  Menu,
  ArrowLeft,
  Headphones,
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

const djNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
  { href: "/dashboard/shows", label: "My Shows", icon: Radio },
  { href: "/dashboard/mixes", label: "My Mixes", icon: Music },
  { href: "/dashboard/mixes/upload", label: "Upload Mix", icon: Upload },
];

function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 p-4">
      {djNavItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        // Avoid /dashboard/mixes matching /dashboard/mixes/upload when on upload page
        const isExactMixes =
          item.href === "/dashboard/mixes" &&
          pathname.startsWith("/dashboard/mixes/upload");
        const active = isActive && !isExactMixes;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[#74ddc7]/15 text-[#74ddc7] border border-[#74ddc7]/30"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d0d14] md:block">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <Headphones className="size-5 text-[#74ddc7]" />
          <Link href="/dashboard" className="text-lg font-bold text-white">
            DJ <span className="text-[#74ddc7]">Dashboard</span>
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <SidebarNav />
          <div className="border-t border-white/10 p-4">
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
        <header className="flex h-16 items-center gap-4 border-b border-white/10 bg-[#0d0d14]/80 px-6 backdrop-blur-sm">
          {/* Mobile menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 border-white/10 bg-[#0d0d14] p-0"
            >
              <SheetHeader className="border-b border-white/10 px-6 py-4">
                <SheetTitle className="flex items-center gap-2 text-white">
                  <Headphones className="size-5 text-[#74ddc7]" />
                  DJ <span className="text-[#74ddc7]">Dashboard</span>
                </SheetTitle>
              </SheetHeader>
              <div onClick={() => setSheetOpen(false)}>
                <SidebarNav />
              </div>
              <div className="border-t border-white/10 p-4">
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
          <div className="flex items-center gap-2">
            <Headphones className="size-5 text-[#74ddc7] md:hidden" />
            <h2 className="text-lg font-semibold text-white">
              DJ <span className="text-[#74ddc7]">Dashboard</span>
            </h2>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
