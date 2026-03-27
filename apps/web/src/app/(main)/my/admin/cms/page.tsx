"use client";

import { useState } from "react";
import {
  Globe,
  Pencil,
  Save,
  X,
  FileText,
  CheckCircle2,
  Clock,
  GripVertical,
  Layout,
  Image,
  Type,
  MousePointerClick,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageStatus = "Published" | "Draft";

interface SitePage {
  id: string;
  name: string;
  urlPath: string;
  lastModified: string;
  status: PageStatus;
  metaDescription: string;
  sections: {
    hero: string;
    body: string;
    sidebar: string;
  };
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const initialPages: SitePage[] = [
  { id: "pg-01", name: "Home", urlPath: "/", lastModified: "2026-03-25", status: "Published", metaDescription: "WCCG — Durham's premier hip-hop and community radio.", sections: { hero: "Welcome to WCCG Radio", body: "Your source for the best hip-hop, culture, and community news.", sidebar: "Now Playing widget" } },
  { id: "pg-02", name: "About", urlPath: "/about", lastModified: "2026-03-20", status: "Published", metaDescription: "Learn about WCCG's mission and history.", sections: { hero: "About WCCG", body: "Founded in Durham, WCCG has served the community since day one.", sidebar: "Team highlights" } },
  { id: "pg-03", name: "Shows", urlPath: "/shows", lastModified: "2026-03-22", status: "Published", metaDescription: "Browse our lineup of live and on-demand shows.", sections: { hero: "Our Shows", body: "Explore the full lineup of programming.", sidebar: "Schedule widget" } },
  { id: "pg-04", name: "Channels", urlPath: "/channels", lastModified: "2026-03-18", status: "Published", metaDescription: "Explore WCCG's curated channels.", sections: { hero: "Channels", body: "Stream curated music channels 24/7.", sidebar: "Featured channels" } },
  { id: "pg-05", name: "Sports", urlPath: "/sports", lastModified: "2026-03-15", status: "Published", metaDescription: "Durham sports coverage and live broadcasts.", sections: { hero: "Sports Central", body: "Live scores, game recaps, and exclusive interviews.", sidebar: "Upcoming games" } },
  { id: "pg-06", name: "Advertise", urlPath: "/advertise", lastModified: "2026-03-12", status: "Published", metaDescription: "Reach Durham's audience with WCCG advertising.", sections: { hero: "Advertise With Us", body: "Connect with our engaged audience across radio and digital.", sidebar: "Rate card download" } },
  { id: "pg-07", name: "Careers", urlPath: "/careers", lastModified: "2026-03-10", status: "Draft", metaDescription: "Join the WCCG team.", sections: { hero: "Careers at WCCG", body: "We're always looking for passionate people.", sidebar: "Open positions" } },
  { id: "pg-08", name: "Contact", urlPath: "/contact", lastModified: "2026-03-08", status: "Published", metaDescription: "Get in touch with WCCG.", sections: { hero: "Contact Us", body: "Reach out to our team for inquiries and partnerships.", sidebar: "Address and hours" } },
  { id: "pg-09", name: "FAQ", urlPath: "/faq", lastModified: "2026-02-28", status: "Published", metaDescription: "Frequently asked questions about WCCG.", sections: { hero: "FAQ", body: "Answers to common questions about listening, advertising, and more.", sidebar: "Support links" } },
  { id: "pg-10", name: "Events", urlPath: "/events", lastModified: "2026-03-24", status: "Published", metaDescription: "Upcoming WCCG events and community gatherings.", sections: { hero: "Events", body: "Stay up to date with community events and live broadcasts.", sidebar: "Calendar widget" } },
  { id: "pg-11", name: "Contests", urlPath: "/contests", lastModified: "2026-03-05", status: "Draft", metaDescription: "Enter WCCG contests and win prizes.", sections: { hero: "Contests", body: "Participate in our latest giveaways and competitions.", sidebar: "Current prizes" } },
];

const SECTION_BLOCKS = [
  { label: "Header", icon: Layout, color: "border-[#dc2626]/30 bg-[#dc2626]/5" },
  { label: "Content Block", icon: Type, color: "border-[#3b82f6]/30 bg-[#3b82f6]/5" },
  { label: "Media Block", icon: Image, color: "border-[#f59e0b]/30 bg-[#f59e0b]/5" },
  { label: "CTA Block", icon: MousePointerClick, color: "border-[#22c55e]/30 bg-[#22c55e]/5" },
];

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<PageStatus, string> = {
  Published: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
  Draft: "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CmsPage() {
  const [pages, setPages] = useState<SitePage[]>(initialPages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editHero, setEditHero] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSidebar, setEditSidebar] = useState("");

  const publishedCount = pages.filter((p) => p.status === "Published").length;
  const lastUpdated = pages
    .map((p) => p.lastModified)
    .sort()
    .reverse()[0];

  function startEditing(page: SitePage) {
    setEditingId(page.id);
    setEditTitle(page.name);
    setEditMeta(page.metaDescription);
    setEditHero(page.sections.hero);
    setEditBody(page.sections.body);
    setEditSidebar(page.sections.sidebar);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
    setEditMeta("");
    setEditHero("");
    setEditBody("");
    setEditSidebar("");
  }

  function saveEditing() {
    if (!editingId) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: editTitle,
              metaDescription: editMeta,
              sections: { hero: editHero, body: editBody, sidebar: editSidebar },
              lastModified: new Date().toISOString().split("T")[0],
              status: "Published" as PageStatus,
            }
          : p,
      ),
    );
    cancelEditing();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dc2626]/10">
            <Globe className="h-5 w-5 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Web Editor / CMS</h1>
            <p className="text-sm text-muted-foreground">Manage site pages, content sections, and metadata</p>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Pages", value: pages.length, icon: FileText },
            { label: "Published", value: publishedCount, icon: CheckCircle2 },
            { label: "Last Updated", value: lastUpdated, icon: Clock },
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

        {/* ── Pages list ─────────────────────────────────────────── */}
        <div className="mb-8 space-y-3">
          {pages.map((page) => (
            <div key={page.id}>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{page.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[page.status]}`}
                    >
                      {page.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{page.urlPath}</span>
                    <span>Modified {page.lastModified}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (editingId === page.id ? cancelEditing() : startEditing(page))}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    editingId === page.id
                      ? "border border-border bg-card text-foreground hover:bg-muted"
                      : "bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                  }`}
                >
                  {editingId === page.id ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </>
                  )}
                </button>
              </div>

              {/* ── Inline editor ──────────────────────────────────── */}
              {editingId === page.id && (
                <div className="mt-2 rounded-xl border border-[#dc2626]/20 bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-foreground">Editing: {page.name}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Page Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Meta Description</label>
                      <textarea
                        value={editMeta}
                        onChange={(e) => setEditMeta(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-y"
                      />
                    </div>

                    {/* Section editors */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Content Sections</h3>
                      {[
                        { label: "Hero", value: editHero, onChange: setEditHero },
                        { label: "Body", value: editBody, onChange: setEditBody },
                        { label: "Sidebar", value: editSidebar, onChange: setEditSidebar },
                      ].map((section) => (
                        <div key={section.label}>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {section.label}
                          </label>
                          <textarea
                            value={section.value}
                            onChange={(e) => section.onChange(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-y"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={saveEditing}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c] transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save &amp; Publish
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Section builder placeholder ─────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Visual Section Builder</h2>
          <p className="mb-4 text-sm text-muted-foreground">Drag and drop content blocks to build page layouts.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SECTION_BLOCKS.map((block) => (
              <div
                key={block.label}
                className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-4 ${block.color} cursor-grab`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                <block.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{block.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
