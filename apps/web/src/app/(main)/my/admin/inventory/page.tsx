"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Check,
  LayoutGrid,
  Radio,
  Monitor,
  Calendar,
  Mail,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Placement {
  id: string;
  name: string;
  channel: string;
  type: string;
  dimensions: string | null;
  pricing_model: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
}

const CHANNELS = [
  { value: "on_air", label: "WCCG On-Air", icon: Radio },
  { value: "digital", label: "WCCG Digital", icon: Monitor },
  { value: "events", label: "WCCG Events", icon: Calendar },
  { value: "email", label: "WCCG Email", icon: Mail },
];

const PLACEMENT_TYPES: Record<string, string[]> = {
  on_air: ["Pre-Roll", "Mid-Roll", "Post-Roll", "Live Read", "Sponsorship"],
  digital: ["Banner", "Native", "Interstitial", "Push Notification", "Video Pre-Roll"],
  events: ["Title Sponsor", "Stage Sponsor", "Booth", "Giveaway Partner"],
  email: ["Header Banner", "Sponsored Section", "Footer Ad", "Dedicated Send"],
};

const PRICING_MODELS = ["CPM", "CPC", "CPA", "Flat Rate", "Per Event"];

const CHANNEL_ICON: Record<string, typeof Radio> = {
  on_air: Radio,
  digital: Monitor,
  events: Calendar,
  email: Mail,
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdInventoryPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newChannel, setNewChannel] = useState("digital");
  const [newType, setNewType] = useState("");
  const [newDimensions, setNewDimensions] = useState("");
  const [newPricingModel, setNewPricingModel] = useState("CPM");
  const [newBasePrice, setNewBasePrice] = useState("");

  // Edit form state
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch placements
  // -----------------------------------------------------------------------

  const fetchPlacements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ad_placements")
      .select("*")
      .order("channel", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch placements:", error);
      toast.error("Failed to load ad inventory");
      setPlacements([]);
    } else {
      setPlacements(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = placements.length;
    const active = placements.filter((p) => p.is_active).length;
    const avgCpm =
      placements.length > 0
        ? placements.reduce((sum, p) => sum + (p.base_price || 0), 0) /
          placements.length
        : 0;
    return { total, active, avgCpm };
  }, [placements]);

  // -----------------------------------------------------------------------
  // Group by channel
  // -----------------------------------------------------------------------

  const grouped = useMemo(() => {
    const map: Record<string, Placement[]> = {};
    for (const ch of CHANNELS) {
      map[ch.value] = placements.filter((p) => p.channel === ch.value);
    }
    return map;
  }, [placements]);

  // -----------------------------------------------------------------------
  // Add placement
  // -----------------------------------------------------------------------

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Placement name is required");
      return;
    }
    if (!newType) {
      toast.error("Placement type is required");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("ad_placements").insert({
      name: newName.trim(),
      channel: newChannel,
      type: newType,
      dimensions: newDimensions.trim() || null,
      pricing_model: newPricingModel,
      base_price: parseFloat(newBasePrice) || 0,
      is_active: true,
    });

    if (error) {
      console.error("Failed to add placement:", error);
      toast.error("Failed to add placement");
    } else {
      toast.success("Placement added");
      setNewName("");
      setNewType("");
      setNewDimensions("");
      setNewBasePrice("");
      setShowAddForm(false);
      fetchPlacements();
    }
    setSaving(false);
  };

  // -----------------------------------------------------------------------
  // Start editing
  // -----------------------------------------------------------------------

  const startEdit = (placement: Placement) => {
    setEditingId(placement.id);
    setEditPrice(placement.base_price.toString());
    setEditActive(placement.is_active);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("ad_placements")
      .update({
        base_price: parseFloat(editPrice) || 0,
        is_active: editActive,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update placement");
    } else {
      setPlacements((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                base_price: parseFloat(editPrice) || 0,
                is_active: editActive,
              }
            : p
        )
      );
      toast.success("Placement updated");
    }
    setEditingId(null);
  };

  // -----------------------------------------------------------------------
  // Auth guard
  // -----------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Shield className="h-12 w-12 text-[#dc2626]" />
        <h2 className="text-xl font-bold text-foreground">Sign In Required</h2>
        <p className="text-sm text-muted-foreground">
          You must be signed in as an admin to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <LayoutGrid className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Ad Inventory
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage ad placement inventory across WCCG channels
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#dc2626] hover:bg-[#dc2626]/90 text-white"
        >
          {showAddForm ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1.5" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Placement
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Placements
          </p>
          <p className="mt-1 text-2xl font-bold text-[#dc2626]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Active
          </p>
          <p className="mt-1 text-2xl font-bold text-[#22c55e]">
            {stats.active}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Avg Base Price
          </p>
          <p className="mt-1 text-2xl font-bold text-[#7401df]">
            ${stats.avgCpm.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Add Placement Form */}
      {showAddForm && (
        <div className="rounded-xl border-2 border-[#dc2626]/30 bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">
            New Ad Placement
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Placement Name
              </label>
              <Input
                placeholder="e.g. Morning Show Pre-Roll"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Channel
              </label>
              <Select value={newChannel} onValueChange={setNewChannel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => (
                    <SelectItem
                      key={ch.value}
                      value={ch.value}
                      className="text-xs"
                    >
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Placement Type
              </label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(PLACEMENT_TYPES[newChannel] ?? []).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Dimensions (optional)
              </label>
              <Input
                placeholder="e.g. 728x90, 30s, Full Page"
                value={newDimensions}
                onChange={(e) => setNewDimensions(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Pricing Model
              </label>
              <Select
                value={newPricingModel}
                onValueChange={setNewPricingModel}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_MODELS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Base Price ($)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={newBasePrice}
                onChange={(e) => setNewBasePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-[#dc2626] hover:bg-[#dc2626]/90 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Add Placement
            </Button>
          </div>
        </div>
      )}

      {/* Placement Cards Grouped by Channel */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : placements.length === 0 ? (
        <div className="text-center py-12">
          <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No ad placements yet. Add your first placement above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {CHANNELS.map((channel) => {
            const items = grouped[channel.value] || [];
            if (items.length === 0) return null;
            const ChannelIcon = CHANNEL_ICON[channel.value] || LayoutGrid;

            return (
              <div key={channel.value} className="space-y-3">
                {/* Channel header */}
                <div className="flex items-center gap-2">
                  <ChannelIcon className="h-4 w-4 text-[#dc2626]" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {channel.label}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-[#dc2626]/20 text-[#dc2626]"
                  >
                    {items.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((placement) => (
                    <div
                      key={placement.id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-[#dc2626]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {placement.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {placement.type}
                          </p>
                        </div>
                        <Badge
                          className={`text-[10px] shrink-0 ml-2 ${
                            placement.is_active
                              ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                          variant="outline"
                        >
                          {placement.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="space-y-1">
                        {placement.dimensions && (
                          <p className="text-[10px] text-muted-foreground">
                            Dimensions:{" "}
                            <span className="text-foreground font-medium">
                              {placement.dimensions}
                            </span>
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Pricing:{" "}
                          <span className="text-foreground font-medium">
                            {placement.pricing_model}
                          </span>
                        </p>
                      </div>

                      {/* Price & Edit */}
                      {editingId === placement.id ? (
                        <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground">
                              Base Price ($)
                            </label>
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              Active
                            </span>
                            <Switch
                              checked={editActive}
                              onCheckedChange={setEditActive}
                              className="data-[state=checked]:bg-[#22c55e]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(placement.id)}
                              className="h-7 text-xs bg-[#dc2626] hover:bg-[#dc2626]/90 text-white"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-[#dc2626]" />
                            <span className="text-sm font-bold text-foreground">
                              {placement.base_price.toFixed(2)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(placement)}
                            className="h-7 text-xs text-muted-foreground hover:text-[#dc2626]"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          {placements.length} placement{placements.length !== 1 ? "s" : ""}{" "}
          across {CHANNELS.length} channels
        </p>
      </div>
    </div>
  );
}
