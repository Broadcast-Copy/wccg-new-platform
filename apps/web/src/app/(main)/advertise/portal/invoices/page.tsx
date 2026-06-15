"use client";

/**
 * Advertiser portal — invoices (SP4). Shows the REAL invoices the station has
 * issued to the logged-in client, read Supabase-direct from sales_invoices.
 * Access is enforced by the portal-client RLS policy (crm_clients.portal_user_id
 * = auth.uid()), so a plain select returns only this client's invoices.
 * Read-only + printable; staff manage status in /my/sales/invoices.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText,
  Loader2,
  ArrowLeft,
  Printer,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ---------- Types ---------- */

type InvStatus = "unpaid" | "paid" | "void";

interface InvItem {
  id: string;
  description: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface ClientInvoice {
  id: string;
  invoice_number: string;
  status: InvStatus;
  subtotal: number | null;
  total: number | null;
  issue_date: string;
  due_date: string | null;
  title: string | null;
  deal: { title: string } | null;
  items: InvItem[];
}

/* ---------- Helpers ---------- */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<InvStatus, string> = {
  unpaid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  void: "bg-foreground/[0.06] text-muted-foreground border-border",
};

/* ---------- Printable invoice document ---------- */

function InvoiceDoc({ invoice, onClose }: { invoice: ClientInvoice; onClose: () => void }) {
  const subtotal = invoice.subtotal ?? round2(invoice.items.reduce((s, i) => s + i.line_total, 0));
  const total = invoice.total ?? subtotal;
  return (
    <div className="space-y-4">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@media print { body * { visibility: hidden !important; } #print-doc, #print-doc * { visibility: visible !important; } #print-doc { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; border: 0 !important; } .no-print { display: none !important; } }",
        }}
      />
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to list
        </Button>
        <Button onClick={() => window.print()} className="bg-[#f59e0b] text-black font-bold hover:bg-[#d97706]">
          <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
        </Button>
      </div>

      <div id="print-doc" className="mx-auto max-w-3xl rounded-xl border border-border bg-white text-zinc-900 p-8 sm:p-10 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">WCCG 104.5 FM</h1>
            <p className="text-sm text-zinc-500">Fayetteville, NC · app.wccg1045fm.com</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-widest text-[#7401df]">INVOICE</p>
            <p className="mt-1 text-sm font-semibold text-zinc-700">{invoice.invoice_number}</p>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between text-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Reference</p>
            <p className="mt-1 font-medium text-zinc-800">{invoice.title || invoice.deal?.title || invoice.invoice_number}</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-3"><span className="text-zinc-400">Issued</span><span className="font-medium text-zinc-800 w-32">{formatDate(invoice.issue_date)}</span></div>
            <div className="flex justify-end gap-3"><span className="text-zinc-400">Due</span><span className="font-medium text-zinc-800 w-32">{formatDate(invoice.due_date)}</span></div>
            <div className="flex justify-end gap-3"><span className="text-zinc-400">Status</span><span className="font-medium text-zinc-800 w-32 capitalize">{invoice.status}</span></div>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left font-semibold py-2">Description</th>
              <th className="text-right font-semibold py-2 w-16">Qty</th>
              <th className="text-right font-semibold py-2 w-28">Unit</th>
              <th className="text-right font-semibold py-2 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-center text-zinc-400">No line items.</td></tr>
            ) : (
              invoice.items.map((it) => (
                <tr key={it.id} className="border-b border-zinc-100">
                  <td className="py-2.5 text-zinc-800">{it.description || "—"}</td>
                  <td className="py-2.5 text-right text-zinc-600">{it.qty}</td>
                  <td className="py-2.5 text-right text-zinc-600">{formatCurrency(it.unit_price)}</td>
                  <td className="py-2.5 text-right font-medium text-zinc-900">{formatCurrency(round2((it.qty || 0) * (it.unit_price || 0)))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between border-t-2 border-zinc-300 pt-2 text-base font-bold text-zinc-900"><span>Total Due</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-400">
          Payment terms: Net 30. Make checks payable to WCCG 104.5 FM. Questions? Reply to your account rep.
        </p>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function PortalInvoicesPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [selected, setSelected] = useState<ClientInvoice | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("sales_invoices")
        .select(
          "id, invoice_number, status, subtotal, total, issue_date, due_date, title, deal:sales_deals(title), items:sales_invoice_items(id, description, qty, unit_price, line_total)",
        )
        .order("issue_date", { ascending: false });
      if (!active) return;
      setInvoices((data ?? []) as unknown as ClientInvoice[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, supabase]);

  const isLoading = authLoading || loading;

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const paidTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total ?? 0), 0);
  const unpaidTotal = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + (i.total ?? 0), 0);

  if (selected) {
    return (
      <div className="space-y-8">
        <InvoiceDoc invoice={selected} onClose={() => setSelected(null)} />
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
                <Link href="/advertise/portal" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Portal</Link>
                <span className="text-foreground/20">/</span>
                <span className="text-foreground text-sm font-medium">Invoices</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
              <p className="text-muted-foreground mt-1">View and print invoices issued to your account.</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">Loading invoices...</span>
        </div>
      )}

      {!isLoading && !user && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Please <Link href="/login" className="text-[#f59e0b] hover:underline">sign in</Link> to view invoices.
          </p>
        </div>
      )}

      {!isLoading && user && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total Invoiced", value: formatCurrency(totalInvoiced), icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Paid", value: formatCurrency(paidTotal), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Outstanding", value: formatCurrency(unpaidTotal), icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Your Invoices</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click an invoice to view a printable copy.</p>
            </div>

            {invoices.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FileText className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No invoices yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Invoices issued to your account will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelected(inv)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-foreground/[0.02] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.04] shrink-0">
                        <FileText className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{inv.title || inv.deal?.title || inv.invoice_number}</p>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[inv.status]}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{inv.invoice_number}</span>
                          <span className="text-xs text-muted-foreground">Issued {formatDate(inv.issue_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-foreground">{formatCurrency(inv.total ?? 0)}</span>
                      <Printer className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-center">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
          <Link href="/advertise/portal">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Portal
          </Link>
        </Button>
      </div>
    </div>
  );
}
