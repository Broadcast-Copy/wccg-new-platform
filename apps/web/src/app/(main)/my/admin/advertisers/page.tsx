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
import {
  Shield,
  Loader2,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Globe,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Advertiser {
  id: string;
  company_name: string;
  industry: string | null;
  website: string | null;
  contact_email: string | null;
  status: string;
  total_spend: number;
  created_at: string;
  user_id: string | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string; icon: typeof Clock }
> = {
  pending: {
    bg: "bg-[#f59e0b]/10",
    text: "text-[#f59e0b]",
    border: "border-[#f59e0b]/30",
    icon: Clock,
  },
  approved: {
    bg: "bg-[#22c55e]/10",
    text: "text-[#22c55e]",
    border: "border-[#22c55e]/30",
    icon: CheckCircle2,
  },
  rejected: {
    bg: "bg-[#dc2626]/10",
    text: "text-[#dc2626]",
    border: "border-[#dc2626]/30",
    icon: XCircle,
  },
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdvertiserManagementPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch advertisers
  // -----------------------------------------------------------------------

  const fetchAdvertisers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dsp_advertisers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch advertisers:", error);
      toast.error("Failed to load advertisers");
      setAdvertisers([]);
    } else {
      setAdvertisers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchAdvertisers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -----------------------------------------------------------------------
  // Filtered list
  // -----------------------------------------------------------------------

  const filtered = useMemo(() => {
    let result = advertisers;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        (a.company_name ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [advertisers, statusFilter, search]);

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = advertisers.length;
    const pending = advertisers.filter((a) => a.status === "pending").length;
    const totalSpend = advertisers.reduce(
      (sum, a) => sum + (a.total_spend || 0),
      0
    );
    return { total, pending, totalSpend };
  }, [advertisers]);

  // -----------------------------------------------------------------------
  // Update status
  // -----------------------------------------------------------------------

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    const { error } = await supabase
      .from("dsp_advertisers")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(`Failed to ${newStatus} advertiser`);
    } else {
      setAdvertisers((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      toast.success(
        `Advertiser ${newStatus === "approved" ? "approved" : "rejected"}`
      );
    }
    setUpdating(null);
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
            <Building2 className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Advertiser Management
            </h1>
            <p className="text-sm text-muted-foreground">
              View and approve advertiser accounts
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAdvertisers}
          disabled={loading}
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
        >
          <RefreshCw
            className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Advertisers
          </p>
          <p className="mt-1 text-2xl font-bold text-[#dc2626]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Pending Approval
          </p>
          <p className="mt-1 text-2xl font-bold text-[#f59e0b]">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Spend
          </p>
          <p className="mt-1 text-2xl font-bold text-[#22c55e]">
            ${stats.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advertiser Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all"
              ? "No advertisers match your filters."
              : "No advertisers found."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((advertiser) => {
            const style = STATUS_STYLES[advertiser.status] ?? STATUS_STYLES.pending;
            const StatusIcon = style.icon;

            return (
              <div
                key={advertiser.id}
                className="rounded-xl border border-border bg-card p-5 space-y-4 hover:border-[#dc2626]/30 transition-colors"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {advertiser.company_name}
                    </h3>
                    {advertiser.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {advertiser.industry}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={`text-[10px] shrink-0 ml-2 capitalize ${style.bg} ${style.text} ${style.border}`}
                    variant="outline"
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {advertiser.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  {advertiser.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={
                          advertiser.website.startsWith("http")
                            ? advertiser.website
                            : `https://${advertiser.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#dc2626] hover:underline truncate flex items-center gap-1"
                      >
                        {advertiser.website}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                  {advertiser.contact_email && (
                    <p className="text-[10px] text-muted-foreground">
                      Contact: {advertiser.contact_email}
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-[#22c55e]" />
                    <span className="text-xs font-medium text-foreground">
                      {(advertiser.total_spend || 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}{" "}
                      total spend
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60">
                    Joined{" "}
                    {new Date(advertiser.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <div className="flex gap-2">
                    {advertiser.status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus(advertiser.id, "approved")
                        }
                        disabled={updating === advertiser.id}
                        className="h-7 text-xs bg-[#22c55e] hover:bg-[#22c55e]/90 text-white"
                      >
                        {updating === advertiser.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                    )}
                    {advertiser.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus(advertiser.id, "rejected")
                        }
                        disabled={updating === advertiser.id}
                        className="h-7 text-xs border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
                      >
                        {updating === advertiser.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Showing {filtered.length} of {advertisers.length} advertisers
        </p>
      </div>
    </div>
  );
}
