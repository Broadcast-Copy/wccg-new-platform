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
  Shield,
  Activity,
  Settings,
  Database,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  Server,
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
  change?: string;   // e.g. "+12%" or "-3%"
  changeUp?: boolean;
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
// System health indicator (admin)
// ---------------------------------------------------------------------------

export interface HealthIndicator {
  label: string;
  status: "healthy" | "warning" | "critical";
  value: string;
  icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Campaign item (sales / advertiser)
// ---------------------------------------------------------------------------

export interface CampaignItem {
  id: string;
  name: string;
  client: string;
  status: "active" | "pending" | "completed" | "paused";
  budget: string;
  spent: string;
  impressions: string;
}

// ---------------------------------------------------------------------------
// Show item (DJ)
// ---------------------------------------------------------------------------

export interface ShowItem {
  id: string;
  name: string;
  day: string;
  time: string;
  status: "live" | "upcoming" | "recorded";
  listeners: string;
}

// ---------------------------------------------------------------------------
// Episode item (DJ / Creator)
// ---------------------------------------------------------------------------

export interface EpisodeItem {
  id: string;
  title: string;
  date: string;
  plays: string;
  duration: string;
}

// ---------------------------------------------------------------------------
// Content item (Creator)
// ---------------------------------------------------------------------------

export interface ContentItem {
  id: string;
  title: string;
  type: "podcast" | "music" | "video";
  status: "published" | "draft" | "review";
  plays: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Event item (Listener)
// ---------------------------------------------------------------------------

export interface EventItem {
  id: string;
  name: string;
  date: string;
  location: string;
  ticketStatus: "confirmed" | "available" | "sold-out";
}

// ---------------------------------------------------------------------------
// Listening history (Listener)
// ---------------------------------------------------------------------------

export interface ListeningItem {
  id: string;
  show: string;
  host: string;
  date: string;
  duration: string;
}

// ---------------------------------------------------------------------------
// Combined mock data per role
// ---------------------------------------------------------------------------

export interface RoleMockData {
  stats: StatCard[];
  activity: ActivityItem[];
  actions: QuickAction[];
  // Role-specific extended data
  healthIndicators?: HealthIndicator[];
  campaigns?: CampaignItem[];
  shows?: ShowItem[];
  episodes?: EpisodeItem[];
  contentItems?: ContentItem[];
  events?: EventItem[];
  listeningHistory?: ListeningItem[];
}

// ---------------------------------------------------------------------------
// Admin mock data
// ---------------------------------------------------------------------------

const adminData: RoleMockData = {
  stats: [
    { title: "Total Users", value: "2,847", icon: Users, color: "text-[#10b981]", bgColor: "bg-[#10b981]/10", change: "+127", changeUp: true },
    { title: "Active Streams", value: "6", icon: Radio, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10", change: "+2", changeUp: true },
    { title: "Revenue MTD", value: "$45.2K", icon: DollarSign, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10", change: "+8.3%", changeUp: true },
    { title: "Events This Month", value: "8", icon: CalendarDays, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10", change: "+3", changeUp: true },
  ],
  activity: [
    { id: "ad1", text: "New user registration spike -- 47 users today", time: "1 hour ago", icon: Users, color: "text-[#10b981]" },
    { id: "ad2", text: "Stream WCCG-Main auto-restarted after timeout", time: "3 hours ago", icon: Radio, color: "text-[#74ddc7]" },
    { id: "ad3", text: "Monthly analytics report generated", time: "6 hours ago", icon: BarChart3, color: "text-[#3b82f6]" },
    { id: "ad4", text: "DJ SpinWiz approved as new host", time: "1 day ago", icon: Shield, color: "text-[#7401df]" },
    { id: "ad5", text: "System backup completed successfully", time: "1 day ago", icon: Database, color: "text-[#f97316]" },
  ],
  actions: [
    { label: "Manage Users", href: "/portal/users", icon: Users },
    { label: "Manage Shows", href: "/portal/shows", icon: Radio },
    { label: "View Reports", href: "/portal/overview#analytics", icon: BarChart3 },
    { label: "System Settings", href: "/portal/overview#settings", icon: Settings },
  ],
  healthIndicators: [
    { label: "API Server", status: "healthy", value: "99.9% uptime", icon: Server },
    { label: "Database", status: "healthy", value: "12ms avg latency", icon: Database },
    { label: "Stream Server", status: "warning", value: "87% capacity", icon: Radio },
    { label: "CDN", status: "healthy", value: "42ms avg response", icon: Zap },
  ],
};

// ---------------------------------------------------------------------------
// Sales mock data
// ---------------------------------------------------------------------------

const salesData: RoleMockData = {
  stats: [
    { title: "Active Campaigns", value: "12", icon: Target, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10", change: "+4", changeUp: true },
    { title: "Monthly Revenue", value: "$32K", icon: DollarSign, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10", change: "+12%", changeUp: true },
    { title: "New Leads", value: "8", icon: Users, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10", change: "+3", changeUp: true },
    { title: "Conversion Rate", value: "24%", icon: TrendingUp, color: "text-[#7401df]", bgColor: "bg-[#7401df]/10", change: "+2.1%", changeUp: true },
  ],
  activity: [
    { id: "s1", text: "New campaign signed -- Fayetteville Auto Group", time: "2 hours ago", icon: Target, color: "text-[#f97316]" },
    { id: "s2", text: "Proposal accepted by Cape Fear Valley Health", time: "5 hours ago", icon: FileText, color: "text-green-500" },
    { id: "s3", text: "Invoice paid -- $3,200 from CrossFit Fayetteville", time: "1 day ago", icon: DollarSign, color: "text-[#74ddc7]" },
    { id: "s4", text: "New client inquiry from Bragg Blvd. Motors", time: "1 day ago", icon: Users, color: "text-[#3b82f6]" },
    { id: "s5", text: "Campaign performance report generated", time: "2 days ago", icon: BarChart3, color: "text-[#7401df]" },
  ],
  actions: [
    { label: "New Campaign", href: "/portal/campaigns", icon: Target },
    { label: "View Pipeline", href: "/portal/campaigns", icon: TrendingUp },
    { label: "Add Client", href: "/portal/overview#clients", icon: Users },
  ],
  campaigns: [
    { id: "sc1", name: "Spring Auto Sale", client: "Fayetteville Auto Group", status: "active", budget: "$8,500", spent: "$4,200", impressions: "45.2K" },
    { id: "sc2", name: "Health Fair 2026", client: "Cape Fear Valley Health", status: "active", budget: "$12,000", spent: "$7,800", impressions: "89.1K" },
    { id: "sc3", name: "Gym Membership Push", client: "CrossFit Fayetteville", status: "pending", budget: "$3,500", spent: "$0", impressions: "0" },
    { id: "sc4", name: "Weekend Warriors", client: "Bragg Blvd. Motors", status: "active", budget: "$6,000", spent: "$3,100", impressions: "32.4K" },
    { id: "sc5", name: "Winter Clearance", client: "Downtown Boutique", status: "completed", budget: "$2,800", spent: "$2,800", impressions: "67.3K" },
    { id: "sc6", name: "Tax Season Special", client: "Liberty Tax Service", status: "active", budget: "$4,200", spent: "$1,900", impressions: "28.7K" },
  ],
};

// ---------------------------------------------------------------------------
// DJ mock data
// ---------------------------------------------------------------------------

const djData: RoleMockData = {
  stats: [
    { title: "Next Show", value: "in 2h", icon: Clock, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10" },
    { title: "Total Episodes", value: "156", icon: Music, color: "text-[#7401df]", bgColor: "bg-[#7401df]/10", change: "+4", changeUp: true },
    { title: "Listeners This Week", value: "12.4K", icon: Headphones, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10", change: "+18%", changeUp: true },
    { title: "Avg Rating", value: "4.8", icon: Star, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10", change: "+0.2", changeUp: true },
  ],
  activity: [
    { id: "d1", text: "Mix \"Friday Night Fire Vol. 12\" hit 500 plays", time: "3 hours ago", icon: Play, color: "text-[#74ddc7]" },
    { id: "d2", text: "New show slot assigned -- Saturday Night Mixtape", time: "1 day ago", icon: Radio, color: "text-[#f97316]" },
    { id: "d3", text: "Mix \"Summer Vibes 2026\" uploaded successfully", time: "2 days ago", icon: Upload, color: "text-[#7401df]" },
    { id: "d4", text: "Profile updated with new bio", time: "3 days ago", icon: Headphones, color: "text-[#3b82f6]" },
    { id: "d5", text: "Schedule change: moved to 8 PM slot on Fridays", time: "5 days ago", icon: CalendarDays, color: "text-[#ef4444]" },
  ],
  actions: [
    { label: "Go Live", href: "/portal/shows", icon: Radio },
    { label: "Upload Mix", href: "/portal/overview#upload", icon: Upload },
    { label: "Edit Show", href: "/portal/shows", icon: Music },
  ],
  shows: [
    { id: "ds1", name: "Friday Night Fire", day: "Friday", time: "8:00 PM - 10:00 PM", status: "upcoming", listeners: "3.2K" },
    { id: "ds2", name: "Saturday Night Mixtape", day: "Saturday", time: "9:00 PM - 11:00 PM", status: "upcoming", listeners: "4.1K" },
    { id: "ds3", name: "Midday Mix", day: "Wednesday", time: "12:00 PM - 2:00 PM", status: "recorded", listeners: "1.8K" },
  ],
  episodes: [
    { id: "de1", title: "Friday Night Fire Vol. 12", date: "Mar 1, 2026", plays: "542", duration: "1h 58m" },
    { id: "de2", title: "Saturday Mixtape: R&B Edition", date: "Feb 28, 2026", plays: "421", duration: "2h 05m" },
    { id: "de3", title: "Midday Mix: Soul Classics", date: "Feb 26, 2026", plays: "387", duration: "1h 45m" },
    { id: "de4", title: "Friday Night Fire Vol. 11", date: "Feb 22, 2026", plays: "612", duration: "2h 10m" },
    { id: "de5", title: "Summer Vibes 2026 Preview", date: "Feb 20, 2026", plays: "298", duration: "1h 30m" },
  ],
};

// ---------------------------------------------------------------------------
// Creator mock data
// ---------------------------------------------------------------------------

const creatorData: RoleMockData = {
  stats: [
    { title: "Published", value: "23", icon: CheckCircle, color: "text-[#7401df]", bgColor: "bg-[#7401df]/10", change: "+3", changeUp: true },
    { title: "Drafts", value: "5", icon: FileText, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
    { title: "Total Plays", value: "45.2K", icon: Play, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10", change: "+2.1K", changeUp: true },
    { title: "Subscribers", value: "1.2K", icon: Users, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10", change: "+89", changeUp: true },
  ],
  activity: [
    { id: "c1", text: "Episode \"Community Voices #42\" published", time: "1 hour ago", icon: Mic, color: "text-[#7401df]" },
    { id: "c2", text: "Track \"Fayetteville Anthem\" gained 200 streams", time: "6 hours ago", icon: TrendingUp, color: "text-[#74ddc7]" },
    { id: "c3", text: "New follower milestone: 1,200 subscribers", time: "1 day ago", icon: Users, color: "text-[#3b82f6]" },
    { id: "c4", text: "Podcast featured in \"Local Voices\" playlist", time: "2 days ago", icon: Star, color: "text-[#f97316]" },
    { id: "c5", text: "Analytics report available for February", time: "3 days ago", icon: BarChart3, color: "text-[#ef4444]" },
  ],
  actions: [
    { label: "Upload Music", href: "/portal/content", icon: Upload },
    { label: "New Podcast", href: "/portal/content", icon: Mic },
    { label: "Go to Studio", href: "/portal/content", icon: Music },
  ],
  contentItems: [
    { id: "ci1", title: "Community Voices #42", type: "podcast", status: "published", plays: "1,247", date: "Mar 3, 2026" },
    { id: "ci2", title: "Fayetteville Anthem", type: "music", status: "published", plays: "3,891", date: "Feb 28, 2026" },
    { id: "ci3", title: "Behind the Scenes Ep. 8", type: "video", status: "draft", plays: "0", date: "Mar 4, 2026" },
    { id: "ci4", title: "Community Voices #43", type: "podcast", status: "draft", plays: "0", date: "Mar 5, 2026" },
    { id: "ci5", title: "Late Night Grooves", type: "music", status: "published", plays: "2,103", date: "Feb 20, 2026" },
    { id: "ci6", title: "Studio Session Highlights", type: "video", status: "review", plays: "0", date: "Mar 2, 2026" },
    { id: "ci7", title: "Community Voices #41", type: "podcast", status: "published", plays: "1,876", date: "Feb 24, 2026" },
    { id: "ci8", title: "Morning Motivation Mix", type: "music", status: "published", plays: "956", date: "Feb 15, 2026" },
  ],
};

// ---------------------------------------------------------------------------
// Advertiser mock data
// ---------------------------------------------------------------------------

const advertiserData: RoleMockData = {
  stats: [
    { title: "Active Ads", value: "3", icon: Megaphone, color: "text-[#ef4444]", bgColor: "bg-[#ef4444]/10" },
    { title: "Impressions", value: "125K", icon: Eye, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10", change: "+14K", changeUp: true },
    { title: "CTR", value: "2.4%", icon: MousePointerClick, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10", change: "+0.3%", changeUp: true },
    { title: "Spend MTD", value: "$5.2K", icon: CreditCard, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10" },
  ],
  activity: [
    { id: "a1", text: "Ad \"Spring Sale Banner\" approved and live", time: "1 hour ago", icon: Megaphone, color: "text-[#ef4444]" },
    { id: "a2", text: "Campaign \"March Madness Promo\" reached 50K impressions", time: "4 hours ago", icon: Eye, color: "text-[#3b82f6]" },
    { id: "a3", text: "New creative uploaded for review", time: "1 day ago", icon: Image, color: "text-[#7401df]" },
    { id: "a4", text: "Monthly invoice generated -- $2,450.00", time: "2 days ago", icon: CreditCard, color: "text-[#f97316]" },
    { id: "a5", text: "CTR improved by 0.4% on \"Weekend Events\" ad", time: "3 days ago", icon: TrendingUp, color: "text-[#74ddc7]" },
  ],
  actions: [
    { label: "New Campaign", href: "/portal/campaigns", icon: Target },
    { label: "Upload Creative", href: "/portal/overview#creative", icon: Image },
    { label: "View Reports", href: "/portal/overview#analytics", icon: BarChart3 },
  ],
  campaigns: [
    { id: "ac1", name: "Spring Sale Banner", client: "Jordan Williams", status: "active", budget: "$3,000", spent: "$1,800", impressions: "52.3K" },
    { id: "ac2", name: "March Madness Promo", client: "Jordan Williams", status: "active", budget: "$5,000", spent: "$2,400", impressions: "50.1K" },
    { id: "ac3", name: "Weekend Events", client: "Jordan Williams", status: "active", budget: "$2,000", spent: "$1,000", impressions: "22.6K" },
    { id: "ac4", name: "Holiday Special", client: "Jordan Williams", status: "completed", budget: "$4,500", spent: "$4,500", impressions: "98.2K" },
  ],
};

// ---------------------------------------------------------------------------
// Listener mock data
// ---------------------------------------------------------------------------

const listenerData: RoleMockData = {
  stats: [
    { title: "Points Balance", value: "2,450", icon: Star, color: "text-[#f97316]", bgColor: "bg-[#f97316]/10", change: "+150", changeUp: true },
    { title: "Favorites", value: "12", icon: Heart, color: "text-[#ef4444]", bgColor: "bg-[#ef4444]/10", change: "+2", changeUp: true },
    { title: "Events Attended", value: "5", icon: Ticket, color: "text-[#3b82f6]", bgColor: "bg-[#3b82f6]/10" },
    { title: "Listening Hours", value: "89h", icon: Headphones, color: "text-[#74ddc7]", bgColor: "bg-[#74ddc7]/10", change: "+12h", changeUp: true },
  ],
  activity: [
    { id: "l1", text: "Earned 50 points for listening to WCCG live", time: "30 min ago", icon: Star, color: "text-[#f97316]" },
    { id: "l2", text: "Registered for \"Spring Fest 2026\" event", time: "2 hours ago", icon: Ticket, color: "text-[#3b82f6]" },
    { id: "l3", text: "Added \"Friday Night Fire\" to favorites", time: "1 day ago", icon: Heart, color: "text-[#ef4444]" },
    { id: "l4", text: "Redeemed 500 points for WCCG merch", time: "3 days ago", icon: Star, color: "text-[#7401df]" },
    { id: "l5", text: "Checked in at WCCG Community Day event", time: "5 days ago", icon: CalendarDays, color: "text-[#74ddc7]" },
  ],
  actions: [
    { label: "Browse Shows", href: "/portal/overview#favorites", icon: Radio },
    { label: "Redeem Points", href: "/portal/overview#points", icon: Star },
    { label: "My Tickets", href: "/portal/overview#tickets", icon: Ticket },
  ],
  events: [
    { id: "le1", name: "Spring Fest 2026", date: "Mar 22, 2026", location: "Festival Park, Fayetteville", ticketStatus: "confirmed" },
    { id: "le2", name: "DJ SpinWiz Live", date: "Mar 15, 2026", location: "The Crown Complex", ticketStatus: "confirmed" },
    { id: "le3", name: "WCCG Community Day", date: "Apr 5, 2026", location: "Cross Creek Mall", ticketStatus: "available" },
    { id: "le4", name: "Summer Kickoff Party", date: "May 1, 2026", location: "Huske Hardware House", ticketStatus: "available" },
    { id: "le5", name: "Gospel Brunch", date: "Mar 29, 2026", location: "Marketplace Mall", ticketStatus: "sold-out" },
  ],
  listeningHistory: [
    { id: "lh1", show: "Friday Night Fire", host: "DJ SpinWiz", date: "Today", duration: "1h 45m" },
    { id: "lh2", show: "Community Voices", host: "Aisha Reynolds", date: "Yesterday", duration: "42m" },
    { id: "lh3", show: "Morning Drive", host: "Big Mike", date: "Yesterday", duration: "2h 10m" },
    { id: "lh4", show: "Saturday Mixtape", host: "DJ SpinWiz", date: "Mar 1", duration: "1h 30m" },
    { id: "lh5", show: "Sunday Gospel Hour", host: "Pastor James", date: "Feb 28", duration: "55m" },
  ],
};

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export const MOCK_DATA: Record<RoleId, RoleMockData> = {
  admin: adminData,
  sales: salesData,
  dj: djData,
  creator: creatorData,
  advertiser: advertiserData,
  listener: listenerData,
};
