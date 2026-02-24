"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Menu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_CONFIGS, type RoleId } from "./_lib/role-config";
import RoleSwitcher from "./_components/role-switcher";

// ---------------------------------------------------------------------------
// DemoRole context (inline — no separate file needed)
// ---------------------------------------------------------------------------

interface DemoRoleCtx {
  role: RoleId | null;
  setRole: (r: RoleId | null) => void;
}

const DemoRoleContext = createContext<DemoRoleCtx>({
  role: null,
  setRole: () => {},
});

export function useDemoRole() {
  return useContext(DemoRoleContext);
}

// ---------------------------------------------------------------------------
// Sidebar nav for the selected role
// ---------------------------------------------------------------------------

function SidebarNav({ role }: { role: RoleId }) {
  const pathname = usePathname();
  const config = ROLE_CONFIGS[role];

  return (
    <nav className="space-y-1 p-4">
      {config.navItems.map((item) => {
        const isActive =
          item.href === "/portal/overview"
            ? pathname === "/portal/overview"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? `${config.accentBg} ${config.accentText} border ${config.accentBorder}`
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

// ---------------------------------------------------------------------------
// Portal layout
// ---------------------------------------------------------------------------

const STORAGE_KEY = "wccg-portal-role";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleId | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as RoleId | null;
    if (stored && stored in ROLE_CONFIGS) {
      setRoleState(stored);
    }
    setMounted(true);
  }, []);

  function setRole(r: RoleId | null) {
    setRoleState(r);
    if (r) {
      localStorage.setItem(STORAGE_KEY, r);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function handleRoleSwitch(newRole: RoleId) {
    setRole(newRole);
    router.push("/portal/overview");
  }

  // Don't render until client hydrated to avoid mismatch
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-[#74ddc7]" />
      </div>
    );
  }

  // If on the role selection page (/portal) or no role selected — render without sidebar
  const isSelectionPage = pathname === "/portal";
  if (isSelectionPage || !role) {
    return (
      <DemoRoleContext.Provider value={{ role, setRole }}>
        <div className="min-h-screen bg-[#0a0a0f]">{children}</div>
      </DemoRoleContext.Provider>
    );
  }

  // Role is selected — render full sidebar layout
  const config = ROLE_CONFIGS[role];
  const RoleIcon = config.icon;

  return (
    <DemoRoleContext.Provider value={{ role, setRole }}>
      <div className="flex min-h-screen bg-[#0a0a0f]">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d0d14] md:block">
          <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
            <RoleIcon className="size-5" style={{ color: config.accentColor }} />
            <Link href="/portal/overview" className="text-lg font-bold text-white">
              {config.shortLabel}{" "}
              <span style={{ color: config.accentColor }}>Portal</span>
            </Link>
            <Badge
              variant="outline"
              className="ml-auto border-white/20 text-[10px] text-muted-foreground"
            >
              Demo
            </Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <SidebarNav role={role} />

            {/* Role switcher */}
            <div className="border-t border-white/10 p-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Logged in as
              </p>
              <RoleSwitcher currentRole={role} onRoleChange={handleRoleSwitch} />
            </div>

            {/* Back to site */}
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
                    <RoleIcon
                      className="size-5"
                      style={{ color: config.accentColor }}
                    />
                    {config.shortLabel}{" "}
                    <span style={{ color: config.accentColor }}>Portal</span>
                  </SheetTitle>
                </SheetHeader>
                <div onClick={() => setSheetOpen(false)}>
                  <SidebarNav role={role} />
                </div>
                <div className="border-t border-white/10 p-4">
                  <RoleSwitcher currentRole={role} onRoleChange={(r) => { handleRoleSwitch(r); setSheetOpen(false); }} />
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
              <RoleIcon
                className="size-5 md:hidden"
                style={{ color: config.accentColor }}
              />
              <h2 className="text-lg font-semibold text-white">
                {config.shortLabel}{" "}
                <span style={{ color: config.accentColor }}>Dashboard</span>
              </h2>
              <Badge
                variant="outline"
                className="border-white/20 text-[10px] text-muted-foreground"
              >
                Demo
              </Badge>
            </div>

            {/* Desktop: mini role indicator */}
            <div className="ml-auto hidden items-center gap-2 md:flex">
              <div
                className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: config.accentColor }}
              >
                {config.mockUser.initials}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {config.mockUser.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {config.mockUser.email}
                </p>
              </div>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </DemoRoleContext.Provider>
  );
}
