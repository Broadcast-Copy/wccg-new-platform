"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText,
  Loader2,
  ArrowLeft,
  Printer,
  Download,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget_total: number;
  budget_daily: number;
  start_date: string;
  end_date: string;
  channel_radio_pct: number;
  channel_streaming_pct: number;
  channel_social_pct: number;
  channel_display_pct: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  campaign: Campaign;
  lineItems: { description: string; amount: number }[];
  subtotal: number;
  platformFee: number;
  total: number;
  isPaid: boolean;
}

/* ---------- Mock data ---------- */

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    name: "Summer Beats Campaign",
    status: "ACTIVE",
    budget_total: 5000,
    budget_daily: 150,
    start_date: "2026-06-01",
    end_date: "2026-08-31",
    channel_radio_pct: 40,
    channel_streaming_pct: 30,
    channel_social_pct: 20,
    channel_display_pct: 10,
  },
  {
    id: "camp-2",
    name: "Local Business Spotlight",
    status: "COMPLETED",
    budget_total: 2500,
    budget_daily: 80,
    start_date: "2026-01-15",
    end_date: "2026-03-15",
    channel_radio_pct: 60,
    channel_streaming_pct: 20,
    channel_social_pct: 10,
    channel_display_pct: 10,
  },
  {
    id: "camp-3",
    name: "Holiday Promo Blitz",
    status: "PAUSED",
    budget_total: 8000,
    budget_daily: 250,
    start_date: "2026-11-15",
    end_date: "2026-12-31",
    channel_radio_pct: 35,
    channel_streaming_pct: 35,
    channel_social_pct: 15,
    channel_display_pct: 15,
  },
];

/* ---------- Helpers ---------- */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function generateInvoice(campaign: Campaign, index: number): InvoiceData {
  const spend = campaign.budget_total;
  const radioSpend = spend * (campaign.channel_radio_pct / 100);
  const streamingSpend = spend * (campaign.channel_streaming_pct / 100);
  const socialSpend = spend * (campaign.channel_social_pct / 100);
  const displaySpend = spend * (campaign.channel_display_pct / 100);
  const subtotal = spend;
  const platformFee = subtotal * 0.25;
  const total = subtotal + platformFee;

  const issueDate = new Date();
  issueDate.setDate(issueDate.getDate() - index * 30);
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    invoiceNumber: `WCCG-INV-${String(2026000 + index + 1).padStart(7, "0")}`,
    date: issueDate.toISOString(),
    dueDate: dueDate.toISOString(),
    campaign,
    lineItems: [
      { description: "Radio Broadcast Advertising", amount: radioSpend },
      { description: "Digital Streaming Ads", amount: streamingSpend },
      { description: "Social Media Promotion", amount: socialSpend },
      { description: "Display / Banner Ads", amount: displaySpend },
    ].filter((item) => item.amount > 0),
    subtotal,
    platformFee,
    total,
    isPaid: campaign.status === "COMPLETED",
  };
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-foreground/[0.06] text-muted-foreground border-border",
  PAUSED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DRAFT: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

/* ---------- Invoice View (Printable) ---------- */

function InvoiceView({
  invoice,
  onClose,
  onTogglePaid,
}: {
  invoice: InvoiceData;
  onClose: () => void;
  onTogglePaid: () => void;
}) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    toast.success(
      "Use your browser's print dialog to save as PDF (Ctrl+P / Cmd+P)"
    );
    window.print();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar (hidden during print) */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to List
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePaid}
            className={`border-border text-xs ${
              invoice.isPaid
                ? "text-emerald-400 hover:bg-emerald-500/10"
                : "text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            {invoice.isPaid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Paid
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 mr-1" />
                Mark as Paid
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-border text-foreground/60 hover:bg-foreground/[0.04]"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            className="bg-[#f59e0b] text-black font-bold hover:bg-[#d97706]"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div
        ref={invoiceRef}
        className="rounded-xl border border-border bg-white text-black p-8 sm:p-12 max-w-3xl mx-auto print:border-0 print:shadow-none print:rounded-none print:max-w-none print:p-0"
      >
        {/* Letterhead */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WCCG 104.5 FM</h1>
            <p className="text-sm text-gray-500 mt-1">
              Fayetteville&apos;s #1 for Hip-Hop and R&B
            </p>
            <p className="text-xs text-gray-400 mt-2">
              1234 Radio Way, Fayetteville, NC 28301
              <br />
              billing@wccgfm.com | (910) 555-1045
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wider">
              Invoice
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2">
              {invoice.isPaid ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  PAID
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  <Clock className="h-3 w-3" />
                  UNPAID
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">
              Bill To
            </p>
            <p className="text-sm text-gray-800 font-medium">Advertiser</p>
            <p className="text-xs text-gray-500">
              Campaign: {invoice.campaign.name}
            </p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-end gap-4">
                <span className="text-xs text-gray-400">Invoice Date:</span>
                <span className="text-xs text-gray-700 font-medium">
                  {formatDate(invoice.date)}
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-xs text-gray-400">Due Date:</span>
                <span className="text-xs text-gray-700 font-medium">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-xs text-gray-400">Campaign Period:</span>
                <span className="text-xs text-gray-700 font-medium">
                  {formatDate(invoice.campaign.start_date)} -{" "}
                  {formatDate(invoice.campaign.end_date)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left text-xs text-gray-400 uppercase font-semibold tracking-wider pb-2">
                Description
              </th>
              <th className="text-right text-xs text-gray-400 uppercase font-semibold tracking-wider pb-2">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 text-sm text-gray-700">
                  {item.description}
                </td>
                <td className="py-3 text-sm text-gray-700 text-right font-medium">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700 font-medium">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee (25%)</span>
              <span className="text-gray-700 font-medium">
                {formatCurrency(invoice.platformFee)}
              </span>
            </div>
            <div className="border-t-2 border-gray-200 pt-2 flex justify-between">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400">
            Payment terms: Net 30 | Make checks payable to WCCG 104.5 FM |
            For billing inquiries: billing@wccgfm.com
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function InvoicesPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(
    null
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const { data } = await supabase
          .from("dsp_campaigns")
          .select(
            "id, name, status, budget_total, budget_daily, start_date, end_date"
          )
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          const campaignList = data.map((c: Record<string, unknown>) => ({
            ...c,
            channel_radio_pct: 40,
            channel_streaming_pct: 30,
            channel_social_pct: 20,
            channel_display_pct: 10,
          })) as Campaign[];
          setCampaigns(campaignList);
          setInvoices(campaignList.map((c, i) => generateInvoice(c, i)));
        } else {
          setCampaigns(MOCK_CAMPAIGNS);
          setInvoices(MOCK_CAMPAIGNS.map((c, i) => generateInvoice(c, i)));
        }
      } catch {
        setCampaigns(MOCK_CAMPAIGNS);
        setInvoices(MOCK_CAMPAIGNS.map((c, i) => generateInvoice(c, i)));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, supabase]);

  function togglePaid(invoiceNumber: string) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.invoiceNumber === invoiceNumber
          ? { ...inv, isPaid: !inv.isPaid }
          : inv
      )
    );
    if (selectedInvoice?.invoiceNumber === invoiceNumber) {
      setSelectedInvoice((prev) =>
        prev ? { ...prev, isPaid: !prev.isPaid } : prev
      );
    }
    toast.success("Invoice status updated");
  }

  const isLoading = authLoading || loading;

  // Stats
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const paidTotal = invoices
    .filter((i) => i.isPaid)
    .reduce((s, i) => s + i.total, 0);
  const unpaidTotal = invoices
    .filter((i) => !i.isPaid)
    .reduce((s, i) => s + i.total, 0);

  // If viewing an invoice
  if (selectedInvoice) {
    return (
      <div className="space-y-8">
        <InvoiceView
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onTogglePaid={() => togglePaid(selectedInvoice.invoiceNumber)}
        />
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
              <FileText className="h-7 w-7 text-white" />
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
                  Invoices
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
              <p className="text-muted-foreground mt-1">
                View and download printable invoices for your campaigns
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">
            Loading invoices...
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
            to view invoices.
          </p>
        </div>
      )}

      {!isLoading && user && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Total Invoiced",
                value: formatCurrency(totalInvoiced),
                icon: DollarSign,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "Paid",
                value: formatCurrency(paidTotal),
                icon: CheckCircle2,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Outstanding",
                value: formatCurrency(unpaidTotal),
                icon: AlertCircle,
                color: "text-red-400",
                bg: "bg-red-500/10",
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

          {/* Invoice List */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Campaign Invoices</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click &quot;Generate Invoice&quot; to view a printable PDF-style invoice
              </p>
            </div>

            {invoices.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FileText className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  No campaigns with invoices
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Invoices will be generated once your campaigns have spend
                  data.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <div
                    key={inv.invoiceNumber}
                    className="px-5 py-4 flex items-center justify-between hover:bg-foreground/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.04] shrink-0">
                        <FileText className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {inv.campaign.name}
                          </p>
                          <Badge
                            className={`text-[10px] border ${
                              STATUS_STYLES[inv.campaign.status] ||
                              "bg-foreground/[0.06] text-muted-foreground border-border"
                            }`}
                          >
                            {inv.campaign.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(inv.total)}
                          </span>
                          {inv.isPaid ? (
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePaid(inv.invoiceNumber)}
                        className={`border-border text-xs ${
                          inv.isPaid
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {inv.isPaid ? "Unpay" : "Mark Paid"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedInvoice(inv)}
                        className="bg-[#f59e0b] text-black font-bold hover:bg-[#d97706]"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Generate Invoice
                      </Button>
                    </div>
                  </div>
                ))}
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
