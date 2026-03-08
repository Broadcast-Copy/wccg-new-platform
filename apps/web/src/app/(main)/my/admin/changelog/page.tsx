"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ScrollText,
  ArrowLeft,
  Filter,
  Calendar,
  Rocket,
  Wrench,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChangeType = "feature" | "fix" | "update" | "launch";

interface ChangelogEntry {
  id: string;
  date: string;
  version?: string;
  area: string;
  title: string;
  description: string;
  type: ChangeType;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<ChangeType, { bg: string; text: string; label: string; icon: LucideIcon }> = {
  feature: { bg: "bg-[#74ddc7]/10", text: "text-[#74ddc7]", label: "Feature", icon: Sparkles },
  fix:     { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", label: "Fix", icon: Wrench },
  update:  { bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]", label: "Update", icon: RefreshCw },
  launch:  { bg: "bg-[#7401df]/10", text: "text-[#7401df]", label: "Launch", icon: Rocket },
};

const AREAS = [
  "All",
  "Podcast Studio",
  "Video Editor",
  "Audio Editor",
  "Media Manager",
  "Sales Portal",
  "My Studio",
  "Platform",
];

const TYPE_FILTERS = ["All", "Feature", "Fix", "Update", "Launch"];

// ---------------------------------------------------------------------------
// Changelog Data (seeded from actual platform history)
// ---------------------------------------------------------------------------

const CHANGELOG: ChangelogEntry[] = [
  // March 8, 2026
  {
    id: "cl-01",
    date: "2026-03-08",
    version: "v3.0",
    area: "Podcast Studio",
    title: "Settings modal with device selection and video recording",
    description: "Added settings dialog for selecting audio/video input devices, camera persistence across layout changes, plus integrated video recording capability.",
    type: "feature",
  },
  {
    id: "cl-02",
    date: "2026-03-08",
    area: "Podcast Studio",
    title: "Timeline panel with editing tools",
    description: "New timeline panel with select, razor, trim, and slip editing tools for precise audio and video clip editing.",
    type: "feature",
  },
  {
    id: "cl-03",
    date: "2026-03-08",
    area: "Podcast Studio",
    title: "Riverside-style layout with video grid and chat",
    description: "Redesigned studio layout inspired by Riverside.fm with multi-participant video grid, live chat panel, and participants sidebar.",
    type: "update",
  },
  {
    id: "cl-04",
    date: "2026-03-08",
    area: "Media Manager",
    title: "File and folder manager replaces DJ mixshows",
    description: "Replaced the old DJ mixshows page with a full file/folder management interface for all media assets including mixes, commercials, promos, and voiceovers.",
    type: "launch",
  },
  {
    id: "cl-05",
    date: "2026-03-08",
    area: "Media Manager",
    title: "File converter, DJB rename, and FTP sync tools",
    description: "Added WAV/MP3 format converter, DJB automation system renaming tool with cart numbers, and FTP settings panel for Program Directors.",
    type: "feature",
  },
  {
    id: "cl-06",
    date: "2026-03-08",
    area: "Sales Portal",
    title: "Campaign builder, invoices, and sales dashboard",
    description: "New sales portal with campaign builder supporting daypart scheduling, invoice management with status tracking, and a sales dashboard with client overview.",
    type: "launch",
  },
  {
    id: "cl-07",
    date: "2026-03-08",
    area: "My Studio",
    title: "Version badges and tool tracking",
    description: "Creator tools now display version numbers. Added New Project workflow with tool selection.",
    type: "update",
  },
  {
    id: "cl-08",
    date: "2026-03-08",
    area: "My Studio",
    title: "Renamed tools, reordered sections, color-coded projects",
    description: "Updated tool names for clarity, reorganized studio sections for better navigation flow, and added color coding to project cards.",
    type: "update",
  },
  {
    id: "cl-09",
    date: "2026-03-08",
    area: "Platform",
    title: "Platform Changelog introduced",
    description: "New admin page tracking all platform changes, version updates, and feature releases across all tools and sections.",
    type: "feature",
  },
  // March 7, 2026
  {
    id: "cl-10",
    date: "2026-03-07",
    version: "v2.1",
    area: "Video Editor",
    title: "Context menu, settings dialog, and keyboard shortcuts",
    description: "Added right-click context menu with Cut/Copy/Paste/Slice/Delete, settings dialog for project configuration, and keyboard shortcuts for common actions.",
    type: "feature",
  },
  {
    id: "cl-11",
    date: "2026-03-07",
    area: "Video Editor",
    title: "Recording freeze fix and save/download",
    description: "Fixed recording freeze issue that occurred on longer sessions. Added save and download functionality for recorded content.",
    type: "fix",
  },
  {
    id: "cl-12",
    date: "2026-03-07",
    area: "Video Editor",
    title: "Responsive layout and mobile improvements",
    description: "Fixed dynamic height calculations, responsive timeline rendering, and hidden bottom navigation on smaller screens.",
    type: "fix",
  },
  {
    id: "cl-13",
    date: "2026-03-07",
    area: "Platform",
    title: "Admin dashboards and portal role system",
    description: "Added role-based admin modules, production queue, studio booking, and comprehensive sales reporting dashboards.",
    type: "feature",
  },
  // March 5, 2026
  {
    id: "cl-14",
    date: "2026-03-05",
    area: "Video Editor",
    title: "Deletable tracks, keyboard shortcuts, and clear all",
    description: "Tracks can now be individually deleted, added keyboard shortcuts for track management, and a clear all function to reset the timeline.",
    type: "feature",
  },
  // March 4, 2026
  {
    id: "cl-15",
    date: "2026-03-04",
    version: "v2.0",
    area: "Video Editor",
    title: "Fully interactive video editor launched",
    description: "All controls wired with real recording, webcam support, file import, and playback. Multi-track timeline with drag-and-drop clip management.",
    type: "launch",
  },
  {
    id: "cl-16",
    date: "2026-03-04",
    version: "v2.0",
    area: "Audio Editor",
    title: "Full DAW with waveform editing and effects",
    description: "Complete digital audio workstation with live waveform visualization, non-destructive editing, trim/cut operations, undo/redo history, and audio export.",
    type: "launch",
  },
  {
    id: "cl-17",
    date: "2026-03-04",
    area: "Audio Editor",
    title: "Recording stability and download improvements",
    description: "Fixed recording freeze issues, added download and delete functionality for clips, and improved error messaging throughout.",
    type: "fix",
  },
  {
    id: "cl-18",
    date: "2026-03-04",
    area: "Platform",
    title: "Live Icecast stream integration",
    description: "Wired direct Icecast stream URL and Cirrus XML now-playing feed for real-time stream data across all six station channels.",
    type: "feature",
  },
  // February 24, 2026
  {
    id: "cl-19",
    date: "2026-02-24",
    area: "Platform",
    title: "Admin analytics, system settings, and sales CRM",
    description: "Phase 10 delivery including admin analytics dashboard, system settings panel, sales CRM module, and listening history tracking.",
    type: "launch",
  },
  {
    id: "cl-20",
    date: "2026-02-24",
    area: "Platform",
    title: "Podcast management, advertiser portal, moderation",
    description: "Phases 5-8 delivery: podcast management hub, full advertiser portal, content moderation tools, notification center, and follow system.",
    type: "launch",
  },
  // February 21, 2026
  {
    id: "cl-21",
    date: "2026-02-21",
    area: "Platform",
    title: "Premium dark theme redesign",
    description: "Complete UI overhaul with premium dark theme inspired by iHeartRadio, SiriusXM, and Riverside. New gradient system and card styles.",
    type: "update",
  },
  // February 18, 2026
  {
    id: "cl-22",
    date: "2026-02-18",
    area: "Platform",
    title: "Platform launch — Phase 0 scaffolding complete",
    description: "Full monorepo scaffolding with Next.js frontend, NestJS backend, Prisma ORM, and shared type packages. All apps booting successfully.",
    type: "launch",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(entries: ChangelogEntry[]): [string, ChangelogEntry[]][] {
  const groups: Record<string, ChangelogEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlatformChangelogPage() {
  const [areaFilter, setAreaFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = CHANGELOG.filter((entry) => {
    if (areaFilter !== "All" && entry.area !== areaFilter) return false;
    if (typeFilter !== "All" && entry.type !== typeFilter.toLowerCase()) return false;
    return true;
  });

  const grouped = groupByDate(filtered);

  // Stats
  const latestDate = CHANGELOG.length > 0 ? formatDate(CHANGELOG[0].date) : "—";
  const totalEntries = CHANGELOG.length;
  const uniqueAreas = new Set(CHANGELOG.map((e) => e.area)).size;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/my/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Station Control
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#74ddc7]/10 border border-[#74ddc7]/20">
            <ScrollText className="h-7 w-7 text-[#74ddc7]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Changelog</h1>
            <p className="text-sm text-muted-foreground">
              Version history and updates across all platform tools.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Updates</p>
          <p className="mt-1 text-2xl font-bold text-[#74ddc7]">{totalEntries}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Last Updated</p>
          <p className="mt-1 text-lg font-bold text-foreground">{latestDate}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Areas Covered</p>
          <p className="mt-1 text-2xl font-bold text-[#7401df]">{uniqueAreas}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Area filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setAreaFilter(area)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                areaFilter === area
                  ? "bg-[#74ddc7]/15 text-[#74ddc7] border border-[#74ddc7]/30"
                  : "bg-foreground/[0.04] text-muted-foreground border border-transparent hover:bg-foreground/[0.08] hover:text-foreground"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          {TYPE_FILTERS.map((tf) => {
            const key = tf.toLowerCase() as ChangeType;
            const config = tf === "All" ? null : TYPE_CONFIG[key];
            return (
              <button
                key={tf}
                type="button"
                onClick={() => setTypeFilter(tf)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  typeFilter === tf
                    ? config
                      ? `${config.bg} ${config.text} border border-current/20`
                      : "bg-[#74ddc7]/15 text-[#74ddc7] border border-[#74ddc7]/30"
                    : "bg-foreground/[0.04] text-muted-foreground border border-transparent hover:bg-foreground/[0.08] hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No changes match your filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, entries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 rounded-full bg-foreground/[0.06] px-3.5 py-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    {formatDate(date)}
                  </span>
                </div>
                <div className="flex-1 border-t border-border" />
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {entries.length} {entries.length === 1 ? "change" : "changes"}
                </span>
              </div>

              {/* Entries */}
              <div className="space-y-2 ml-2 pl-4 border-l-2 border-border">
                {entries.map((entry) => {
                  const config = TYPE_CONFIG[entry.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={entry.id}
                      className="relative rounded-xl border border-border bg-card p-4 hover:border-input transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-[calc(1rem+5px)] top-5 h-2.5 w-2.5 rounded-full border-2 border-card ${config.bg.replace('/10', '')} ${config.text}`}
                        style={{ backgroundColor: "currentColor" }}
                      />

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Type badge */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>

                        {/* Area tag */}
                        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {entry.area}
                        </span>

                        {/* Version pill */}
                        {entry.version && (
                          <span className="rounded border border-[#74ddc7]/20 bg-[#74ddc7]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#74ddc7]">
                            {entry.version}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {entry.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back link bottom */}
      <div className="pt-4 border-t border-border">
        <Link
          href="/my/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Station Control
        </Link>
      </div>
    </div>
  );
}
