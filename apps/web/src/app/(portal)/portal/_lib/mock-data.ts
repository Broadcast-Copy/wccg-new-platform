import type { RoleId } from "./role-config";
import type { LucideIcon } from "lucide-react";
import {
  DollarSign,
  Users,
  Target,
  FileText,
  Headphones,
  Music,
  Play,
  Radio,
  Mic,
  BarChart3,
  Megaphone,
  Eye,
  MousePointerClick,
  CreditCard,
  Star,
  Ticket,
  Heart,
  TrendingUp,
  Upload,
  CalendarDays,
  Image,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Stat card shape
// ---------------------------------------------------------------------------

export interface StatCard {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;   // Tailwind text class
  bgColor: string; // Tailwind bg class
}

// ---------------------------------------------------------------------------
// Activity item shape
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  icon: LucideIcon;
  color: string;
}

// ---------------------------------------------------------------------------
// Quick action shape
// ---------------------------------------------------------------------------

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Combined mock data per role
// ---------------------------------------------------------------------------

export interface RoleMockData {
  stats: StatCard[];
  activity: ActivityItem[];
  actions: QuickAction[];
}

// ---------------------------------------------------------------------------
// Sales mock data
// ---------------------------------------------------------------------------

const salesData: RoleMockData = {
  stats: [
    { title: "Monthly Revenue", value: "$42,580", icon: DollarSign, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
    { title: "Active Campaigns", value: "23", icon: Target, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10" },
    { title: "Client Accounts", value: "47", icon: Users, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10" },
    { title: "Pending Proposals", value: "8", icon: FileText, color: "text-[#7401df]", bgColor: "bg-[#7401df]/10" },
  ],
  activity: [
    { id: "s1", text: "New campaign signed — Fayetteville Auto Group", time: "2 hours ago", icon: Target, color: "text-[#f97316]" },
    { id: "s2", text: "Proposal accepted by Cape Fear Valley Health", time: "5 hours ago", icon: FileText, color: "text-green-500" },
    { id: "s3", text: "Invoice paid — $3,200 from CrossFit Fayetteville", time: "1 day ago", icon: DollarSign, color: "text-[#74ddc7]" },
    { id: "s4", text: "New client inquiry from Bragg Blvd. Motors", time: "1 day ago", icon: Users, color: "text-[#3b82f6]" },
    { id: "s5", text: "Campaign performance report generated", time: "2 days ago", icon: BarChart3, color: "text-[#7401df]" },
  ],
  actions: [
    { label: "Create Proposal", href: "#proposals", icon: FileText },
    { label: "View Campaigns", href: "#campaigns", icon: Target },
    { label: "Add Client", href: "#clients", icon: Users },
  ],
};

// ---------------------------------------------------------------------------
// DJ mock data
// ---------------------------------------------------------------------------

const djData: RoleMockData = {
  stats: [
    { title: "Total Mixes", value: "24", icon: Music, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10" },
    { title: "Total Plays", value: "12,847", icon: Play, color: "text-[#7401df]", bgColor: "bg-[#7401df]/10" },
    { title: "Active Shows", value: "3", icon: Radio, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
  ],
  activity: [
    { id: "d1", text: "Mix \"Friday Night Fire Vol. 12\" hit 500 plays", time: "3 hours ago", icon: Play, color: "text-[#74ddc7]" },
    { id: "d2", text: "New show slot assigned — Saturday Night Mixtape", time: "1 day ago", icon: Radio, color: "text-[#f97316]" },
    { id: "d3", text: "Mix \"Summer Vibes 2026\" uploaded successfully", time: "2 days ago", icon: Upload, color: "text-[#7401df]" },
    { id: "d4", text: "Profile updated with new bio", time: "3 days ago", icon: Headphones, color: "text-[#3b82f6]" },
    { id: "d5", text: "Schedule change: moved to 8 PM slot on Fridays", time: "5 days ago", icon: CalendarDays, color: "text-[#ef4444]" },
  ],
  actions: [
    { label: "Upload Mix", href: "#upload", icon: Upload },
    { label: "View Shows", href: "#shows", icon: Radio },
    { label: "Edit Profile", href: "#profile", icon: Headphones },
  ],
};

// ---------------------------------------------------------------------------
// Creator mock data
// ---------------------------------------------------------------------------

const creatorData: RoleMockData = {
  stats: [
    { title: "Published Tracks", value: "18", icon: Music, color: "text-[#7401df]", bgColor: "bg-[#7401df]/10" },
    { title: "Podcast Episodes", value: "42", icon: Mic, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10" },
    { title: "Total Streams", value: "8,293", icon: Play, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
    { title: "Followers", value: "1,247", icon: Users, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10" },
  ],
  activity: [
    { id: "c1", text: "Episode \"Community Voices #42\" published", time: "1 hour ago", icon: Mic, color: "text-[#7401df]" },
    { id: "c2", text: "Track \"Fayetteville Anthem\" gained 200 streams", time: "6 hours ago", icon: TrendingUp, color: "text-[#74ddc7]" },
    { id: "c3", text: "New follower milestone: 1,200 followers", time: "1 day ago", icon: Users, color: "text-[#3b82f6]" },
    { id: "c4", text: "Podcast featured in \"Local Voices\" playlist", time: "2 days ago", icon: Star, color: "text-[#f97316]" },
    { id: "c5", text: "Analytics report available for February", time: "3 days ago", icon: BarChart3, color: "text-[#ef4444]" },
  ],
  actions: [
    { label: "Upload Content", href: "#upload", icon: Upload },
    { label: "View Analytics", href: "#analytics", icon: BarChart3 },
    { label: "Manage Podcasts", href: "#podcasts", icon: Mic },
  ],
};

// ---------------------------------------------------------------------------
// Advertiser mock data
// ---------------------------------------------------------------------------

const advertiserData: RoleMockData = {
  stats: [
    { title: "Active Ads", value: "5", icon: Megaphone, color: "text-[#ef4444]", bgColor: "bg-[#ef4444]/10" },
    { title: "Impressions", value: "145,200", icon: Eye, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10" },
    { title: "Click-Through Rate", value: "3.2%", icon: MousePointerClick, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10" },
    { title: "Monthly Spend", value: "$2,450", icon: CreditCard, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
  ],
  activity: [
    { id: "a1", text: "Ad \"Spring Sale Banner\" approved and live", time: "1 hour ago", icon: Megaphone, color: "text-[#ef4444]" },
    { id: "a2", text: "Campaign \"March Madness Promo\" reached 50K impressions", time: "4 hours ago", icon: Eye, color: "text-[#3b82f6]" },
    { id: "a3", text: "New creative uploaded for review", time: "1 day ago", icon: Image, color: "text-[#7401df]" },
    { id: "a4", text: "Monthly invoice generated — $2,450.00", time: "2 days ago", icon: CreditCard, color: "text-[#f97316]" },
    { id: "a5", text: "CTR improved by 0.4% on \"Weekend Events\" ad", time: "3 days ago", icon: TrendingUp, color: "text-[#74ddc7]" },
  ],
  actions: [
    { label: "Create Ad", href: "#creative", icon: Image },
    { label: "View Campaigns", href: "#campaigns", icon: Target },
    { label: "Billing History", href: "#billing", icon: CreditCard },
  ],
};

// ---------------------------------------------------------------------------
// Listener mock data
// ---------------------------------------------------------------------------

const listenerData: RoleMockData = {
  stats: [
    { title: "Points Balance", value: "2,750", icon: Star, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
    { title: "Event Tickets", value: "3", icon: Ticket, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10" },
    { title: "Favorites", value: "12", icon: Heart, color: "text-[#ef4444]", bgColor: "bg-[#ef4444]/10" },
  ],
  activity: [
    { id: "l1", text: "Earned 50 points for listening to WCCG live", time: "30 min ago", icon: Star, color: "text-[#f97316]" },
    { id: "l2", text: "Registered for \"Spring Fest 2026\" event", time: "2 hours ago", icon: Ticket, color: "text-[#3b82f6]" },
    { id: "l3", text: "Added \"Friday Night Fire\" to favorites", time: "1 day ago", icon: Heart, color: "text-[#ef4444]" },
    { id: "l4", text: "Redeemed 500 points for WCCG merch", time: "3 days ago", icon: Star, color: "text-[#7401df]" },
    { id: "l5", text: "Checked in at WCCG Community Day event", time: "5 days ago", icon: CalendarDays, color: "text-[#74ddc7]" },
  ],
  actions: [
    { label: "Browse Events", href: "#events", icon: CalendarDays },
    { label: "View Rewards", href: "#points", icon: Star },
    { label: "My Favorites", href: "#favorites", icon: Heart },
  ],
};

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export const MOCK_DATA: Record<RoleId, RoleMockData> = {
  sales: salesData,
  dj: djData,
  creator: creatorData,
  advertiser: advertiserData,
  listener: listenerData,
};
