"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic,
  Clock,
  ArrowRight,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PodcastSeries {
  id: string;
  title: string;
  description?: string;
  category?: string;
  coverImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// LocalStorage key (must match the one in /my/podcasts/page.tsx)
// ---------------------------------------------------------------------------

const LOCAL_KEY = "wccg_podcast_series";

function loadLocalSeries(): PodcastSeries[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as PodcastSeries[]) : [];
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
  const [projects, setProjects] = useState<PodcastSeries[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProjects(loadLocalSeries());
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
            <Mic className="h-6 w-6 text-[#7401df]" />
          </div>
          <p className="text-sm text-muted-foreground">
            No studio projects yet
          </p>
          <Button size="sm" asChild className="rounded-lg bg-[#7401df] hover:bg-[#7401df]/90 text-white">
            <Link href="/my/podcasts">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Your First Podcast
            </Link>
          </Button>
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
          <Link href="/my/podcasts">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href="/studio/podcast"
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-[#7401df]/40 hover:shadow-lg hover:shadow-purple-500/5"
          >
            {/* Icon + Info */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7401df] to-[#4c1d95]">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors truncate">
                  {project.title || "Untitled Podcast"}
                </h3>
                {project.category && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {project.category}
                  </span>
                )}
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
              <span className="flex items-center gap-1 text-xs text-[#7401df] group-hover:text-[#74ddc7] transition-colors font-medium">
                Open Studio
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
