"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  DollarSign,
  Headphones,
  Mic,
  Megaphone,
  Radio,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Users,
  BarChart3,
  Settings,
  Database,
  Target,
  FileText,
  Music,
  Upload,
  CalendarDays,
  Star,
  Heart,
  Ticket,
  CreditCard,
  Image,
  TrendingUp,
  Eye,
  MousePointerClick,
  Play,
  type LucideIcon,
  Bell,
  MessageSquare,
  Globe,
  Lock,
  Zap,
  MapPin,
  Award,
  Gift,
  Layers,
  Workflow,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDemoRole } from "../layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Priority = "critical" | "high" | "medium" | "low";
type Status = "shipped" | "in-progress" | "planned" | "backlog";

interface Feature {
  name: string;
  description: string;
  priority: Priority;
  status: Status;
  icon: LucideIcon;
}

interface ServiceModule {
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  features: Feature[];
}

interface RolePRD {
  roleId: string;
  roleLabel: string;
  roleIcon: LucideIcon;
  accentColor: string;
  summary: string;
  modules: ServiceModule[];
}

// ---------------------------------------------------------------------------
// Priority & Status helpers
// ---------------------------------------------------------------------------

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  low: { label: "Low", color: "bg-gray-500/20 text-muted-foreground border-gray-500/30" },
};

const statusConfig: Record<Status, { label: string; icon: LucideIcon; color: string }> = {
  shipped: { label: "Shipped", icon: CheckCircle2, color: "text-green-400" },
  "in-progress": { label: "In Progress", icon: Clock, color: "text-yellow-400" },
  planned: { label: "Planned", icon: CalendarDays, color: "text-blue-400" },
  backlog: { label: "Backlog", icon: AlertCircle, color: "text-muted-foreground" },
};

// ---------------------------------------------------------------------------
// PRD Data — All 6 roles
// ---------------------------------------------------------------------------

const PRD_DATA: RolePRD[] = [
  // =========================================================================
  // ADMINISTRATOR
  // =========================================================================
  {
    roleId: "admin",
    roleLabel: "Administrator",
    roleIcon: Shield,
    accentColor: "#10b981",
    summary:
      "Full platform control. Administrators manage all users, content, streams, monetization, analytics, and system configuration. They have the highest privilege level and can impersonate any role for support purposes.",
    modules: [
      {
        name: "User Management",
        description: "Create, edit, suspend, and delete user accounts. Assign and revoke roles.",
        icon: Users,
        color: "#10b981",
        features: [
          { name: "User CRUD", description: "Create, read, update, and delete user accounts with profile details, avatars, and contact info", priority: "critical", status: "shipped", icon: Users },
          { name: "Role Assignment", description: "Assign roles (admin, sales, dj, creator, advertiser, listener) to users via a junction table. Multiple roles per user supported", priority: "critical", status: "shipped", icon: Shield },
          { name: "Account Suspension", description: "Temporarily suspend or permanently ban accounts with reason tracking and appeal workflow", priority: "high", status: "planned", icon: Lock },
          { name: "User Search & Filters", description: "Full-text search across users by name, email, role. Filter by status (active, suspended, pending)", priority: "high", status: "shipped", icon: Users },
          { name: "Bulk Actions", description: "Select multiple users and apply bulk role changes, email notifications, or status updates", priority: "medium", status: "backlog", icon: Layers },
          { name: "Impersonation Mode", description: "Log in as any user for debugging and support. All actions logged for audit trail", priority: "medium", status: "planned", icon: Eye },
        ],
      },
      {
        name: "Stream Management",
        description: "Configure and monitor all live audio streams. Manage Centova Cast and Icecast integrations.",
        icon: Radio,
        color: "#74ddc7",
        features: [
          { name: "Stream Configuration", description: "Add, edit, and remove streaming channels. Configure mount points, bitrates, genres, and metadata", priority: "critical", status: "shipped", icon: Radio },
          { name: "Live Monitoring Dashboard", description: "Real-time listener counts, bitrate status, and uptime metrics for all 6 channels with auto-alerts", priority: "critical", status: "shipped", icon: Activity },
          { name: "Auto-DJ Scheduling", description: "Configure automated playlists with time-based rules, genre rotation, and fallback content", priority: "high", status: "planned", icon: CalendarDays },
          { name: "Stream Health Alerts", description: "Automated email/SMS alerts when streams go down, buffer rates spike, or listener counts drop below threshold", priority: "high", status: "planned", icon: Bell },
          { name: "Centova Cast API", description: "Full integration with Centova Cast for DJ accounts, auto-DJ, request system, and statistics", priority: "high", status: "shipped", icon: Settings },
          { name: "Icecast Relay Management", description: "Configure relay servers, fallback mounts, and geographic distribution for redundancy", priority: "medium", status: "backlog", icon: Globe },
        ],
      },
      {
        name: "Content Moderation",
        description: "Review and approve user-generated content including mixes, podcasts, events, and directory listings.",
        icon: Database,
        color: "#7401df",
        features: [
          { name: "Content Approval Queue", description: "Review pending mixes, podcast episodes, events, and directory claims before publication", priority: "critical", status: "shipped", icon: FileText },
          { name: "Automated Content Scanning", description: "AI-powered detection of inappropriate content, copyright violations, and metadata quality checks", priority: "medium", status: "backlog", icon: Shield },
          { name: "Community Directory Oversight", description: "Verify government service listings, approve business claims, and manage the 8-county directory", priority: "high", status: "shipped", icon: MapPin },
          { name: "Takedown Workflow", description: "DMCA and content removal process with audit logs, appeal handling, and counter-notice support", priority: "high", status: "planned", icon: AlertCircle },
        ],
      },
      {
        name: "Analytics & Reporting",
        description: "Platform-wide analytics covering listeners, revenue, content performance, and growth metrics.",
        icon: BarChart3,
        color: "#3b82f6",
        features: [
          { name: "Real-Time Dashboard", description: "Live metrics: active listeners, concurrent streams, peak hours, geographic heatmap", priority: "critical", status: "shipped", icon: Activity },
          { name: "Revenue Analytics", description: "Track ad revenue, subscription income, merchandise sales, and event ticket revenue with trends", priority: "high", status: "planned", icon: DollarSign },
          { name: "Content Performance", description: "Leaderboards for top mixes, shows, podcasts by plays, favorites, and engagement rate", priority: "high", status: "planned", icon: TrendingUp },
          { name: "Export Reports", description: "Generate PDF/CSV reports for FCC compliance, advertiser reports, and board presentations", priority: "medium", status: "backlog", icon: FileText },
          { name: "User Growth Funnel", description: "Track registration, activation, retention, and churn rates with cohort analysis", priority: "medium", status: "backlog", icon: Users },
        ],
      },
      {
        name: "System Settings",
        description: "Platform configuration, integrations, and system health management.",
        icon: Settings,
        color: "#f97316",
        features: [
          { name: "Platform Branding", description: "Configure station name, logos, colors, taglines, and social media links across the platform", priority: "high", status: "shipped", icon: Image },
          { name: "Email Templates", description: "Manage transactional email templates for registration, password reset, notifications, and marketing", priority: "high", status: "planned", icon: MessageSquare },
          { name: "API Key Management", description: "Generate and revoke API keys for third-party integrations (Centova, payment gateways, analytics)", priority: "medium", status: "planned", icon: Lock },
          { name: "Feature Flags", description: "Enable/disable platform features per role or globally. A/B testing support", priority: "medium", status: "backlog", icon: Zap },
          { name: "Audit Logs", description: "Comprehensive activity log for all admin actions with timestamps, IP addresses, and user agents", priority: "high", status: "shipped", icon: FileText },
        ],
      },
    ],
  },

  // =========================================================================
  // SALES MANAGER
  // =========================================================================
  {
    roleId: "sales",
    roleLabel: "Sales Manager",
    roleIcon: DollarSign,
    accentColor: "#f97316",
    summary:
      "Revenue-focused role managing advertising clients, campaign proposals, billing, and sales analytics. Sales managers are the bridge between advertisers and the station.",
    modules: [
      {
        name: "Client Management",
        description: "CRM for managing advertising client accounts, contacts, and relationship history.",
        icon: Users,
        color: "#f97316",
        features: [
          { name: "Client Profiles", description: "Full business profiles with contact info, billing history, contract terms, and notes", priority: "critical", status: "shipped", icon: Users },
          { name: "Lead Pipeline", description: "Track prospects through stages: lead, contacted, proposal sent, negotiating, closed-won/lost", priority: "high", status: "shipped", icon: Target },
          { name: "Contact History", description: "Log calls, emails, meetings, and notes per client. Timeline view of all interactions", priority: "high", status: "backlog", icon: MessageSquare },
          { name: "Client Onboarding", description: "Automated onboarding flow: agreement signing, creative submission, campaign setup wizard", priority: "medium", status: "backlog", icon: Workflow },
        ],
      },
      {
        name: "Campaign Management",
        description: "Create, configure, schedule, and monitor advertising campaigns for clients.",
        icon: Target,
        color: "#74ddc7",
        features: [
          { name: "Campaign Builder", description: "Create campaigns with date ranges, budget, target demographics, daypart selection, and frequency caps", priority: "critical", status: "shipped", icon: Target },
          { name: "Ad Scheduling", description: "Schedule ad spots across live streams, podcasts, and pre-roll. Calendar view with conflict detection", priority: "critical", status: "shipped", icon: CalendarDays },
          { name: "Campaign Cloning", description: "Duplicate successful campaigns with one click. Modify dates, budget, and creative for renewal", priority: "medium", status: "backlog", icon: Layers },
          { name: "A/B Testing", description: "Split-test ad creatives and scheduling strategies. Automatic winner selection based on CTR", priority: "low", status: "backlog", icon: BarChart3 },
        ],
      },
      {
        name: "Proposals & Contracts",
        description: "Generate, send, and track advertising proposals and contracts.",
        icon: FileText,
        color: "#7401df",
        features: [
          { name: "Proposal Generator", description: "Create branded PDF proposals with rate cards, audience demographics, reach estimates, and package options", priority: "high", status: "shipped", icon: FileText },
          { name: "E-Signature Integration", description: "Send proposals for digital signature. Track status: sent, viewed, signed, expired", priority: "high", status: "backlog", icon: FileText },
          { name: "Rate Card Management", description: "Maintain rate cards with pricing tiers for 15s/30s/60s spots, sponsorships, and digital ads", priority: "high", status: "shipped", icon: DollarSign },
          { name: "Contract Renewals", description: "Automated alerts for expiring contracts. Pre-filled renewal proposals with updated terms", priority: "medium", status: "backlog", icon: Bell },
        ],
      },
      {
        name: "Revenue & Analytics",
        description: "Track sales performance, commission calculations, and revenue forecasting.",
        icon: TrendingUp,
        color: "#3b82f6",
        features: [
          { name: "Revenue Dashboard", description: "Real-time revenue metrics: MTD, QTD, YTD with comparisons to prior periods and targets", priority: "critical", status: "shipped", icon: DollarSign },
          { name: "Commission Tracking", description: "Auto-calculate commissions by rep based on tiered rates and collected revenue", priority: "high", status: "backlog", icon: DollarSign },
          { name: "Forecasting", description: "Pipeline-based revenue forecasting with probability-weighted projections", priority: "medium", status: "backlog", icon: TrendingUp },
          { name: "Advertiser Reports", description: "Generate per-client performance reports with impressions, plays, reach, and ROI estimates", priority: "high", status: "shipped", icon: BarChart3 },
        ],
      },
    ],
  },

  // =========================================================================
  // DJ / HOST
  // =========================================================================
  {
    roleId: "dj",
    roleLabel: "DJ / Host",
    roleIcon: Headphones,
    accentColor: "#74ddc7",
    summary:
      "On-air talent managing their shows, uploading DJ mixes, tracking listener engagement, and managing their public profile on the station.",
    modules: [
      {
        name: "Show Management",
        description: "View, request, and manage assigned radio shows and time slots.",
        icon: Radio,
        color: "#74ddc7",
        features: [
          { name: "My Shows List", description: "View all assigned shows with schedule, description, cover art, and listener stats", priority: "critical", status: "shipped", icon: Radio },
          { name: "Show Profile Editor", description: "Edit show title, description, genre tags, cover art, and social links for public-facing pages", priority: "high", status: "shipped", icon: Settings },
          { name: "Time Slot Requests", description: "Request new time slots or changes to existing schedule. Admin approval workflow", priority: "high", status: "planned", icon: CalendarDays },
          { name: "Guest Management", description: "Invite guest DJs or hosts to co-host shows. Share streaming credentials for one-time sessions", priority: "medium", status: "backlog", icon: Users },
          { name: "Live Show Controls", description: "Web-based DJ console: source selection, microphone toggle, crossfader, and live chat integration", priority: "medium", status: "backlog", icon: Headphones },
        ],
      },
      {
        name: "Mix Management",
        description: "Upload, organize, and publish DJ mixes and recorded sets.",
        icon: Music,
        color: "#7401df",
        features: [
          { name: "Mix Upload", description: "Upload MP3/WAV/FLAC mixes up to 500MB. Auto-extract duration, waveform preview generation", priority: "critical", status: "shipped", icon: Upload },
          { name: "Mix Editor", description: "Edit title, description, tracklist, genre tags, cover art, and visibility (public/unlisted/private)", priority: "high", status: "shipped", icon: Music },
          { name: "Mix Analytics", description: "Per-mix stats: plays, unique listeners, average listen duration, drop-off points, favorites count", priority: "high", status: "planned", icon: BarChart3 },
          { name: "Tracklist Builder", description: "Searchable track database to build tracklists. Auto-detect tracks via audio fingerprinting", priority: "medium", status: "backlog", icon: FileText },
          { name: "Series/Collections", description: "Group mixes into series (e.g., 'Friday Night Fire Vol. 1-12'). Auto-number and cross-link", priority: "low", status: "backlog", icon: Layers },
        ],
      },
      {
        name: "Profile & Branding",
        description: "Manage public-facing DJ profile, social links, and personal brand.",
        icon: Users,
        color: "#f97316",
        features: [
          { name: "DJ Profile Page", description: "Public profile with bio, photo, genre specialties, upcoming shows, and latest mixes", priority: "critical", status: "shipped", icon: Users },
          { name: "Social Media Links", description: "Connect Instagram, Twitter/X, SoundCloud, Mixcloud, and Spotify profiles", priority: "high", status: "shipped", icon: Globe },
          { name: "Promo Kit", description: "Auto-generated media kit with headshot, bio, stats, and show graphics for event promoters", priority: "medium", status: "backlog", icon: Image },
          { name: "Availability Calendar", description: "Mark available dates for guest appearances, events, and private bookings", priority: "low", status: "backlog", icon: CalendarDays },
        ],
      },
      {
        name: "Schedule & Calendar",
        description: "View personal broadcast schedule and sync with external calendars.",
        icon: CalendarDays,
        color: "#3b82f6",
        features: [
          { name: "My Schedule View", description: "Weekly/monthly calendar showing assigned show times, with conflict highlighting", priority: "critical", status: "shipped", icon: CalendarDays },
          { name: "Calendar Sync", description: "Export schedule to Google Calendar, Apple Calendar, or Outlook via iCal feed", priority: "medium", status: "planned", icon: CalendarDays },
          { name: "Swap Requests", description: "Request show swaps with other DJs. Both parties must approve. Admin notified", priority: "medium", status: "backlog", icon: Workflow },
          { name: "Absence Reporting", description: "Report planned absences. System suggests backup DJs based on genre match", priority: "low", status: "backlog", icon: Bell },
        ],
      },
    ],
  },

  // =========================================================================
  // CONTENT CREATOR
  // =========================================================================
  {
    roleId: "creator",
    roleLabel: "Content Creator",
    roleIcon: Mic,
    accentColor: "#7401df",
    summary:
      "Creators produce podcasts, music, and multimedia content distributed through the WCCG platform. They grow their audience and monetize through the station's ecosystem.",
    modules: [
      {
        name: "Podcast Management",
        description: "Create, publish, and manage podcast series and episodes.",
        icon: Mic,
        color: "#7401df",
        features: [
          { name: "Podcast Series CRUD", description: "Create and manage podcast series with cover art, description, category, language, and RSS feed settings", priority: "critical", status: "shipped", icon: Mic },
          { name: "Episode Publishing", description: "Upload episodes with show notes, timestamps, guest credits, and transcript. Schedule future publishing", priority: "critical", status: "shipped", icon: Upload },
          { name: "RSS Feed Generation", description: "Auto-generate Apple Podcasts, Spotify, and Google Podcasts compatible RSS feeds per series", priority: "high", status: "planned", icon: Globe },
          { name: "Episode Analytics", description: "Downloads, listening duration, subscriber growth, geographic distribution, and device breakdown", priority: "high", status: "planned", icon: BarChart3 },
          { name: "Live Recording Studio", description: "Browser-based recording with noise reduction, multi-track editing, and direct-to-publish workflow", priority: "low", status: "backlog", icon: Mic },
        ],
      },
      {
        name: "Music Distribution",
        description: "Upload original music, manage releases, and track streaming performance.",
        icon: Music,
        color: "#74ddc7",
        features: [
          { name: "Track Upload", description: "Upload original tracks with metadata: title, artist, album, genre, BPM, key, cover art", priority: "critical", status: "shipped", icon: Upload },
          { name: "Release Management", description: "Create single, EP, or album releases. Schedule release dates with pre-save campaigns", priority: "high", status: "planned", icon: Music },
          { name: "Playlist Submission", description: "Submit tracks for inclusion in WCCG curated playlists. Track submission status", priority: "medium", status: "planned", icon: Star },
          { name: "Royalty Tracking", description: "Track plays and calculate royalty estimates based on station payout rates", priority: "medium", status: "backlog", icon: DollarSign },
        ],
      },
      {
        name: "Audience & Growth",
        description: "Track followers, engagement, and grow your audience through the platform.",
        icon: TrendingUp,
        color: "#f97316",
        features: [
          { name: "Follower Dashboard", description: "View follower count, growth rate, demographics, and most engaged fans", priority: "high", status: "planned", icon: Users },
          { name: "Engagement Analytics", description: "Track comments, shares, favorites, and listen-through rates across all content", priority: "high", status: "planned", icon: BarChart3 },
          { name: "Cross-Promotion Tools", description: "Suggest collaboration opportunities with other creators. Shared audience analysis", priority: "medium", status: "backlog", icon: Users },
          { name: "Newsletter Integration", description: "Collect subscriber emails and send episode notifications via built-in newsletter tool", priority: "low", status: "backlog", icon: MessageSquare },
        ],
      },
      {
        name: "Creator Analytics",
        description: "Comprehensive analytics for all content performance and audience insights.",
        icon: BarChart3,
        color: "#3b82f6",
        features: [
          { name: "Content Dashboard", description: "Unified view of all published content with play counts, trends, and comparison to previous periods", priority: "critical", status: "planned", icon: BarChart3 },
          { name: "Revenue Overview", description: "Track earnings from plays, tips, merchandise, and sponsorships in one view", priority: "medium", status: "backlog", icon: DollarSign },
          { name: "Audience Insights", description: "Demographics, listening habits, peak hours, preferred devices, and geographic distribution", priority: "medium", status: "backlog", icon: Eye },
          { name: "Export Data", description: "Download analytics as CSV for external analysis or reporting to sponsors", priority: "low", status: "backlog", icon: FileText },
        ],
      },
    ],
  },

  // =========================================================================
  // ADVERTISER
  // =========================================================================
  {
    roleId: "advertiser",
    roleLabel: "Advertiser",
    roleIcon: Megaphone,
    accentColor: "#ef4444",
    summary:
      "External advertisers manage their ad campaigns, upload creative assets, monitor campaign performance, and handle billing through a self-service portal.",
    modules: [
      {
        name: "Campaign Management",
        description: "Create and manage advertising campaigns with targeting, scheduling, and budget controls.",
        icon: Target,
        color: "#ef4444",
        features: [
          { name: "Self-Service Campaign Builder", description: "Step-by-step wizard: select ad type (audio/banner/sponsorship), set dates, budget, target audience, and dayparts", priority: "critical", status: "shipped", icon: Target },
          { name: "Campaign Dashboard", description: "View all active, paused, and completed campaigns with key metrics at a glance", priority: "critical", status: "shipped", icon: BarChart3 },
          { name: "Budget & Pacing", description: "Set daily/total budgets. Real-time pacing indicators showing spend vs budget with projections", priority: "high", status: "shipped", icon: DollarSign },
          { name: "Audience Targeting", description: "Target by geography (county/city), age, gender, listening time, and content genre preferences", priority: "high", status: "backlog", icon: Users },
          { name: "Campaign Pause/Resume", description: "Instantly pause or resume campaigns with one click. Automatic pause on budget exhaustion", priority: "medium", status: "shipped", icon: Play },
        ],
      },
      {
        name: "Ad Creative",
        description: "Upload, manage, and get approval for advertising creative assets.",
        icon: Image,
        color: "#7401df",
        features: [
          { name: "Creative Upload", description: "Upload audio spots (15s/30s/60s), display banners (multiple sizes), and sponsorship copy", priority: "critical", status: "shipped", icon: Upload },
          { name: "Creative Library", description: "Organized library of all uploaded creatives with version history, approval status, and usage tracking", priority: "high", status: "shipped", icon: Image },
          { name: "Creative Specs Guide", description: "Interactive specs page showing required formats, dimensions, file sizes, and audio loudness standards", priority: "medium", status: "shipped", icon: FileText },
          { name: "Creative Approval Status", description: "Track approval workflow: submitted, in-review, approved, rejected (with feedback)", priority: "high", status: "shipped", icon: CheckCircle2 },
        ],
      },
      {
        name: "Performance Analytics",
        description: "Track campaign effectiveness with detailed impression, click, and conversion data.",
        icon: BarChart3,
        color: "#3b82f6",
        features: [
          { name: "Impressions & Reach", description: "Track total impressions, unique reach, frequency per listener, and geographic distribution", priority: "critical", status: "shipped", icon: Eye },
          { name: "Click-Through Analytics", description: "CTR by creative, placement, daypart, and audience segment. Heatmaps for banner ads", priority: "high", status: "shipped", icon: MousePointerClick },
          { name: "Conversion Tracking", description: "Pixel-based conversion tracking for website actions. Attribution window configuration", priority: "medium", status: "backlog", icon: Target },
          { name: "Competitive Benchmarks", description: "Compare campaign performance against platform averages and industry benchmarks", priority: "low", status: "backlog", icon: TrendingUp },
          { name: "Automated Reports", description: "Schedule weekly/monthly performance reports delivered via email as PDF attachments", priority: "medium", status: "shipped", icon: FileText },
        ],
      },
      {
        name: "Billing & Invoicing",
        description: "Self-service billing portal for invoices, payments, and spending history.",
        icon: CreditCard,
        color: "#f97316",
        features: [
          { name: "Invoice History", description: "View and download all invoices with line-item detail by campaign. PDF export", priority: "critical", status: "shipped", icon: FileText },
          { name: "Payment Methods", description: "Add/remove credit cards and ACH accounts. Auto-pay configuration for recurring campaigns", priority: "high", status: "shipped", icon: CreditCard },
          { name: "Spending Alerts", description: "Set email alerts for daily/weekly spend thresholds. Prevent overspend with hard caps", priority: "medium", status: "shipped", icon: Bell },
          { name: "Tax Documents", description: "Download annual W-9 and spending summaries for tax purposes", priority: "low", status: "backlog", icon: FileText },
        ],
      },
    ],
  },

  // =========================================================================
  // LISTENER
  // =========================================================================
  {
    roleId: "listener",
    roleLabel: "Listener",
    roleIcon: Radio,
    accentColor: "#3b82f6",
    summary:
      "The core audience experience. Listeners tune in to live streams, earn loyalty points, attend events, save favorites, and engage with the WCCG community.",
    modules: [
      {
        name: "mY1045 Points & Rewards",
        description: "Earn points for engagement actions and redeem for rewards, merchandise, and experiences.",
        icon: Star,
        color: "#f97316",
        features: [
          { name: "Points Dashboard", description: "View current balance, lifetime earnings, recent transactions, and tier status (Bronze/Silver/Gold/Platinum)", priority: "critical", status: "shipped", icon: Star },
          { name: "Earning Actions", description: "Earn points for: listening (1pt/min), event check-ins (50pts), social shares (25pts), referrals (100pts), contests (varies)", priority: "critical", status: "shipped", icon: Zap },
          { name: "Rewards Catalog", description: "Browse and redeem rewards: WCCG merch, concert tickets, meet-and-greets, gift cards, and exclusive content", priority: "high", status: "planned", icon: Gift },
          { name: "Points History", description: "Full transaction log with earned/spent amounts, descriptions, and running balance", priority: "high", status: "shipped", icon: FileText },
          { name: "Tier Benefits", description: "Unlock perks at each tier: early event access, exclusive streams, birthday rewards, VIP experiences", priority: "medium", status: "planned", icon: Award },
          { name: "Referral Program", description: "Share referral link. Earn 100 points per new user who registers and listens for 30+ minutes", priority: "medium", status: "backlog", icon: Users },
        ],
      },
      {
        name: "Events & Tickets",
        description: "Discover, register for, and manage tickets to WCCG events and community gatherings.",
        icon: Ticket,
        color: "#3b82f6",
        features: [
          { name: "Event Discovery", description: "Browse upcoming events with filters by date, type (concert, meetup, festival), location, and price", priority: "critical", status: "shipped", icon: CalendarDays },
          { name: "Ticket Purchase/RSVP", description: "Register for free events or purchase tickets. QR code tickets with digital wallet support", priority: "critical", status: "shipped", icon: Ticket },
          { name: "My Tickets", description: "View all upcoming and past event registrations. Download tickets, view event details", priority: "high", status: "shipped", icon: Ticket },
          { name: "Event Check-In", description: "QR code scan at events for points earning. Geofenced auto-check-in for large venues", priority: "high", status: "planned", icon: MapPin },
          { name: "Event Reminders", description: "Push and email notifications before registered events. Add-to-calendar integration", priority: "medium", status: "planned", icon: Bell },
          { name: "Event Reviews", description: "Post reviews and photos after attending events. Community event gallery", priority: "low", status: "backlog", icon: MessageSquare },
        ],
      },
      {
        name: "Favorites & Library",
        description: "Save shows, mixes, podcasts, and DJs to a personal library for quick access.",
        icon: Heart,
        color: "#ef4444",
        features: [
          { name: "Favorite Shows", description: "Save shows to favorites. Get notified when new episodes air or when live", priority: "critical", status: "shipped", icon: Heart },
          { name: "Favorite Mixes", description: "Save DJ mixes for offline-like quick access. Create personal playlists from saved mixes", priority: "high", status: "shipped", icon: Music },
          { name: "Follow DJs/Creators", description: "Follow creators to see their new content in your feed. Notification preferences per creator", priority: "high", status: "shipped", icon: Users },
          { name: "Listening History", description: "Auto-tracked history of streams, mixes, and podcasts listened to. Resume where you left off", priority: "medium", status: "shipped", icon: Clock },
          { name: "Personal Playlists", description: "Create, name, and share playlists of mixes and podcast episodes", priority: "medium", status: "backlog", icon: Music },
        ],
      },
      {
        name: "Live Listening Experience",
        description: "The core live streaming experience with chat, song requests, and interactive features.",
        icon: Radio,
        color: "#74ddc7",
        features: [
          { name: "Persistent Audio Player", description: "Global audio player that persists across page navigation. Play/pause, volume, now-playing info", priority: "critical", status: "shipped", icon: Play },
          { name: "Channel Selector", description: "Quick-switch between 6 live channels from the player. Visual indicators for each channel's genre", priority: "critical", status: "shipped", icon: Radio },
          { name: "Song Requests", description: "Submit song requests for live shows. Queue visible to listeners. DJ can accept/reject", priority: "high", status: "planned", icon: Music },
          { name: "Live Chat", description: "Real-time chat during live shows. Emoji reactions, @mentions, and moderation tools", priority: "high", status: "backlog", icon: MessageSquare },
          { name: "Now Playing Widget", description: "Display current song, artist, album art. 'Like' current track to add to favorites automatically", priority: "medium", status: "planned", icon: Music },
          { name: "Sleep Timer", description: "Auto-stop playback after 15/30/60/90 minutes or end of current show", priority: "low", status: "backlog", icon: Clock },
        ],
      },
      {
        name: "Community Engagement",
        description: "Participate in contests, interact with the station, and connect with other listeners.",
        icon: Users,
        color: "#10b981",
        features: [
          { name: "Contest Participation", description: "Enter on-air and digital contests. View entry status, winners, and prize claims", priority: "high", status: "planned", icon: Award },
          { name: "Community Directory", description: "Browse the 8-county government services directory. Claim and manage local service listings", priority: "high", status: "shipped", icon: MapPin },
          { name: "Listener Profiles", description: "Public profile with avatar, favorite shows, listening stats, and earned badges", priority: "medium", status: "planned", icon: Users },
          { name: "Social Sharing", description: "Share now-playing, events, and mixes to Instagram, Twitter/X, Facebook with auto-generated graphics", priority: "medium", status: "planned", icon: Globe },
          { name: "Feedback & Suggestions", description: "Submit feedback, song suggestions, and feature requests directly to the station", priority: "low", status: "planned", icon: MessageSquare },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Collapsible Section Component
// ---------------------------------------------------------------------------

function CollapsibleModule({ module, accentColor }: { module: ServiceModule; accentColor: string }) {
  const [open, setOpen] = useState(true);
  const Icon = module.icon;

  return (
    <Card className="border-white/10 bg-[#12121a]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-white/5"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${module.color}20` }}
        >
          <Icon className="size-4" style={{ color: module.color }} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{module.name}</h4>
          <p className="text-xs text-muted-foreground">{module.description}</p>
        </div>
        <Badge variant="outline" className="mr-2 border-white/20 text-muted-foreground">
          {module.features.length} features
        </Badge>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <CardContent className="border-t border-white/5 pt-4">
          <div className="space-y-3">
            {module.features.map((feature) => {
              const FIcon = feature.icon;
              const pCfg = priorityConfig[feature.priority];
              const sCfg = statusConfig[feature.status];
              const SIcon = sCfg.icon;
              return (
                <div
                  key={feature.name}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <FIcon className="size-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{feature.name}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", pCfg.color)}
                    >
                      {pCfg.label}
                    </Badge>
                    <span className={cn("ml-auto flex items-center gap-1 text-xs", sCfg.color)}>
                      <SIcon className="size-3" />
                      {sCfg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PRD Page
// ---------------------------------------------------------------------------

export default function PortalPRDPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<string | null>(null);

  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  // Count totals
  const totalFeatures = PRD_DATA.reduce(
    (sum, r) => sum + r.modules.reduce((ms, m) => ms + m.features.length, 0),
    0
  );
  const shippedCount = PRD_DATA.reduce(
    (sum, r) =>
      sum +
      r.modules.reduce(
        (ms, m) => ms + m.features.filter((f) => f.status === "shipped").length,
        0
      ),
    0
  );
  const inProgressCount = PRD_DATA.reduce(
    (sum, r) =>
      sum +
      r.modules.reduce(
        (ms, m) => ms + m.features.filter((f) => f.status === "in-progress").length,
        0
      ),
    0
  );
  const plannedCount = PRD_DATA.reduce(
    (sum, r) =>
      sum +
      r.modules.reduce(
        (ms, m) => ms + m.features.filter((f) => f.status === "planned").length,
        0
      ),
    0
  );
  const backlogCount = totalFeatures - shippedCount - inProgressCount - plannedCount;

  const filteredPRD = activeRole
    ? PRD_DATA.filter((r) => r.roleId === activeRole)
    : PRD_DATA;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
            <FileText className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Platform <span className="text-[#74ddc7]">PRD</span>
            </h1>
            <p className="text-muted-foreground">
              Product Requirements Document — WCCG 104.5 FM Digital Platform
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Features</p>
            <p className="text-3xl font-bold text-foreground">{totalFeatures}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="size-5 text-green-400" />
            <div>
              <p className="text-sm text-muted-foreground">Shipped</p>
              <p className="text-2xl font-bold text-green-400">{shippedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="size-5 text-yellow-400" />
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-yellow-400">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex items-center gap-3 pt-6">
            <CalendarDays className="size-5 text-blue-400" />
            <div>
              <p className="text-sm text-muted-foreground">Planned</p>
              <p className="text-2xl font-bold text-blue-400">{plannedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Backlog</p>
              <p className="text-2xl font-bold text-muted-foreground">{backlogCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeRole === null ? "default" : "outline"}
          size="sm"
          className={activeRole === null ? "" : "border-white/10 text-muted-foreground hover:text-foreground"}
          onClick={() => setActiveRole(null)}
        >
          All Roles
        </Button>
        {PRD_DATA.map((r) => {
          const Icon = r.roleIcon;
          const isActive = activeRole === r.roleId;
          return (
            <Button
              key={r.roleId}
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5",
                isActive
                  ? "border-transparent text-foreground"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              )}
              style={isActive ? { backgroundColor: `${r.accentColor}30`, borderColor: `${r.accentColor}50` } : undefined}
              onClick={() => setActiveRole(isActive ? null : r.roleId)}
            >
              <Icon className="size-3.5" style={{ color: r.accentColor }} />
              {r.roleLabel}
            </Button>
          );
        })}
      </div>

      {/* Role Sections */}
      {filteredPRD.map((rolePrd) => {
        const RoleIcon = rolePrd.roleIcon;
        const roleFeatureCount = rolePrd.modules.reduce((s, m) => s + m.features.length, 0);
        const roleShipped = rolePrd.modules.reduce(
          (s, m) => s + m.features.filter((f) => f.status === "shipped").length,
          0
        );

        return (
          <div key={rolePrd.roleId} className="space-y-4">
            {/* Role Header */}
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div
                className="flex size-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${rolePrd.accentColor}20` }}
              >
                <RoleIcon className="size-5" style={{ color: rolePrd.accentColor }} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{rolePrd.roleLabel}</h2>
                <p className="text-sm text-muted-foreground">{rolePrd.summary}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm text-muted-foreground">
                  {roleShipped}/{roleFeatureCount} shipped
                </p>
                <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(roleShipped / roleFeatureCount) * 100}%`,
                      backgroundColor: rolePrd.accentColor,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-4">
              {rolePrd.modules.map((mod) => (
                <CollapsibleModule
                  key={mod.name}
                  module={mod}
                  accentColor={rolePrd.accentColor}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            WCCG 104.5 FM Digital Platform PRD — {PRD_DATA.length} roles, {PRD_DATA.reduce((s, r) => s + r.modules.length, 0)} service modules, {totalFeatures} features
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated: February 24, 2026 — Document version 1.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
