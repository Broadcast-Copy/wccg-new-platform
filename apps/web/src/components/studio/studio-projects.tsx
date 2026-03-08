"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Podcast,
  Film,
  AudioLines,
  Clock,
  ArrowRight,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectType = "podcast" | "video" | "audio";

interface StudioProject {
  id: string;
  title: string;
  description?: string;
  category?: string;
  type: ProjectType;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Tool config — colors match the creator tools
// ---------------------------------------------------------------------------

const TOOL_CONFIG: Record<
  ProjectType,
  {
    icon: typeof Podcast;
    label: string;
    gradient: string;
    accentColor: string;
    borderHover: string;
    shadowColor: string;
    href: string;
  }
> = {
  podcast: {
    icon: Podcast,
    label: "Podcast",
    gradient: "from-[#7401df] to-[#4c1d95]",
    accentColor: "#7401df",
    borderHover: "hover:border-[#7401df]/40",
    shadowColor: "hover:shadow-purple-500/5",
    href: "/studio/podcast",
  },
  video: {
    icon: Film,
    label: "Video",
    gradient: "from-[#f59e0b] to-[#d97706]",
    accentColor: "#f59e0b",
    borderHover: "hover:border-[#f59e0b]/40",
    shadowColor: "hover:shadow-orange-500/5",
    href: "/studio/video-editor",
  },
  audio: {
    icon: AudioLines,
    label: "Audio",
    gradient: "from-[#3b82f6] to-[#1d4ed8]",
    accentColor: "#3b82f6",
    borderHover: "hover:border-[#3b82f6]/40",
    shadowColor: "hover:shadow-blue-500/5",
    href: "/studio/audio-editor",
  },
};

// ---------------------------------------------------------------------------
// LocalStorage keys
// ---------------------------------------------------------------------------

const PROJECTS_KEY = "wccg_studio_projects";
const PODCAST_SERIES_KEY = "wccg_podcast_series"; // Legacy key for backward compat

interface LegacyPodcastSeries {
  id: string;
  title: string;
  description?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

function loadProjects(): StudioProject[] {
  if (typeof window === "undefined") return [];
  try {
    // Try loading from unified key first
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      return JSON.parse(raw) as StudioProject[];
    }

    // Fall back to legacy podcast series key
    const legacyRaw = localStorage.getItem(PODCAST_SERIES_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as LegacyPodcastSeries[];
      return legacy.map((s) => ({
        ...s,
        type: "podcast" as ProjectType,
      }));
    }

    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Time-ago helper
// ---------------------------------------------------------------------------

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudioProjects() {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProjects(loadProjects());
  }, []);

  // Don't render until client-side hydration to avoid mismatch
  if (!mounted) return null;

  // No projects — show a simple CTA
  if (projects.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#7401df]" />
          My Studio Projects
        </h2>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7401df]/10">
            <FolderOpen className="h-6 w-6 text-[#7401df]" />
          </div>
          <p className="text-sm text-muted-foreground">
            No studio projects yet
          </p>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            Open a creator tool above to automatically start a new project.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#7401df]" />
          My Studio Projects
        </h2>
        <Button
          size="sm"
          variant="outline"
          asChild
          className="rounded-lg text-xs"
        >
          <Link href="/studio/podcast">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const config = TOOL_CONFIG[project.type] || TOOL_CONFIG.podcast;
          const ToolIcon = config.icon;
          return (
            <Link
              key={project.id}
              href={config.href}
              className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-all ${config.borderHover} hover:shadow-lg ${config.shadowColor}`}
            >
              {/* Icon + Info */}
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient}`}
                >
                  <ToolIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">
                    {project.title || "Untitled Project"}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: config.accentColor,
                        backgroundColor: `${config.accentColor}15`,
                      }}
                    >
                      {config.label}
                    </span>
                    {project.category && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {project.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                {project.createdAt && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(project.updatedAt || project.createdAt)}
                  </span>
                )}
                <span
                  className="flex items-center gap-1 text-xs font-medium group-hover:text-[#74ddc7] transition-colors"
                  style={{ color: config.accentColor }}
                >
                  Open
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>

              {/* Color accent glow on hover */}
              <div
                className={`pointer-events-none absolute -inset-1 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-[0.03] rounded-xl transition-opacity`}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
