"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Target,
  Users,
  Tv,
  ImagePlus,
  CalendarDays,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Radio,
  Globe,
  MessageSquare,
  Upload,
  Sparkles,
  Zap,
  ChevronRight,
  DollarSign,
  Eye,
  MapPin,
  Clock,
  Music,
  Dumbbell,
  UtensilsCrossed,
  Shirt,
  Church,
  Clapperboard,
  Briefcase,
  Check,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/* ================================================================
   TYPES
   ================================================================ */

type Objective = "awareness" | "traffic" | "engagement" | "conversions" | "local_foot_traffic";

interface AudienceConfig {
  counties: string[];
  ageRanges: string[];
  interests: string[];
  gender: "all" | "male" | "female";
}

interface ChannelConfig {
  wccg_onair: boolean;
  wccg_digital: boolean;
  wccg_hubs: boolean;
  facebook_instagram: boolean;
  tiktok: boolean;
  google_youtube: boolean;
  snapchat: boolean;
}

interface BudgetAllocation {
  [channelKey: string]: number; // percentage 0-100
}

interface CreativeAssets {
  audio_file: File | null;
  display_image: File | null;
  social_image: File | null;
  social_video: File | null;
  social_copy: string;
  social_headline: string;
  social_cta: string;
  native_text: string;
}

interface ScheduleConfig {
  startDate: string;
  endDate: string;
  campaignName: string;
  pacing: "even" | "accelerated";
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const AMBER = "#f59e0b";

const OBJECTIVES: { id: Objective; label: string; desc: string; icon: typeof Target }[] = [
  { id: "awareness", label: "Awareness", desc: "Reach as many people as possible", icon: Eye },
  { id: "traffic", label: "Traffic", desc: "Drive website visits", icon: Globe },
  { id: "engagement", label: "Engagement", desc: "Likes, comments, shares", icon: MessageSquare },
  { id: "conversions", label: "Conversions", desc: "Purchases, sign-ups", icon: Target },
  { id: "local_foot_traffic", label: "Local Foot Traffic", desc: "Drive store visits", icon: MapPin },
];

const COUNTIES = [
  "Cumberland",
  "Hoke",
  "Robeson",
  "Harnett",
  "Sampson",
  "Bladen",
  "Moore",
  "Scotland",
  "Lee",
  "Richmond",
];

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const INTERESTS: { id: string; label: string; icon: typeof Music }[] = [
  { id: "music", label: "Music", icon: Music },
  { id: "sports", label: "Sports", icon: Dumbbell },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "faith", label: "Faith", icon: Church },
  { id: "entertainment", label: "Entertainment", icon: Clapperboard },
  { id: "business", label: "Business", icon: Briefcase },
];

const PRE_BUILT_SEGMENTS = [
  { id: "young_urban", label: "Young Urban Professionals", reach: "45K", counties: ["Cumberland"], ageRanges: ["25-34", "35-44"], interests: ["business", "food", "entertainment"], gender: "all" as const },
  { id: "family_focused", label: "Family Focused", reach: "62K", counties: ["Cumberland", "Hoke", "Harnett"], ageRanges: ["25-34", "35-44", "45-54"], interests: ["food", "faith", "entertainment"], gender: "all" as const },
  { id: "gospel_listeners", label: "Gospel Music Lovers", reach: "38K", counties: ["Cumberland", "Robeson", "Sampson"], ageRanges: ["35-44", "45-54", "55-64", "65+"], interests: ["music", "faith"], gender: "all" as const },
  { id: "sports_fans", label: "Sports Enthusiasts", reach: "51K", counties: ["Cumberland", "Hoke", "Moore"], ageRanges: ["18-24", "25-34", "35-44"], interests: ["sports", "entertainment"], gender: "male" as const },
];

interface ChannelOption {
  key: keyof ChannelConfig;
  label: string;
  desc: string;
  icon: typeof Radio;
  available: boolean;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  { key: "wccg_onair", label: "WCCG On-Air", desc: "Radio spots during programming", icon: Radio, available: true },
  { key: "wccg_digital", label: "WCCG Digital", desc: "Website banners, marketplace, directory", icon: Globe, available: true },
  { key: "wccg_hubs", label: "WCCG Hubs", desc: "Sponsored posts in community feeds", icon: MessageSquare, available: true },
  { key: "facebook_instagram", label: "Facebook / Instagram", desc: "Social media ads via Meta API", icon: Users, available: false },
  { key: "tiktok", label: "TikTok", desc: "Short-form video ads via TikTok API", icon: Tv, available: false },
  { key: "google_youtube", label: "Google / YouTube", desc: "Search & video ads via Google Ads API", icon: Globe, available: false },
  { key: "snapchat", label: "Snapchat", desc: "Stories & sponsored lens ads", icon: Zap, available: false },
];

const STEP_LABELS = ["Objective", "Audience", "Channels", "Creative", "Schedule", "Review"];

/* ================================================================
   HELPERS
   ================================================================ */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function estimateReach(audience: AudienceConfig): number {
  let base = 10000;
  base += audience.counties.length * 8000;
  base += audience.ageRanges.length * 3000;
  base += audience.interests.length * 2000;
  if (audience.gender !== "all") base = Math.round(base * 0.55);
  return base;
}

function generateCampaignName(objective: Objective): string {
  const labels: Record<Objective, string> = {
    awareness: "Awareness",
    traffic: "Traffic",
    engagement: "Engagement",
    conversions: "Conversion",
    local_foot_traffic: "Local Traffic",
  };
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });
  return `${labels[objective]} Campaign - ${month} ${now.getFullYear()}`;
}

/* ================================================================
   STEP COMPONENTS
   ================================================================ */

function StepObjective({
  selected,
  onSelect,
}: {
  selected: Objective | null;
  onSelect: (o: Objective) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Choose Your Objective</h2>
        <p className="text-sm text-muted-foreground mt-1">What do you want this campaign to achieve?</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OBJECTIVES.map((obj) => {
          const active = selected === obj.id;
          return (
            <button
              key={obj.id}
              type="button"
              onClick={() => onSelect(obj.id)}
              className={`group text-left rounded-xl border p-5 transition-all ${
                active
                  ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-border bg-card hover:border-amber-500/30 hover:bg-amber-500/5"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg mb-3 ${active ? "bg-amber-500/20" : "bg-foreground/[0.04]"}`}>
                <obj.icon className={`h-5 w-5 ${active ? "text-amber-400" : "text-muted-foreground"}`} />
              </div>
              <h3 className={`font-semibold mb-1 ${active ? "text-amber-300" : "text-foreground"}`}>{obj.label}</h3>
              <p className="text-xs text-muted-foreground">{obj.desc}</p>
              {active && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                  <Check className="h-3.5 w-3.5" />
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAudience({
  audience,
  setAudience,
}: {
  audience: AudienceConfig;
  setAudience: (a: AudienceConfig) => void;
}) {
  const [useCustom, setUseCustom] = useState(true);
  const reach = estimateReach(audience);

  function applySegment(seg: typeof PRE_BUILT_SEGMENTS[0]) {
    setAudience({ counties: seg.counties, ageRanges: seg.ageRanges, interests: seg.interests, gender: seg.gender });
    setUseCustom(false);
  }

  function toggleItem<K extends keyof AudienceConfig>(
    key: K,
    value: string,
  ) {
    const arr = audience[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    setAudience({ ...audience, [key]: next });
    setUseCustom(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Define Your Audience</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a pre-built segment or build your own</p>
      </div>

      {/* Estimated reach */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated Reach</p>
            <p className="text-lg font-bold text-amber-300">{reach.toLocaleString()} people</p>
          </div>
        </div>
      </div>

      {/* Pre-built segments */}
      <div className="space-y-2">
        <Label className="text-foreground/60 text-xs uppercase tracking-wider">Pre-Built Segments</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRE_BUILT_SEGMENTS.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => applySegment(seg)}
              className={`text-left rounded-lg border p-3 transition-all ${
                !useCustom &&
                JSON.stringify(audience.counties) === JSON.stringify(seg.counties)
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-border bg-card hover:border-amber-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{seg.label}</span>
                <Badge className="text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-400">{seg.reach}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom builder */}
      <div className="space-y-4">
        <Label className="text-foreground/60 text-xs uppercase tracking-wider">Custom Targeting</Label>

        {/* Counties */}
        <div className="space-y-2">
          <p className="text-sm text-foreground font-medium">Location (Counties)</p>
          <div className="flex flex-wrap gap-2">
            {COUNTIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleItem("counties", c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  audience.counties.includes(c)
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Age ranges */}
        <div className="space-y-2">
          <p className="text-sm text-foreground font-medium">Age Range</p>
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleItem("ageRanges", a)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  audience.ageRanges.includes(a)
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <p className="text-sm text-foreground font-medium">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((int) => {
              const active = audience.interests.includes(int.id);
              return (
                <button
                  key={int.id}
                  type="button"
                  onClick={() => toggleItem("interests", int.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                    active
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                  }`}
                >
                  <int.icon className="h-3 w-3" />
                  {int.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <p className="text-sm text-foreground font-medium">Gender</p>
          <div className="flex gap-2">
            {(["all", "male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setAudience({ ...audience, gender: g })}
                className={`text-xs px-4 py-1.5 rounded-full border transition-colors capitalize ${
                  audience.gender === g
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-foreground/[0.04] border-border text-muted-foreground hover:border-foreground/[0.16]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepChannels({
  channels,
  setChannels,
  budget,
  setBudget,
  autoAllocate,
  setAutoAllocate,
  allocation,
  setAllocation,
}: {
  channels: ChannelConfig;
  setChannels: (c: ChannelConfig) => void;
  budget: number;
  setBudget: (b: number) => void;
  autoAllocate: boolean;
  setAutoAllocate: (a: boolean) => void;
  allocation: BudgetAllocation;
  setAllocation: (a: BudgetAllocation) => void;
}) {
  const enabledChannels = CHANNEL_OPTIONS.filter((ch) => ch.available && channels[ch.key]);
  const platformFee = budget * 0.25;
  const netBudget = budget - platformFee;

  // Auto-allocate evenly
  const autoAllocation = useMemo(() => {
    if (enabledChannels.length === 0) return {};
    const pct = Math.floor(100 / enabledChannels.length);
    const remainder = 100 - pct * enabledChannels.length;
    const alloc: BudgetAllocation = {};
    enabledChannels.forEach((ch, i) => {
      alloc[ch.key] = pct + (i === 0 ? remainder : 0);
    });
    return alloc;
  }, [enabledChannels]);

  const activeAllocation = autoAllocate ? autoAllocation : allocation;

  function handleSlider(key: string, value: number) {
    setAllocation({ ...allocation, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Select Channels & Budget</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose where your ads run and set your budget</p>
      </div>

      {/* Channel toggles */}
      <div className="space-y-2">
        {CHANNEL_OPTIONS.map((ch) => {
          const enabled = channels[ch.key];
          return (
            <div
              key={ch.key}
              className={`rounded-xl border p-4 flex items-center justify-between transition-all ${
                !ch.available
                  ? "border-border/50 bg-foreground/[0.02] opacity-60"
                  : enabled
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${enabled && ch.available ? "bg-amber-500/20" : "bg-foreground/[0.04]"}`}>
                  <ch.icon className={`h-4 w-4 ${enabled && ch.available ? "text-amber-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{ch.label}</span>
                    {!ch.available && (
                      <Badge className="text-[9px] border border-foreground/10 bg-foreground/[0.04] text-muted-foreground">
                        <Lock className="h-2.5 w-2.5 mr-0.5" />
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{ch.desc}</p>
                </div>
              </div>
              {ch.available ? (
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => setChannels({ ...channels, [ch.key]: checked })}
                  className="data-[state=checked]:bg-amber-500"
                />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
          );
        })}
      </div>

      {/* Budget */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-foreground/60">Total Campaign Budget</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={100}
              value={budget || ""}
              onChange={(e) => setBudget(Number(e.target.value))}
              placeholder="5000"
              className="pl-9 bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
            />
          </div>
        </div>

        {budget > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Platform fee (25%)</span>
              <span className="text-amber-400 font-medium">{formatCurrency(platformFee)}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-border pt-3">
              <span className="text-foreground font-medium">Net ad spend</span>
              <span className="text-foreground font-bold">{formatCurrency(netBudget)}</span>
            </div>
          </>
        )}
      </div>

      {/* Budget allocation */}
      {enabledChannels.length > 0 && budget > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Budget Allocation</p>
              <p className="text-xs text-muted-foreground">How to split budget across channels</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">AI Optimized</span>
              <Switch
                checked={autoAllocate}
                onCheckedChange={setAutoAllocate}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>

          {autoAllocate && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Budget will be automatically distributed for best performance
            </div>
          )}

          <div className="space-y-3">
            {enabledChannels.map((ch) => {
              const pct = activeAllocation[ch.key] || 0;
              const channelBudget = Math.round(netBudget * pct / 100);
              return (
                <div key={ch.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{ch.label}</span>
                    <span className="text-muted-foreground">{pct}% &middot; {formatCurrency(channelBudget)}</span>
                  </div>
                  {!autoAllocate && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) => handleSlider(ch.key, Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-foreground/10 accent-amber-500 cursor-pointer"
                    />
                  )}
                  <div className="w-full bg-foreground/10 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StepCreative({
  channels,
  creative,
  setCreative,
}: {
  channels: ChannelConfig;
  creative: CreativeAssets;
  setCreative: (c: CreativeAssets) => void;
}) {
  function handleFileChange(key: keyof CreativeAssets, file: File | null) {
    setCreative({ ...creative, [key]: file });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Upload Creatives</h2>
        <p className="text-sm text-muted-foreground mt-1">Add ad assets for each selected channel</p>
      </div>

      {/* Audio — On-Air */}
      {channels.wccg_onair && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">WCCG On-Air — Radio Spot</h3>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-amber-500/40 transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Upload MP3 or WAV (max 60s)</p>
            <input
              type="file"
              accept="audio/mp3,audio/wav,audio/mpeg"
              onChange={(e) => handleFileChange("audio_file", e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-full file:border file:border-amber-500/30 file:bg-amber-500/10 file:text-amber-300 file:text-xs file:cursor-pointer"
            />
            {creative.audio_file && (
              <p className="text-xs text-amber-400 mt-2">{creative.audio_file.name}</p>
            )}
          </div>
          {/* Mock preview */}
          {creative.audio_file && (
            <div className="rounded-lg bg-foreground/[0.03] border border-border p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Music className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{creative.audio_file.name}</p>
                <p className="text-[10px] text-muted-foreground">{(creative.audio_file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display — Digital */}
      {channels.wccg_digital && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">WCCG Digital — Banner Ad</h3>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-amber-500/40 transition-colors">
            <ImagePlus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Upload JPG or PNG (728x90, 300x250)</p>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileChange("display_image", e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-full file:border file:border-amber-500/30 file:bg-amber-500/10 file:text-amber-300 file:text-xs file:cursor-pointer"
            />
            {creative.display_image && (
              <p className="text-xs text-amber-400 mt-2">{creative.display_image.name}</p>
            )}
          </div>
          {/* Preview mock */}
          {creative.display_image && (
            <div className="rounded-lg bg-foreground/[0.03] border border-border p-4">
              <p className="text-[10px] text-muted-foreground mb-2">Banner Preview (728x90)</p>
              <div className="w-full h-[90px] rounded bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
                <span className="text-xs text-amber-400">{creative.display_image.name}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Social — Hubs or Social channels */}
      {(channels.wccg_hubs || channels.facebook_instagram || channels.tiktok) && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">Social / Hub — Sponsored Content</h3>
          </div>

          {/* Image upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-amber-500/40 transition-colors">
            <ImagePlus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Upload image or video</p>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleFileChange("social_image", e.target.files?.[0] ?? null)}
              className="text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-full file:border file:border-amber-500/30 file:bg-amber-500/10 file:text-amber-300 file:text-xs file:cursor-pointer"
            />
          </div>

          {/* Ad copy fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs">Headline</Label>
              <Input
                value={creative.social_headline}
                onChange={(e) => setCreative({ ...creative, social_headline: e.target.value })}
                placeholder="Catchy headline for your ad"
                className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs">Ad Copy</Label>
              <Textarea
                value={creative.social_copy}
                onChange={(e) => setCreative({ ...creative, social_copy: e.target.value })}
                placeholder="Write your ad copy here..."
                rows={3}
                className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs">CTA Button Text</Label>
              <Input
                value={creative.social_cta}
                onChange={(e) => setCreative({ ...creative, social_cta: e.target.value })}
                placeholder="Shop Now, Learn More, Sign Up..."
                className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
              />
            </div>
          </div>

          {/* Social preview mock */}
          {(creative.social_headline || creative.social_copy) && (
            <div className="rounded-lg bg-foreground/[0.03] border border-border p-4 space-y-2">
              <p className="text-[10px] text-muted-foreground">Social Preview</p>
              <div className="rounded-lg bg-background border border-border p-4 max-w-xs mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-amber-500/20" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Your Business</p>
                    <p className="text-[10px] text-muted-foreground">Sponsored</p>
                  </div>
                </div>
                {creative.social_copy && <p className="text-xs text-foreground mb-2">{creative.social_copy}</p>}
                <div className="w-full h-32 rounded bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-border mb-2 flex items-center justify-center">
                  {creative.social_image ? (
                    <span className="text-xs text-amber-400">{creative.social_image.name}</span>
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>
                {creative.social_headline && (
                  <p className="text-xs font-semibold text-foreground mb-1">{creative.social_headline}</p>
                )}
                {creative.social_cta && (
                  <div className="bg-amber-500 text-black text-xs font-bold py-1.5 px-4 rounded text-center">
                    {creative.social_cta}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Native — Hub post */}
      {channels.wccg_hubs && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">WCCG Hubs — Native Post</h3>
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs">Post Text</Label>
            <Textarea
              value={creative.native_text}
              onChange={(e) => setCreative({ ...creative, native_text: e.target.value })}
              placeholder="Write your sponsored post text for community hubs..."
              rows={4}
              className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20 resize-none"
            />
          </div>
        </div>
      )}

      {!channels.wccg_onair && !channels.wccg_digital && !channels.wccg_hubs && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ImagePlus className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select channels in the previous step to upload creatives</p>
        </div>
      )}
    </div>
  );
}

function StepSchedule({
  schedule,
  setSchedule,
  objective,
}: {
  schedule: ScheduleConfig;
  setSchedule: (s: ScheduleConfig) => void;
  objective: Objective | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Set Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">When should this campaign run?</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* Campaign name */}
        <div className="space-y-1.5">
          <Label className="text-foreground/60">Campaign Name</Label>
          <Input
            value={schedule.campaignName}
            onChange={(e) => setSchedule({ ...schedule, campaignName: e.target.value })}
            placeholder="My Campaign"
            className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
          />
          {objective && !schedule.campaignName && (
            <button
              type="button"
              onClick={() => setSchedule({ ...schedule, campaignName: generateCampaignName(objective) })}
              className="text-xs text-amber-400 hover:underline"
            >
              Auto-generate name
            </button>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-foreground/60">Start Date</Label>
            <Input
              type="date"
              value={schedule.startDate}
              onChange={(e) => setSchedule({ ...schedule, startDate: e.target.value })}
              className="bg-foreground/[0.04] border-border text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground/60">End Date</Label>
            <Input
              type="date"
              value={schedule.endDate}
              onChange={(e) => setSchedule({ ...schedule, endDate: e.target.value })}
              className="bg-foreground/[0.04] border-border text-foreground"
            />
          </div>
        </div>

        {/* Pacing */}
        <div className="space-y-2">
          <Label className="text-foreground/60">Pacing</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["even", "accelerated"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSchedule({ ...schedule, pacing: p })}
                className={`rounded-lg border p-4 text-left transition-all ${
                  schedule.pacing === p
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-border bg-foreground/[0.02] hover:border-amber-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {p === "even" ? (
                    <Clock className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Zap className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="text-sm font-medium text-foreground capitalize">{p}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p === "even"
                    ? "Spread budget evenly over campaign duration"
                    : "Spend budget as fast as possible"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview({
  objective,
  audience,
  channels,
  budget,
  autoAllocate,
  allocation,
  creative,
  schedule,
}: {
  objective: Objective | null;
  audience: AudienceConfig;
  channels: ChannelConfig;
  budget: number;
  autoAllocate: boolean;
  allocation: BudgetAllocation;
  creative: CreativeAssets;
  schedule: ScheduleConfig;
}) {
  const enabledChannels = CHANNEL_OPTIONS.filter((ch) => ch.available && channels[ch.key]);
  const platformFee = budget * 0.25;
  const netBudget = budget - platformFee;
  const reach = estimateReach(audience);
  const objLabel = OBJECTIVES.find((o) => o.id === objective)?.label ?? "Not set";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Review & Launch</h2>
        <p className="text-sm text-muted-foreground mt-1">Double-check everything before launching your campaign</p>
      </div>

      <div className="space-y-3">
        {/* Objective */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Objective</p>
            <p className="text-sm font-semibold text-foreground">{objLabel}</p>
          </div>
          <Target className="h-5 w-5 text-amber-400" />
        </div>

        {/* Audience */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Audience</p>
            <Users className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-foreground"><span className="text-muted-foreground">Reach:</span> {reach.toLocaleString()}</p>
            {audience.counties.length > 0 && (
              <p className="text-foreground"><span className="text-muted-foreground">Counties:</span> {audience.counties.join(", ")}</p>
            )}
            {audience.ageRanges.length > 0 && (
              <p className="text-foreground"><span className="text-muted-foreground">Ages:</span> {audience.ageRanges.join(", ")}</p>
            )}
            {audience.interests.length > 0 && (
              <p className="text-foreground"><span className="text-muted-foreground">Interests:</span> {audience.interests.join(", ")}</p>
            )}
            <p className="text-foreground"><span className="text-muted-foreground">Gender:</span> {audience.gender}</p>
          </div>
        </div>

        {/* Channels & Budget */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Channels & Budget</p>
            <DollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Budget</span>
              <span className="text-foreground font-bold">{formatCurrency(budget)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Platform Fee (25%)</span>
              <span className="text-amber-400">{formatCurrency(platformFee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-foreground font-medium">Net Ad Spend</span>
              <span className="text-foreground font-bold">{formatCurrency(netBudget)}</span>
            </div>
            {enabledChannels.map((ch) => {
              const alloc = autoAllocate
                ? Math.floor(100 / enabledChannels.length)
                : (allocation[ch.key] || 0);
              return (
                <div key={ch.key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{ch.label}</span>
                  <span className="text-foreground">{alloc}% &middot; {formatCurrency(Math.round(netBudget * alloc / 100))}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Creatives summary */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Creatives</p>
            <ImagePlus className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-1 text-sm">
            {creative.audio_file && <p className="text-foreground">Audio: {creative.audio_file.name}</p>}
            {creative.display_image && <p className="text-foreground">Display: {creative.display_image.name}</p>}
            {creative.social_image && <p className="text-foreground">Social Image: {creative.social_image.name}</p>}
            {creative.social_headline && <p className="text-foreground">Headline: {creative.social_headline}</p>}
            {creative.social_cta && <p className="text-foreground">CTA: {creative.social_cta}</p>}
            {creative.native_text && <p className="text-foreground">Native Post: {creative.native_text.slice(0, 60)}...</p>}
            {!creative.audio_file && !creative.display_image && !creative.social_image && !creative.social_headline && !creative.native_text && (
              <p className="text-muted-foreground text-xs">No creatives uploaded yet</p>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Schedule</p>
            <CalendarDays className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-foreground"><span className="text-muted-foreground">Name:</span> {schedule.campaignName || "Not set"}</p>
            <p className="text-foreground"><span className="text-muted-foreground">Dates:</span> {schedule.startDate || "?"} to {schedule.endDate || "?"}</p>
            <p className="text-foreground"><span className="text-muted-foreground">Pacing:</span> {schedule.pacing === "even" ? "Even" : "Accelerated"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function CampaignBuilderPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Step state
  const [objective, setObjective] = useState<Objective | null>(null);
  const [audience, setAudience] = useState<AudienceConfig>({
    counties: [],
    ageRanges: [],
    interests: [],
    gender: "all",
  });
  const [channels, setChannels] = useState<ChannelConfig>({
    wccg_onair: true,
    wccg_digital: true,
    wccg_hubs: true,
    facebook_instagram: false,
    tiktok: false,
    google_youtube: false,
    snapchat: false,
  });
  const [budget, setBudget] = useState(0);
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [allocation, setAllocation] = useState<BudgetAllocation>({});
  const [creative, setCreative] = useState<CreativeAssets>({
    audio_file: null,
    display_image: null,
    social_image: null,
    social_video: null,
    social_copy: "",
    social_headline: "",
    social_cta: "",
    native_text: "",
  });
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    startDate: "",
    endDate: "",
    campaignName: "",
    pacing: "even",
  });

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return objective !== null;
      case 1: return audience.counties.length > 0 || audience.interests.length > 0;
      case 2: {
        const hasChannel = CHANNEL_OPTIONS.some((ch) => ch.available && channels[ch.key]);
        return hasChannel && budget > 0;
      }
      case 3: return true; // Creative is optional
      case 4: return schedule.startDate && schedule.endDate && schedule.campaignName;
      case 5: return true;
      default: return false;
    }
  }, [step, objective, audience, channels, budget, schedule]);

  async function handleLaunch() {
    if (!user) {
      toast.error("Please sign in to create a campaign");
      return;
    }

    setSubmitting(true);
    try {
      const enabledChannels = CHANNEL_OPTIONS.filter((ch) => ch.available && channels[ch.key]);
      const platformFee = budget * 0.25;
      const netBudget = budget - platformFee;

      // Insert into dsp_campaigns
      const { data: campaign, error: campaignError } = await supabase
        .from("dsp_campaigns")
        .insert({
          advertiser_id: user.id,
          name: schedule.campaignName,
          objective,
          status: "draft",
          total_budget: budget,
          net_budget: netBudget,
          platform_fee: platformFee,
          pacing: schedule.pacing,
          start_date: schedule.startDate,
          end_date: schedule.endDate,
          audience_counties: audience.counties,
          audience_age_ranges: audience.ageRanges,
          audience_interests: audience.interests,
          audience_gender: audience.gender,
          auto_allocate: autoAllocate,
          social_headline: creative.social_headline || null,
          social_copy: creative.social_copy || null,
          social_cta: creative.social_cta || null,
          native_text: creative.native_text || null,
        })
        .select("id")
        .single();

      if (campaignError) throw campaignError;

      // Insert channel budgets
      const channelBudgetRows = enabledChannels.map((ch) => {
        const pct = autoAllocate
          ? Math.floor(100 / enabledChannels.length)
          : (allocation[ch.key] || 0);
        return {
          campaign_id: campaign.id,
          channel: ch.key,
          percentage: pct,
          budget_amount: Math.round(netBudget * pct / 100),
        };
      });

      if (channelBudgetRows.length > 0) {
        const { error: budgetError } = await supabase
          .from("dsp_channel_budgets")
          .insert(channelBudgetRows);
        if (budgetError) throw budgetError;
      }

      setCampaignId(campaign.id);
      setSubmitted(true);
      toast.success("Campaign submitted successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Auth gate
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mx-auto">
            <Sparkles className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sign in to Build Campaigns</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Create cross-platform ad campaigns that run on WCCG radio, digital, community hubs, and more.
          </p>
          <Button asChild className="rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 px-6">
            <Link href="/login">
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 sm:p-12 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 mx-auto">
            <CheckCircle2 className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Campaign Submitted!</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your campaign has been created and is in draft status. Our team will review it shortly.
          </p>
          {campaignId && (
            <div className="inline-flex items-center gap-2 bg-foreground/[0.04] rounded-full px-4 py-2 border border-border">
              <span className="text-xs text-muted-foreground">Campaign ID:</span>
              <code className="text-xs text-amber-400 font-mono">{campaignId.slice(0, 8)}</code>
            </div>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild className="rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 px-6">
              <Link href="/advertise/portal/dashboard">
                View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-border text-foreground hover:bg-foreground/5 px-6">
              <Link href="/advertise/portal">Back to Portal</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-amber-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/advertise/portal" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Portal</Link>
                <span className="text-foreground/20">/</span>
                <span className="text-foreground text-sm font-medium">Campaign Builder</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Campaign Builder</h1>
              <p className="text-muted-foreground mt-1">Create a cross-platform advertising campaign</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => { if (i < step) setStep(i); }}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === step
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : i < step
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20"
                    : "bg-foreground/[0.04] text-muted-foreground border border-transparent"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                i < step
                  ? "bg-amber-500 text-black"
                  : i === step
                    ? "bg-amber-500/30 text-amber-300"
                    : "bg-foreground/10 text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${i < step ? "text-amber-500/40" : "text-foreground/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 0 && <StepObjective selected={objective} onSelect={setObjective} />}
        {step === 1 && <StepAudience audience={audience} setAudience={setAudience} />}
        {step === 2 && (
          <StepChannels
            channels={channels}
            setChannels={setChannels}
            budget={budget}
            setBudget={setBudget}
            autoAllocate={autoAllocate}
            setAutoAllocate={setAutoAllocate}
            allocation={allocation}
            setAllocation={setAllocation}
          />
        )}
        {step === 3 && <StepCreative channels={channels} creative={creative} setCreative={setCreative} />}
        {step === 4 && <StepSchedule schedule={schedule} setSchedule={setSchedule} objective={objective} />}
        {step === 5 && (
          <StepReview
            objective={objective}
            audience={audience}
            channels={channels}
            budget={budget}
            autoAllocate={autoAllocate}
            allocation={allocation}
            creative={creative}
            schedule={schedule}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="border-border text-foreground/60 hover:bg-foreground/[0.04]"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-40"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            onClick={handleLaunch}
            disabled={submitting}
            className="bg-amber-500 text-black font-bold hover:bg-amber-400 px-8"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Launch Campaign
          </Button>
        )}
      </div>

      {/* Back to portal */}
      <div className="flex justify-center">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
          <Link href="/advertise/portal">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Portal
          </Link>
        </Button>
      </div>
    </div>
  );
}
