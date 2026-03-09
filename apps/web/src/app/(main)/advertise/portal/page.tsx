"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  CreditCard,
  ImagePlus,
  ArrowRight,
  TrendingUp,
  Eye,
  MousePointerClick,
  DollarSign,
  Loader2,
  Plus,
  Upload,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface AdvertiserAccount {
  id: string;
  companyName: string;
  billingEmail: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  budgetTotal: number;
  budgetDaily: number;
  startDate: string;
  endDate: string;
  impressions?: number;
  clicks?: number;
}

interface RateCard {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unit: string;
  creativeType: string;
}

interface ImpressionData {
  totalImpressions: number;
  totalClicks: number;
}

/* ---------- Helpers ---------- */

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PENDING_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PAUSED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  COMPLETED: "bg-foreground/[0.06] text-muted-foreground border-border",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- Unauthenticated View ---------- */

function SignInView() {
  const portalFeatures = [
    {
      icon: BarChart3,
      title: "Campaign Analytics",
      description:
        "Track impressions, reach, frequency, and listener engagement for all your active campaigns.",
    },
    {
      icon: FileText,
      title: "Ad Scheduling",
      description:
        "View your ad schedule, dayparts, and rotation details across all WCCG channels.",
    },
    {
      icon: CreditCard,
      title: "Billing & Invoices",
      description:
        "Access invoices, payment history, and manage your advertising account billing.",
    },
    {
      icon: ImagePlus,
      title: "Creative Management",
      description:
        "Upload and manage your ad creative, scripts, and promotional materials.",
    },
  ];

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/[0.04] mx-auto">
          <LayoutDashboard className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Sign in to Your Portal
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Access your advertising dashboard to view campaigns, analytics,
          invoices, and manage your ad creative.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            asChild
            className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-6"
          >
            <Link href="/login">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-border text-foreground hover:bg-foreground/5 px-6"
          >
            <Link href="/advertise">Become an Advertiser</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {portalFeatures.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 mb-3">
              <feature.icon className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Dashboard View ---------- */

function DashboardView({ account }: { account: AdvertiserAccount }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [campaignData, rateCardData] = await Promise.all([
          apiClient<Campaign[]>(
            `/advertising/campaigns?advertiserId=${account.id}`
          ),
          apiClient<RateCard[]>("/advertising/rate-cards"),
        ]);
        setCampaigns(campaignData);
        setRateCards(rateCardData);

        // Fetch impressions for active campaigns
        const activeCampaigns = campaignData.filter(
          (c) => c.status === "ACTIVE" || c.status === "COMPLETED"
        );
        let impTotal = 0;
        let clickTotal = 0;
        await Promise.all(
          activeCampaigns.map(async (c) => {
            try {
              const data = await apiClient<ImpressionData>(
                `/advertising/campaigns/${c.id}/impressions`
              );
              impTotal += data.totalImpressions || 0;
              clickTotal += data.totalClicks || 0;
            } catch {
              // Skip campaigns with no impression data
            }
          })
        );
        setTotalImpressions(impTotal);
        setTotalClicks(clickTotal);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [account.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground text-sm">
          Loading dashboard...
        </span>
      </div>
    );
  }

  const activeCampaignCount = campaigns.filter(
    (c) => c.status === "ACTIVE"
  ).length;
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.budgetTotal || 0), 0);
  const avgCtr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  return (
    <>
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Active Campaigns",
            value: activeCampaignCount.toString(),
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Total Impressions",
            value: formatNumber(totalImpressions),
            icon: Eye,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            label: "Avg CTR",
            value: `${avgCtr}%`,
            icon: MousePointerClick,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
          {
            label: "Total Spend",
            value: formatCurrency(totalSpend),
            icon: DollarSign,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
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
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/advertise/portal/campaigns",
            label: "Create Campaign",
            desc: "Launch a new ad campaign",
            icon: Plus,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            href: "/advertise/portal/creatives",
            label: "Upload Creative",
            desc: "Add new ad creative files",
            icon: Upload,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            href: "/advertise/portal/billing",
            label: "View Billing",
            desc: "Invoices & payment history",
            icon: CreditCard,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input flex items-center gap-4"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} shrink-0`}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-foreground/20 group-hover:text-[#74ddc7] transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* Recent Campaigns Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Campaigns</h2>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/advertise/portal/campaigns">
              View All
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <TrendingUp className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            <Button
              asChild
              size="sm"
              className="mt-3 rounded-full bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              <Link href="/advertise/portal/campaigns">
                Create Your First Campaign
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Campaign</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Budget</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">
                  Start Date
                </TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">
                  End Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.slice(0, 5).map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="border-border hover:bg-foreground/[0.02]"
                >
                  <TableCell className="text-foreground font-medium">
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] border ${STATUS_STYLES[campaign.status] || "bg-foreground/[0.06] text-muted-foreground border-border"}`}
                    >
                      {campaign.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground/60">
                    {formatCurrency(campaign.budgetTotal)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {formatDate(campaign.startDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {formatDate(campaign.endDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Rate Cards Overview */}
      {rateCards.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Ad Packages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available advertising packages and rates
            </p>
          </div>
          <div className="grid gap-px bg-foreground/[0.06] sm:grid-cols-2 lg:grid-cols-3">
            {rateCards.slice(0, 6).map((card) => (
              <div key={card.id} className="bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="h-4 w-4 text-red-400" />
                  <h3 className="font-medium text-foreground text-sm">
                    {card.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {card.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(card.pricePerUnit)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {card.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Main Page ---------- */

export default function AdvertiserPortalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [account, setAccount] = useState<AdvertiserAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setAccountLoading(true);
    apiClient<AdvertiserAccount>("/advertising/accounts/my")
      .then((data) => {
        setAccount(data);
        setAccountError(null);
      })
      .catch((err) => {
        setAccountError(
          err instanceof Error ? err.message : "Failed to load account"
        );
      })
      .finally(() => setAccountLoading(false));
  }, [user]);

  const isLoading = authLoading || accountLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-red-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
                <LayoutDashboard className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Advertiser Portal
                </h1>
                <p className="text-muted-foreground mt-1">
                  {account
                    ? `Welcome back, ${account.companyName}`
                    : "Manage your WCCG advertising campaigns"}
                </p>
              </div>
            </div>
            {account && (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/advertise/portal/campaigns"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border hover:border-input"
                >
                  Campaigns
                </Link>
                <Link
                  href="/advertise/portal/creatives"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border hover:border-input"
                >
                  Creatives
                </Link>
                <Link
                  href="/advertise/portal/billing"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border hover:border-input"
                >
                  Billing
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">Loading...</span>
        </div>
      )}

      {/* Not logged in */}
      {!isLoading && !user && <SignInView />}

      {/* Logged in but no advertiser account */}
      {!isLoading && user && accountError && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 mx-auto">
            <LayoutDashboard className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            No Advertiser Account Found
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            It looks like you don&apos;t have an advertiser account yet. Contact
            our advertising team to get started with WCCG advertising.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              asChild
              className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-6"
            >
              <Link href="/advertise">
                Become an Advertiser
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-border text-foreground hover:bg-foreground/5 px-6"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {!isLoading && user && account && <DashboardView account={account} />}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Need help with your portal?{" "}
          <Link
            href="/contact"
            className="text-[#74ddc7] hover:underline"
          >
            Contact our advertising team
          </Link>{" "}
          or call (910) 484-4932.
        </p>
      </div>
    </div>
  );
}
