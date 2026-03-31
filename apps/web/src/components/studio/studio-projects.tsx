"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Podcast,
  Film,
  AudioLines,
  Clock,
  ArrowRight,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectType = "podcast" | "video" | "audio";

interface StudioProject {
  id: string;
  title: string;
  type: ProjectType;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Tool config
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
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      // Fallback to localStorage for unauthenticated users
      try {
        const raw = localStorage.getItem("wccg_studio_projects");
        if (raw) {
          const parsed = JSON.parse(raw);
          setProjects(parsed.map((p: Record<string, string>) => ({
            id: p.id,
            title: p.title || "Untitled",
            type: (p.type || p.tool || "podcast") as ProjectType,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })));
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("studio_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setProjects(data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: (row.title as string) || "Untitled",
        type: (row.tool as ProjectType) || "podcast",
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      })));
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    if (user) {
      await supabase.from("studio_projects").delete().eq("id", id);
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#7401df]" />
          My Projects
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#7401df]" />
          My Projects
        </h2>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7401df]/10">
            <FolderOpen className="h-6 w-6 text-[#7401df]" />
          </div>
          <p className="text-sm text-muted-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            Click &quot;New Project&quot; to create your first project.
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
          My Projects
        </h2>
        <Button size="sm" variant="outline" asChild className="rounded-lg text-xs">
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
            <div
              key={project.id}
              className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 transition-all ${config.borderHover} hover:shadow-lg ${config.shadowColor}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${config.gradient}`}>
                  <ToolIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
                  <span
                    className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                    style={{ color: config.accentColor, backgroundColor: `${config.accentColor}15` }}
                  >
                    {config.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                {project.createdAt && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(project.updatedAt || project.createdAt)}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href={config.href}
                    className="flex items-center gap-1 text-xs font-medium transition-colors"
                    style={{ color: config.accentColor }}
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
