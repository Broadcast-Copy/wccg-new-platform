"use client";

import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, type UserRole } from "@/hooks/use-user-roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Calendar,
  CalendarDays,
  Clapperboard,
  Clock,
  DollarSign,
  Eye,
  FolderOpen,
  Gift,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Mic,
  Palette,
  Radio,
  Receipt,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Lock,
  Package,
  Music,
  Users,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Role-specific menu items
// ---------------------------------------------------------------------------

interface RoleSection {
  label: string;
  items: { href: string; label: string; icon: React.ReactNode }[];
}

function getRoleSection(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isCreator: boolean;
  isHost: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}): RoleSection {
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
        { href: "/my/admin/campaigns", label: "Campaigns", icon: <Megaphone className="mr-2 h-4 w-4" /> },
        { href: "/my/admin/reports", label: "Reports", icon: <BarChart3 className="mr-2 h-4 w-4" /> },
        { href: "/my/admin/programming", label: "Programming", icon: <Radio className="mr-2 h-4 w-4" /> },
        { href: "/my/events", label: "Events Manager", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
        { href: "/my/studio", label: "Broadcast Studio", icon: <Clapperboard className="mr-2 h-4 w-4" /> },
        { href: "/my/mixes", label: "Media Manager", icon: <FolderOpen className="mr-2 h-4 w-4" /> },
      ],
    };
  }

  if (isManagement || isProduction || isCreator || isHost) {
    return {
      label: "Creator",
      items: [
        { href: "/my/admin/programming", label: "Programming", icon: <Radio className="mr-2 h-4 w-4" /> },
        { href: "/my/admin/production", label: "Production Queue", icon: <Clapperboard className="mr-2 h-4 w-4" /> },
        { href: "/my/studio", label: "Broadcast Studio", icon: <Mic className="mr-2 h-4 w-4" /> },
        { href: "/my/mixes", label: "Media Manager", icon: <FolderOpen className="mr-2 h-4 w-4" /> },
        { href: "/my/events", label: "Events Manager", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
        { href: "/creators", label: "Creator Hub", icon: <Palette className="mr-2 h-4 w-4" /> },
      ],
    };
  }

  if (isPromotions) {
    return {
      label: "Marketing",
      items: [
        { href: "/my/marketing/campaigns", label: "Campaigns", icon: <Megaphone className="mr-2 h-4 w-4" /> },
        { href: "/my/marketing/campaign-builder", label: "Campaign Builder", icon: <Briefcase className="mr-2 h-4 w-4" /> },
        { href: "/my/events", label: "Events Manager", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
        { href: "/contests", label: "Contests", icon: <Gift className="mr-2 h-4 w-4" /> },
      ],
    };
  }

  if (isSales) {
    return {
      label: "Sales",
      items: [
        { href: "/my/sales", label: "Sales Dashboard", icon: <DollarSign className="mr-2 h-4 w-4" /> },
        { href: "/my/admin/reports", label: "Reports", icon: <BarChart3 className="mr-2 h-4 w-4" /> },
        { href: "/my/sales/invoices", label: "Invoices", icon: <Receipt className="mr-2 h-4 w-4" /> },
        { href: "/my/events", label: "Events Manager", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
      ],
    };
  }

  return { label: "", items: [] };
}


// ---------------------------------------------------------------------------
// Listener / Creator Toggle (inline for the dropdown)
// ---------------------------------------------------------------------------
type ViewMode = "listener" | "creator" | "vendor";

function ListenerCreatorToggle({
  activeMode,
  onModeChange,
}: {
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}) {
  const modes: { value: ViewMode; label: string; activeColor: string }[] = [
    { value: "creator", label: "Creator", activeColor: "#7401df" },
    { value: "listener", label: "Listener", activeColor: "#74ddc7" },
    { value: "vendor", label: "Vendor", activeColor: "#f59e0b" },
  ];

  return (
    <div className="inline-flex w-full items-center justify-center rounded-full border border-border bg-muted/50 p-px">
      {modes.map(({ value, label, activeColor }) => {
        const isActive = activeMode === value;
        const needsLock = value !== "listener" && !isActive;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className="flex-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all text-center inline-flex items-center justify-center gap-0.5"
            style={
              isActive
                ? { backgroundColor: activeColor, color: value === "creator" ? "#fff" : "#0a0a0f" }
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
// Component
// ---------------------------------------------------------------------------

export function UserMenu() {
  const { user, signOut, isLoading } = useAuth();
  const {
    isAdmin,
    isSuperAdmin,
    isHost,
    isSales,
    isManagement,
    isProduction,
    isPromotions,
    isCreator,
    roleOverride,
    isOverrideActive,
    setRoleOverride,
  } = useUserRoles();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Sign Up</Link>
        </Button>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  const roleSection = getRoleSection({
    isSales,
    isProduction,
    isManagement,
    isPromotions,
    isCreator,
    isHost,
    isAdmin,
    isSuperAdmin,
  });

  const adminRoles = ["operations", "production", "sales"];
  const isAdminMode = isOverrideActive && roleOverride !== null && adminRoles.includes(roleOverride);

  // Mock notification counts for admin sections
  const adminNotifications = { production: 3, sales: 2 };
  const totalAdminNotifications = adminNotifications.production + adminNotifications.sales;

  const currentActiveMode: ViewMode =
    isOverrideActive && roleOverride === "content_creator"
      ? "creator"
      : isOverrideActive && roleOverride === "vendor"
        ? "vendor"
        : "listener";

  const currentAdminMode = isAdminMode ? (roleOverride as string) : "production";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end">
        {/* User info + Admin toggle */}
        <div className="px-2 py-1.5">
          <div className="flex items-start justify-between mb-0.5">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isAdminMode) {
                  setRoleOverride(null);
                } else {
                  setRoleOverride("production");
                }
              }}
              className={`relative inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold transition-all shrink-0 ${
                isAdminMode
                  ? "bg-[#dc2626] text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Shield className="h-2.5 w-2.5" />
              {isAdminMode ? "Exit" : "Admin"}
              {!isAdminMode && totalAdminNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#dc2626] text-[7px] font-bold text-white px-0.5 ring-1 ring-card">
                  {totalAdminNotifications}
                </span>
              )}
            </button>
          </div>
        </div>
        <DropdownMenuSeparator />

        {/* Toggle section */}
        <div className="px-2 py-1.5 space-y-2">
          {isAdminMode ? (
            /* Admin mode toggle: Operations | Production | Sales */
            <div className="inline-flex w-full items-center justify-center rounded-full border border-[#dc2626]/30 bg-[#dc2626]/5 p-px">
              {([
                { value: "operations", label: "Operations", needsLock: true, notifCount: 0 },
                { value: "production", label: "Production", needsLock: false, notifCount: adminNotifications.production },
                { value: "sales", label: "Sales", needsLock: true, notifCount: adminNotifications.sales },
              ] as const).map(({ value, label, needsLock, notifCount }) => {
                const active = roleOverride === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRoleOverride(value)}
                    className="relative flex-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-all text-center inline-flex items-center justify-center gap-0.5"
                    style={active ? { backgroundColor: "#dc2626", color: "#fff" } : undefined}
                  >
                    {needsLock && !active && <Lock className="h-2.5 w-2.5 opacity-40" />}
                    {label}
                    {notifCount > 0 && (
                      <span className="absolute -top-1 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#dc2626] text-[7px] font-bold text-white px-0.5 ring-1 ring-card">
                        {notifCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* User mode toggle: Creator | Listener | Vendor */
            <ListenerCreatorToggle
              activeMode={currentActiveMode}
              onModeChange={(mode) => {
                if (mode === "listener") {
                  setRoleOverride(null);
                } else if (mode === "creator") {
                  setRoleOverride("content_creator");
                } else if (mode === "vendor") {
                  setRoleOverride("vendor");
                }
              }}
            />
          )}
        </div>
        <DropdownMenuSeparator />

        {/* Mode-specific navigation */}
        <DropdownMenuGroup
          className={
            isAdminMode
              ? "[&_[data-slot=dropdown-menu-item]:focus]:bg-[#dc2626]/10 [&_[data-slot=dropdown-menu-item]:focus]:text-[#dc2626]"
              : currentActiveMode === "creator"
                ? "[&_[data-slot=dropdown-menu-item]:focus]:bg-[#7401df]/10 [&_[data-slot=dropdown-menu-item]:focus]:text-[#7401df]"
                : currentActiveMode === "vendor"
                  ? "[&_[data-slot=dropdown-menu-item]:focus]:bg-[#f59e0b]/10 [&_[data-slot=dropdown-menu-item]:focus]:text-[#f59e0b]"
                  : "[&_[data-slot=dropdown-menu-item]:focus]:bg-[#74ddc7]/10 [&_[data-slot=dropdown-menu-item]:focus]:text-[#0a0a0f]"
          }
        >
          {isAdminMode ? (
            <>
              {roleOverride === "operations" ? (
                <>
                  <DropdownMenuItem asChild><Link href="/my/admin"><Shield className="mr-2 h-4 w-4" />Admin Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/directory"><Store className="mr-2 h-4 w-4" />Listings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/admin/programming"><Users className="mr-2 h-4 w-4" />Users</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/admin/operations/shifts"><CalendarDays className="mr-2 h-4 w-4" />Scheduling</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/admin/operations"><Settings className="mr-2 h-4 w-4" />System Control</Link></DropdownMenuItem>
                </>
              ) : roleOverride === "sales" ? (
                <>
                  <DropdownMenuItem asChild><Link href="/my/sales"><BarChart3 className="mr-2 h-4 w-4" />Sales Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/sales/clients"><Briefcase className="mr-2 h-4 w-4" />Advertisers</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/marketing/campaigns"><Megaphone className="mr-2 h-4 w-4" />Campaigns</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/admin/gm/revenue"><DollarSign className="mr-2 h-4 w-4" />Revenue</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/sales/pipeline"><Receipt className="mr-2 h-4 w-4" />Proposals</Link></DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link href="/my/admin/production"><Clapperboard className="mr-2 h-4 w-4" />Content</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/studio"><Mic className="mr-2 h-4 w-4" />Audio Studio</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/mixes"><FolderOpen className="mr-2 h-4 w-4" />Media Manager</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/creators"><Palette className="mr-2 h-4 w-4" />Creators</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my/vendor/media"><Music className="mr-2 h-4 w-4" />Uploads</Link></DropdownMenuItem>
                </>
              )}
            </>
          ) : currentActiveMode === "listener" ? (
            <>
              <DropdownMenuItem asChild>
                <Link href="/my">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/points">
                  <Star className="mr-2 h-4 w-4" />
                  Points & Rewards
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/favorites">
                  <Heart className="mr-2 h-4 w-4" />
                  Favorites
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/places">
                  <MapPin className="mr-2 h-4 w-4" />
                  My Places
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/tickets">
                  <Ticket className="mr-2 h-4 w-4" />
                  My Tickets
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/history">
                  <Clock className="mr-2 h-4 w-4" />
                  Listening History
                </Link>
              </DropdownMenuItem>
            </>
          ) : currentActiveMode === "creator" ? (
            <>
              <DropdownMenuItem asChild>
                <Link href="/my/studio">
                  <Mic className="mr-2 h-4 w-4" />
                  Broadcast Studio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/mixes">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Media Manager
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/creators">
                  <Palette className="mr-2 h-4 w-4" />
                  Creator Hub
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/events">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Events Manager
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/storefront">
                  <Store className="mr-2 h-4 w-4" />
                  Storefront Manager
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/products">
                  <Package className="mr-2 h-4 w-4" />
                  Products
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/bookings">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Bookings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/events">
                  <Megaphone className="mr-2 h-4 w-4" />
                  Events
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/tokens">
                  <Gift className="mr-2 h-4 w-4" />
                  Listener Tokens
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/customers">
                  <Users className="mr-2 h-4 w-4" />
                  Customers
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my/vendor/media">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Media Tracking
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem asChild>
          <Link href="/my/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
