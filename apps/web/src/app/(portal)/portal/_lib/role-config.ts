import {
  DollarSign,
  Headphones,
  Mic,
  Megaphone,
  Radio,
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Music,
  Upload,
  CalendarDays,
  Star,
  Heart,
  Ticket,
  Image,
  CreditCard,
  TrendingUp,
  Target,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Role IDs
// ---------------------------------------------------------------------------

export type RoleId = "sales" | "dj" | "creator" | "advertiser" | "listener";

// ---------------------------------------------------------------------------
// Nav item shape
// ---------------------------------------------------------------------------

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Mock user shape
// ---------------------------------------------------------------------------

export interface MockUser {
  name: string;
  email: string;
  initials: string;
}

// ---------------------------------------------------------------------------
// Full role config shape
// ---------------------------------------------------------------------------

export interface RoleConfig {
  id: RoleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;   // hex
  accentBg: string;      // Tailwind class
  accentText: string;    // Tailwind class
  accentBorder: string;  // Tailwind class
  navItems: PortalNavItem[];
  mockUser: MockUser;
}

// ---------------------------------------------------------------------------
// All 5 role configs
// ---------------------------------------------------------------------------

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  sales: {
    id: "sales",
    label: "Sales Manager",
    shortLabel: "Sales",
    description: "Manage advertising clients, campaigns, and revenue targets",
    icon: DollarSign,
    accentColor: "#f97316",
    accentBg: "bg-[#f97316]/15",
    accentText: "text-[#f97316]",
    accentBorder: "border-[#f97316]/30",
    mockUser: {
      name: "Marcus Thompson",
      email: "marcus.t@wccg.fm",
      initials: "MT",
    },
    navItems: [
      { href: "/portal/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/portal/overview#clients", label: "Clients", icon: Users },
      { href: "/portal/overview#campaigns", label: "Campaigns", icon: Target },
      { href: "/portal/overview#revenue", label: "Revenue", icon: TrendingUp },
      { href: "/portal/overview#proposals", label: "Proposals", icon: FileText },
    ],
  },
  dj: {
    id: "dj",
    label: "DJ / Host",
    shortLabel: "DJ",
    description: "Manage your shows, upload mixes, and track your audience",
    icon: Headphones,
    accentColor: "#74ddc7",
    accentBg: "bg-[#74ddc7]/15",
    accentText: "text-[#74ddc7]",
    accentBorder: "border-[#74ddc7]/30",
    mockUser: {
      name: "DJ SpinWiz",
      email: "spinwiz@wccg.fm",
      initials: "SW",
    },
    navItems: [
      { href: "/portal/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/portal/overview#shows", label: "My Shows", icon: Radio },
      { href: "/portal/overview#mixes", label: "My Mixes", icon: Music },
      { href: "/portal/overview#upload", label: "Upload Mix", icon: Upload },
      { href: "/portal/overview#schedule", label: "Schedule", icon: CalendarDays },
    ],
  },
  creator: {
    id: "creator",
    label: "Content Creator",
    shortLabel: "Creator",
    description: "Create podcasts, music content, and grow your audience",
    icon: Mic,
    accentColor: "#7401df",
    accentBg: "bg-[#7401df]/15",
    accentText: "text-[#7401df]",
    accentBorder: "border-[#7401df]/30",
    mockUser: {
      name: "Aisha Reynolds",
      email: "aisha.r@wccg.fm",
      initials: "AR",
    },
    navItems: [
      { href: "/portal/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/portal/overview#podcasts", label: "Podcasts", icon: Mic },
      { href: "/portal/overview#music", label: "Music", icon: Music },
      { href: "/portal/overview#upload", label: "Upload", icon: Upload },
      { href: "/portal/overview#analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  advertiser: {
    id: "advertiser",
    label: "Advertiser",
    shortLabel: "Advertiser",
    description: "Manage ad campaigns, creatives, and track performance",
    icon: Megaphone,
    accentColor: "#ef4444",
    accentBg: "bg-[#ef4444]/15",
    accentText: "text-[#ef4444]",
    accentBorder: "border-[#ef4444]/30",
    mockUser: {
      name: "Jordan Williams",
      email: "jordan.w@adcorp.com",
      initials: "JW",
    },
    navItems: [
      { href: "/portal/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/portal/overview#campaigns", label: "Campaigns", icon: Target },
      { href: "/portal/overview#creative", label: "Ad Creative", icon: Image },
      { href: "/portal/overview#analytics", label: "Analytics", icon: BarChart3 },
      { href: "/portal/overview#billing", label: "Billing", icon: CreditCard },
    ],
  },
  listener: {
    id: "listener",
    label: "Listener",
    shortLabel: "Listener",
    description: "Earn points, save favorites, and manage event tickets",
    icon: Radio,
    accentColor: "#3b82f6",
    accentBg: "bg-[#3b82f6]/15",
    accentText: "text-[#3b82f6]",
    accentBorder: "border-[#3b82f6]/30",
    mockUser: {
      name: "Taylor Jackson",
      email: "taylor.j@gmail.com",
      initials: "TJ",
    },
    navItems: [
      { href: "/portal/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/portal/overview#points", label: "Points", icon: Star },
      { href: "/portal/overview#favorites", label: "Favorites", icon: Heart },
      { href: "/portal/overview#tickets", label: "Tickets", icon: Ticket },
      { href: "/portal/overview#events", label: "Events", icon: CalendarDays },
    ],
  },
};

export const ROLE_IDS: RoleId[] = ["sales", "dj", "creator", "advertiser", "listener"];
