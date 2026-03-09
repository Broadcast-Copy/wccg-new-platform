"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Target,
  Search,
  Plus,
  MoreHorizontal,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  CheckCircle,
  ArrowLeft,
  Download,
  Pause,
  Play,
  BarChart3,
  Calendar,
} from "lucide-react";
import { useDemoRole } from "../layout";
import { ROLE_CONFIGS } from "../_lib/role-config";

// ---------------------------------------------------------------------------
// Mock campaigns data
// ---------------------------------------------------------------------------

interface MockCampaignRow {
  id: string;
  name: string;
  client: string;
  status: "active" | "pending" | "completed" | "paused";
  type: "audio" | "banner" | "sponsored" | "pre-roll";
  budget: string;
  spent: string;
  impressions: string;
  clicks: string;
  ctr: string;
  startDate: string;
  endDate: string;
}

const MOCK_CAMPAIGNS: MockCampaignRow[] = [
  { id: "c1", name: "Spring Auto Sale", client: "Fayetteville Auto Group", status: "active", type: "audio", budget: "$8,500", spent: "$4,200", impressions: "45.2K", clicks: "1,084", ctr: "2.4%", startDate: "Feb 15, 2026", endDate: "Apr 15, 2026" },
  { id: "c2", name: "Health Fair 2026", client: "Cape Fear Valley Health", status: "active", type: "banner", budget: "$12,000", spent: "$7,800", impressions: "89.1K", clicks: "2,673", ctr: "3.0%", startDate: "Jan 1, 2026", endDate: "Mar 31, 2026" },
  { id: "c3", name: "Gym Membership Push", client: "CrossFit Fayetteville", status: "pending", type: "audio", budget: "$3,500", spent: "$0", impressions: "0", clicks: "0", ctr: "0%", startDate: "Mar 15, 2026", endDate: "May 15, 2026" },
  { id: "c4", name: "Weekend Warriors", client: "Bragg Blvd. Motors", status: "active", type: "pre-roll", budget: "$6,000", spent: "$3,100", impressions: "32.4K", clicks: "810", ctr: "2.5%", startDate: "Feb 1, 2026", endDate: "Apr 1, 2026" },
  { id: "c5", name: "Winter Clearance", client: "Downtown Boutique", status: "completed", type: "banner", budget: "$2,800", spent: "$2,800", impressions: "67.3K", clicks: "1,346", ctr: "2.0%", startDate: "Dec 1, 2025", endDate: "Jan 31, 2026" },
  { id: "c6", name: "Tax Season Special", client: "Liberty Tax Service", status: "active", type: "sponsored", budget: "$4,200", spent: "$1,900", impressions: "28.7K", clicks: "861", ctr: "3.0%", startDate: "Feb 1, 2026", endDate: "Apr 15, 2026" },
  { id: "c7", name: "Spring Sale Banner", client: "Jordan Williams", status: "active", type: "banner", budget: "$3,000", spent: "$1,800", impressions: "52.3K", clicks: "1,255", ctr: "2.4%", startDate: "Mar 1, 2026", endDate: "Mar 31, 2026" },
  { id: "c8", name: "March Madness Promo", client: "Jordan Williams", status: "active", type: "audio", budget: "$5,000", spent: "$2,400", impressions: "50.1K", clicks: "1,503", ctr: "3.0%", startDate: "Mar 1, 2026", endDate: "Apr 1, 2026" },
  { id: "c9", name: "Weekend Events", client: "Jordan Williams", status: "active", type: "pre-roll", budget: "$2,000", spent: "$1,000", impressions: "22.6K", clicks: "542", ctr: "2.4%", startDate: "Feb 15, 2026", endDate: "Mar 30, 2026" },
  { id: "c10", name: "Holiday Special", client: "Jordan Williams", status: "completed", type: "sponsored", budget: "$4,500", spent: "$4,500", impressions: "98.2K", clicks: "2,946", ctr: "3.0%", startDate: "Nov 15, 2025", endDate: "Jan 5, 2026" },
  { id: "c11", name: "Back to School", client: "ABC Supplies", status: "completed", type: "banner", budget: "$5,000", spent: "$5,000", impressions: "112K", clicks: "3,360", ctr: "3.0%", startDate: "Jul 15, 2025", endDate: "Sep 15, 2025" },
  { id: "c12", name: "Summer Festival", client: "Festival Park Events", status: "paused", type: "audio", budget: "$7,500", spent: "$2,250", impressions: "35.6K", clicks: "712", ctr: "2.0%", startDate: "May 1, 2026", endDate: "Jul 31, 2026" },
];

// ---------------------------------------------------------------------------
// Status Message
// ---------------------------------------------------------------------------

function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }, []);
  return { message, showMessage };
}

function StatusToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border border-border bg-popover px-4 py-3 text-sm text-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-[#74ddc7]" />
          {message}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { message, showMessage } = useStatusMessage();

  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-[#74ddc7]" />
      </div>
    );
  }

  const config = ROLE_CONFIGS[role];

  // For advertiser role, filter to only their campaigns
  const roleFilteredCampaigns =
    role === "advertiser"
      ? MOCK_CAMPAIGNS.filter((c) => c.client === "Jordan Williams")
      : MOCK_CAMPAIGNS;

  const filteredCampaigns = roleFilteredCampaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(search.toLowerCase()) ||
      campaign.client.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || campaign.status === filterStatus;
    const matchesType = filterType === "all" || campaign.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      pending: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
      completed: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
      paused: "border-border bg-foreground/5 text-muted-foreground",
    };
    return colors[status] || colors.paused;
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      audio: "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]",
      banner: "border-[#7401df]/30 bg-[#7401df]/10 text-[#7401df]",
      sponsored: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
      "pre-roll": "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
    };
    return colors[type] || "";
  };

  const activeCampaigns = roleFilteredCampaigns.filter((c) => c.status === "active").length;
  const totalBudget = roleFilteredCampaigns.reduce((sum, c) => {
    const val = parseFloat(c.budget.replace(/[$,]/g, ""));
    return sum + val;
  }, 0);
  const totalSpent = roleFilteredCampaigns.reduce((sum, c) => {
    const val = parseFloat(c.spent.replace(/[$,]/g, ""));
    return sum + val;
  }, 0);

  const pageTitle = role === "advertiser" ? "My Campaigns" : "Campaign Management";
  const pageDesc = role === "advertiser"
    ? "Manage your advertising campaigns and track performance"
    : "Manage advertising campaigns, budgets, and performance";

  return (
    <div className="space-y-6">
      <StatusToast message={message} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/overview">
                <ArrowLeft className="mr-1 size-4" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">{pageDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground"
            onClick={() => showMessage("Exporting campaign data...")}
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button
            style={{ backgroundColor: config.accentColor }}
            className="text-white"
            onClick={() => showMessage("Opening new campaign wizard...")}
          >
            <Plus className="mr-2 size-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold text-foreground">{activeCampaigns}</p>
              </div>
              <div className="rounded-lg bg-[#10b981]/10 p-2">
                <Target className="size-5 text-[#10b981]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-foreground">${(totalBudget / 1000).toFixed(1)}K</p>
              </div>
              <div className="rounded-lg bg-[#f97316]/10 p-2">
                <DollarSign className="size-5 text-[#f97316]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-foreground">${(totalSpent / 1000).toFixed(1)}K</p>
              </div>
              <div className="rounded-lg bg-[#74ddc7]/10 p-2">
                <TrendingUp className="size-5 text-[#74ddc7]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg CTR</p>
                <p className="text-2xl font-bold text-foreground">2.6%</p>
              </div>
              <div className="rounded-lg bg-[#3b82f6]/10 p-2">
                <MousePointerClick className="size-5 text-[#3b82f6]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-foreground/5 pl-10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Types</option>
                <option value="audio">Audio</option>
                <option value="banner">Banner</option>
                <option value="sponsored">Sponsored</option>
                <option value="pre-roll">Pre-Roll</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Campaigns</CardTitle>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {filteredCampaigns.length} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Campaign</TableHead>
                {role !== "advertiser" && (
                  <TableHead className="text-muted-foreground">Client</TableHead>
                )}
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Budget</TableHead>
                <TableHead className="text-muted-foreground">Spent</TableHead>
                <TableHead className="text-muted-foreground">Impressions</TableHead>
                <TableHead className="text-muted-foreground">CTR</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer border-border transition-colors hover:bg-foreground/5"
                  onClick={() => showMessage(`Viewing campaign: ${campaign.name}`)}
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.startDate} - {campaign.endDate}
                      </p>
                    </div>
                  </TableCell>
                  {role !== "advertiser" && (
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.client}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className={typeBadge(campaign.type)}>
                      {campaign.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadge(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{campaign.budget}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.spent}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.impressions}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.ctr}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        showMessage(`Actions for ${campaign.name}`);
                      }}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCampaigns.length === 0 && (
            <div className="py-12 text-center">
              <Target className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No campaigns found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
