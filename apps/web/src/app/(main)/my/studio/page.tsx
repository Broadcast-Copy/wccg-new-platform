"use client";

import Link from "next/link";
import {
  Clapperboard,
  Podcast,
  Film,
  AudioLines,
  Music,
  ArrowRight,
  Calendar,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioProjects } from "@/components/studio/studio-projects";

// ---------------------------------------------------------------------------
// Creator tools — quick-launch cards
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    icon: Podcast,
    title: "OBS Studio for Live Podcasting",
    description: "Manage scenes, audio mixing, overlays, and stream live.",
    href: "/studio/podcast",
    color: "from-[#7401df] to-[#4c1d95]",
    badge: "Live",
  },
  {
    icon: Film,
    title: "Premiere Video Editor",
    description: "Multi-track timeline, effects, transitions, and color grading.",
    href: "/studio/video-editor",
    color: "from-[#f59e0b] to-[#d97706]",
    badge: "NLE",
  },
  {
    icon: AudioLines,
    title: "Audio Editor & Recorder",
    description: "Record, edit, and mix audio — waveform editing & effects.",
    href: "/studio/audio-editor",
    color: "from-[#3b82f6] to-[#1d4ed8]",
    badge: "DAW",
  },
];

// Quick links
const QUICK_LINKS = [
  { href: "/my/podcasts", label: "My Podcasts", icon: Mic },
  { href: "/my/mixes", label: "My Mixes", icon: Music },
  { href: "/studio/booking", label: "Book a Studio", icon: Calendar },
  { href: "/studio", label: "All Studio Services", icon: Clapperboard },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MyStudioPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clapperboard className="h-6 w-6 text-[#7401df]" />
          My Studio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your projects, creator tools, and studio resources in one place.
        </p>
      </div>

      {/* Studio Projects */}
      <StudioProjects />

      {/* Creator Tools */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Creator Tools</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#74ddc7] bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-2 py-0.5 rounded-full">
            Free
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-[#74ddc7]/40 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4 flex-1">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} shadow-lg`}
                >
                  <tool.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors text-sm leading-tight">
                    {tool.title}
                  </h3>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                    {tool.badge}
                  </span>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-xs font-semibold text-[#7401df] group-hover:text-[#74ddc7] transition-colors">
                Open
                <ArrowRight className="h-3 w-3" />
              </div>
              <div
                className={`pointer-events-none absolute -inset-1 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-[#74ddc7]/30 hover:bg-foreground/[0.02]"
            >
              <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-[#74ddc7] transition-colors" />
              <span className="text-sm font-medium text-foreground group-hover:text-[#74ddc7] transition-colors">
                {link.label}
              </span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-[#74ddc7] transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* CTA to full services */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-[#7401df]/5 to-[#74ddc7]/5 p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            Need Professional Production?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Explore our full-service studio production, video, live broadcasts, and more.
          </p>
        </div>
        <Button size="sm" asChild className="rounded-lg bg-[#7401df] hover:bg-[#7401df]/90 text-white shrink-0">
          <Link href="/studio">
            View All Services
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
