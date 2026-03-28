"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Eye,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Plus,
  X,
  CalendarDays,
  BarChart3,
  Pause,
  Play,
  CheckCircle2,
  Package,
  Calendar,
  CalendarCheck,
  Radio,
  Monitor,
  Share2,
  Ticket,
  ArrowLeft,
  ArrowRight,
  Rocket,
  ChevronRight,
} from "lucide-react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignStatus = "Active" | "Paused" | "Completed";
type CampaignType = "Radio Spot" | "Digital Ad" | "Social Media" | "Event Sponsor";
type PromotionType = "product" | "event" | "service";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  spend: number;
  promotedItemId?: string;
  promotedItemType?: string;
  promotedItemName?: string;
}

interface PromotableItem {
  id: string;
  name: string;
  detail: string; // price or date
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<CampaignStatus, { bg: string; text: string; icon: typeof Play }> = {
  Active: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: Play },
  Paused: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: Pause },
  Completed: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: CheckCircle2 },
};

const STEP_LABELS = [
  "Promote",
  "Select Item",
  "Campaign Type",
  "Details",
  "Preview",
];

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                i + 1 < current
                  ? "border-amber-500 bg-amber-500 text-white"
                  : i + 1 === current
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {i + 1 < current ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-1.5 text-[11px] font-medium ${
                i + 1 <= current
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {STEP_LABELS[i]}
            </span>
          </div>
          {/* Connector line */}
          {i < total - 1 && (
            <div
              className={`mx-1 mb-5 h-0.5 w-8 sm:w-12 ${
                i + 1 < current ? "bg-amber-500" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorMediaPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  // Campaign list
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Wizard state: 0 = list view, 1-5 = wizard steps
  const [wizardStep, setWizardStep] = useState(0);

  // Step 1 - Promotion type
  const [promotionType, setPromotionType] = useState<PromotionType | null>(null);

  // Step 2 - Selected item
  const [items, setItems] = useState<PromotableItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Step 3 - Campaign type
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);

  // Step 4 - Details
  const [formName, setFormName] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAudience, setFormAudience] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // --- Fetch campaigns from Supabase ---
  useEffect(() => {
    if (!user) return;
    async function fetchCampaigns() {
      const { data, error } = await supabase
        .from("media_campaigns")
        .select("*")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setCampaigns(
          data.map((row: any) => ({
            id: row.id,
            name: row.name,
            type: row.type ?? "Radio Spot",
            status: row.status ?? "Active",
            startDate: row.start_date ?? "",
            endDate: row.end_date ?? "",
            impressions: row.impressions ?? 0,
            clicks: row.clicks ?? 0,
            spend: row.budget ?? row.spend ?? 0,
            promotedItemId: row.promoted_item_id ?? undefined,
            promotedItemType: row.promoted_item_type ?? undefined,
            promotedItemName: row.promoted_item_name ?? undefined,
          }))
        );
      }
    }
    fetchCampaigns();
  }, [user, supabase]);

  // --- Fetch promotable items when step 2 is reached ---
  const fetchItems = useCallback(async () => {
    if (!user || !promotionType) return;
    setItemsLoading(true);
    setItems([]);

    try {
      if (promotionType === "product") {
        const { data } = await supabase
          .from("vendor_products")
          .select("*")
          .eq("vendor_id", user.id)
          .eq("status", "active");
        if (data) {
          setItems(
            data.map((p: any) => ({
              id: p.id,
              name: p.name ?? p.title ?? "Untitled",
              detail: p.price != null ? `$${Number(p.price).toFixed(2)}` : "No price",
            }))
          );
        }
      } else if (promotionType === "event") {
        const { data } = await supabase
          .from("vendor_events")
          .select("*")
          .eq("vendor_id", user.id);
        if (data) {
          setItems(
            data.map((e: any) => ({
              id: e.id,
              name: e.name ?? e.title ?? "Untitled",
              detail: e.event_date ?? e.start_date ?? "No date set",
            }))
          );
        }
      } else if (promotionType === "service") {
        const { data } = await supabase
          .from("vendor_bookings")
          .select("*")
          .eq("vendor_id", user.id)
          .eq("status", "active");
        if (data) {
          setItems(
            data.map((s: any) => ({
              id: s.id,
              name: s.name ?? s.service_name ?? s.title ?? "Untitled",
              detail: s.price != null ? `$${Number(s.price).toFixed(2)}` : "No price",
            }))
          );
        }
      }
    } finally {
      setItemsLoading(false);
    }
  }, [user, promotionType, supabase]);

  useEffect(() => {
    if (wizardStep === 2) {
      fetchItems();
    }
  }, [wizardStep, fetchItems]);

  // --- Auth guard ---
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Please sign in to manage campaigns.
      </div>
    );
  }

  // Aggregate stats
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgCtr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0";
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

  // Bar chart data
  const maxImpressions = Math.max(...campaigns.map((c) => c.impressions), 0);

  // Derived values
  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;

  const promotionTypeLabel =
    promotionType === "product"
      ? "Product"
      : promotionType === "event"
      ? "Event"
      : promotionType === "service"
      ? "Service"
      : "";

  // Auto-suggest campaign name when arriving at step 4
  const autoSuggestName = () => {
    if (selectedItem && campaignType && !formName) {
      setFormName(`${selectedItem.name} - ${campaignType}`);
    }
  };

  // Reset wizard
  const resetWizard = () => {
    setWizardStep(0);
    setPromotionType(null);
    setItems([]);
    setSelectedItemId(null);
    setCampaignType(null);
    setFormName("");
    setFormBudget("");
    setFormStart("");
    setFormEnd("");
    setFormAudience("");
    setFormDescription("");
  };

  // Can advance?
  const canAdvance = (): boolean => {
    switch (wizardStep) {
      case 1:
        return promotionType !== null;
      case 2:
        return selectedItemId !== null;
      case 3:
        return campaignType !== null;
      case 4:
        return !!(formName.trim() && formStart && formEnd);
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) return;
    const next = wizardStep + 1;
    if (next === 4) autoSuggestName();
    setWizardStep(next);
  };

  const goBack = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  // Launch campaign
  const handleLaunch = async () => {
    if (!user || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("media_campaigns")
      .insert({
        vendor_id: user.id,
        name: formName,
        type: campaignType,
        budget: parseFloat(formBudget) || 0,
        start_date: formStart,
        end_date: formEnd,
        target_audience: formAudience,
        description: formDescription,
        promoted_item_id: selectedItemId,
        promoted_item_type: promotionType,
      })
      .select();

    if (!error && data?.[0]) {
      const row = data[0];
      const newCampaign: Campaign = {
        id: row.id,
        name: row.name,
        type: row.type ?? campaignType ?? "Radio Spot",
        status: "Active",
        startDate: row.start_date ?? formStart,
        endDate: row.end_date ?? formEnd,
        impressions: 0,
        clicks: 0,
        spend: row.budget ?? (parseFloat(formBudget) || 0),
        promotedItemId: selectedItemId || undefined,
        promotedItemType: promotionType || undefined,
        promotedItemName: selectedItem?.name,
      };
      setCampaigns((prev) => [newCampaign, ...prev]);
    }

    setSubmitting(false);
    resetWizard();
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media & Ad Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage advertising campaigns and track performance
          </p>
        </div>
        {wizardStep === 0 ? (
          <button
            onClick={() => setWizardStep(1)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        ) : (
          <button
            onClick={resetWizard}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Overview Stats                                                   */}
      {/* --------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-amber-500" },
          { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-blue-500" },
          { label: "Avg CTR", value: `${avgCtr}%`, icon: TrendingUp, color: "text-green-500" },
          { label: "Total Spend", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "text-purple-500" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className={`rounded-xl bg-muted p-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* WIZARD (Steps 1-5)                                               */}
      {/* --------------------------------------------------------------- */}
      {wizardStep > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          {/* Step indicator */}
          <StepIndicator current={wizardStep} total={5} />

          {/* ----- Step 1: What do you want to promote? ----- */}
          {wizardStep === 1 && (
            <div>
              <h2 className="mb-6 text-center text-lg font-semibold">
                What do you want to promote?
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    {
                      type: "product" as PromotionType,
                      icon: Package,
                      label: "Product",
                      desc: "Promote a product from your store",
                    },
                    {
                      type: "event" as PromotionType,
                      icon: Calendar,
                      label: "Event",
                      desc: "Promote an upcoming event",
                    },
                    {
                      type: "service" as PromotionType,
                      icon: CalendarCheck,
                      label: "Service",
                      desc: "Promote a booking service",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setPromotionType(opt.type)}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                      promotionType === opt.type
                        ? "border-amber-500 bg-amber-500/5"
                        : "border-border hover:border-amber-300"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-3 ${
                        promotionType === opt.type
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="h-7 w-7" />
                    </div>
                    <span className="text-base font-semibold">{opt.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ----- Step 2: Select the item ----- */}
          {wizardStep === 2 && (
            <div>
              <h2 className="mb-6 text-center text-lg font-semibold">
                Select the {promotionTypeLabel.toLowerCase()}
              </h2>
              {itemsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading {promotionTypeLabel.toLowerCase()}s...
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Package className="h-8 w-8 opacity-40" />
                  <p>
                    No {promotionTypeLabel.toLowerCase()}s found. Create one
                    first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`flex flex-col gap-1 rounded-2xl border-2 p-5 text-left transition-all ${
                        selectedItemId === item.id
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.detail}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ----- Step 3: Campaign type ----- */}
          {wizardStep === 3 && (
            <div>
              <h2 className="mb-6 text-center text-lg font-semibold">
                Campaign type
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    {
                      type: "Radio Spot" as CampaignType,
                      icon: Radio,
                      desc: "Air your ad on WCCG 104.5 FM",
                    },
                    {
                      type: "Digital Ad" as CampaignType,
                      icon: Monitor,
                      desc: "Banner ads on our digital platforms",
                    },
                    {
                      type: "Social Media" as CampaignType,
                      icon: Share2,
                      desc: "Promoted posts on social channels",
                    },
                    {
                      type: "Event Sponsor" as CampaignType,
                      icon: Ticket,
                      desc: "Sponsor a WCCG event",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setCampaignType(opt.type)}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                      campaignType === opt.type
                        ? "border-amber-500 bg-amber-500/5"
                        : "border-border hover:border-amber-300"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-3 ${
                        campaignType === opt.type
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="h-7 w-7" />
                    </div>
                    <span className="text-sm font-semibold">{opt.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ----- Step 4: Campaign details ----- */}
          {wizardStep === 4 && (
            <div>
              <h2 className="mb-6 text-center text-lg font-semibold">
                Campaign details
              </h2>
              <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="My Campaign"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Budget ($)
                    </label>
                    <input
                      type="number"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      placeholder="500"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Target Audience
                    </label>
                    <input
                      type="text"
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value)}
                      placeholder="18-35, Fayetteville area"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">
                      Description
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe your campaign goals..."
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----- Step 5: Preview & Launch ----- */}
          {wizardStep === 5 && (
            <div>
              <h2 className="mb-6 text-center text-lg font-semibold">
                Preview & Launch
              </h2>
              <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background p-6">
                <div className="space-y-4">
                  {/* Promoted Item */}
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Promoted Item
                      </p>
                      <p className="mt-1 text-base font-semibold">
                        {selectedItem?.name ?? "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {promotionTypeLabel} &middot; {selectedItem?.detail}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
                      {promotionType === "product" && <Package className="h-5 w-5" />}
                      {promotionType === "event" && <Calendar className="h-5 w-5" />}
                      {promotionType === "service" && <CalendarCheck className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Campaign Type */}
                  <div className="border-b border-border pb-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Campaign Type
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {campaignType}
                    </p>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Campaign Name
                      </p>
                      <p className="mt-1 text-sm font-medium">{formName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Budget
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        ${parseFloat(formBudget || "0").toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date Range
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formStart} &mdash; {formEnd}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Target Audience
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {formAudience || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {formDescription && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Description
                      </p>
                      <p className="mt-1 text-sm text-foreground/80">
                        {formDescription}
                      </p>
                    </div>
                  )}
                </div>

                {/* Launch actions */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <button
                    onClick={handleLaunch}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Rocket className="h-4 w-4" />
                    {submitting ? "Launching..." : "Launch Campaign"}
                  </button>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back to Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----- Navigation buttons (steps 1-4) ----- */}
          {wizardStep >= 1 && wizardStep <= 4 && (
            <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
              <button
                onClick={wizardStep === 1 ? resetWizard : goBack}
                className="flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                {wizardStep === 1 ? "Cancel" : "Back"}
              </button>
              <button
                onClick={goNext}
                disabled={!canAdvance()}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* Performance Chart (div bars)                                     */}
      {/* --------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Campaign Performance</h2>
        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          {campaigns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No campaigns yet. Create one to see performance data.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-4">
                {campaigns.map((c) => {
                  const height =
                    maxImpressions > 0
                      ? (c.impressions / maxImpressions) * 120
                      : 0;
                  const ctr =
                    c.impressions > 0
                      ? ((c.clicks / c.impressions) * 100).toFixed(1)
                      : "0";
                  return (
                    <div
                      key={c.id}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {ctr}%
                      </span>
                      <div
                        className="w-full max-w-[60px] rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-400 transition-all"
                        style={{ height: `${Math.max(height, 8)}px` }}
                      />
                      <span className="max-w-[80px] truncate text-center text-xs text-muted-foreground">
                        {c.name.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Bar height = impressions
                </span>
                <span>Label = CTR %</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* Campaign Cards                                                   */}
      {/* --------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Campaigns</h2>
        {campaigns.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No campaigns yet. Click &ldquo;Create Campaign&rdquo; to get
              started.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {campaigns.map((campaign) => {
              const ctr =
                campaign.impressions > 0
                  ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                  : "0.00";
              const sc = statusConfig[campaign.status];
              const StatusIcon = sc.icon;

              return (
                <div
                  key={campaign.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {campaign.type}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${sc.bg} ${sc.text}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {campaign.status}
                    </span>
                  </div>

                  {/* Promoted item line */}
                  {(campaign.promotedItemName || campaign.promotedItemType) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <ChevronRight className="h-3 w-3" />
                      <span>
                        Promoting: {campaign.promotedItemName ?? "Item"}{" "}
                        {campaign.promotedItemType &&
                          `(${campaign.promotedItemType})`}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {campaign.startDate} &mdash; {campaign.endDate}
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      {
                        label: "Impressions",
                        value: campaign.impressions.toLocaleString(),
                      },
                      {
                        label: "Clicks",
                        value: campaign.clicks.toLocaleString(),
                      },
                      { label: "CTR", value: `${ctr}%` },
                      {
                        label: "Spend",
                        value: `$${campaign.spend.toLocaleString()}`,
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-xl bg-muted/50 px-2 py-2"
                      >
                        <p className="text-[10px] text-muted-foreground">
                          {m.label}
                        </p>
                        <p className="text-sm font-semibold">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
