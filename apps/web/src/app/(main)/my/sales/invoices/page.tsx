"use client";

/**
 * Invoices (SP4) — Supabase-direct against sales_invoices / sales_invoice_items.
 * Generate an invoice from a won deal (snapshots its line items, advances the
 * deal to "invoiced"), mark paid (flips invoice + deal to "paid"), and open a
 * printable invoice. No API server; staff-RLS gated.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Receipt,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowLeft,
  CreditCard,
  Plus,
  Printer,
  X,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvStatus = "unpaid" | "paid" | "void";

interface InvItem {
  id: string;
  description: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: InvStatus;
  subtotal: number | null;
  total: number | null;
  issue_date: string;
  due_date: string | null;
  deal_id: string | null;
  client: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
  items: InvItem[];
}

interface WonDealItem {
  description: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface WonDeal {
  id: string;
  title: string;
  subtotal: number | null;
  client_id: string | null;
  client: { id: string; name: string } | null;
  items: WonDealItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES: Record<InvStatus, string> = {
  unpaid: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  void: "bg-foreground/[0.06] text-muted-foreground border-border",
};

type Filter = "all" | InvStatus;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [wonDeals, setWonDeals] = useState<WonDeal[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchAll() {
    const supabase = createClient();
    const [invRes, dealRes] = await Promise.all([
      supabase
        .from("sales_invoices")
        .select(
          "id, invoice_number, status, subtotal, total, issue_date, due_date, deal_id, client:crm_clients(id, name), deal:sales_deals(id, title), items:sales_invoice_items(id, description, qty, unit_price, line_total)",
        )
        .order("issue_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("sales_deals")
        .select("id, title, subtotal, client_id, client:crm_clients(id, name), items:sales_deal_items(description, qty, unit_price, line_total)")
        .eq("status", "won")
        .order("updated_at", { ascending: false }),
    ]);
    return {
      invoices: (invRes.data ?? []) as unknown as Invoice[],
      wonDeals: (dealRes.data ?? []) as unknown as WonDeal[],
    };
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const data = await fetchAll();
      if (!active) return;
      setUserId(auth.user?.id ?? null);
      setInvoices(data.invoices);
      setWonDeals(data.wonDeals);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function reload() {
    const data = await fetchAll();
    setInvoices(data.invoices);
    setWonDeals(data.wonDeals);
  }

  async function generateFromDeal(deal: WonDeal) {
    setBusy(deal.id);
    setErr(null);
    const supabase = createClient();
    const subtotal = round2((deal.items ?? []).reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0)) || (deal.subtotal ?? 0);
    const issue = new Date().toISOString().slice(0, 10);
    const { data: inv, error } = await supabase
      .from("sales_invoices")
      .insert({
        deal_id: deal.id,
        client_id: deal.client_id,
        associate_id: userId,
        title: deal.title,
        issue_date: issue,
        due_date: addDays(issue, 30),
        status: "unpaid",
        subtotal,
        total: subtotal,
      })
      .select("id")
      .single();
    if (error || !inv) {
      setErr(error?.message ?? "Could not create the invoice.");
      setBusy(null);
      return;
    }
    if (deal.items?.length) {
      const rows = deal.items.map((it) => ({
        invoice_id: inv.id,
        description: it.description,
        qty: it.qty,
        unit_price: it.unit_price,
        line_total: round2((it.qty || 0) * (it.unit_price || 0)),
      }));
      const { error: ie } = await supabase.from("sales_invoice_items").insert(rows);
      if (ie) {
        setErr(ie.message);
        setBusy(null);
        return;
      }
    }
    await supabase.from("sales_deals").update({ status: "invoiced" }).eq("id", deal.id);
    setBusy(null);
    setPicking(false);
    await reload();
  }

  async function markPaid(inv: Invoice) {
    setBusy(inv.id);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from("sales_invoices").update({ status: "paid" }).eq("id", inv.id);
    if (error) {
      setErr(error.message);
      setBusy(null);
      return;
    }
    if (inv.deal_id) {
      await supabase.from("sales_deals").update({ status: "paid" }).eq("id", inv.deal_id);
    }
    setBusy(null);
    await reload();
  }

  const loading = invoices === null;
  const list = invoices ?? [];

  const totalRevenue = list.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total ?? 0), 0);
  const outstanding = list.filter((i) => i.status === "unpaid").reduce((s, i) => s + (i.total ?? 0), 0);
  const unpaidCount = list.filter((i) => i.status === "unpaid").length;
  const paidCount = list.filter((i) => i.status === "paid").length;

  const stats = [
    { label: "Collected", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Outstanding", value: formatCurrency(outstanding), icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Unpaid", value: unpaidCount.toString(), icon: FileText, color: "text-muted-foreground", bg: "bg-foreground/[0.06]" },
    { label: "Paid", value: paidCount.toString(), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  const filtered = filter === "all" ? list : list.filter((i) => i.status === filter);
  const FILTERS: Filter[] = ["all", "unpaid", "paid", "void"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/my/sales"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-yellow-400" />
            Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate invoices from won deals, track payment, and print.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setErr(null); setPicking(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Generate Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? <span className="text-muted-foreground/40">—</span> : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
            }`}
          >
            {f}
            {f !== "all" && <span className="ml-1 opacity-60">({list.filter((i) => i.status === f).length})</span>}
          </button>
        ))}
      </div>

      {err && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-3">Invoice #</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Client</th>
              <th className="text-left font-medium px-4 py-3 hidden md:table-cell">For</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-right font-medium px-4 py-3">Total</th>
              <th className="text-right font-medium px-4 py-3 hidden lg:table-cell">Issued</th>
              <th className="text-right font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading invoices…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-foreground/20" />
                  <p className="text-sm font-medium">No invoices {filter !== "all" ? `(${filter})` : "yet"}</p>
                  <p className="text-xs mt-1">Generate one from a won deal to get started.</p>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/my/sales/quote?invoice=${inv.id}`} className="font-medium text-foreground hover:text-[#74ddc7]">
                      {inv.invoice_number}
                    </Link>
                    <div className="text-[11px] text-muted-foreground sm:hidden">{inv.client?.name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{inv.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{inv.deal?.title ?? inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(inv.total ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden lg:table-cell">{formatDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/my/sales/quote?invoice=${inv.id}`}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                        title="View / print"
                      >
                        <Printer className="h-3 w-3" />
                        View
                      </Link>
                      {inv.status === "unpaid" && (
                        <button
                          type="button"
                          onClick={() => markPaid(inv)}
                          disabled={busy === inv.id}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          title="Mark as paid"
                        >
                          {busy === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                          Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate-from-deal picker */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-foreground">Generate invoice from a won deal</h2>
              <button type="button" onClick={() => setPicking(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {wonDeals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No deals in the <span className="font-semibold">won</span> stage. Advance a deal to “won” in the{" "}
                  <Link href="/my/sales/deals" className="text-[#74ddc7] hover:underline">pipeline</Link> first.
                </p>
              ) : (
                wonDeals.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => generateFromDeal(d)}
                    disabled={busy === d.id}
                    className="w-full text-left rounded-lg border border-border bg-background p-3 hover:border-[#74ddc7]/40 transition-colors disabled:opacity-50 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.client?.name ?? "No client"} · {(d.items ?? []).length} line item(s)</p>
                    </div>
                    <span className="text-sm font-bold text-[#74ddc7]">{formatCurrency(d.subtotal ?? 0)}</span>
                    {busy === d.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
