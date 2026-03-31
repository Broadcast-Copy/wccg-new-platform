"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  FlaskConical,
  Loader2,
  ArrowLeft,
  Plus,
  Trophy,
  BarChart3,
  MousePointerClick,
  Eye,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

/* ---------- Types ---------- */

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface VariantForm {
  headline: string;
  body_text: string;
  image_url: string;
  cta_text: string;
}

interface ABTestVariant {
  id: string;
  test_id: string;
  campaign_id: string;
  variant_label: string;
  headline: string;
  body_text: string;
  image_url: string | null;
  cta_text: string;
  impressions: number;
  clicks: number;
  created_at: string;
}

/* ---------- Mock data ---------- */

const MOCK_TESTS: ABTestVariant[] = [
  {
    id: "mock-a-1",
    test_id: "test-001",
    campaign_id: "mock-camp-1",
    variant_label: "A",
    headline: "Summer Beats on WCCG 104.5",
    body_text: "Tune in for the hottest tracks all summer long",
    image_url: null,
    cta_text: "Listen Now",
    impressions: 12450,
    clicks: 873,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-b-1",
    test_id: "test-001",
    campaign_id: "mock-camp-1",
    variant_label: "B",
    headline: "Your Summer Soundtrack Awaits",
    body_text: "WCCG 104.5 brings the heat with new music daily",
    image_url: null,
    cta_text: "Start Listening",
    impressions: 12380,
    clicks: 1041,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-a-2",
    test_id: "test-002",
    campaign_id: "mock-camp-2",
    variant_label: "A",
    headline: "Local Business Spotlight",
    body_text: "Reach thousands of listeners in the Fayetteville area",
    image_url: null,
    cta_text: "Advertise Today",
    impressions: 8200,
    clicks: 410,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-b-2",
    test_id: "test-002",
    campaign_id: "mock-camp-2",
    variant_label: "B",
    headline: "Grow Your Business with WCCG",
    body_text: "Affordable radio ads that get results",
    image_url: null,
    cta_text: "Get Started",
    impressions: 8150,
    clicks: 652,
    created_at: new Date().toISOString(),
  },
];

/* ---------- Helpers ---------- */

function ctr(impressions: number, clicks: number): string {
  if (impressions === 0) return "0.00";
  return ((clicks / impressions) * 100).toFixed(2);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/* ---------- Bar Chart Component ---------- */

function ComparisonBar({
  label,
  valueA,
  valueB,
  format = "number",
}: {
  label: string;
  valueA: number;
  valueB: number;
  format?: "number" | "percent";
}) {
  const max = Math.max(valueA, valueB, 1);
  const widthA = (valueA / max) * 100;
  const widthB = (valueB / max) * 100;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-400 font-semibold w-6">A</span>
          <div className="flex-1 h-6 bg-foreground/[0.04] rounded overflow-hidden">
            <div
              className="h-full bg-amber-500/60 rounded transition-all duration-500"
              style={{ width: `${widthA}%` }}
            />
          </div>
          <span className="text-xs text-foreground font-medium w-20 text-right">
            {format === "percent" ? `${valueA}%` : formatNumber(valueA)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-400 font-semibold w-6">B</span>
          <div className="flex-1 h-6 bg-foreground/[0.04] rounded overflow-hidden">
            <div
              className="h-full bg-blue-500/60 rounded transition-all duration-500"
              style={{ width: `${widthB}%` }}
            />
          </div>
          <span className="text-xs text-foreground font-medium w-20 text-right">
            {format === "percent" ? `${valueB}%` : formatNumber(valueB)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Test Result Card ---------- */

function TestResultCard({ variantA, variantB }: { variantA: ABTestVariant; variantB: ABTestVariant }) {
  const ctrA = parseFloat(ctr(variantA.impressions, variantA.clicks));
  const ctrB = parseFloat(ctr(variantB.impressions, variantB.clicks));
  const winner = ctrA > ctrB ? "A" : ctrB > ctrA ? "B" : "TIE";
  const winnerVariant = winner === "A" ? variantA : variantB;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-400" />
          <h3 className="font-semibold text-foreground text-sm">
            Test: {variantA.test_id}
          </h3>
        </div>
        {winner !== "TIE" ? (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border text-[10px]">
            <Trophy className="h-3 w-3 mr-1" />
            Variant {winner} Wins
          </Badge>
        ) : (
          <Badge className="bg-foreground/[0.06] text-muted-foreground border-border border text-[10px]">
            Tie
          </Badge>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Variant summaries */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[variantA, variantB].map((v) => {
            const isWinner =
              winner !== "TIE" && v.variant_label === winner;
            return (
              <div
                key={v.id}
                className={`rounded-lg border p-4 space-y-2 ${
                  isWinner
                    ? "border-amber-500/30 bg-amber-500/[0.03]"
                    : "border-border bg-foreground/[0.01]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      v.variant_label === "A"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {v.variant_label}
                  </span>
                  {isWinner && (
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {v.headline}
                </p>
                <p className="text-xs text-muted-foreground">{v.body_text}</p>
                <p className="text-xs text-amber-400 font-medium">
                  CTA: {v.cta_text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bar charts */}
        <div className="space-y-4">
          <ComparisonBar
            label="Impressions"
            valueA={variantA.impressions}
            valueB={variantB.impressions}
          />
          <ComparisonBar
            label="Clicks"
            valueA={variantA.clicks}
            valueB={variantB.clicks}
          />
          <ComparisonBar
            label="CTR"
            valueA={ctrA}
            valueB={ctrB}
            format="percent"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function ABTestingPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tests, setTests] = useState<ABTestVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [variantA, setVariantA] = useState<VariantForm>({
    headline: "",
    body_text: "",
    image_url: "",
    cta_text: "",
  });
  const [variantB, setVariantB] = useState<VariantForm>({
    headline: "",
    body_text: "",
    image_url: "",
    cta_text: "",
  });

  /* Load campaigns and existing tests */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // Load campaigns
        const { data: campaignData } = await supabase
          .from("dsp_campaigns")
          .select("id, name, status")
          .order("created_at", { ascending: false });

        setCampaigns(campaignData || []);

        // Load existing A/B test variants
        const { data: testData } = await supabase
          .from("ab_test_variants")
          .select("*")
          .order("created_at", { ascending: false });

        if (testData && testData.length > 0) {
          setTests(testData);
        } else {
          // Use mock data
          setTests(MOCK_TESTS);
        }
      } catch {
        // Fallback to mock data
        setTests(MOCK_TESTS);
        setCampaigns([
          { id: "mock-camp-1", name: "Summer Promo", status: "ACTIVE" },
          { id: "mock-camp-2", name: "Local Business Ads", status: "ACTIVE" },
        ]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, supabase]);

  /* Create A/B test */
  async function handleCreate() {
    if (!selectedCampaign) {
      toast.error("Please select a campaign");
      return;
    }
    if (!variantA.headline.trim() || !variantB.headline.trim()) {
      toast.error("Both variants need a headline");
      return;
    }
    if (!variantA.cta_text.trim() || !variantB.cta_text.trim()) {
      toast.error("Both variants need CTA text");
      return;
    }

    setCreating(true);
    try {
      const testId = `test-${Date.now()}`;
      const variants = [
        {
          test_id: testId,
          campaign_id: selectedCampaign,
          variant_label: "A",
          headline: variantA.headline,
          body_text: variantA.body_text,
          image_url: variantA.image_url || null,
          cta_text: variantA.cta_text,
          impressions: 0,
          clicks: 0,
        },
        {
          test_id: testId,
          campaign_id: selectedCampaign,
          variant_label: "B",
          headline: variantB.headline,
          body_text: variantB.body_text,
          image_url: variantB.image_url || null,
          cta_text: variantB.cta_text,
          impressions: 0,
          clicks: 0,
        },
      ];

      const { data, error } = await supabase
        .from("ab_test_variants")
        .insert(variants)
        .select();

      if (error) throw error;

      if (data) {
        setTests((prev) => [...data, ...prev]);
      }

      toast.success("A/B test created successfully");
      setShowForm(false);
      setSelectedCampaign("");
      setVariantA({ headline: "", body_text: "", image_url: "", cta_text: "" });
      setVariantB({ headline: "", body_text: "", image_url: "", cta_text: "" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create A/B test"
      );
    } finally {
      setCreating(false);
    }
  }

  /* Group tests by test_id */
  const groupedTests: Record<string, ABTestVariant[]> = {};
  tests.forEach((t) => {
    if (!groupedTests[t.test_id]) groupedTests[t.test_id] = [];
    groupedTests[t.test_id].push(t);
  });

  const testPairs = Object.entries(groupedTests).filter(
    ([, variants]) => variants.length >= 2
  );

  // Stats
  const totalTests = testPairs.length;
  const totalImpressions = tests.reduce((s, t) => s + t.impressions, 0);
  const totalClicks = tests.reduce((s, t) => s + t.clicks, 0);
  const avgCTR =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  const isLoading = authLoading || loading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-amber-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl">
                <FlaskConical className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href="/advertise/portal"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Portal
                  </Link>
                  <span className="text-foreground/20">/</span>
                  <span className="text-foreground text-sm font-medium">
                    A/B Testing
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  A/B Testing
                </h1>
                <p className="text-muted-foreground mt-1">
                  Test ad creative variants and find what performs best
                </p>
              </div>
            </div>
            <div className="hidden sm:block">
              <Button
                onClick={() => setShowForm(!showForm)}
                className="rounded-full bg-[#f59e0b] text-black font-bold hover:bg-[#d97706] px-5"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New A/B Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile button */}
      <div className="sm:hidden">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-[#f59e0b] text-black font-bold hover:bg-[#d97706] px-5"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New A/B Test
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">
            Loading A/B tests...
          </span>
        </div>
      )}

      {/* Auth required */}
      {!isLoading && !user && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Please{" "}
            <Link href="/login" className="text-[#f59e0b] hover:underline">
              sign in
            </Link>{" "}
            to manage A/B tests.
          </p>
        </div>
      )}

      {!isLoading && user && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Active Tests",
                value: totalTests,
                icon: FlaskConical,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "Total Impressions",
                value: formatNumber(totalImpressions),
                icon: Eye,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                label: "Total Clicks",
                value: formatNumber(totalClicks),
                icon: MousePointerClick,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Avg CTR",
                value: `${avgCTR}%`,
                icon: Percent,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="rounded-xl border border-amber-500/20 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">
                  Create New A/B Test
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define two creative variants to compare
                </p>
              </div>
              <div className="p-5 space-y-6">
                {/* Campaign selector */}
                <div className="space-y-1.5">
                  <Label className="text-foreground/60">Campaign *</Label>
                  <Select
                    value={selectedCampaign}
                    onValueChange={setSelectedCampaign}
                  >
                    <SelectTrigger className="bg-foreground/[0.04] border-border text-foreground">
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      {campaigns.length === 0 && (
                        <SelectItem value="demo" disabled>
                          No campaigns found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variant forms */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {(
                    [
                      { label: "Variant A", state: variantA, setter: setVariantA, color: "amber" },
                      { label: "Variant B", state: variantB, setter: setVariantB, color: "blue" },
                    ] as const
                  ).map(({ label, state, setter, color }) => (
                    <div
                      key={label}
                      className={`rounded-lg border p-4 space-y-3 ${
                        color === "amber"
                          ? "border-amber-500/20 bg-amber-500/[0.02]"
                          : "border-blue-500/20 bg-blue-500/[0.02]"
                      }`}
                    >
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          color === "amber"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {label}
                      </span>

                      <div className="space-y-1.5">
                        <Label className="text-foreground/60 text-xs">
                          Headline *
                        </Label>
                        <Input
                          value={state.headline}
                          onChange={(e) =>
                            setter({ ...state, headline: e.target.value })
                          }
                          placeholder="Eye-catching headline"
                          className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-foreground/60 text-xs">
                          Body Text
                        </Label>
                        <Textarea
                          value={state.body_text}
                          onChange={(e) =>
                            setter({ ...state, body_text: e.target.value })
                          }
                          placeholder="Supporting copy..."
                          rows={2}
                          className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20 resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-foreground/60 text-xs">
                          Image URL
                        </Label>
                        <Input
                          value={state.image_url}
                          onChange={(e) =>
                            setter({ ...state, image_url: e.target.value })
                          }
                          placeholder="https://..."
                          className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-foreground/60 text-xs">
                          CTA Text *
                        </Label>
                        <Input
                          value={state.cta_text}
                          onChange={(e) =>
                            setter({ ...state, cta_text: e.target.value })
                          }
                          placeholder="e.g. Learn More"
                          className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-border text-foreground/60 hover:bg-foreground/[0.04]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-[#f59e0b] text-black font-bold hover:bg-[#d97706]"
                  >
                    {creating && (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    )}
                    Create A/B Test
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Test Results</h2>
              <span className="text-xs text-muted-foreground">
                ({totalTests} test{totalTests !== 1 ? "s" : ""})
              </span>
            </div>

            {testPairs.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
                <FlaskConical className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  No A/B tests yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Create your first A/B test to start comparing ad creative
                  variants.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {testPairs.map(([testId, variants]) => {
                  const sortedVariants = variants.sort((a, b) =>
                    a.variant_label.localeCompare(b.variant_label)
                  );
                  return (
                    <TestResultCard
                      key={testId}
                      variantA={sortedVariants[0]}
                      variantB={sortedVariants[1]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Back Link */}
      <div className="flex justify-center">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/advertise/portal">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Portal
          </Link>
        </Button>
      </div>
    </div>
  );
}
