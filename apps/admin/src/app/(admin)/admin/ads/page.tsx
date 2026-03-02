"use client";

import { useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Eye,
  EyeOff,
  ExternalLink,
  MousePointerClick,
  BarChart3,
  Image as ImageIcon,
  Video,
  Code,
  Volume2,
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
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface AdPlacement {
  id: string;
  slot: string;
  title: string;
  ad_type: string;
  content: string | null;
  target_url: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
  advertiser_name: string | null;
  created_at: string;
  updated_at: string;
}

const AD_TYPES = [
  { value: "image", label: "Image Banner", icon: ImageIcon },
  { value: "html", label: "HTML/Embed", icon: Code },
  { value: "video", label: "Video", icon: Video },
  { value: "audio_preroll", label: "Audio Pre-roll", icon: Volume2 },
];

const AD_SLOTS = [
  { value: "hero_banner", label: "Hero Banner" },
  { value: "home_sidebar", label: "Home Sidebar" },
  { value: "home_midpage", label: "Home Mid-Page" },
  { value: "discover_top", label: "Discover Page Top" },
  { value: "shows_sidebar", label: "Shows Sidebar" },
  { value: "events_banner", label: "Events Banner" },
  { value: "footer_leaderboard", label: "Footer Leaderboard" },
  { value: "stream_preroll", label: "Stream Pre-roll" },
  { value: "mobile_interstitial", label: "Mobile Interstitial" },
];

const MOCK_ADS: AdPlacement[] = [
  {
    id: "1",
    slot: "hero_banner",
    title: "Summer Concert Series",
    ad_type: "image",
    content: null,
    target_url: "https://example.com/summer-concert",
    image_url: "/images/ads/summer-concert.jpg",
    start_date: "2026-06-01T00:00:00Z",
    end_date: "2026-08-31T23:59:59Z",
    is_active: true,
    impressions: 12450,
    clicks: 342,
    advertiser_name: "Fayetteville Events Co.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    slot: "home_sidebar",
    title: "Local Auto Dealer Promo",
    ad_type: "image",
    content: null,
    target_url: "https://example.com/auto-deal",
    image_url: "/images/ads/auto-promo.jpg",
    start_date: "2026-03-01T00:00:00Z",
    end_date: "2026-03-31T23:59:59Z",
    is_active: true,
    impressions: 8920,
    clicks: 156,
    advertiser_name: "Crown Auto Group",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    slot: "stream_preroll",
    title: "Energy Drink Audio Spot",
    ad_type: "audio_preroll",
    content: "https://cdn.example.com/audio/energy-spot.mp3",
    target_url: "https://example.com/energy",
    image_url: null,
    start_date: null,
    end_date: null,
    is_active: false,
    impressions: 3200,
    clicks: 0,
    advertiser_name: "Boost Energy",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function AdsPage() {
  const [ads, setAds] = useState<AdPlacement[]>(MOCK_ADS);
  const [search, setSearch] = useState("");
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    slot: "",
    title: "",
    ad_type: "image",
    content: "",
    target_url: "",
    image_url: "",
    start_date: "",
    end_date: "",
    is_active: true,
    advertiser_name: "",
  });

  useEffect(() => {
    apiClient<AdPlacement[]>("/ads/placements")
      .then(setAds)
      .catch(() => {});
  }, []);

  const filteredAds = ads.filter(
    (ad) =>
      ad.title.toLowerCase().includes(search.toLowerCase()) ||
      ad.slot.toLowerCase().includes(search.toLowerCase()) ||
      (ad.advertiser_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
  const avgCTR =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(1)
      : "0.0";

  const openEditor = (ad: AdPlacement) => {
    setEditingAd(ad);
    setFormData({
      slot: ad.slot,
      title: ad.title,
      ad_type: ad.ad_type,
      content: ad.content || "",
      target_url: ad.target_url || "",
      image_url: ad.image_url || "",
      start_date: ad.start_date ? ad.start_date.slice(0, 10) : "",
      end_date: ad.end_date ? ad.end_date.slice(0, 10) : "",
      is_active: ad.is_active,
      advertiser_name: ad.advertiser_name || "",
    });
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData({
      slot: "",
      title: "",
      ad_type: "image",
      content: "",
      target_url: "",
      image_url: "",
      start_date: "",
      end_date: "",
      is_active: true,
      advertiser_name: "",
    });
  };

  const handleSave = async () => {
    try {
      if (editingAd) {
        await apiClient(`/ads/placements/${editingAd.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiClient("/ads/placements", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      toast.success("Ad placement saved");
    } catch {
      if (editingAd) {
        setAds((prev) =>
          prev.map((a) =>
            a.id === editingAd.id
              ? {
                  ...a,
                  ...formData,
                  content: formData.content || null,
                  target_url: formData.target_url || null,
                  image_url: formData.image_url || null,
                  start_date: formData.start_date || null,
                  end_date: formData.end_date || null,
                  advertiser_name: formData.advertiser_name || null,
                  updated_at: new Date().toISOString(),
                }
              : a,
          ),
        );
      } else {
        setAds((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            ...formData,
            content: formData.content || null,
            target_url: formData.target_url || null,
            image_url: formData.image_url || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            advertiser_name: formData.advertiser_name || null,
            impressions: 0,
            clicks: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      toast.success("Ad placement saved (local only — API not connected)");
    }
    setEditingAd(null);
    setIsCreating(false);
  };

  const toggleActive = async (ad: AdPlacement) => {
    const updated = { ...ad, is_active: !ad.is_active };
    setAds((prev) => prev.map((a) => (a.id === ad.id ? updated : a)));
    try {
      await apiClient(`/ads/placements/${ad.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !ad.is_active }),
      });
    } catch {
      // Local only
    }
    toast.success(
      updated.is_active ? "Ad placement activated" : "Ad placement deactivated",
    );
  };

  const handleDelete = async (ad: AdPlacement) => {
    setAds((prev) => prev.filter((a) => a.id !== ad.id));
    try {
      await apiClient(`/ads/placements/${ad.id}`, { method: "DELETE" });
    } catch {}
    toast.success("Ad placement deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Ad Placements
          </h1>
          <p className="text-white/50">
            Manage advertisements and sponsored content on the public site
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5ec4ad]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Ad Placement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-white/[0.06] bg-[#12121a]">
          <CardContent className="pt-6">
            <p className="text-sm text-white/40">Total Placements</p>
            <p className="text-2xl font-bold text-white">{ads.length}</p>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-[#12121a]">
          <CardContent className="pt-6">
            <p className="text-sm text-white/40">Active</p>
            <p className="text-2xl font-bold text-[#22c55e]">
              {ads.filter((a) => a.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-[#12121a]">
          <CardContent className="pt-6">
            <p className="text-sm text-white/40">Total Impressions</p>
            <p className="text-2xl font-bold text-white">
              {totalImpressions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-white/[0.06] bg-[#12121a]">
          <CardContent className="pt-6">
            <p className="text-sm text-white/40">Avg CTR</p>
            <p className="text-2xl font-bold text-[#74ddc7]">{avgCTR}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Search ads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-white/[0.08] bg-[#141420] text-white placeholder:text-white/30"
        />
      </div>

      {/* Ad list */}
      <div className="grid gap-3">
        {filteredAds.map((ad) => {
          const typeConfig = AD_TYPES.find((t) => t.value === ad.ad_type);
          const TypeIcon = typeConfig?.icon || ImageIcon;
          const slotLabel =
            AD_SLOTS.find((s) => s.value === ad.slot)?.label || ad.slot;

          return (
            <Card key={ad.id} className="border-white/[0.06] bg-[#12121a]">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      <TypeIcon className="h-5 w-5 text-white/50" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">
                          {ad.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            ad.is_active
                              ? "border-[#22c55e]/30 text-[#22c55e]"
                              : "border-white/10 text-white/30"
                          }`}
                        >
                          {ad.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-white/30">
                          {slotLabel}
                        </span>
                        {ad.advertiser_name && (
                          <span className="text-xs text-white/30">
                            {ad.advertiser_name}
                          </span>
                        )}
                        <span className="text-xs text-white/20 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {ad.impressions.toLocaleString()}
                        </span>
                        <span className="text-xs text-white/20 flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" />
                          {ad.clicks.toLocaleString()}
                        </span>
                        {ad.impressions > 0 && (
                          <span className="text-xs text-[#74ddc7]">
                            {((ad.clicks / ad.impressions) * 100).toFixed(1)}%
                            CTR
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={() => toggleActive(ad)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditor(ad)}
                      className="h-8 w-8 text-white/40 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ad)}
                      className="h-8 w-8 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAds.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#12121a]">
          <p className="text-sm text-white/30">
            No ad placements found. Create one to start monetizing.
          </p>
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog
        open={!!editingAd || isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAd(null);
            setIsCreating(false);
          }
        }}
      >
        <DialogContent className="bg-[#141420] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Ad Placement" : "New Ad Placement"}
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Configure the advertisement details and placement slot
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
                  placeholder="Summer Concert Ad"
                  className="border-white/[0.08] bg-[#0a0a0f] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Advertiser</Label>
                <Input
                  value={formData.advertiser_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      advertiser_name: e.target.value,
                    })
                  }
                  placeholder="Company Name"
                  className="border-white/[0.08] bg-[#0a0a0f] text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Ad Slot</Label>
                <Select
                  value={formData.slot}
                  onValueChange={(v) => setFormData({ ...formData, slot: v })}
                >
                  <SelectTrigger className="border-white/[0.08] bg-[#0a0a0f] text-white">
                    <SelectValue placeholder="Select slot" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141420] border-white/[0.08]">
                    {AD_SLOTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Ad Type</Label>
                <Select
                  value={formData.ad_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, ad_type: v })
                  }
                >
                  <SelectTrigger className="border-white/[0.08] bg-[#0a0a0f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141420] border-white/[0.08]">
                    {AD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Image URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://..."
                className="border-white/[0.08] bg-[#0a0a0f] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Click-Through URL</Label>
              <Input
                value={formData.target_url}
                onChange={(e) =>
                  setFormData({ ...formData, target_url: e.target.value })
                }
                placeholder="https://..."
                className="border-white/[0.08] bg-[#0a0a0f] text-white"
              />
            </div>
            {(formData.ad_type === "html" ||
              formData.ad_type === "audio_preroll") && (
              <div className="space-y-2">
                <Label className="text-white/70">
                  {formData.ad_type === "html"
                    ? "HTML/Embed Code"
                    : "Audio URL"}
                </Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder={
                    formData.ad_type === "html"
                      ? "<div>...</div>"
                      : "https://cdn.example.com/audio.mp3"
                  }
                  rows={4}
                  className="border-white/[0.08] bg-[#0a0a0f] text-white font-mono text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  className="border-white/[0.08] bg-[#0a0a0f] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  className="border-white/[0.08] bg-[#0a0a0f] text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label className="text-white/70">Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingAd(null);
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
