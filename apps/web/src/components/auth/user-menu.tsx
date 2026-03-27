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
// Role switcher options
// ---------------------------------------------------------------------------
const VIEWABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "promotions", label: "Advertising" },
  { value: "operations", label: "Operations" },
  { value: "gm", label: "General Manager" },
  { value: "traffic", label: "Traffic & Office" },
  { value: "admin", label: "Admin" },
];

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

  const currentActiveMode: ViewMode =
    isOverrideActive && roleOverride === "content_creator"
      ? "creator"
      : isOverrideActive && roleOverride === "vendor"
        ? "vendor"
        : "listener";

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
        {/* User info */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />

        {/* Listener / Creator toggle */}
        <div className="px-2 py-1.5">
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
        </div>
        <DropdownMenuSeparator />

        {/* Mode-specific navigation */}
        <DropdownMenuGroup>
          {currentActiveMode === "listener" ? (
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
                <Link href="/my/admin/production">
                  <Clapperboard className="mr-2 h-4 w-4" />
                  Production Queue
                </Link>
              </DropdownMenuItem>
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

        {/* Role-specific section (admin overrides) */}
        {currentActiveMode === "listener" && roleSection.items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {roleSection.label && (
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {roleSection.label}
              </DropdownMenuLabel>
            )}
            <DropdownMenuGroup>
              {roleSection.items.map((item) => (
                <DropdownMenuItem key={item.href + item.label} asChild>
                  <Link href={item.href}>
                    {item.icon}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {/* Station Control (admin) */}
        {(isAdmin || isSuperAdmin) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/my/admin" className="text-[#dc2626]">
                <Shield className="mr-2 h-4 w-4" />
                Station Control
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Role switcher */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Eye className="mr-2 h-4 w-4" />
            {isOverrideActive ? (
              <span className="capitalize text-[#f59e0b]">
                {roleOverride?.replace("_", " ")}
              </span>
            ) : (
              "View as role\u2026"
            )}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {isOverrideActive && (
              <>
                <DropdownMenuItem onClick={() => setRoleOverride(null)}>
                  <RotateCcw className="mr-2 h-4 w-4 text-[#f59e0b]" />
                  Reset to default
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {VIEWABLE_ROLES.map((r) => (
              <DropdownMenuItem
                key={r.value}
                onClick={() => setRoleOverride(r.value)}
                className={roleOverride === r.value ? "bg-accent" : ""}
              >
                {r.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Settings & Sign Out */}
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
