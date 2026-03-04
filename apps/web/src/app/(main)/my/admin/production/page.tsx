"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Clapperboard,
  Clock,
  CalendarDays,
  Radio,
  Music,
  Video,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

const productionJobs = [
  { id: "PQ-1042", client: "Metro Auto Group", type: "Audio Spot", due: "Mar 5, 2026", status: "In Progress" as const, assignedTo: "Marcus T." },
  { id: "PQ-1043", client: "City Health Clinic", type: "Audio Spot", due: "Mar 6, 2026", status: "Pending" as const, assignedTo: "Unassigned" },
  { id: "PQ-1044", client: "WCCG Internal", type: "Promo", due: "Mar 5, 2026", status: "Review" as const, assignedTo: "Keisha W." },
  { id: "PQ-1045", client: "Carolina BBQ Fest", type: "Audio Spot", due: "Mar 8, 2026", status: "In Progress" as const, assignedTo: "Marcus T." },
  { id: "PQ-1046", client: "First National Bank", type: "Video", due: "Mar 10, 2026", status: "Pending" as const, assignedTo: "Devon R." },
  { id: "PQ-1047", client: "WCCG Morning Show", type: "Promo", due: "Mar 4, 2026", status: "Completed" as const, assignedTo: "Keisha W." },
  { id: "PQ-1048", client: "Johnson Law Firm", type: "Audio Spot", due: "Mar 7, 2026", status: "In Progress" as const, assignedTo: "Marcus T." },
  { id: "PQ-1049", client: "WCCG Events", type: "Video", due: "Mar 12, 2026", status: "Pending" as const, assignedTo: "Devon R." },
];

const studios = [
  { name: "Studio A", activity: "Recording", status: "In Use" as const, color: "from-[#dc2626] to-[#b91c1c]" },
  { name: "Studio B", activity: "Mixing", status: "Available" as const, color: "from-[#22c55e] to-[#16a34a]" },
  { name: "Studio C", activity: "Mastering", status: "In Use" as const, color: "from-[#f59e0b] to-[#d97706]" },
];

const quickActions: { icon: LucideIcon; title: string; href: string; color: string }[] = [
  { icon: CalendarDays, title: "Studio Booking", href: "/studio/booking", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: Radio, title: "Content Library", href: "/studio", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: Music, title: "Audio Editor", href: "/studio/audio-editor", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: Video, title: "Video Editor", href: "/studio/video-editor", color: "from-[#ec4899] to-[#be185d]" },
];

function getJobStatusBadge(status: string) {
  switch (status) {
    case "In Progress":
      return (
        <span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3b82f6]">
          In Progress
        </span>
      );
    case "Pending":
      return (
        <span className="inline-flex items-center rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">
          Pending
        </span>
      );
    case "Review":
      return (
        <span className="inline-flex items-center rounded-full bg-[#7401df]/10 border border-[#7401df]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7401df]">
          Review
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
          Completed
        </span>
      );
    default:
      return null;
  }
}

function getStudioStatusBadge(status: string) {
  switch (status) {
    case "In Use":
      return (
        <span className="inline-flex items-center rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#dc2626]">
          In Use
        </span>
      );
    case "Available":
      return (
        <span className="inline-flex items-center rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
          Available
        </span>
      );
    default:
      return null;
  }
}

export default function ProductionPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20">
            <Clapperboard className="h-7 w-7 text-[#f59e0b]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Production Queue</h1>
            <p className="text-sm text-muted-foreground">
              Active jobs, studio status, and production workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">
            Production
          </span>
        </div>
      </div>

      {/* Active Jobs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#f59e0b]" />
          Active Jobs
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {productionJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#74ddc7]">{job.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{job.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.type}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{job.due}</td>
                    <td className="px-4 py-3">{getJobStatusBadge(job.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.assignedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Studio Status */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Radio className="h-5 w-5 text-[#74ddc7]" />
          Studio Status
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {studios.map((studio) => (
            <div
              key={studio.name}
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${studio.color}`}
                  >
                    <Radio className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground">{studio.name}</h3>
                </div>
                {getStudioStatusBadge(studio.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Current Activity: <span className="text-foreground font-medium">{studio.activity}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.color}`}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                  {action.title}
                </h3>
              </div>
              <div
                className={`absolute -inset-1 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
