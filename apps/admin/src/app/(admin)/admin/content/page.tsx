"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Image as ImageIcon,
  Type,
  Code,
  FileJson,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface ContentBlock {
  id: string;
  slug: string;
  content_type: string;
  title: string;
  value: string;
  metadata: Record<string, unknown>;
  page: string | null;
  updated_at: string;
}

const CONTENT_TYPES = [
  { value: "text", label: "Plain Text", icon: Type },
  { value: "richtext", label: "Rich Text", icon: FileText },
  { value: "image", label: "Image URL", icon: ImageIcon },
  { value: "json", label: "JSON", icon: FileJson },
  { value: "html", label: "HTML", icon: Code },
];

const PAGES = [
  { value: "home", label: "Home" },
  { value: "discover", label: "Discover" },
  { value: "channels", label: "Channels" },
  { value: "shows", label: "Shows" },
  { value: "events", label: "Events" },
  { value: "community", label: "Community" },
  { value: "contests", label: "Contests" },
  { value: "global", label: "Global (all pages)" },
];

// Mock data until API is connected
const MOCK_CONTENT: ContentBlock[] = [
  {
    id: "1",
    slug: "hero_title",
    content_type: "text",
    title: "Hero Title",
    value: "Hip Hop, Sports, Reactions And Podcasts.",
    metadata: {},
    page: "home",
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    slug: "hero_subtitle",
    content_type: "text",
    title: "Hero Subtitle",
    value: "Experience premium digital content wherever you are!",
    metadata: {},
    page: "home",
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    slug: "cta_banner_title",
    content_type: "text",
    title: "CTA Banner Title",
    value: "Your Station. Your Community.",
    metadata: {},
    page: "home",
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    slug: "cta_banner_description",
    content_type: "text",
    title: "CTA Banner Description",
    value: "Join thousands of listeners earning rewards, attending exclusive events, and supporting local businesses through WCCG 104.5 FM.",
    metadata: {},
    page: "home",
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    slug: "ticker_items",
    content_type: "json",
    title: "News Ticker Items",
    value: JSON.stringify([
      "WCCG 104.5 FM — Fayetteville's Hip Hop Station",
      "Streetz Morning Takeover weekdays 6AM-10AM",
      "Download the mY1045 app for exclusive perks",
    ]),
    metadata: {},
    page: "home",
    updated_at: new Date().toISOString(),
  },
  {
    id: "6",
    slug: "station_announcement",
    content_type: "richtext",
    title: "Station Announcement",
    value: "Welcome to WCCG 104.5 FM — Fayetteville's #1 Hip Hop Station!",
    metadata: {},
    page: "global",
    updated_at: new Date().toISOString(),
  },
];

export default function ContentPage() {
  const [content, setContent] = useState<ContentBlock[]>(MOCK_CONTENT);
  const [search, setSearch] = useState("");
  const [filterPage, setFilterPage] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<ContentBlock | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    content_type: "text",
    value: "",
    page: "home",
  });

  // Try to load from API
  useEffect(() => {
    apiClient<ContentBlock[]>("/cms/content")
      .then(setContent)
      .catch(() => {
        // API not available, use mock data
      });
  }, []);

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPage = filterPage === "all" || item.page === filterPage;
    return matchesSearch && matchesPage;
  });

  const groupedContent = filteredContent.reduce(
    (groups, item) => {
      const page = item.page || "uncategorized";
      if (!groups[page]) groups[page] = [];
      groups[page].push(item);
      return groups;
    },
    {} as Record<string, ContentBlock[]>,
  );

  const openEditor = (item: ContentBlock) => {
    setEditingItem(item);
    setFormData({
      slug: item.slug,
      title: item.title,
      content_type: item.content_type,
      value: item.value,
      page: item.page || "home",
    });
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData({
      slug: "",
      title: "",
      content_type: "text",
      value: "",
      page: "home",
    });
  };

  const handleSave = async () => {
    try {
      await apiClient(`/cms/content/${formData.slug}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      toast.success("Content saved successfully");
    } catch {
      // Update locally as fallback
      if (editingItem) {
        setContent((prev) =>
          prev.map((c) =>
            c.id === editingItem.id
              ? { ...c, ...formData, updated_at: new Date().toISOString() }
              : c,
          ),
        );
      } else {
        setContent((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            ...formData,
            metadata: {},
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      toast.success("Content saved (local only — API not connected)");
    }
    setEditingItem(null);
    setIsCreating(false);
  };

  const handleDelete = async (item: ContentBlock) => {
    try {
      await apiClient(`/cms/content/${item.slug}`, { method: "DELETE" });
      toast.success("Content deleted");
    } catch {
      toast.success("Content deleted (local only)");
    }
    setContent((prev) => prev.filter((c) => c.id !== item.id));
  };

  const contentTypeIcon = (type: string) => {
    const ct = CONTENT_TYPES.find((t) => t.value === type);
    return ct ? ct.icon : FileText;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Site Content
          </h1>
          <p className="text-white/50">
            Manage text, images, and content blocks displayed on the public site
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5ec4ad]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-white/[0.08] bg-[#141420] text-white placeholder:text-white/30"
          />
        </div>
        <Select value={filterPage} onValueChange={setFilterPage}>
          <SelectTrigger className="w-[180px] border-white/[0.08] bg-[#141420] text-white">
            <SelectValue placeholder="Filter by page" />
          </SelectTrigger>
          <SelectContent className="bg-[#141420] border-white/[0.08]">
            <SelectItem value="all">All Pages</SelectItem>
            {PAGES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content blocks grouped by page */}
      {Object.entries(groupedContent).map(([page, items]) => (
        <Card key={page} className="border-white/[0.06] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-white capitalize flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#74ddc7]" />
              {page === "global" ? "Global Content" : `${page} Page`}
            </CardTitle>
            <CardDescription className="text-white/40">
              {items.length} content block{items.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-white/[0.06]">
              {items.map((item) => {
                const Icon = contentTypeIcon(item.content_type);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                        <Icon className="h-4 w-4 text-white/50" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-xs text-white/30">
                            {item.slug}
                          </code>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-white/10 text-white/40"
                          >
                            {item.content_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditor(item)}
                        className="h-8 w-8 text-white/40 hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item)}
                        className="h-8 w-8 text-white/40 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredContent.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#12121a]">
          <p className="text-sm text-white/30">
            No content blocks found. Create one to get started.
          </p>
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog
        open={!!editingItem || isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setIsCreating(false);
          }
        }}
      >
        <DialogContent className="bg-[#141420] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Content Block" : "Create Content Block"}
            </DialogTitle>
            <DialogDescription className="text-white/40">
              {editingItem
                ? `Editing "${editingItem.title}"`
                : "Add a new content block to the site"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Hero Title"
                  className="border-white/[0.08] bg-[#0a0a0f] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  placeholder="hero_title"
                  disabled={!!editingItem}
                  className="border-white/[0.08] bg-[#0a0a0f] text-white disabled:opacity-50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, content_type: v })
                  }
                >
                  <SelectTrigger className="border-white/[0.08] bg-[#0a0a0f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141420] border-white/[0.08]">
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Page</Label>
                <Select
                  value={formData.page}
                  onValueChange={(v) => setFormData({ ...formData, page: v })}
                >
                  <SelectTrigger className="border-white/[0.08] bg-[#0a0a0f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141420] border-white/[0.08]">
                    {PAGES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Value</Label>
              <Textarea
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="Enter content value..."
                rows={6}
                className="border-white/[0.08] bg-[#0a0a0f] text-white font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreating(false);
                }}
                className="text-white/50"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5ec4ad]"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
