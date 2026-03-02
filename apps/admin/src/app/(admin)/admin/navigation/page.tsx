"use client";

import { useEffect, useState } from "react";
import {
  Navigation as NavIcon,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ExternalLink,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface NavItem {
  id: string;
  location: string;
  label: string;
  href: string;
  icon: string | null;
  sort_order: number;
  parent_id: string | null;
  is_visible: boolean;
}

const LOCATIONS = [
  { value: "header", label: "Header Navigation" },
  { value: "footer", label: "Footer Links" },
  { value: "bottom_tabs", label: "Bottom Tab Bar" },
  { value: "mega_menu", label: "Streaming Mega Menu" },
];

const ICON_OPTIONS = [
  "Home", "Compass", "Headphones", "Mic", "Radio", "CalendarDays",
  "Trophy", "Users2", "Mail", "Gift", "Search", "MapPin", "ShoppingBag",
  "Music", "Ticket", "Heart", "Star", "Megaphone", "BookOpen",
];

// Initial mock data matching the current site navigation
const MOCK_NAV: NavItem[] = [
  // Header
  { id: "h1", location: "header", label: "Discover", href: "/discover", icon: "Compass", sort_order: 1, parent_id: null, is_visible: true },
  { id: "h2", location: "header", label: "Listen", href: "/channels", icon: "Headphones", sort_order: 2, parent_id: null, is_visible: true },
  { id: "h3", location: "header", label: "Shows", href: "/shows", icon: "Mic", sort_order: 3, parent_id: null, is_visible: true },
  { id: "h4", location: "header", label: "Schedule", href: "/schedule", icon: "CalendarDays", sort_order: 4, parent_id: null, is_visible: true },
  { id: "h5", location: "header", label: "Events", href: "/events", icon: "CalendarDays", sort_order: 5, parent_id: null, is_visible: true },
  { id: "h6", location: "header", label: "Contests", href: "/contests", icon: "Trophy", sort_order: 6, parent_id: null, is_visible: true },
  { id: "h7", location: "header", label: "Mixes", href: "/mixes", icon: "Headphones", sort_order: 7, parent_id: null, is_visible: true },
  { id: "h8", location: "header", label: "Community", href: "/community", icon: "Users2", sort_order: 8, parent_id: null, is_visible: true },
  { id: "h9", location: "header", label: "Connect", href: "/contact", icon: "Mail", sort_order: 9, parent_id: null, is_visible: true },

  // Bottom tabs
  { id: "b1", location: "bottom_tabs", label: "Home", href: "/", icon: "Home", sort_order: 1, parent_id: null, is_visible: true },
  { id: "b2", location: "bottom_tabs", label: "Listen", href: "/channels", icon: "Radio", sort_order: 2, parent_id: null, is_visible: true },
  { id: "b3", location: "bottom_tabs", label: "Discover", href: "/discover", icon: "Compass", sort_order: 3, parent_id: null, is_visible: true },
  { id: "b4", location: "bottom_tabs", label: "Shows", href: "/shows", icon: "Mic", sort_order: 4, parent_id: null, is_visible: true },
  { id: "b5", location: "bottom_tabs", label: "Perks", href: "/rewards", icon: "Gift", sort_order: 5, parent_id: null, is_visible: true },

  // Mega menu (Streaming dropdown)
  { id: "m1", location: "mega_menu", label: "WCCG 104.5 FM", href: "/channels/stream_wccg", icon: "Radio", sort_order: 1, parent_id: null, is_visible: true },
  { id: "m2", location: "mega_menu", label: "SOUL 104.5 FM", href: "/channels/stream_soul", icon: "Radio", sort_order: 2, parent_id: null, is_visible: true },
  { id: "m3", location: "mega_menu", label: "HOT 104.5 FM", href: "/channels/stream_hot", icon: "Radio", sort_order: 3, parent_id: null, is_visible: true },
  { id: "m4", location: "mega_menu", label: "104.5 THE VIBE", href: "/channels/stream_vibe", icon: "Radio", sort_order: 4, parent_id: null, is_visible: true },
];

export default function NavigationPage() {
  const [navItems, setNavItems] = useState<NavItem[]>(MOCK_NAV);
  const [activeTab, setActiveTab] = useState("header");
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    location: "header",
    label: "",
    href: "",
    icon: "",
    is_visible: true,
  });

  useEffect(() => {
    apiClient<NavItem[]>("/navigation")
      .then(setNavItems)
      .catch(() => {});
  }, []);

  const locationItems = navItems
    .filter((item) => item.location === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order);

  const moveItem = (item: NavItem, direction: "up" | "down") => {
    const items = [...locationItems];
    const idx = items.findIndex((i) => i.id === item.id);
    if (direction === "up" && idx > 0) {
      [items[idx], items[idx - 1]] = [items[idx - 1], items[idx]];
    } else if (direction === "down" && idx < items.length - 1) {
      [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    }
    const reordered = items.map((i, order) => ({
      ...i,
      sort_order: order + 1,
    }));
    setNavItems((prev) => [
      ...prev.filter((i) => i.location !== activeTab),
      ...reordered,
    ]);
  };

  const toggleVisibility = (item: NavItem) => {
    setNavItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_visible: !i.is_visible } : i,
      ),
    );
    toast.success(
      item.is_visible ? "Item hidden from navigation" : "Item visible in navigation",
    );
  };

  const openEditor = (item: NavItem) => {
    setEditingItem(item);
    setFormData({
      location: item.location,
      label: item.label,
      href: item.href,
      icon: item.icon || "",
      is_visible: item.is_visible,
    });
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData({
      location: activeTab,
      label: "",
      href: "",
      icon: "",
      is_visible: true,
    });
  };

  const handleSave = () => {
    if (editingItem) {
      setNavItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                label: formData.label,
                href: formData.href,
                icon: formData.icon || null,
                is_visible: formData.is_visible,
                location: formData.location,
              }
            : i,
        ),
      );
    } else {
      const maxOrder = Math.max(
        0,
        ...navItems
          .filter((i) => i.location === formData.location)
          .map((i) => i.sort_order),
      );
      setNavItems((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          label: formData.label,
          href: formData.href,
          icon: formData.icon || null,
          location: formData.location,
          sort_order: maxOrder + 1,
          parent_id: null,
          is_visible: formData.is_visible,
        },
      ]);
    }
    toast.success("Navigation updated (local only — API not connected)");
    setEditingItem(null);
    setIsCreating(false);
  };

  const handleSaveAll = async () => {
    try {
      await apiClient("/navigation", {
        method: "PUT",
        body: JSON.stringify({ items: navItems }),
      });
      toast.success("Navigation saved to server");
    } catch {
      toast.success("Navigation saved locally (API not connected)");
    }
  };

  const handleDelete = (item: NavItem) => {
    setNavItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success("Navigation item removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Navigation Editor
          </h1>
          <p className="text-white/50">
            Configure the public site navigation menus and link structure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateDialog}
            variant="outline"
            className="border-white/[0.08] text-white hover:bg-white/[0.04]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
          <Button
            onClick={handleSaveAll}
            className="bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5ec4ad]"
          >
            <Save className="mr-2 h-4 w-4" />
            Publish Changes
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#12121a] border border-white/[0.06]">
          {LOCATIONS.map((loc) => (
            <TabsTrigger
              key={loc.value}
              value={loc.value}
              className="data-[state=active]:bg-[#74ddc7]/15 data-[state=active]:text-[#74ddc7]"
            >
              {loc.label}
              <Badge
                variant="outline"
                className="ml-2 text-[10px] border-white/10 text-white/40"
              >
                {navItems.filter((i) => i.location === loc.value).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {LOCATIONS.map((loc) => (
          <TabsContent key={loc.value} value={loc.value}>
            <Card className="border-white/[0.06] bg-[#12121a]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <NavIcon className="h-5 w-5 text-[#74ddc7]" />
                  {loc.label}
                </CardTitle>
                <CardDescription className="text-white/40">
                  Drag to reorder, toggle visibility, or edit items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationItems.length > 0 ? (
                  <div className="space-y-1">
                    {locationItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          item.is_visible
                            ? "bg-white/[0.02] hover:bg-white/[0.04]"
                            : "bg-white/[0.01] opacity-50"
                        }`}
                      >
                        <GripVertical className="h-4 w-4 text-white/20 shrink-0" />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.icon && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-white/10 text-white/40 shrink-0"
                            >
                              {item.icon}
                            </Badge>
                          )}
                          <span
                            className={`font-medium ${item.is_visible ? "text-white" : "text-white/30 line-through"}`}
                          >
                            {item.label}
                          </span>
                          <span className="text-xs text-white/20 truncate">
                            {item.href}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveItem(item, "up")}
                            disabled={idx === 0}
                            className="h-7 w-7 text-white/30 hover:text-white disabled:opacity-20"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveItem(item, "down")}
                            disabled={idx === locationItems.length - 1}
                            className="h-7 w-7 text-white/30 hover:text-white disabled:opacity-20"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibility(item)}
                            className="h-7 w-7 text-white/30 hover:text-white"
                          >
                            {item.is_visible ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditor(item)}
                            className="h-7 w-7 text-white/30 hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item)}
                            className="h-7 w-7 text-white/30 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.08]">
                    <p className="text-sm text-white/30">
                      No items in this section. Add one to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

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
        <DialogContent className="bg-[#141420] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Navigation Item" : "Add Navigation Item"}
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Configure the menu item label, link, and icon
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-white/70">Location</Label>
              <Select
                value={formData.location}
                onValueChange={(v) =>
                  setFormData({ ...formData, location: v })
                }
              >
                <SelectTrigger className="border-white/[0.08] bg-[#0a0a0f] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141420] border-white/[0.08]">
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Label</Label>
                <Input
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  placeholder="Discover"
                  className="border-white/[0.08] bg-[#0a0a0f] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Icon (optional)</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger className="border-white/[0.08] bg-[#0a0a0f] text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141420] border-white/[0.08]">
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Link URL</Label>
              <Input
                value={formData.href}
                onChange={(e) =>
                  setFormData({ ...formData, href: e.target.value })
                }
                placeholder="/discover"
                className="border-white/[0.08] bg-[#0a0a0f] text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_visible}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_visible: checked })
                }
              />
              <Label className="text-white/70">Visible</Label>
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
