"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Target,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Criterion {
  type: string;
  value: string | string[] | { min?: number; max?: number };
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  criteria: Criterion[];
  estimated_size: number;
  is_active: boolean;
  created_at: string;
}

const GENRES = ["Hip-Hop", "R&B", "Gospel", "Jazz", "Talk"];
const COUNTIES = [
  "Cumberland",
  "Hoke",
  "Robeson",
  "Harnett",
  "Sampson",
  "Bladen",
  "Moore",
];
const ENGAGEMENT_LEVELS = ["Low", "Medium", "High"];
const USER_TYPES = ["Listener", "Creator", "Vendor"];
const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"];

const CRITERIA_TYPES = [
  { value: "listening_hours", label: "Listening Hours" },
  { value: "favorite_genre", label: "Favorite Genre" },
  { value: "location", label: "Location" },
  { value: "engagement_level", label: "Engagement Level" },
  { value: "user_type", label: "User Type" },
  { value: "age_range", label: "Age Range" },
];

// ---------------------------------------------------------------------------
// Estimated Size Helper
// ---------------------------------------------------------------------------

function estimateAudienceSize(criteria: Criterion[]): number {
  // Mock calculation: start with a base and reduce per criterion
  let base = 12500;
  for (const c of criteria) {
    switch (c.type) {
      case "listening_hours": {
        const v = c.value as { min?: number; max?: number };
        if (v.min && v.min > 10) base = Math.floor(base * 0.4);
        else if (v.min && v.min > 5) base = Math.floor(base * 0.6);
        else base = Math.floor(base * 0.8);
        break;
      }
      case "favorite_genre": {
        const arr = c.value as string[];
        base = Math.floor(base * Math.min(1, arr.length * 0.25));
        break;
      }
      case "location": {
        const arr = c.value as string[];
        base = Math.floor(base * Math.min(1, arr.length * 0.18));
        break;
      }
      case "engagement_level":
        base = Math.floor(base * 0.35);
        break;
      case "user_type":
        base = Math.floor(base * 0.45);
        break;
      case "age_range":
        base = Math.floor(base * 0.3);
        break;
    }
  }
  return Math.max(base, 50);
}

// ---------------------------------------------------------------------------
// Criteria Builder Sub-component
// ---------------------------------------------------------------------------

function CriterionRow({
  criterion,
  index,
  onChange,
  onRemove,
}: {
  criterion: Criterion;
  index: number;
  onChange: (index: number, updated: Criterion) => void;
  onRemove: (index: number) => void;
}) {
  const renderValueEditor = () => {
    switch (criterion.type) {
      case "listening_hours": {
        const v = (criterion.value as { min?: number; max?: number }) || {};
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min hrs/week"
              value={v.min ?? ""}
              onChange={(e) =>
                onChange(index, {
                  ...criterion,
                  value: { ...v, min: Number(e.target.value) || undefined },
                })
              }
              className="w-28 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              placeholder="Max hrs/week"
              value={v.max ?? ""}
              onChange={(e) =>
                onChange(index, {
                  ...criterion,
                  value: { ...v, max: Number(e.target.value) || undefined },
                })
              }
              className="w-28 h-8 text-xs"
            />
          </div>
        );
      }
      case "favorite_genre": {
        const selected = (criterion.value as string[]) || [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  const next = selected.includes(g)
                    ? selected.filter((s) => s !== g)
                    : [...selected, g];
                  onChange(index, { ...criterion, value: next });
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                  selected.includes(g)
                    ? "bg-[#dc2626] text-white border-[#dc2626]"
                    : "bg-card text-muted-foreground border-border hover:border-[#dc2626]/40"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        );
      }
      case "location": {
        const selected = (criterion.value as string[]) || [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {COUNTIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  const next = selected.includes(c)
                    ? selected.filter((s) => s !== c)
                    : [...selected, c];
                  onChange(index, { ...criterion, value: next });
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                  selected.includes(c)
                    ? "bg-[#dc2626] text-white border-[#dc2626]"
                    : "bg-card text-muted-foreground border-border hover:border-[#dc2626]/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        );
      }
      case "engagement_level":
        return (
          <Select
            value={(criterion.value as string) || ""}
            onValueChange={(val) =>
              onChange(index, { ...criterion, value: val })
            }
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {ENGAGEMENT_LEVELS.map((l) => (
                <SelectItem key={l} value={l} className="text-xs">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "user_type":
        return (
          <Select
            value={(criterion.value as string) || ""}
            onValueChange={(val) =>
              onChange(index, { ...criterion, value: val })
            }
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {USER_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "age_range":
        return (
          <Select
            value={(criterion.value as string) || ""}
            onValueChange={(val) =>
              onChange(index, { ...criterion, value: val })
            }
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
      <Select
        value={criterion.type}
        onValueChange={(val) =>
          onChange(index, { type: val, value: val === "listening_hours" ? {} : val === "favorite_genre" || val === "location" ? [] : "" })
        }
      >
        <SelectTrigger className="w-44 h-8 text-xs">
          <SelectValue placeholder="Select criteria" />
        </SelectTrigger>
        <SelectContent>
          {CRITERIA_TYPES.map((ct) => (
            <SelectItem key={ct.value} value={ct.value} className="text-xs">
              {ct.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1">{renderValueEditor()}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="text-muted-foreground hover:text-[#dc2626] h-8 w-8 p-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criteria Tag Display
// ---------------------------------------------------------------------------

function criterionLabel(c: Criterion): string {
  const meta = CRITERIA_TYPES.find((ct) => ct.value === c.type);
  const label = meta?.label ?? c.type;
  if (c.type === "listening_hours") {
    const v = c.value as { min?: number; max?: number };
    return `${label}: ${v.min ?? 0}-${v.max ?? "unlimited"} hrs/wk`;
  }
  if (Array.isArray(c.value)) return `${label}: ${(c.value as string[]).join(", ")}`;
  return `${label}: ${c.value}`;
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AudienceSegmentsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  const estimatedSize = useMemo(() => estimateAudienceSize(criteria), [criteria]);

  // -----------------------------------------------------------------------
  // Fetch segments
  // -----------------------------------------------------------------------

  const fetchSegments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audience_segments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch segments:", error);
      toast.error("Failed to load segments");
      setSegments([]);
    } else {
      setSegments(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -----------------------------------------------------------------------
  // Create segment
  // -----------------------------------------------------------------------

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Segment name is required");
      return;
    }
    if (criteria.length === 0) {
      toast.error("Add at least one criterion");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("audience_segments").insert({
      name: name.trim(),
      description: description.trim() || null,
      criteria,
      estimated_size: estimatedSize,
      is_active: true,
      created_by: user!.id,
    });

    if (error) {
      console.error("Failed to create segment:", error);
      toast.error("Failed to create segment");
    } else {
      toast.success("Segment created");
      setName("");
      setDescription("");
      setCriteria([]);
      setShowForm(false);
      fetchSegments();
    }
    setSaving(false);
  };

  // -----------------------------------------------------------------------
  // Toggle active
  // -----------------------------------------------------------------------

  const toggleActive = async (segment: Segment) => {
    const { error } = await supabase
      .from("audience_segments")
      .update({ is_active: !segment.is_active })
      .eq("id", segment.id);

    if (error) {
      toast.error("Failed to update segment");
    } else {
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segment.id ? { ...s, is_active: !s.is_active } : s
        )
      );
    }
  };

  // -----------------------------------------------------------------------
  // Delete segment
  // -----------------------------------------------------------------------

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase
      .from("audience_segments")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete segment");
    } else {
      setSegments((prev) => prev.filter((s) => s.id !== id));
      toast.success("Segment deleted");
    }
    setDeleting(null);
  };

  // -----------------------------------------------------------------------
  // Criteria builder helpers
  // -----------------------------------------------------------------------

  const addCriterion = () => {
    setCriteria((prev) => [...prev, { type: "listening_hours", value: {} }]);
  };

  const updateCriterion = (index: number, updated: Criterion) => {
    setCriteria((prev) => prev.map((c, i) => (i === index ? updated : c)));
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
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
            <Target className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Audience Segments
            </h1>
            <p className="text-sm text-muted-foreground">
              Create targetable audience segments from listener data
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#dc2626] hover:bg-[#dc2626]/90 text-white"
        >
          {showForm ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1.5" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Segment
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Segments
          </p>
          <p className="mt-1 text-2xl font-bold text-[#dc2626]">
            {segments.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Active Segments
          </p>
          <p className="mt-1 text-2xl font-bold text-[#22c55e]">
            {segments.filter((s) => s.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Est. Reach
          </p>
          <p className="mt-1 text-2xl font-bold text-[#7401df]">
            {segments
              .filter((s) => s.is_active)
              .reduce((sum, s) => sum + (s.estimated_size || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Create Form (Expandable) */}
      {showForm && (
        <div className="rounded-xl border-2 border-[#dc2626]/30 bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">
            New Audience Segment
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Segment Name
              </label>
              <Input
                placeholder="e.g. Hip-Hop Power Listeners"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="Describe this audience segment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                className="min-h-[40px] resize-none"
              />
            </div>
          </div>

          {/* Criteria Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Targeting Criteria
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={addCriterion}
                className="h-7 text-xs border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Criterion
              </Button>
            </div>
            {criteria.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-3 text-center">
                No criteria added yet. Click &quot;Add Criterion&quot; to start
                building your segment.
              </p>
            ) : (
              <div className="space-y-2">
                {criteria.map((c, i) => (
                  <CriterionRow
                    key={i}
                    criterion={c}
                    index={i}
                    onChange={updateCriterion}
                    onRemove={removeCriterion}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Estimated Size */}
          {criteria.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#dc2626]/5 border border-[#dc2626]/20">
              <Hash className="h-5 w-5 text-[#dc2626]" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Estimated Audience Size
                </p>
                <p className="text-lg font-bold text-[#dc2626]">
                  {estimatedSize.toLocaleString()} listeners
                </p>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-[#dc2626] hover:bg-[#dc2626]/90 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save Segment
            </Button>
          </div>
        </div>
      )}

      {/* Segment Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : segments.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No audience segments yet. Create your first segment above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-[#dc2626]/30 transition-colors"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {segment.name}
                  </h3>
                  {segment.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {segment.description}
                    </p>
                  )}
                </div>
                <Badge
                  className={`text-[10px] shrink-0 ml-2 ${
                    segment.is_active
                      ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                  variant="outline"
                >
                  {segment.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Estimated size */}
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-[#dc2626]" />
                <span className="text-xs font-medium text-foreground">
                  {(segment.estimated_size || 0).toLocaleString()} est.
                  listeners
                </span>
              </div>

              {/* Criteria tags */}
              <div className="flex flex-wrap gap-1.5">
                {(segment.criteria as Criterion[])?.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] border-[#dc2626]/20 text-[#dc2626]/80"
                  >
                    {criterionLabel(c)}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Active
                  </span>
                  <Switch
                    checked={segment.is_active}
                    onCheckedChange={() => toggleActive(segment)}
                    className="data-[state=checked]:bg-[#22c55e]"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(segment.id)}
                  disabled={deleting === segment.id}
                  className="text-muted-foreground hover:text-[#dc2626] h-8"
                >
                  {deleting === segment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-xs">Delete</span>
                </Button>
              </div>

              {/* Created date */}
              <p className="text-[10px] text-muted-foreground/60">
                Created{" "}
                {new Date(segment.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          {segments.length} segment{segments.length !== 1 ? "s" : ""} configured
        </p>
      </div>
    </div>
  );
}
