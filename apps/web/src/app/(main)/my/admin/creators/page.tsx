"use client";

import { useState } from "react";
import {
  Palette,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  ShieldX,
  Eye,
  Check,
  X,
  UserCheck,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreatorStatus = "Active" | "Pending" | "Suspended";
type CreatorType = "Podcaster" | "Musician" | "DJ";
type TabId = "all" | "pending" | "active" | "suspended";

interface Creator {
  id: string;
  name: string;
  type: CreatorType;
  joinDate: string;
  contentCount: number;
  status: CreatorStatus;
}

interface Submission {
  id: string;
  title: string;
  creatorName: string;
  type: string;
  submittedDate: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const initialCreators: Creator[] = [
  { id: "cr-01", name: "DJ Kilo", type: "DJ", joinDate: "2025-11-15", contentCount: 24, status: "Active" },
  { id: "cr-02", name: "Marcus Lyons", type: "Podcaster", joinDate: "2026-01-08", contentCount: 12, status: "Active" },
  { id: "cr-03", name: "Tasha Reign", type: "Musician", joinDate: "2026-02-20", contentCount: 0, status: "Pending" },
  { id: "cr-04", name: "Smooth B", type: "DJ", joinDate: "2025-09-03", contentCount: 47, status: "Active" },
  { id: "cr-05", name: "Nia Carter", type: "Podcaster", joinDate: "2026-03-10", contentCount: 0, status: "Pending" },
  { id: "cr-06", name: "Ray Focus", type: "Musician", joinDate: "2025-12-01", contentCount: 8, status: "Suspended" },
];

const initialSubmissions: Submission[] = [
  { id: "sub-01", title: "The Culture Corner Ep. 14", creatorName: "Marcus Lyons", type: "Podcast Episode", submittedDate: "2026-03-26" },
  { id: "sub-02", title: "Night Drive Mix Vol. 3", creatorName: "DJ Kilo", type: "Mix", submittedDate: "2026-03-25" },
  { id: "sub-03", title: "Summer Anthem (Single)", creatorName: "Tasha Reign", type: "Music Track", submittedDate: "2026-03-24" },
  { id: "sub-04", title: "Friday Vibes Playlist", creatorName: "Smooth B", type: "Playlist", submittedDate: "2026-03-23" },
];

// ---------------------------------------------------------------------------
// Status & type badge styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<CreatorStatus, string> = {
  Active: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
  Pending: "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]",
  Suspended: "bg-[#dc2626]/10 border-[#dc2626]/20 text-[#dc2626]",
};

const TYPE_STYLES: Record<CreatorType, string> = {
  Podcaster: "bg-[#7401df]/10 border-[#7401df]/20 text-[#7401df]",
  Musician: "bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]",
  DJ: "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]",
};

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All Creators" },
  { id: "pending", label: "Pending Review" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreatorManagerPage() {
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const activeCount = creators.filter((c) => c.status === "Active").length;
  const pendingCount = creators.filter((c) => c.status === "Pending").length;

  const filteredCreators =
    activeTab === "all"
      ? creators
      : creators.filter((c) => c.status.toLowerCase() === activeTab);

  function approveCreator(id: string) {
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Active" as CreatorStatus } : c)),
    );
  }

  function suspendCreator(id: string) {
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Suspended" as CreatorStatus } : c)),
    );
  }

  function approveSubmission(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  function rejectSubmission(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dc2626]/10">
            <Palette className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Creator Manager</h1>
            <p className="text-sm text-muted-foreground">Moderate creators and review submitted content</p>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Creators", value: creators.length, icon: Users },
            { label: "Active", value: activeCount, icon: UserCheck },
            { label: "Pending Review", value: pendingCount, icon: Clock },
            { label: "Content Submissions", value: submissions.length, icon: FileText },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <stat.icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#dc2626] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Creator cards ───────────────────────────────────────── */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCreators.map((creator) => (
            <div
              key={creator.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{creator.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_STYLES[creator.type]}`}
                    >
                      {creator.type}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[creator.status]}`}
                    >
                      {creator.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Joined {creator.joinDate}</span>
                <span>{creator.contentCount} items</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {creator.status !== "Active" && (
                  <button
                    type="button"
                    onClick={() => approveCreator(creator.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e]/10 px-3 py-1.5 text-xs font-semibold text-[#22c55e] hover:bg-[#22c55e]/20 transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Approve
                  </button>
                )}
                {creator.status !== "Suspended" && (
                  <button
                    type="button"
                    onClick={() => suspendCreator(creator.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#dc2626]/10 px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:bg-[#dc2626]/20 transition-colors"
                  >
                    <ShieldX className="h-3.5 w-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pending submissions ─────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#dc2626]" />
            <h2 className="text-lg font-semibold text-foreground">Pending Submissions</h2>
          </div>

          {submissions.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">All submissions have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground">{sub.title}</h4>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{sub.creatorName}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">{sub.type}</span>
                      <span>{sub.submittedDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => approveSubmission(sub.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16a34a] transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectSubmission(sub.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#dc2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b91c1c] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
