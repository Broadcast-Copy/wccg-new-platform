"use client";

import { useState } from "react";
import {
  PenLine,
  Plus,
  Eye,
  FileText,
  Clock,
  Send,
  Save,
  X,
  CalendarDays,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostStatus = "Published" | "Draft" | "Scheduled";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  status: PostStatus;
  publishDate: string;
  views: number;
  category: string;
  featuredImage: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CATEGORIES = ["Hip-Hop", "Culture", "Music News", "Community", "Opinion"];

const initialPosts: BlogPost[] = [
  {
    id: "bp-001",
    title: "The Rise of Durham's Hip-Hop Scene",
    excerpt: "Exploring how local artists are putting the Bull City on the map with fresh sounds and authentic storytelling.",
    status: "Published",
    publishDate: "2026-03-20",
    views: 1842,
    category: "Hip-Hop",
    featuredImage: "",
  },
  {
    id: "bp-002",
    title: "Behind the Boards: Producers Shaping the Sound",
    excerpt: "A deep dive into the producers creating beats that define the next generation of Carolina hip-hop.",
    status: "Published",
    publishDate: "2026-03-18",
    views: 1205,
    category: "Music News",
    featuredImage: "",
  },
  {
    id: "bp-003",
    title: "Community Spotlight: Youth Music Programs",
    excerpt: "How local organizations are nurturing the next wave of talent through mentorship and studio access.",
    status: "Draft",
    publishDate: "",
    views: 0,
    category: "Community",
    featuredImage: "",
  },
  {
    id: "bp-004",
    title: "Opinion: Why Radio Still Matters in the Streaming Era",
    excerpt: "In a world of algorithms, local radio provides something streaming never can — community connection.",
    status: "Scheduled",
    publishDate: "2026-04-01",
    views: 0,
    category: "Opinion",
    featuredImage: "",
  },
  {
    id: "bp-005",
    title: "Festival Season Preview: What to Expect This Summer",
    excerpt: "A roundup of the hottest festivals, block parties, and live events hitting the Triangle this summer.",
    status: "Published",
    publishDate: "2026-03-15",
    views: 2310,
    category: "Culture",
    featuredImage: "",
  },
];

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<PostStatus, string> = {
  Published: "bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]",
  Draft: "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]",
  Scheduled: "bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BlogManagerPage() {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formImage, setFormImage] = useState("");

  const published = posts.filter((p) => p.status === "Published");
  const drafts = posts.filter((p) => p.status === "Draft");
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);

  function resetForm() {
    setFormTitle("");
    setFormContent("");
    setFormCategory(CATEGORIES[0]);
    setFormImage("");
    setShowForm(false);
  }

  function handlePublish() {
    if (!formTitle.trim()) return;
    const newPost: BlogPost = {
      id: `bp-${Date.now()}`,
      title: formTitle.trim(),
      excerpt: formContent.slice(0, 140),
      status: "Published",
      publishDate: new Date().toISOString().split("T")[0],
      views: 0,
      category: formCategory,
      featuredImage: formImage,
    };
    setPosts([newPost, ...posts]);
    resetForm();
  }

  function handleSaveDraft() {
    if (!formTitle.trim()) return;
    const newPost: BlogPost = {
      id: `bp-${Date.now()}`,
      title: formTitle.trim(),
      excerpt: formContent.slice(0, 140),
      status: "Draft",
      publishDate: "",
      views: 0,
      category: formCategory,
      featuredImage: formImage,
    };
    setPosts([newPost, ...posts]);
    resetForm();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10">
              <PenLine className="h-5 w-5 text-[#7401df]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Blog Manager</h1>
              <p className="text-sm text-muted-foreground">Create and manage your blog content</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7401df] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#6001b8] transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Post"}
          </button>
        </div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Posts", value: posts.length, icon: FileText },
            { label: "Published", value: published.length, icon: Send },
            { label: "Drafts", value: drafts.length, icon: Clock },
            { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye },
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

        {/* ── New Post Form ──────────────────────────────────────── */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-[#7401df]/20 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">New Blog Post</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter post title..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7401df] focus:outline-none focus:ring-1 focus:ring-[#7401df]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Content</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your blog post content..."
                  rows={8}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7401df] focus:outline-none focus:ring-1 focus:ring-[#7401df] resize-y"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#7401df] focus:outline-none focus:ring-1 focus:ring-[#7401df]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Featured Image URL</label>
                  <input
                    type="text"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7401df] focus:outline-none focus:ring-1 focus:ring-[#7401df]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#7401df] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6001b8] transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Publish
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Save Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Posts list ──────────────────────────────────────────── */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <PenLine className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground">No posts yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first blog post to get started.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7401df] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6001b8] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-[#7401df]/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{post.title}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[post.status]}`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {post.category}
                    </span>
                    {post.publishDate && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {post.publishDate}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views.toLocaleString()} views
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
