"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Radio,
  Clock,
  Users,
  CalendarDays,
  ArrowLeft,
  Mic,
  type LucideIcon,
} from "lucide-react";

const scheduleData = [
  { time: "6:00 AM - 10:00 AM", show: "The Morning Mix", host: "DJ Quick", status: "Completed" as const },
  { time: "10:00 AM - 2:00 PM", show: "Midday Groove", host: "DJ Smooth", status: "Live" as const },
  { time: "2:00 PM - 6:00 PM", show: "Drive Time", host: "MC Blaze", status: "Upcoming" as const },
  { time: "6:00 PM - 10:00 PM", show: "Evening Vibes", host: "Lady Soul", status: "Upcoming" as const },
  { time: "10:00 PM - 2:00 AM", show: "Late Night R&B", host: "DJ Velvet", status: "Upcoming" as const },
  { time: "8:00 AM - 12:00 PM", show: "Sunday Gospel", host: "Minister Ray", status: "Upcoming" as const },
];

const shows = [
  { name: "The Morning Mix", host: "DJ Quick", time: "6:00 AM - 10:00 AM", status: "Active" },
  { name: "Midday Groove", host: "DJ Smooth", time: "10:00 AM - 2:00 PM", status: "Active" },
  { name: "Drive Time", host: "MC Blaze", time: "2:00 PM - 6:00 PM", status: "Active" },
  { name: "Evening Vibes", host: "Lady Soul", time: "6:00 PM - 10:00 PM", status: "Active" },
  { name: "Late Night R&B", host: "DJ Velvet", time: "10:00 PM - 2:00 AM", status: "Active" },
  { name: "Sunday Gospel", host: "Minister Ray", time: "Sun 8:00 AM - 12:00 PM", status: "Weekend" },
];

const quickActions: { icon: LucideIcon; title: string; href: string; color: string }[] = [
  { icon: Radio, title: "All Shows", href: "/shows", color: "from-[#7401df] to-[#4c1d95]" },
  { icon: Users, title: "Manage Hosts", href: "/hosts", color: "from-[#3b82f6] to-[#1d4ed8]" },
  { icon: CalendarDays, title: "Full Schedule", href: "/schedule", color: "from-[#74ddc7] to-[#0d9488]" },
  { icon: ArrowLeft, title: "Back to Admin", href: "/my/admin", color: "from-[#dc2626] to-[#b91c1c]" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "Live":
      return (
        <span className="inline-flex items-center rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#22c55e]">
          Live
        </span>
      );
    case "Upcoming":
      return (
        <span className="inline-flex items-center rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3b82f6]">
          Upcoming
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Completed
        </span>
      );
    case "Active":
      return (
        <span className="inline-flex items-center rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#74ddc7]">
          Active
        </span>
      );
    case "Weekend":
      return (
        <span className="inline-flex items-center rounded-full bg-[#7401df]/10 border border-[#7401df]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7401df]">
          Weekend
        </span>
      );
    default:
      return null;
  }
}

export default function ProgrammingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7401df]/10 border border-[#7401df]/20">
            <Radio className="h-7 w-7 text-[#7401df]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programming &amp; Shows</h1>
            <p className="text-sm text-muted-foreground">
              Manage schedules, shows, and on-air hosts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#7401df]/10 border border-[#7401df]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7401df]">
            Programming
          </span>
        </div>
      </div>

      {/* Current Schedule */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#74ddc7]" />
          Current Schedule
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Show</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Host</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduleData.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.time}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.show}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.host}</td>
                    <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Show Management */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mic className="h-5 w-5 text-[#7401df]" />
          Show Management
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show) => (
            <div
              key={show.name}
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-input hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{show.name}</h3>
                {getStatusBadge(show.status)}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {show.host}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {show.time}
                </p>
              </div>
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
