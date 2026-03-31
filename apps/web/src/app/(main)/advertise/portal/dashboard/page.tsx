"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  Target,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Radio,
  Globe,
  MessageSquare,
  Users,
  Tv,
  Zap,
  Link2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/* ================================================================
   TYPES
   ================================================================ */

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  total_budget: number;
  net_budget: number;
  platform_fee: number;
  start_date: string;
  end_date: string;
  pacing: string;
  auto_allocate: boolean;
  audience_counties: string[];
  audience_age_ranges: string[];
  audience_interests: string[];
  audience_gender: string;
  created_at: string;
}

interface ChannelBudget {
  id: string;
  campaign_id: string;
  channel: string;
  percentage: number;
  budget_amount: number;
}

interface AnalyticsRow {
  id: string;
  campaign_id: string;
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  date: string;
}

interface ChannelMetrics {
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  completed: "bg-foreground/[0.06] text-muted-foreground border-border",
};

const CHANNEL_LABELS: Record<string, { label: string; icon: typeof Radio }> = {
  wccg_onair: { label: "WCCG On-Air", icon: Radio },
  wccg_digital: { label: "WCCG Digital", icon: Globe },
  wccg_hubs: { label: "WCCG Hubs", icon: MessageSquare },
  facebook_instagram: { label: "Facebook / IG", icon: Users },
  tiktok: { label: "TikTok", icon: Tv },
  google_youtube: { label: "Google / YT", icon: Globe },
  snapchat: { label: "Snapchat", icon: Zap },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: "Awareness",
  traffic: "Traffic",
  engagement: "Engagement",
  conversions: "Conversions",
  local_foot_traffic: "Local Foot Traffic",
};

/* ================================================================
   SEED / MOCK DATA
   ================================================================ */

function generateMockCampaigns(): Campaign[] {
  return [
    {
      id: "demo-camp-1",
      name: "Spring Community Outreach",
      objective: "awareness",
      status: "active",
      total_budget: 5000,
      net_budget: 3750,
      platform_fee: 1250,
      start_date: "2026-03-01",
      end_date: "2026-04-30",
      pacing: "even",
      auto_allocate: true,
      audience_counties: ["Cumberland", "Hoke", "Robeson"],
      audience_age_ranges: ["25-34", "35-44", "45-54"],
      audience_interests: ["music", "faith", "entertainment"],
      audience_gender: "all",
      created_at: "2026-02-28T10:00:00Z",
    },
    {
      id: "demo-camp-2",
      name: "Easter Weekend Sale",
      objective: "conversions",
      status: "active",
      total_budget: 3000,
      net_budget: 2250,
      platform_fee: 750,
      start_date: "2026-03-28",
      end_date: "2026-04-06",
      pacing: "accelerated",
      auto_allocate: false,
      audience_counties: ["Cumberland"],
      audience_age_ranges: ["18-24", "25-34"],
      audience_interests: ["food", "fashion"],
      audience_gender: "all",
      created_at: "2026-03-20T14:00:00Z",
    },
    {
      id: "demo-camp-3",
      name: "Gospel Music Festival Promo",
      objective: "engagement",
      status: "completed",
      total_budget: 8000,
      net_budget: 6000,
      platform_fee: 2000,
      start_date: "2026-01-15",
      end_date: "2026-02-28",
      pacing: "even",
      auto_allocate: true,
      audience_counties: ["Cumberland", "Hoke", "Sampson", "Bladen"],
      audience_age_ranges: ["35-44", "45-54", "55-64"],
      audience_interests: ["music", "faith"],
      audience_gender: "all",
      created_at: "2026-01-10T09:00:00Z",
    },
    {
      id: "demo-camp-4",
      name: "Summer Traffic Drive",
      objective: "traffic",
      status: "draft",
      total_budget: 2500,
      net_budget: 1875,
      platform_fee: 625,
      start_date: "2026-06-01",
      end_date: "2026-08-31",
      pacing: "even",
      auto_allocate: true,
      audience_counties: ["Cumberland", "Moore"],
      audience_age_ranges: ["25-34", "35-44"],
      audience_interests: ["business", "entertainment"],
      audience_gender: "all",
      created_at: "2026-03-25T11:00:00Z",
    },
  ];
}

function generateMockAnalytics(campaigns: Campaign[]): { analytics: AnalyticsRow[]; channelBudgets: ChannelBudget[] } {
  const analytics: AnalyticsRow[] = [];
  const channelBudgets: ChannelBudget[] = [];
  const channels = ["wccg_onair", "wccg_digital", "wccg_hubs"];

  campaigns.forEach((camp) => {
    // Channel budgets
    channels.forEach((ch, idx) => {
      const pct = idx === 0 ? 40 : idx === 1 ? 35 : 25;
      channelBudgets.push({
        id: `${camp.id}-${ch}`,
        campaign_id: camp.id,
        channel: ch,
        percentage: pct,
        budget_amount: Math.round(camp.net_budget * pct / 100),
      });
    });

    // Analytics per channel per day (last 30 days)
    if (camp.status === "active" || camp.status === "completed") {
      const days = camp.status === "completed" ? 30 : 14;
      for (let d = 0; d < days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        channels.forEach((ch) => {
          const baseImpressions = ch === "wccg_onair" ? 1200 : ch === "wccg_digital" ? 800 : 500;
          const variation = 0.7 + Math.random() * 0.6;
          const impressions = Math.round(baseImpressions * variation);
          const clickRate = ch === "wccg_digital" ? 0.035 : ch === "wccg_hubs" ? 0.028 : 0.012;
          const clicks = Math.round(impressions * (clickRate + Math.random() * 0.01));
          const conversions = Math.round(clicks * (0.03 + Math.random() * 0.04));
          const dailyBudget = camp.net_budget / (days * channels.length);
          const spend = Math.round(dailyBudget * (0.8 + Math.random() * 0.4) * 100) / 100;

          analytics.push({
            id: `${camp.id}-${ch}-${d}`,
            campaign_id: camp.id,
            channel: ch,
            impressions,
            clicks,
            conversions,
            spend,
            date: date.toISOString().split("T")[0],
          });
        });
      }
    }
  });

  return { analytics, channelBudgets };
}

/* ================================================================
   HELPERS
   ================================================================ */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ================================================================
   CAMPAIGN CARD
   ================================================================ */

function CampaignCard({
  campaign,
  channelBudgets,
  analytics,
}: {
  campaign: Campaign;
  channelBudgets: ChannelBudget[];
  analytics: AnalyticsRow[];
}) {
  const [expanded, setExpanded] = useState(false);

  const campBudgets = channelBudgets.filter((b) => b.campaign_id === campaign.id);
  const campAnalytics = analytics.filter((a) => a.campaign_id === campaign.id);

  const totals = useMemo(() => {
    const t = { impressions: 0, clicks: 0, conversions: 0, spend: 0 };
    campAnalytics.forEach((a) => {
      t.impressions += a.impressions;
      t.clicks += a.clicks;
      t.conversions += a.conversions;
      t.spend += a.spend;
    });
    return t;
  }, [campAnalytics]);

  const channelBreakdown = useMemo(() => {
    const map = new Map<string, ChannelMetrics>();
    campAnalytics.forEach((a) => {
      const existing = map.get(a.channel) || { channel: a.channel, impressions: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0 };
      existing.impressions += a.impressions;
      existing.clicks += a.clicks;
      existing.conversions += a.conversions;
      existing.spend += a.spend;
      map.set(a.channel, existing);
    });
    // Compute derived metrics
    map.forEach((m) => {
      m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
    });
    return Array.from(map.values());
  }, [campAnalytics]);

  const maxImpressions = Math.max(...channelBreakdown.map((c) => c.impressions), 1);

  const activeChannels = campBudgets.map((b) => b.channel);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-foreground/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-foreground">{campaign.name}</h3>
              <Badge className={`text-[10px] border ${STATUS_STYLES[campaign.status] || "bg-foreground/[0.06] text-muted-foreground border-border"}`}>
                {campaign.status}
              </Badge>
              <Badge className="text-[10px] border border-amber-500/20 bg-amber-500/10 text-amber-400">
                {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(campaign.total_budget)}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400">{formatCurrency(totals.spend)} spent</span>
              </span>
            </div>
            {/* Channel icon badges */}
            <div className="flex items-center gap-1.5 mt-2">
              {activeChannels.map((ch) => {
                const info = CHANNEL_LABELS[ch];
                if (!info) return null;
                return (
                  <div
                    key={ch}
                    className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 border border-amber-500/20"
                    title={info.label}
                  >
                    <info.icon className="h-3 w-3 text-amber-400" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-foreground">{formatNumber(totals.impressions)}</p>
              <p className="text-[10px] text-muted-foreground">impressions</p>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Per-channel breakdown */}
          <div>
            <h4 className="text-xs font-medium text-foreground/60 uppercase tracking-wider mb-3">Channel Breakdown</h4>
            {channelBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No analytics data available yet.</p>
            ) : (
              <div className="space-y-3">
                {channelBreakdown.map((ch) => {
                  const info = CHANNEL_LABELS[ch.channel];
                  const barWidth = (ch.impressions / maxImpressions) * 100;
                  return (
                    <div key={ch.channel} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {info && <info.icon className="h-3.5 w-3.5 text-amber-400" />}
                          <span className="text-sm font-medium text-foreground">{info?.label || ch.channel}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Impressions</p>
                          <p className="text-foreground font-medium">{formatNumber(ch.impressions)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clicks</p>
                          <p className="text-foreground font-medium">{formatNumber(ch.clicks)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CTR</p>
                          <p className="text-foreground font-medium">{ch.ctr.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Spend</p>
                          <p className="text-foreground font-medium">{formatCurrency(Math.round(ch.spend))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conversions</p>
                          <p className="text-foreground font-medium">{ch.conversions}</p>
                        </div>
                      </div>
                      {/* Mini bar chart */}
                      <div className="w-full bg-foreground/[0.06] rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function DashboardPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channelBudgets, setChannelBudgets] = useState<ChannelBudget[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch campaigns
        const { data: campData, error: campError } = await supabase
          .from("dsp_campaigns")
          .select("*")
          .eq("advertiser_id", user!.id)
          .order("created_at", { ascending: false });

        if (campError) throw campError;

        if (!campData || campData.length === 0) {
          // Use mock data for demonstration
          const mock = generateMockCampaigns();
          const { analytics: mockAnalytics, channelBudgets: mockBudgets } = generateMockAnalytics(mock);
          setCampaigns(mock);
          setChannelBudgets(mockBudgets);
          setAnalytics(mockAnalytics);
          setUsingMockData(true);
          return;
        }

        setCampaigns(campData as Campaign[]);
        setUsingMockData(false);

        // Fetch channel budgets
        const campIds = campData.map((c: Campaign) => c.id);
        const { data: budgetData } = await supabase
          .from("dsp_channel_budgets")
          .select("*")
          .in("campaign_id", campIds);
        setChannelBudgets((budgetData || []) as ChannelBudget[]);

        // Fetch analytics
        const { data: analyticsData } = await supabase
          .from("dsp_analytics")
          .select("*")
          .in("campaign_id", campIds);

        if (!analyticsData || analyticsData.length === 0) {
          // Generate mock analytics for real campaigns
          const { analytics: mockA, channelBudgets: mockB } = generateMockAnalytics(campData as Campaign[]);
          setAnalytics(mockA);
          if (!budgetData || budgetData.length === 0) {
            setChannelBudgets(mockB);
          }
        } else {
          setAnalytics(analyticsData as AnalyticsRow[]);
        }
      } catch {
        // Fallback to mock
        const mock = generateMockCampaigns();
        const { analytics: mockAnalytics, channelBudgets: mockBudgets } = generateMockAnalytics(mock);
        setCampaigns(mock);
        setChannelBudgets(mockBudgets);
        setAnalytics(mockAnalytics);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, supabase]);

  // Filter analytics by date range
  const filteredAnalytics = useMemo(() => {
    const days = parseInt(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return analytics.filter((a) => a.date >= cutoffStr);
  }, [analytics, dateRange]);

  // Aggregate stats
  const topStats = useMemo(() => {
    const t = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    filteredAnalytics.forEach((a) => {
      t.spend += a.spend;
      t.impressions += a.impressions;
      t.clicks += a.clicks;
      t.conversions += a.conversions;
    });
    const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
    const roas = t.spend > 0 ? (t.conversions * 45) / t.spend : 0; // Assume $45 avg conversion value
    return { ...t, ctr, roas };
  }, [filteredAnalytics]);

  // Channel performance comparison
  const channelPerformance = useMemo(() => {
    const map = new Map<string, ChannelMetrics>();
    filteredAnalytics.forEach((a) => {
      const existing = map.get(a.channel) || { channel: a.channel, impressions: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0 };
      existing.impressions += a.impressions;
      existing.clicks += a.clicks;
      existing.conversions += a.conversions;
      existing.spend += a.spend;
      map.set(a.channel, existing);
    });
    map.forEach((m) => {
      m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
    });
    return Array.from(map.values()).sort((a, b) => b.impressions - a.impressions);
  }, [filteredAnalytics]);

  // Audience insights (mock)
  const audienceInsights = useMemo(() => {
    if (campaigns.length === 0) return null;
    // Find top segment from campaigns
    const allInterests = campaigns.flatMap((c) => c.audience_interests || []);
    const interestCounts: Record<string, number> = {};
    allInterests.forEach((i) => { interestCounts[i] = (interestCounts[i] || 0) + 1; });
    const topInterest = Object.entries(interestCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      topSegment: topInterest ? topInterest[0] : "General",
      bestTimeOfDay: "Morning Drive (6am-10am)",
      bestCreative: "Audio Radio Spot",
    };
  }, [campaigns]);

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
            <BarChart3 className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sign in to View Dashboard</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            See unified analytics across all your advertising channels.
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-amber-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/advertise/portal" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Portal</Link>
                  <span className="text-foreground/20">/</span>
                  <span className="text-foreground text-sm font-medium">Dashboard</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">Campaign Dashboard</h1>
                <p className="text-muted-foreground mt-1">Cross-platform performance analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px] bg-foreground/[0.04] border-border text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Mock data banner */}
      {usingMockData && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2 text-xs text-amber-400">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Showing demo data for illustration. Create a campaign to see your real analytics.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">Loading dashboard...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Top Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              { label: "Total Spend", value: formatCurrency(Math.round(topStats.spend)), icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Impressions", value: formatNumber(topStats.impressions), icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Clicks", value: formatNumber(topStats.clicks), icon: MousePointerClick, color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Avg CTR", value: `${topStats.ctr.toFixed(2)}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Conversions", value: formatNumber(topStats.conversions), icon: Target, color: "text-rose-400", bg: "bg-rose-500/10" },
              { label: "ROAS", value: `${topStats.roas.toFixed(1)}x`, icon: RefreshCw, color: "text-cyan-400", bg: "bg-cyan-500/10" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Campaign List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
              <Button asChild className="rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 text-xs px-4 py-1.5 h-auto">
                <Link href="/advertise/portal/campaign-builder">
                  <Sparkles className="h-3 w-3 mr-1" />
                  New Campaign
                </Link>
              </Button>
            </div>

            {campaigns.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No campaigns yet.</p>
                <Button asChild className="mt-3 rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400 px-5">
                  <Link href="/advertise/portal/campaign-builder">Create Your First Campaign</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <CampaignCard
                    key={camp.id}
                    campaign={camp}
                    channelBudgets={channelBudgets}
                    analytics={filteredAnalytics}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Channel Performance Section */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Channel Performance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Side-by-side comparison across all channels</p>
            </div>
            <div className="p-5">
              {channelPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No channel data available</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Active WCCG channels */}
                  {channelPerformance.map((ch) => {
                    const info = CHANNEL_LABELS[ch.channel];
                    return (
                      <div key={ch.channel} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          {info && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                              <info.icon className="h-4 w-4 text-amber-400" />
                            </div>
                          )}
                          <span className="text-sm font-semibold text-foreground">{info?.label || ch.channel}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Impressions</p>
                            <p className="text-foreground font-bold text-sm">{formatNumber(ch.impressions)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="text-foreground font-bold text-sm">{formatNumber(ch.clicks)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CTR</p>
                            <p className="text-foreground font-bold text-sm">{ch.ctr.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CPC</p>
                            <p className="text-foreground font-bold text-sm">${ch.cpc.toFixed(2)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Spend</p>
                            <p className="text-foreground font-bold text-sm">{formatCurrency(Math.round(ch.spend))}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* External platform placeholders */}
                  {["Facebook / Instagram", "TikTok", "Google / YouTube"].map((platform) => (
                    <div key={platform} className="rounded-xl border border-border bg-foreground/[0.02] p-4 flex flex-col items-center justify-center text-center min-h-[160px]">
                      <Link2 className="h-6 w-6 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground mb-1">{platform}</p>
                      <button
                        type="button"
                        onClick={() => toast.info(`${platform} integration coming soon!`)}
                        className="text-xs text-amber-400 hover:underline"
                      >
                        Connect Account
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audience Insights */}
          {audienceInsights && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Audience Insights</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Key takeaways from your campaign data</p>
              </div>
              <div className="grid gap-px bg-foreground/[0.06] sm:grid-cols-3">
                <div className="bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Segment</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground capitalize">{audienceInsights.topSegment}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Best performing audience interest</p>
                </div>
                <div className="bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Time</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{audienceInsights.bestTimeOfDay}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Highest engagement time slot</p>
                </div>
                <div className="bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Best Creative</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{audienceInsights.bestCreative}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Top performing creative type</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

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
