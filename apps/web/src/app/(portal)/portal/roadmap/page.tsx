"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  CalendarDays,
  AlertCircle,
  Circle,
  Database,
  Shield,
  Users,
  Radio,
  Music,
  Mic,
  Headphones,
  DollarSign,
  Megaphone,
  Star,
  Ticket,
  Heart,
  BarChart3,
  Settings,
  Target,
  FileText,
  Upload,
  Play,
  CreditCard,
  Image,
  Globe,
  Bell,
  MessageSquare,
  Lock,
  Zap,
  MapPin,
  Award,
  Gift,
  Layers,
  Workflow,
  Code2,
  Rocket,
  TestTube,
  Paintbrush,
  Server,
  Eye,
  MousePointerClick,
  TrendingUp,
  type LucideIcon,
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

type TaskStatus = "done" | "active" | "next" | "planned" | "backlog";
type PhaseStatus = "complete" | "active" | "upcoming";

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  icon: LucideIcon;
  tags: string[];
  effort: "S" | "M" | "L" | "XL";
  deps?: string[];
}

interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  status: PhaseStatus;
  icon: LucideIcon;
  color: string;
  timeline: string;
  tasks: Task[];
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const taskStatusConfig: Record<TaskStatus, { label: string; icon: LucideIcon; color: string; bgColor: string }> = {
  done: { label: "Done", icon: CheckCircle2, color: "text-green-400", bgColor: "bg-green-500/10" },
  active: { label: "Active", icon: Clock, color: "text-yellow-400", bgColor: "bg-yellow-500/10" },
  next: { label: "Up Next", icon: CalendarDays, color: "text-blue-400", bgColor: "bg-blue-500/10" },
  planned: { label: "Planned", icon: Circle, color: "text-purple-400", bgColor: "bg-purple-500/10" },
  backlog: { label: "Backlog", icon: AlertCircle, color: "text-gray-500", bgColor: "bg-gray-500/10" },
};

const effortConfig: Record<string, { label: string; color: string }> = {
  S: { label: "Small", color: "text-green-400 border-green-500/30" },
  M: { label: "Medium", color: "text-blue-400 border-blue-500/30" },
  L: { label: "Large", color: "text-orange-400 border-orange-500/30" },
  XL: { label: "X-Large", color: "text-red-400 border-red-500/30" },
};

const phaseStatusConfig: Record<PhaseStatus, { label: string; color: string; border: string }> = {
  complete: { label: "Complete", color: "bg-green-500", border: "border-green-500/50" },
  active: { label: "Active", color: "bg-yellow-500", border: "border-yellow-500/50" },
  upcoming: { label: "Upcoming", color: "bg-gray-600", border: "border-white/10" },
};

// ---------------------------------------------------------------------------
// PHASE DATA — Full ecosystem build plan
// ---------------------------------------------------------------------------

const PHASES: Phase[] = [
  // =========================================================================
  // PHASE 0 — SCAFFOLDING (COMPLETE)
  // =========================================================================
  {
    id: "p0",
    number: 0,
    title: "Project Scaffolding",
    subtitle: "Monorepo setup, app bootstrapping, CI/CD pipeline",
    status: "complete",
    icon: Code2,
    color: "#10b981",
    timeline: "Week 1 — Complete",
    tasks: [
      { id: "p0-1", title: "Initialize monorepo with pnpm workspaces + Turborepo", description: "Create root workspace config, turbo.json, and shared tsconfig", status: "done", icon: Code2, tags: ["infra"], effort: "M" },
      { id: "p0-2", title: "Scaffold Next.js 16 frontend (apps/web)", description: "Create Next.js app with App Router, Tailwind v4, static export for GitHub Pages", status: "done", icon: Globe, tags: ["frontend"], effort: "M" },
      { id: "p0-3", title: "Scaffold NestJS 11 backend (apps/api)", description: "Create NestJS app with /api/v1 prefix, Swagger docs, health check endpoint", status: "done", icon: Server, tags: ["backend"], effort: "M" },
      { id: "p0-4", title: "Configure Supabase project", description: "Set up Supabase project, configure auth, create initial migration structure", status: "done", icon: Database, tags: ["infra", "db"], effort: "M" },
      { id: "p0-5", title: "Set up shared packages (db, types, ui)", description: "Create Prisma package, shared TypeScript types, and UI component library stubs", status: "done", icon: Layers, tags: ["infra"], effort: "S" },
      { id: "p0-6", title: "GitHub Pages deployment pipeline", description: "Configure GitHub Actions for auto-deploy on push to main, basePath handling", status: "done", icon: Rocket, tags: ["infra", "ci"], effort: "S" },
      { id: "p0-7", title: "Design system foundation", description: "Tailwind v4 config, dark theme tokens, Radix UI + shadcn component setup", status: "done", icon: Paintbrush, tags: ["frontend", "design"], effort: "M" },
    ],
  },

  // =========================================================================
  // PHASE 1 — DATABASE & AUTH FOUNDATION
  // =========================================================================
  {
    id: "p1",
    number: 1,
    title: "Database Schema & Auth",
    subtitle: "Core tables, RLS policies, role system, and JWT auth flow",
    status: "active",
    icon: Database,
    color: "#74ddc7",
    timeline: "Week 2-3 — In Progress",
    tasks: [
      { id: "p1-1", title: "Users & profiles table", description: "auth.users extension with public profiles: display_name, avatar_url, bio, phone, location, social_links JSONB", status: "done", icon: Users, tags: ["db", "auth"], effort: "M" },
      { id: "p1-2", title: "Roles & permissions tables", description: "roles enum, user_roles junction table, permissions table. Roles: super_admin, admin, sales, host, creator, advertiser, listener", status: "done", icon: Shield, tags: ["db", "auth"], effort: "M" },
      { id: "p1-3", title: "Streams & channels schema", description: "streams table: name, slug, mount_point, genre, bitrate, status, listener_count, metadata JSONB, cover_image_url", status: "active", icon: Radio, tags: ["db"], effort: "M" },
      { id: "p1-4", title: "Shows & schedule schema", description: "shows table: title, description, host_id FK, genre, cover_art. schedule_slots table: show_id, day_of_week, start_time, end_time, stream_id, recurring boolean", status: "active", icon: CalendarDays, tags: ["db"], effort: "L" },
      { id: "p1-5", title: "Mixes & tracks schema", description: "mixes table: title, dj_id FK, file_url, duration, genre, bpm, waveform_url, play_count, status (draft/pending/published). tracks table for tracklists", status: "active", icon: Music, tags: ["db"], effort: "L" },
      { id: "p1-6", title: "Podcasts & episodes schema", description: "podcast_series: title, creator_id FK, cover_art, category, rss_url. episodes: series_id FK, title, audio_url, show_notes, duration, published_at", status: "next", icon: Mic, tags: ["db"], effort: "L" },
      { id: "p1-7", title: "Events & tickets schema", description: "events: title, description, date, location, type, capacity, price, cover_image. event_registrations: event_id, user_id, ticket_code, status, checked_in_at", status: "next", icon: Ticket, tags: ["db"], effort: "L" },
      { id: "p1-8", title: "Points & rewards schema", description: "point_transactions: user_id, amount, type (earn/spend), source, description. reward_items: name, point_cost, stock, image. reward_redemptions: user_id, item_id, status", status: "next", icon: Star, tags: ["db"], effort: "L" },
      { id: "p1-9", title: "Advertising schema", description: "ad_campaigns: advertiser_id, name, budget, start/end date, status. ad_creatives: campaign_id, type, file_url, status. ad_impressions: creative_id, stream_id, timestamp", status: "planned", icon: Megaphone, tags: ["db"], effort: "XL" },
      { id: "p1-10", title: "Favorites, follows, & interactions", description: "favorites: user_id, item_type (show/mix/podcast/dj), item_id. follows: follower_id, following_id. listening_history: user_id, content_type, content_id, duration", status: "next", icon: Heart, tags: ["db"], effort: "M" },
      { id: "p1-11", title: "Community directory schema", description: "directory_listings: name, category, county, address, phone, website, claimed_by FK, claim_status. Already has frontend — needs backend table", status: "next", icon: MapPin, tags: ["db"], effort: "M" },
      { id: "p1-12", title: "Row Level Security (RLS) policies", description: "RLS for all tables: users see own data, admins see all, public read for published content, hosts manage own shows/mixes", status: "planned", icon: Lock, tags: ["db", "security"], effort: "XL" },
      { id: "p1-13", title: "Supabase Auth integration", description: "Email/password + magic link auth. JWT token validation in NestJS via SupabaseAuthGuard. Session refresh middleware", status: "done", icon: Shield, tags: ["auth", "backend"], effort: "L" },
      { id: "p1-14", title: "Generate shared TypeScript types", description: "Run Supabase type generation, export to packages/types. Create Zod validation schemas for all tables", status: "planned", icon: Code2, tags: ["types"], effort: "M" },
    ],
  },

  // =========================================================================
  // PHASE 2 — API LAYER
  // =========================================================================
  {
    id: "p2",
    number: 2,
    title: "API Services & Endpoints",
    subtitle: "NestJS REST modules for all platform services",
    status: "upcoming",
    icon: Server,
    color: "#7401df",
    timeline: "Week 3-5",
    tasks: [
      { id: "p2-1", title: "Auth module — registration, login, profile", description: "POST /auth/register, POST /auth/login, GET /users/me, PATCH /users/me, GET /users/me/roles", status: "next", icon: Shield, tags: ["api", "auth"], effort: "L", deps: ["p1-1", "p1-2", "p1-13"] },
      { id: "p2-2", title: "Streams module — CRUD + live status", description: "GET /streams, GET /streams/:id, POST /streams (admin), PATCH /streams/:id (admin). WebSocket endpoint for real-time listener counts", status: "planned", icon: Radio, tags: ["api"], effort: "L", deps: ["p1-3"] },
      { id: "p2-3", title: "Shows module — CRUD + schedule", description: "GET /shows, GET /shows/:id, POST /shows (host), PATCH /shows/:id. GET /schedule, POST /schedule/slots (admin)", status: "planned", icon: CalendarDays, tags: ["api"], effort: "L", deps: ["p1-4"] },
      { id: "p2-4", title: "Mixes module — upload + streaming", description: "GET /mixes, GET /mixes/:id, POST /mixes (host), file upload to Supabase Storage with presigned URLs, POST /mixes/:id/play for play count tracking", status: "planned", icon: Music, tags: ["api", "storage"], effort: "XL", deps: ["p1-5"] },
      { id: "p2-5", title: "Podcasts module — series + episodes", description: "Full CRUD for podcast_series and episodes. File upload for audio. Auto-generate RSS feed endpoint GET /podcasts/:slug/feed.xml", status: "planned", icon: Mic, tags: ["api", "storage"], effort: "XL", deps: ["p1-6"] },
      { id: "p2-6", title: "Events module — CRUD + registration", description: "GET /events, POST /events, PATCH /events/:id. POST /events/:id/register, GET /events/:id/ticket, POST /events/:id/checkin", status: "planned", icon: Ticket, tags: ["api"], effort: "L", deps: ["p1-7"] },
      { id: "p2-7", title: "Points module — earn, spend, history", description: "GET /points/balance, GET /points/history, POST /points/earn (internal), GET /rewards, POST /rewards/:id/redeem", status: "planned", icon: Star, tags: ["api"], effort: "L", deps: ["p1-8"] },
      { id: "p2-8", title: "Advertising module — campaigns + creatives", description: "Full CRUD for campaigns and creatives. POST /ads/impression for tracking. GET /ads/report/:campaign_id for performance reports", status: "planned", icon: Megaphone, tags: ["api"], effort: "XL", deps: ["p1-9"] },
      { id: "p2-9", title: "Favorites & follows module", description: "POST /favorites, DELETE /favorites/:id, GET /favorites. POST /follows/:userId, DELETE /follows/:userId, GET /following", status: "planned", icon: Heart, tags: ["api"], effort: "M", deps: ["p1-10"] },
      { id: "p2-10", title: "Directory module — listings + claims", description: "GET /directory, POST /directory/claim/:id, PATCH /directory/:id (owner), admin approval endpoints", status: "planned", icon: MapPin, tags: ["api"], effort: "M", deps: ["p1-11"] },
      { id: "p2-11", title: "Admin module — user mgmt + moderation", description: "GET /admin/users, PATCH /admin/users/:id/roles, POST /admin/users/:id/suspend, GET /admin/content/pending, POST /admin/content/:id/approve", status: "planned", icon: Shield, tags: ["api", "admin"], effort: "L", deps: ["p1-12"] },
      { id: "p2-12", title: "Analytics module — aggregation endpoints", description: "GET /analytics/overview, GET /analytics/streams, GET /analytics/content, GET /analytics/revenue. Materialized views for performance", status: "backlog", icon: BarChart3, tags: ["api"], effort: "XL" },
      { id: "p2-13", title: "File upload service", description: "Shared service for uploading audio (mixes, episodes), images (covers, avatars), and documents to Supabase Storage with CDN URLs", status: "planned", icon: Upload, tags: ["api", "storage"], effort: "L" },
    ],
  },

  // =========================================================================
  // PHASE 3 — LISTENER EXPERIENCE
  // =========================================================================
  {
    id: "p3",
    number: 3,
    title: "Listener Experience",
    subtitle: "Core audience features — streaming, points, favorites, events",
    status: "upcoming",
    icon: Radio,
    color: "#3b82f6",
    timeline: "Week 4-6",
    tasks: [
      { id: "p3-1", title: "Persistent audio player (live streams)", description: "Global AudioProvider with channel switching, play/pause, volume, now-playing metadata. Persists across navigation", status: "done", icon: Play, tags: ["frontend"], effort: "L" },
      { id: "p3-2", title: "Channel browser with live stats", description: "Browse 6 live channels with real-time listener counts, current show info, genre badges, and stream quality indicators", status: "done", icon: Radio, tags: ["frontend"], effort: "M" },
      { id: "p3-3", title: "User registration & login flow", description: "Email/password registration with email verification. Login with redirect. Password reset flow. Social auth (Google, Apple)", status: "next", icon: Users, tags: ["frontend", "auth"], effort: "L", deps: ["p2-1"] },
      { id: "p3-4", title: "User profile page & editor", description: "Public profile page with avatar, bio, listening stats, badges. Profile editor with image upload, social links", status: "planned", icon: Users, tags: ["frontend"], effort: "M", deps: ["p2-1"] },
      { id: "p3-5", title: "Favorites system", description: "Heart button on shows, mixes, podcasts, DJs. Favorites page with filters by type. Quick-access in sidebar", status: "planned", icon: Heart, tags: ["frontend"], effort: "M", deps: ["p2-9"] },
      { id: "p3-6", title: "mY1045 Points dashboard", description: "Points balance, tier status (Bronze/Silver/Gold/Platinum), transaction history, earning actions list, progress to next tier", status: "planned", icon: Star, tags: ["frontend"], effort: "L", deps: ["p2-7"] },
      { id: "p3-7", title: "Rewards catalog & redemption", description: "Browse rewards with point costs, stock levels. Redeem with confirmation flow. Redemption history", status: "planned", icon: Gift, tags: ["frontend"], effort: "M", deps: ["p2-7"] },
      { id: "p3-8", title: "Event discovery & registration", description: "Browse events with date/type/location filters. Event detail page with RSVP/ticket purchase. QR code ticket generation", status: "planned", icon: Ticket, tags: ["frontend"], effort: "L", deps: ["p2-6"] },
      { id: "p3-9", title: "My Tickets page", description: "View upcoming/past event tickets, download QR codes, add to calendar, view event details", status: "planned", icon: Ticket, tags: ["frontend"], effort: "S", deps: ["p2-6"] },
      { id: "p3-10", title: "Now Playing widget + song requests", description: "Display current song/artist from stream metadata. Submit song requests. Like current track to auto-favorite", status: "backlog", icon: Music, tags: ["frontend", "realtime"], effort: "L" },
      { id: "p3-11", title: "Listening history & resume", description: "Auto-track listened streams, mixes, podcasts. Resume playback where left off. History page with search", status: "backlog", icon: Clock, tags: ["frontend"], effort: "M", deps: ["p2-9"] },
    ],
  },

  // =========================================================================
  // PHASE 4 — DJ / HOST PORTAL
  // =========================================================================
  {
    id: "p4",
    number: 4,
    title: "DJ / Host Portal",
    subtitle: "Show management, mix uploads, scheduling, DJ profiles",
    status: "upcoming",
    icon: Headphones,
    color: "#74ddc7",
    timeline: "Week 5-7",
    tasks: [
      { id: "p4-1", title: "DJ Dashboard overview", description: "Stats cards (total mixes, plays, shows), recent mix performance, upcoming shows, quick actions", status: "done", icon: BarChart3, tags: ["frontend"], effort: "M" },
      { id: "p4-2", title: "Show management CRUD", description: "Create/edit shows with title, description, genre, cover art. View show schedule and listener stats", status: "planned", icon: Radio, tags: ["frontend"], effort: "L", deps: ["p2-3"] },
      { id: "p4-3", title: "Mix upload with processing", description: "Drag-and-drop upload (MP3/WAV/FLAC up to 500MB). Progress bar, waveform generation, auto-metadata extraction", status: "planned", icon: Upload, tags: ["frontend", "storage"], effort: "XL", deps: ["p2-4"] },
      { id: "p4-4", title: "Mix editor & tracklist builder", description: "Edit mix metadata, cover art, tracklist. Searchable track database. Genre/BPM tagging", status: "planned", icon: Music, tags: ["frontend"], effort: "L", deps: ["p2-4"] },
      { id: "p4-5", title: "Mix analytics per track", description: "Play count over time, unique listeners, avg listen duration, drop-off chart, geographic breakdown", status: "backlog", icon: BarChart3, tags: ["frontend"], effort: "L", deps: ["p2-12"] },
      { id: "p4-6", title: "DJ profile page (public)", description: "Public-facing profile with headshot, bio, genre badges, upcoming shows, latest mixes, social links", status: "done", icon: Users, tags: ["frontend"], effort: "M" },
      { id: "p4-7", title: "Schedule view + calendar sync", description: "Weekly/monthly calendar of assigned show times. Export iCal feed for Google/Apple Calendar", status: "planned", icon: CalendarDays, tags: ["frontend"], effort: "M", deps: ["p2-3"] },
      { id: "p4-8", title: "Time slot requests & swaps", description: "Request new time slots (admin approval). Propose swaps with other DJs. Both-party approval flow", status: "backlog", icon: Workflow, tags: ["frontend", "api"], effort: "L" },
    ],
  },

  // =========================================================================
  // PHASE 5 — CREATOR TOOLS
  // =========================================================================
  {
    id: "p5",
    number: 5,
    title: "Creator Tools",
    subtitle: "Podcast management, music distribution, creator analytics",
    status: "upcoming",
    icon: Mic,
    color: "#7401df",
    timeline: "Week 6-8",
    tasks: [
      { id: "p5-1", title: "Podcast series CRUD", description: "Create/manage podcast series with cover art, description, category. Public series page with episode list", status: "planned", icon: Mic, tags: ["frontend"], effort: "L", deps: ["p2-5"] },
      { id: "p5-2", title: "Episode publishing workflow", description: "Upload audio, add show notes with rich text editor, timestamps, guest credits. Schedule future publish dates", status: "planned", icon: Upload, tags: ["frontend", "storage"], effort: "XL", deps: ["p2-5"] },
      { id: "p5-3", title: "RSS feed generation", description: "Auto-generate Apple Podcasts / Spotify compatible RSS feeds. Validate with podcast validator tool", status: "planned", icon: Globe, tags: ["backend"], effort: "L", deps: ["p2-5"] },
      { id: "p5-4", title: "Music track uploads", description: "Upload original tracks with metadata (title, artist, album, genre, BPM, key). Cover art upload", status: "planned", icon: Music, tags: ["frontend", "storage"], effort: "L", deps: ["p2-4"] },
      { id: "p5-5", title: "Creator analytics dashboard", description: "Unified view: total streams, downloads, subscriber growth, top episodes, audience demographics", status: "backlog", icon: BarChart3, tags: ["frontend"], effort: "L", deps: ["p2-12"] },
      { id: "p5-6", title: "Follower management", description: "View followers list, growth chart, most engaged fans. Notification preferences per follower", status: "backlog", icon: Users, tags: ["frontend"], effort: "M", deps: ["p2-9"] },
      { id: "p5-7", title: "Playlist submission for curation", description: "Submit tracks to WCCG curated playlists. Track submission status (submitted/reviewed/accepted/rejected)", status: "backlog", icon: Star, tags: ["frontend", "api"], effort: "M" },
    ],
  },

  // =========================================================================
  // PHASE 6 — ADVERTISING & SALES
  // =========================================================================
  {
    id: "p6",
    number: 6,
    title: "Advertising & Sales Platform",
    subtitle: "Self-serve ad campaigns, client CRM, billing, performance tracking",
    status: "upcoming",
    icon: Megaphone,
    color: "#ef4444",
    timeline: "Week 7-10",
    tasks: [
      { id: "p6-1", title: "Advertiser self-serve campaign builder", description: "Step-by-step wizard: ad type (audio/banner/sponsorship), dates, budget, targeting (geo, age, daypart), frequency caps", status: "planned", icon: Target, tags: ["frontend"], effort: "XL", deps: ["p2-8"] },
      { id: "p6-2", title: "Ad creative upload & approval", description: "Upload audio spots (15/30/60s) and display banners. Admin approval workflow with feedback loop", status: "planned", icon: Image, tags: ["frontend", "storage"], effort: "L", deps: ["p2-8"] },
      { id: "p6-3", title: "Campaign dashboard (advertiser)", description: "View active/paused/completed campaigns. Key metrics: impressions, CTR, spend, pacing", status: "planned", icon: BarChart3, tags: ["frontend"], effort: "L", deps: ["p2-8"] },
      { id: "p6-4", title: "Sales CRM — client profiles", description: "Client database with contacts, billing history, contract terms, notes. Pipeline stages: lead to closed", status: "planned", icon: Users, tags: ["frontend"], effort: "XL" },
      { id: "p6-5", title: "Proposal generator", description: "Create branded PDF proposals with rate cards, audience stats, package options. E-signature integration", status: "backlog", icon: FileText, tags: ["frontend", "api"], effort: "XL" },
      { id: "p6-6", title: "Rate card management", description: "Admin-editable rate cards for 15s/30s/60s spots, sponsorships, digital banner ads. Tiered pricing", status: "planned", icon: DollarSign, tags: ["frontend", "api"], effort: "M" },
      { id: "p6-7", title: "Revenue dashboard (sales)", description: "MTD/QTD/YTD revenue, pipeline forecast, commission tracking, per-client breakdowns", status: "backlog", icon: TrendingUp, tags: ["frontend"], effort: "L", deps: ["p2-12"] },
      { id: "p6-8", title: "Invoicing & billing portal", description: "Auto-generated invoices, payment method management (Stripe), spending alerts, tax documents", status: "backlog", icon: CreditCard, tags: ["frontend", "api"], effort: "XL" },
      { id: "p6-9", title: "Ad impression tracking & reporting", description: "Pixel-based impression/click tracking. Per-campaign performance reports. CSV/PDF export", status: "backlog", icon: Eye, tags: ["api", "analytics"], effort: "XL", deps: ["p2-8"] },
    ],
  },

  // =========================================================================
  // PHASE 7 — ADMIN OPERATIONS
  // =========================================================================
  {
    id: "p7",
    number: 7,
    title: "Admin Operations Center",
    subtitle: "User management, content moderation, stream monitoring, system config",
    status: "upcoming",
    icon: Shield,
    color: "#10b981",
    timeline: "Week 8-10",
    tasks: [
      { id: "p7-1", title: "User management panel", description: "Search/filter users, view profiles, edit roles, suspend/ban accounts with reason tracking. Bulk actions", status: "planned", icon: Users, tags: ["frontend", "api"], effort: "L", deps: ["p2-11"] },
      { id: "p7-2", title: "Content moderation queue", description: "Unified queue for pending mixes, podcasts, events, directory claims. Approve/reject with feedback", status: "planned", icon: FileText, tags: ["frontend", "api"], effort: "L", deps: ["p2-11"] },
      { id: "p7-3", title: "Stream monitoring dashboard", description: "Real-time view of all 6 streams: listener counts, bitrate, uptime, error alerts. Auto-restart controls", status: "planned", icon: Radio, tags: ["frontend", "realtime"], effort: "L", deps: ["p2-2"] },
      { id: "p7-4", title: "Broadcast schedule editor", description: "Drag-and-drop weekly schedule grid. Assign shows to time slots. Conflict detection. Bulk schedule templates", status: "planned", icon: CalendarDays, tags: ["frontend"], effort: "L", deps: ["p2-3"] },
      { id: "p7-5", title: "Platform analytics dashboard", description: "Overview: total users, active listeners, revenue, content volume. Trend charts. Exportable reports", status: "backlog", icon: BarChart3, tags: ["frontend"], effort: "XL", deps: ["p2-12"] },
      { id: "p7-6", title: "System settings & configuration", description: "Station branding, email templates, API key management, feature flags, integration settings", status: "backlog", icon: Settings, tags: ["frontend", "api"], effort: "L" },
      { id: "p7-7", title: "Audit log viewer", description: "Searchable log of all admin actions with timestamps, user, action type, and affected resources", status: "backlog", icon: FileText, tags: ["frontend", "api"], effort: "M" },
      { id: "p7-8", title: "Ad approval workflow", description: "Review pending ad creatives. Preview in-context (banner placement, audio playback). Approve/reject with notes", status: "planned", icon: Megaphone, tags: ["frontend"], effort: "M", deps: ["p2-8"] },
    ],
  },

  // =========================================================================
  // PHASE 8 — COMMUNITY & ENGAGEMENT
  // =========================================================================
  {
    id: "p8",
    number: 8,
    title: "Community & Engagement",
    subtitle: "Contests, live chat, social sharing, community features",
    status: "upcoming",
    icon: Users,
    color: "#f97316",
    timeline: "Week 9-11",
    tasks: [
      { id: "p8-1", title: "Government services directory (backend)", description: "Connect existing 8-county frontend directory to Supabase. Claim workflow with admin approval", status: "planned", icon: MapPin, tags: ["frontend", "api"], effort: "L", deps: ["p2-10"] },
      { id: "p8-2", title: "Contest entry system", description: "Create contests with entry forms, rules, eligibility. Random winner selection. Prize claim workflow", status: "backlog", icon: Award, tags: ["frontend", "api"], effort: "L" },
      { id: "p8-3", title: "Live chat for shows", description: "Real-time chat during live broadcasts using Supabase Realtime. Emoji reactions, @mentions, moderation", status: "backlog", icon: MessageSquare, tags: ["frontend", "realtime"], effort: "XL" },
      { id: "p8-4", title: "Social sharing with OG images", description: "Share now-playing, events, mixes to social media. Auto-generated Open Graph images with show/event details", status: "backlog", icon: Globe, tags: ["frontend"], effort: "M" },
      { id: "p8-5", title: "Event check-in with QR codes", description: "QR code scanning at events for point earning. Admin scanner app. Geofenced auto-check-in option", status: "backlog", icon: MapPin, tags: ["frontend", "api"], effort: "L" },
      { id: "p8-6", title: "Push notifications system", description: "Browser push notifications for live shows, new content, event reminders, points earned. Preference management", status: "backlog", icon: Bell, tags: ["frontend", "api"], effort: "L" },
      { id: "p8-7", title: "Listener profiles & badges", description: "Public listener profiles with avatar, favorite shows, listening streaks, earned badges. Gamification system", status: "backlog", icon: Award, tags: ["frontend"], effort: "M" },
    ],
  },

  // =========================================================================
  // PHASE 9 — INTEGRATIONS & AUTOMATION
  // =========================================================================
  {
    id: "p9",
    number: 9,
    title: "Integrations & Automation",
    subtitle: "Centova Cast, payment processing, email, external services",
    status: "upcoming",
    icon: Zap,
    color: "#8b5cf6",
    timeline: "Week 10-12",
    tasks: [
      { id: "p9-1", title: "Centova Cast full integration", description: "Bidirectional sync: DJ accounts, auto-DJ playlists, listener stats, now-playing metadata, request system", status: "planned", icon: Radio, tags: ["backend", "integration"], effort: "XL" },
      { id: "p9-2", title: "Stripe payment integration", description: "Event ticket purchases, ad campaign billing, merchandise sales. Webhook handlers for payment events", status: "planned", icon: CreditCard, tags: ["backend", "integration"], effort: "XL" },
      { id: "p9-3", title: "Email service (transactional + marketing)", description: "Integration with Resend or SendGrid. Templates: welcome, password reset, event reminders, points earned, creator notifications", status: "planned", icon: MessageSquare, tags: ["backend", "integration"], effort: "L" },
      { id: "p9-4", title: "BullMQ background job workers", description: "Activate apps/workers for: audio processing, waveform generation, analytics aggregation, email sending, ad impression batching", status: "planned", icon: Server, tags: ["backend"], effort: "L" },
      { id: "p9-5", title: "Icecast metadata relay", description: "Pull real-time now-playing data from Icecast streams. Broadcast to connected clients via WebSocket", status: "backlog", icon: Radio, tags: ["backend", "integration"], effort: "M" },
      { id: "p9-6", title: "Calendar sync (iCal export)", description: "Generate iCal feeds for DJ schedules and user event registrations. Compatible with Google/Apple/Outlook", status: "backlog", icon: CalendarDays, tags: ["backend"], effort: "S" },
    ],
  },

  // =========================================================================
  // PHASE 10 — POLISH & LAUNCH
  // =========================================================================
  {
    id: "p10",
    number: 10,
    title: "Polish, Testing & Launch",
    subtitle: "Performance, accessibility, SEO, testing, production deployment",
    status: "upcoming",
    icon: Rocket,
    color: "#ec4899",
    timeline: "Week 11-13",
    tasks: [
      { id: "p10-1", title: "End-to-end test suite", description: "Playwright tests for critical user flows: registration, streaming, mix upload, event registration, points redemption", status: "backlog", icon: TestTube, tags: ["testing"], effort: "XL" },
      { id: "p10-2", title: "API integration tests", description: "Jest tests for all NestJS endpoints. Auth flow tests, RBAC permission tests, file upload tests", status: "backlog", icon: TestTube, tags: ["testing"], effort: "L" },
      { id: "p10-3", title: "Accessibility audit (WCAG 2.1 AA)", description: "Screen reader testing, keyboard navigation, color contrast, ARIA labels, focus management", status: "backlog", icon: Eye, tags: ["frontend", "a11y"], effort: "L" },
      { id: "p10-4", title: "Performance optimization", description: "Lighthouse audit, image optimization, bundle splitting, lazy loading, CDN configuration, caching headers", status: "backlog", icon: Zap, tags: ["frontend", "infra"], effort: "L" },
      { id: "p10-5", title: "SEO & metadata", description: "Dynamic meta tags, Open Graph images, sitemap.xml generation, robots.txt, structured data (JSON-LD)", status: "backlog", icon: Globe, tags: ["frontend"], effort: "M" },
      { id: "p10-6", title: "Production deployment pipeline", description: "Docker containers, environment configs, database migration runner, health checks, rollback procedures", status: "backlog", icon: Rocket, tags: ["infra", "ci"], effort: "L" },
      { id: "p10-7", title: "Monitoring & alerting", description: "Error tracking (Sentry), uptime monitoring, database query performance, API response time dashboards", status: "backlog", icon: Bell, tags: ["infra"], effort: "M" },
      { id: "p10-8", title: "Documentation", description: "API docs (Swagger), developer onboarding guide, deployment runbook, database schema diagram", status: "backlog", icon: FileText, tags: ["docs"], effort: "M" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Phase card component
// ---------------------------------------------------------------------------

function PhaseCard({ phase }: { phase: Phase }) {
  const [open, setOpen] = useState(phase.status === "active");
  const Icon = phase.icon;
  const psCfg = phaseStatusConfig[phase.status];

  const doneTasks = phase.tasks.filter((t) => t.status === "done").length;
  const totalTasks = phase.tasks.length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Card className={cn("border-white/10 bg-[#12121a] transition-all", psCfg.border)}>
      {/* Phase header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-6 py-5 text-left"
      >
        {/* Phase number circle */}
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ backgroundColor: `${phase.color}20` }}
        >
          <Icon className="size-6" style={{ color: phase.color }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              PHASE {phase.number}
            </span>
            <div className={cn("size-2 rounded-full", psCfg.color)} />
            <span className="text-xs text-muted-foreground">{psCfg.label}</span>
          </div>
          <h3 className="text-lg font-bold text-white">{phase.title}</h3>
          <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-medium text-white">
            {doneTasks}/{totalTasks}
          </p>
          <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: phase.color }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{phase.timeline}</p>
        </div>

        {open ? (
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Tasks list */}
      {open && (
        <CardContent className="border-t border-white/5 pt-4">
          <div className="space-y-2">
            {phase.tasks.map((task) => {
              const TIcon = task.icon;
              const tsCfg = taskStatusConfig[task.status];
              const TSIcon = tsCfg.icon;
              const eCfg = effortConfig[task.effort];
              return (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-lg border border-white/5 p-3 transition-colors hover:bg-white/[0.03]",
                    task.status === "done" && "opacity-60"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TSIcon className={cn("size-4 shrink-0", tsCfg.color)} />
                    <span className={cn("text-sm font-medium", task.status === "done" ? "text-muted-foreground line-through" : "text-white")}>
                      {task.title}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px]", eCfg.color)}>
                      {task.effort}
                    </Badge>
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-white/10 text-[10px] text-muted-foreground">
                        {tag}
                      </Badge>
                    ))}
                    {task.deps && task.deps.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        deps: {task.deps.join(", ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {task.description}
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
// Roadmap page
// ---------------------------------------------------------------------------

export default function PortalRoadmapPage() {
  const { role } = useDemoRole();
  const router = useRouter();

  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  // Aggregate stats
  const totalTasks = PHASES.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks = PHASES.reduce((s, p) => s + p.tasks.filter((t) => t.status === "done").length, 0);
  const activeTasks = PHASES.reduce((s, p) => s + p.tasks.filter((t) => t.status === "active").length, 0);
  const nextTasks = PHASES.reduce((s, p) => s + p.tasks.filter((t) => t.status === "next").length, 0);
  const plannedTasks = PHASES.reduce((s, p) => s + p.tasks.filter((t) => t.status === "planned").length, 0);
  const backlogTasks = totalTasks - doneTasks - activeTasks - nextTasks - plannedTasks;
  const pctComplete = Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
            <Rocket className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Build <span className="text-[#74ddc7]">Roadmap</span>
            </h1>
            <p className="text-muted-foreground">
              {PHASES.length} phases &middot; {totalTasks} tasks &middot; End-to-end ecosystem build plan
            </p>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold text-white">{pctComplete}%</p>
            </div>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-400">{doneTasks}</p>
                <p className="text-[10px] text-muted-foreground">Done</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-400">{activeTasks}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">{nextTasks}</p>
                <p className="text-[10px] text-muted-foreground">Next</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-400">{plannedTasks}</p>
                <p className="text-[10px] text-muted-foreground">Planned</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-500">{backlogTasks}</p>
                <p className="text-[10px] text-muted-foreground">Backlog</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="flex h-full">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
              />
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${(activeTasks / totalTasks) * 100}%` }}
              />
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(nextTasks / totalTasks) * 100}%` }}
              />
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${(plannedTasks / totalTasks) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-500" /> Done</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-yellow-500" /> Active</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-blue-500" /> Next</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-purple-500" /> Planned</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-gray-500" /> Backlog</span>
          </div>
        </CardContent>
      </Card>

      {/* Phase cards */}
      <div className="space-y-4">
        {PHASES.map((phase) => (
          <PhaseCard key={phase.id} phase={phase} />
        ))}
      </div>

      {/* Footer */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">
              WCCG 104.5 FM — Full Ecosystem Build Roadmap
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: February 24, 2026 &middot; Estimated timeline: 13 weeks
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 text-muted-foreground" asChild>
            <Link href="/portal/prd">View Full PRD</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
