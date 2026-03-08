"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Podcast,
  Film,
  AudioLines,
  Music,
  ArrowRight,
  Calendar,
  Plus,
  X,
  Check,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioProjects } from "@/components/studio/studio-projects";

// ---------------------------------------------------------------------------
// Tools (used in New Project modal for tool selection)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    icon: Podcast,
    title: "Podcasts",
    description: "Record, manage scenes, audio mixing, overlays, and stream live.",
    href: "/studio/podcast",
    color: "from-[#7401df] to-[#4c1d95]",
    version: "v3.0",
  },
  {
    icon: Film,
    title: "Video Editor",
    description: "Multi-track timeline, effects, transitions, and color grading.",
    href: "/studio/video-editor",
    color: "from-[#f59e0b] to-[#d97706]",
    version: "v2.1",
  },
  {
    icon: AudioLines,
    title: "Audio Editor",
    description: "Record, edit, and mix audio — waveform editing & effects.",
    href: "/studio/audio-editor",
    color: "from-[#3b82f6] to-[#1d4ed8]",
    version: "v2.0",
  },
];

// Quick links
const QUICK_LINKS = [
  { href: "/my/mixes", label: "Media Manager", icon: FolderOpen },
  { href: "/studio/booking", label: "Book a Studio", icon: Calendar },
  { href: "/studio", label: "All Studio Services", icon: Clapperboard },
];

// ---------------------------------------------------------------------------
// New Project Modal
// ---------------------------------------------------------------------------

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [selectedTool, setSelectedTool] = useState<number | null>(null);

  if (!open) return null;

  const canCreate = projectName.trim().length > 0 && selectedTool !== null;

  function handleCreate() {
    if (!canCreate) return;
    const tool = TOOLS[selectedTool!];

    // Save project to localStorage
    const key = "wccg_studio_projects";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const newProject = {
      id: `proj_${Date.now()}`,
      name: projectName.trim(),
      tool: tool.title,
      toolHref: tool.href,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify([newProject, ...existing]));

    // Navigate to the selected tool
    router.push(tool.href);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#74ddc7]" />
              New Project
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Name your project and choose a tool to get started.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Project Name */}
        <div className="space-y-2 mb-5">
          <label className="text-sm font-medium text-foreground">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Friday Night Mix, Spring Campaign Ad..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 focus:border-[#74ddc7]/50"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) handleCreate();
            }}
          />
        </div>

        {/* Tool Selection */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-foreground">Choose a Tool</label>
          <div className="grid gap-2">
            {TOOLS.map((tool, idx) => {
              const isSelected = selectedTool === idx;
              return (
                <button
                  key={tool.title}
                  type="button"
                  onClick={() => setSelectedTool(idx)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-[#74ddc7]/60 bg-[#74ddc7]/5 ring-1 ring-[#74ddc7]/30"
                      : "border-border bg-background hover:border-input hover:bg-foreground/[0.02]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tool.color}`}
                  >
                    <tool.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${isSelected ? "text-[#74ddc7]" : "text-foreground"}`}>
                        {tool.title}
                      </p>
                      <span className="text-[9px] font-bold tracking-wider text-[#74ddc7] bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-1 py-0.5 rounded">
                        {tool.version}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {tool.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#74ddc7]">
                      <Check className="h-3.5 w-3.5 text-background" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canCreate}
            onClick={handleCreate}
            className="bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-background disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MyStudioPage() {
  const [showNewProject, setShowNewProject] = useState(false);

  return (
    <div className="space-y-8">
      {/* New Project Modal */}
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clapperboard className="h-6 w-6 text-[#7401df]" />
            Broadcast Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create projects, manage your work, and access studio resources.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewProject(true)}
          className="bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-background rounded-lg"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Quick Links — right below header */}
      <div className="grid gap-3 sm:grid-cols-3">
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

      {/* My Projects */}
      <StudioProjects />

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
