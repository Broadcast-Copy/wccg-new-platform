"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Receipt,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
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
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  status: string;
  createdAt?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  budgetTotal: number;
  budgetDaily: number;
  startDate: string;
  endDate: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
}

/* ---------- Constants ---------- */

const INVOICE_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  OVERDUE: "bg-red-500/10 text-red-400 border-red-500/20",
  DRAFT: "bg-white/[0.06] text-white/40 border-white/[0.08]",
  CANCELLED: "bg-white/[0.06] text-white/30 border-white/[0.06]",
};

const INVOICE_STATUS_ICONS: Record<string, React.ElementType> = {
  PAID: CheckCircle2,
  PENDING: Clock,
  OVERDUE: AlertCircle,
  DRAFT: FileText,
  CANCELLED: FileText,
};

/* ---------- Helpers ---------- */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- Monthly Spend Chart Placeholder ---------- */

function SpendChart({ campaigns }: { campaigns: Campaign[] }) {
  // Group spend by month using campaign budget and dates
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonth = new Date().getMonth();

  // Create simple monthly data based on active campaigns
  const monthlyData = months.map((month, idx) => {
    const relevantCampaigns = campaigns.filter((c) => {
      const start = new Date(c.startDate).getMonth();
      const end = new Date(c.endDate).getMonth();
      return (
        idx >= start &&
        idx <= end &&
        (c.status === "ACTIVE" || c.status === "COMPLETED")
      );
    });
    const spend = relevantCampaigns.reduce(
      (sum, c) => sum + (c.budgetDaily || 0) * 30,
      0
    );
    return { month, spend, isCurrent: idx === currentMonth };
  });

  const maxSpend = Math.max(...monthlyData.map((d) => d.spend), 1);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-white/40" />
          <h2 className="font-semibold text-white">Monthly Spend</h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          Estimated monthly spend based on campaign budgets
        </p>
      </div>
      <div className="px-5 py-6">
        <div className="flex items-end gap-1.5 h-32">
          {monthlyData.map((d) => (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div className="w-full flex items-end justify-center h-24">
                <div
                  className={`w-full max-w-6 rounded-t transition-all ${
                    d.isCurrent
                      ? "bg-red-500"
                      : d.spend > 0
                        ? "bg-white/[0.12]"
                        : "bg-white/[0.04]"
                  }`}
                  style={{
                    height: `${Math.max((d.spend / maxSpend) * 100, 4)}%`,
                  }}
                />
              </div>
              <span
                className={`text-[9px] ${d.isCurrent ? "text-white font-medium" : "text-white/30"}`}
              >
                {d.month}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function BillingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [account, setAccount] = useState<AdvertiserAccount | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    apiClient<AdvertiserAccount>("/advertising/accounts/my")
      .then(async (acct) => {
        setAccount(acct);

        // Load campaigns for spend chart
        try {
          const campaignData = await apiClient<Campaign[]>(
            `/advertising/campaigns?advertiserId=${acct.id}`
          );
          setCampaigns(campaignData);
        } catch {
          // Non-critical, continue
        }

        // Invoices are loaded via account — mock since we don't have a dedicated endpoint
        // The API will return invoices if the endpoint exists; otherwise we show empty state
        try {
          const invoiceData = await apiClient<Invoice[]>(
            `/advertising/accounts/my/invoices`
          );
          setInvoices(invoiceData);
        } catch {
          // No invoice endpoint yet, show empty state
          setInvoices([]);
        }

        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load billing data"
        );
      })
      .finally(() => setLoading(false));
  }, [user]);

  const isLoading = authLoading || loading;

  // Calculate billing stats
  const totalBudget = campaigns.reduce(
    (sum, c) => sum + (c.budgetTotal || 0),
    0
  );
  const activeBudget = campaigns
    .filter((c) => c.status === "ACTIVE")
    .reduce((sum, c) => sum + (c.budgetTotal || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const pendingInvoices = invoices.filter(
    (i) => i.status === "PENDING" || i.status === "OVERDUE"
  );
  const totalPending = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/advertise/portal"
                  className="text-white/40 hover:text-white text-sm transition-colors"
                >
                  Portal
                </Link>
                <span className="text-white/20">/</span>
                <span className="text-white text-sm font-medium">Billing</span>
              </div>
              <h1 className="text-3xl font-bold text-white">
                Billing & Invoices
              </h1>
              <p className="text-white/50 mt-1">
                Manage your billing information and view invoices
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          <span className="ml-3 text-white/40 text-sm">
            Loading billing...
          </span>
        </div>
      )}

      {/* Auth required */}
      {!isLoading && !user && (
        <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 text-center space-y-4">
          <p className="text-white/50 text-sm">
            Please{" "}
            <Link href="/login" className="text-[#74ddc7] hover:underline">
              sign in
            </Link>{" "}
            to view your billing information.
          </p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Billing Content */}
      {!isLoading && user && account && !error && (
        <>
          {/* Billing Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Budget",
                value: formatCurrency(totalBudget),
                icon: DollarSign,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Active Budget",
                value: formatCurrency(activeBudget),
                icon: TrendingUp,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                label: "Total Paid",
                value: formatCurrency(totalPaid),
                icon: CheckCircle2,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Pending",
                value: formatCurrency(totalPending),
                icon: Clock,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/[0.06] bg-[#141420] p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Account Info + Payment Method */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Account Info Card */}
            <div className="rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-semibold text-white">
                  Account Information
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] shrink-0 mt-0.5">
                    <Building2 className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-0.5">
                      Company Name
                    </p>
                    <p className="text-sm text-white font-medium">
                      {account.companyName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] shrink-0 mt-0.5">
                    <Mail className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-0.5">
                      Billing Email
                    </p>
                    <p className="text-sm text-white font-medium">
                      {account.billingEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-0.5">
                      Billing Address
                    </p>
                    <p className="text-sm text-white font-medium">
                      {account.billingAddress ? (
                        <>
                          {account.billingAddress}
                          <br />
                          {account.billingCity}, {account.billingState}{" "}
                          {account.billingZip}
                        </>
                      ) : (
                        <span className="text-white/30">
                          No address on file
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {account.createdAt && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/30">
                      Account created {formatDate(account.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-semibold text-white">Payment Method</h2>
              </div>
              <div className="p-5 flex flex-col items-center justify-center min-h-[200px] text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                  <CreditCard className="h-7 w-7 text-white/20" />
                </div>
                <div>
                  <p className="text-sm text-white/60 font-medium">
                    Payment methods managed by WCCG
                  </p>
                  <p className="text-xs text-white/30 mt-1 max-w-xs">
                    Contact our advertising team to update your payment method or
                    set up auto-pay for your account.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/[0.08] text-white/60 hover:bg-white/[0.04] mt-2"
                >
                  <Link href="/contact">Contact Billing Support</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Monthly Spend Chart */}
          <SpendChart campaigns={campaigns} />

          {/* Invoice History */}
          <div className="rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-white/40" />
                <h2 className="font-semibold text-white">Invoice History</h2>
              </div>
              {invoices.length > 0 && (
                <span className="text-xs text-white/40">
                  {invoices.length} invoice
                  {invoices.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {invoices.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Receipt className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white mb-1">
                  No invoices yet
                </h3>
                <p className="text-sm text-white/40 max-w-sm mx-auto">
                  Invoices will appear here once your campaigns start running.
                  WCCG generates invoices monthly based on your campaign
                  activity.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Invoice</TableHead>
                    <TableHead className="text-white/40">Amount</TableHead>
                    <TableHead className="text-white/40">Status</TableHead>
                    <TableHead className="text-white/40 hidden sm:table-cell">
                      Issued
                    </TableHead>
                    <TableHead className="text-white/40 hidden sm:table-cell">
                      Due
                    </TableHead>
                    <TableHead className="text-white/40 hidden md:table-cell">
                      Paid
                    </TableHead>
                    <TableHead className="text-white/40 w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const StatusIcon =
                      INVOICE_STATUS_ICONS[invoice.status] || FileText;
                    return (
                      <TableRow
                        key={invoice.id}
                        className="border-white/[0.06] hover:bg-white/[0.02]"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-3.5 w-3.5 text-white/30" />
                            <span className="text-white font-medium text-sm">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {formatCurrency(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] border ${INVOICE_STATUS_STYLES[invoice.status] || "bg-white/[0.06] text-white/40 border-white/[0.08]"}`}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/40 hidden sm:table-cell">
                          {formatDate(invoice.issuedDate)}
                        </TableCell>
                        <TableCell className="text-white/40 hidden sm:table-cell">
                          {formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell className="text-white/40 hidden md:table-cell">
                          {invoice.paidDate
                            ? formatDate(invoice.paidDate)
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-white/30 hover:text-white"
                            title="Download invoice"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-white/50 text-sm">
          Billing questions?{" "}
          <Link href="/contact" className="text-[#74ddc7] hover:underline">
            Contact our advertising team
          </Link>{" "}
          or email billing@wccgfm.com
        </p>
      </div>

      {/* Back Link */}
      <div className="flex justify-center">
        <Button
          asChild
          variant="ghost"
          className="text-white/40 hover:text-white"
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
