"use client";

/**
 * Printable quote / invoice document (SP4). Reads ?deal=<id> (a proposal/quote
 * from a sales_deal) or ?invoice=<id> (a sales_invoice). Supabase-direct; a
 * Print button calls window.print(), and the print CSS hides the app chrome so
 * only the document prints (or "Save as PDF").
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DocLine {
  id: string;
  description: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface ClientInfo {
  name: string;
  company: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

interface DocData {
  kind: "quote" | "invoice";
  number: string;
  title: string | null;
  date: string;
  dueDate: string | null;
  status: string | null;
  subtotal: number;
  total: number;
  client: ClientInfo | null;
  items: DocLine[];
  notes: string | null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function QuoteDocPage() {
  const [doc, setDoc] = useState<DocData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const invoiceId = params.get("invoice");
      const dealId = params.get("deal");
      const supabase = createClient();

      if (invoiceId) {
        const { data } = await supabase
          .from("sales_invoices")
          .select(
            "invoice_number, status, subtotal, total, issue_date, due_date, title, notes, client:crm_clients(name, company, contact_name, contact_email, contact_phone, address), items:sales_invoice_items(id, description, qty, unit_price, line_total)",
          )
          .eq("id", invoiceId)
          .maybeSingle();
        if (!active) return;
        if (!data) { setNotFound(true); return; }
        const row = data as unknown as {
          invoice_number: string; status: string; subtotal: number | null; total: number | null;
          issue_date: string; due_date: string | null; title: string | null; notes: string | null;
          client: ClientInfo | null; items: DocLine[];
        };
        const items = row.items ?? [];
        setDoc({
          kind: "invoice",
          number: row.invoice_number,
          title: row.title,
          date: row.issue_date,
          dueDate: row.due_date,
          status: row.status,
          subtotal: row.subtotal ?? round2(items.reduce((s, i) => s + i.line_total, 0)),
          total: row.total ?? round2(items.reduce((s, i) => s + i.line_total, 0)),
          client: row.client,
          items,
          notes: row.notes,
        });
        return;
      }

      if (dealId) {
        const { data } = await supabase
          .from("sales_deals")
          .select(
            "title, status, subtotal, notes, created_at, client:crm_clients(name, company, contact_name, contact_email, contact_phone, address), items:sales_deal_items(id, description, qty, unit_price, line_total)",
          )
          .eq("id", dealId)
          .maybeSingle();
        if (!active) return;
        if (!data) { setNotFound(true); return; }
        const row = data as unknown as {
          title: string; status: string; subtotal: number | null; notes: string | null; created_at: string;
          client: ClientInfo | null; items: DocLine[];
        };
        const items = row.items ?? [];
        setDoc({
          kind: "quote",
          number: row.title,
          title: row.title,
          date: row.created_at,
          dueDate: null,
          status: row.status,
          subtotal: row.subtotal ?? round2(items.reduce((s, i) => s + i.line_total, 0)),
          total: row.subtotal ?? round2(items.reduce((s, i) => s + i.line_total, 0)),
          client: row.client,
          items,
          notes: row.notes,
        });
        return;
      }

      if (active) setNotFound(true);
    })();
    return () => { active = false; };
  }, []);

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link href="/my/sales/invoices" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          Document not found. Pass <code className="text-foreground">?invoice=&lt;id&gt;</code> or <code className="text-foreground">?deal=&lt;id&gt;</code>.
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">Loading document…</div>
    );
  }

  const isInvoice = doc.kind === "invoice";
  const heading = isInvoice ? "INVOICE" : "QUOTE / PROPOSAL";

  return (
    <div className="space-y-4">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@media print { body * { visibility: hidden !important; } #print-doc, #print-doc * { visibility: visible !important; } #print-doc { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; border: 0 !important; } .no-print { display: none !important; } }",
        }}
      />

      {/* Toolbar (not printed) */}
      <div className="no-print flex items-center justify-between">
        <Link
          href={isInvoice ? "/my/sales/invoices" : "/my/sales/deals"}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to {isInvoice ? "invoices" : "pipeline"}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* The document */}
      <div id="print-doc" className="mx-auto max-w-3xl rounded-xl border border-border bg-white text-zinc-900 p-8 sm:p-10 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">WCCG 104.5 FM</h1>
            <p className="text-sm text-zinc-500">Fayetteville, NC · app.wccg1045fm.com</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-widest text-[#7401df]">{heading}</p>
            {isInvoice && <p className="mt-1 text-sm font-semibold text-zinc-700">{doc.number}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Bill To</p>
            {doc.client ? (
              <div className="mt-1 text-sm text-zinc-800">
                <p className="font-semibold">{doc.client.name}</p>
                {doc.client.company && doc.client.company !== doc.client.name && <p>{doc.client.company}</p>}
                {doc.client.contact_name && <p>{doc.client.contact_name}</p>}
                {doc.client.address && <p className="text-zinc-500">{doc.client.address}</p>}
                {doc.client.contact_email && <p className="text-zinc-500">{doc.client.contact_email}</p>}
                {doc.client.contact_phone && <p className="text-zinc-500">{doc.client.contact_phone}</p>}
              </div>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">—</p>
            )}
          </div>
          <div className="text-right space-y-1 text-sm">
            <div className="flex justify-end gap-3">
              <span className="text-zinc-400">{isInvoice ? "Issued" : "Date"}</span>
              <span className="font-medium text-zinc-800 w-32">{fmtDate(doc.date)}</span>
            </div>
            {isInvoice && (
              <div className="flex justify-end gap-3">
                <span className="text-zinc-400">Due</span>
                <span className="font-medium text-zinc-800 w-32">{fmtDate(doc.dueDate)}</span>
              </div>
            )}
            {doc.status && (
              <div className="flex justify-end gap-3">
                <span className="text-zinc-400">Status</span>
                <span className="font-medium text-zinc-800 w-32 capitalize">{doc.status}</span>
              </div>
            )}
            {doc.title && !isInvoice && (
              <div className="flex justify-end gap-3">
                <span className="text-zinc-400">Re</span>
                <span className="font-medium text-zinc-800 w-32 truncate">{doc.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
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
            {doc.items.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-center text-zinc-400">No line items.</td></tr>
            ) : (
              doc.items.map((it) => (
                <tr key={it.id} className="border-b border-zinc-100">
                  <td className="py-2.5 text-zinc-800">{it.description || "—"}</td>
                  <td className="py-2.5 text-right text-zinc-600">{it.qty}</td>
                  <td className="py-2.5 text-right text-zinc-600">{fmt(it.unit_price)}</td>
                  <td className="py-2.5 text-right font-medium text-zinc-900">{fmt(round2((it.qty || 0) * (it.unit_price || 0)))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>{fmt(doc.subtotal)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-zinc-300 pt-2 text-base font-bold text-zinc-900">
              <span>{isInvoice ? "Total Due" : "Total"}</span>
              <span>{fmt(doc.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes / footer */}
        {doc.notes && (
          <div className="mt-8 border-t border-zinc-200 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Notes</p>
            <p className="mt-1 text-sm text-zinc-600 whitespace-pre-wrap">{doc.notes}</p>
          </div>
        )}
        <p className="mt-10 text-center text-xs text-zinc-400">
          {isInvoice
            ? "Thank you for your business. Please remit payment by the due date above."
            : "This proposal is valid for 30 days. We look forward to working with you."}
        </p>
      </div>
    </div>
  );
}
