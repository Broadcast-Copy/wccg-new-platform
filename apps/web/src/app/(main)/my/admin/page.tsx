"use client";

import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import Link from "next/link";
import {
  Shield,
  Radio,
  Users,
  CalendarDays,
  BarChart3,
  Megaphone,
  Music,
  Settings,
  ExternalLink,
  Lock,
  Briefcase,
  FileAudio,
  Palette,
  Trophy,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminModule {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color: string;
}

const defaultModules: AdminModule[] = [
  {
    icon: Radio,
    title: "Stream Management",
    description: "Manage live streams, channels, and on-air scheduling.",
    href: "/my/admin",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
  {
    icon: Users,
    title: "User Management",
    description: "View and manage listeners, hosts, and admin accounts.",
    href: "/my/admin",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    icon: CalendarDays,
    title: "Events & Tickets",
    description: "Create events, manage ticket sales, and check-ins.",
    href: "/events/create",
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    icon: Megaphone,
    title: "Advertising",
    description: "Manage ad campaigns, clients, creatives, and billing.",
    href: "/advertise/portal",
    color: "from-[#dc2626] to-[#b91c1c]",
  },
  {
    icon: Music,
    title: "Shows & Programming",
    description: "Manage show listings, host assignments, and schedules.",
    href: "/shows",
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Listener metrics, stream stats, and engagement data.",
    href: "/my/admin",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: Settings,
    title: "Platform Settings",
    description: "Site configuration, branding, and system preferences.",
    href: "/my/admin",
    color: "from-[#8b5cf6] to-[#6d28d9]",
  },
];

const salesModules: AdminModule[] = [
  {
    icon: Megaphone,
    title: "Campaign Builder",
    description: "Create and manage advertising campaigns.",
    href: "/my/admin/campaigns",
    color: "from-[#dc2626] to-[#b91c1c]",
  },
  {
    icon: Briefcase,
    title: "Client Manager",
    description: "Manage advertiser accounts and contacts.",
    href: "/advertise/portal/clients",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    icon: BarChart3,
    title: "Sales Reports",
    description: "Revenue tracking, pipeline, and sales analytics.",
    href: "/my/admin/reports",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: FileAudio,
    title: "Rate Cards",
    description: "Manage advertising rates and packages.",
    href: "/advertise/portal",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
  {
    icon: Settings,
    title: "Advertising Portal",
    description: "Full advertiser management portal.",
    href: "/advertise/portal",
    color: "from-[#8b5cf6] to-[#6d28d9]",
  },
];

const productionModules: AdminModule[] = [
  {
    icon: FileAudio,
    title: "Production Queue",
    description: "Active jobs, deadlines, and production workflow.",
    href: "/my/admin/production",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: CalendarDays,
    title: "Studio Booking",
    description: "Reserve studio time and manage sessions.",
    href: "/studio/booking",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    icon: Radio,
    title: "Content Library",
    description: "Browse and manage audio assets and recordings.",
    href: "/studio",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
  {
    icon: Music,
    title: "Audio Editor",
    description: "Edit, mix, and master audio content.",
    href: "/studio/audio-editor",
    color: "from-[#7401df] to-[#4c1d95]",
  },
  {
    icon: Megaphone,
    title: "Shows & Programming",
    description: "Manage show listings, host assignments, and schedules.",
    href: "/shows",
    color: "from-[#ec4899] to-[#be185d]",
  },
];

const promotionsModules: AdminModule[] = [
  {
    icon: CalendarDays,
    title: "Events Manager",
    description: "Create and manage station events and appearances.",
    href: "/events/create",
    color: "from-[#ec4899] to-[#be185d]",
  },
  {
    icon: Trophy,
    title: "Contests Manager",
    description: "Run contests, giveaways, and listener promotions.",
    href: "/contests",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: MessageSquare,
    title: "Community Hub",
    description: "Engage with listeners and manage community content.",
    href: "/community",
    color: "from-[#3b82f6] to-[#1d4ed8]",
  },
  {
    icon: Palette,
    title: "Social Content",
    description: "Create and schedule social media content.",
    href: "/studio/social-content",
    color: "from-[#7401df] to-[#4c1d95]",
  },
];

const allModules: AdminModule[] = [
  ...defaultModules,
  {
    icon: Megaphone,
    title: "Campaign Builder",
    description: "Create and manage advertising campaigns.",
    href: "/my/admin/campaigns",
    color: "from-[#dc2626] to-[#b91c1c]",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description: "Revenue tracking, pipeline, and sales analytics.",
    href: "/my/admin/reports",
    color: "from-[#f59e0b] to-[#d97706]",
  },
  {
    icon: Radio,
    title: "Programming",
    description: "Programming schedules, show management, and hosts.",
    href: "/my/admin/programming",
    color: "from-[#74ddc7] to-[#0d9488]",
  },
];

function getModulesForRole(flags: {
  isSales: boolean;
  isProduction: boolean;
  isManagement: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPromotions: boolean;
}): AdminModule[] {
  if (flags.isManagement || flags.isAdmin || flags.isSuperAdmin) {
    return allModules;
  }
  if (flags.isSales) return salesModules;
  if (flags.isProduction) return productionModules;
  if (flags.isPromotions) return promotionsModules;
  return defaultModules;
}

export default function StationControlPage() {
  const { user } = useAuth();
  const {
    isSales,
    isProduction,
    isManagement,
    isAdmin,
    isSuperAdmin,
    isPromotions,
  } = useUserRoles();

  const modules = getModulesForRole({
    isSales,
    isProduction,
    isManagement,
    isAdmin,
    isSuperAdmin,
    isPromotions,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <Shield className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Station Control</h1>
            <p className="text-sm text-muted-foreground">
              Admin dashboard for WCCG 104.5 FM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#dc2626]">
            Admin
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Shows", value: "22", color: "text-[#74ddc7]" },
          { label: "Total Hosts", value: "25", color: "text-[#7401df]" },
          { label: "Streams", value: "6", color: "text-[#3b82f6]" },
          { label: "Status", value: "On Air", color: "text-[#22c55e]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {stat.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Admin Modules */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Link
              key={mod.title}
              href={mod.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color}`}
                >
                  <mod.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                </div>
              </div>
              <div
                className={`absolute -inset-1 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* External Admin Link */}
      <div className="rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-[#dc2626]" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Full Admin Panel
            </p>
            <p className="text-xs text-muted-foreground">
              Access the complete admin interface at admin.wccg1045fm.com
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
          asChild
        >
          <a
            href="https://admin.wccg1045fm.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Admin
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      {/* Logged in info */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Logged in as {user?.email || "admin"} · Carson Communications / WCCG
          104.5 FM
        </p>
      </div>
    </div>
  );
}
