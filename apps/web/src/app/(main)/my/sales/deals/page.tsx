"use client";

/**
 * Deal pipeline + builder (SP3). Supabase-direct against sales_deals /
 * sales_deal_items / sales_products / crm_clients (all staff-RLS).
 *
 * Pipeline: kanban columns by status. Editor (modal): pick/create a client,
 * add line items from the rate-card catalog (qty + price editable), totals
 * auto-compute, status advances. Associate = current auth user.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Trash2,
  Layers,
  Building2,
  ArrowLeft,
  Loader2,
  Printer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DealStatus = "lead" | "quoted" | "won" | "lost" | "invoiced" | "paid";

interface Product {
  id: string;
  category: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
}

interface DealItem {
  id: string;
  product_id: string | null;
  description: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface Deal {
  id: string;
  title: string;
  status: DealStatus;
  subtotal: number | null;
  notes: string | null;
  client_id: string | null;
  created_at: string;
  client: { id: string; name: string } | null;
  items: DealItem[];
}

interface ClientLite {
  id: string;
  name: string;
}

interface DraftItem {
  key: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
}

interface Draft {
  id: string | null;
  title: string;
  client_id: string | null;
  useNewClient: boolean;
  newClientName: string;
  status: DealStatus;
  notes: string;
  items: DraftItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_ORDER: DealStatus[] = ["lead", "quoted", "won", "invoiced", "paid", "lost"];
const STATUS_LABEL: Record<DealStatus, string> = {
  lead: "Lead",
  quoted: "Quoted",
  won: "Won",
  invoiced: "Invoiced",
  paid: "Paid",
  lost: "Lost",
};
const STATUS_DOT: Record<DealStatus, string> = {
  lead: "bg-muted-foreground",
  quoted: "bg-yellow-400",
  won: "bg-emerald-400",
  invoiced: "bg-blue-400",
  paid: "bg-emerald-300",
  lost: "bg-red-400",
};
const CATEGORY_LABEL: Record<string, string> = {
  ad_spot: "Ad Spots / Airtime",
  sponsorship: "Sponsorships",
  production: "Production",
  dj_event: "DJ & Events",
};
const CATEGORY_ORDER = ["ad_spot", "sponsorship", "production", "dj_event"];

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

function newKey() {
  try {
    return crypto.randomUUID();
  } catch {
    return `k${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  }
}

function emptyDraft(clientId: string | null, useNew: boolean): Draft {
  return {
    id: null,
    title: "",
    client_id: clientId,
    useNewClient: useNew,
    newClientName: "",
    status: "lead",
    notes: "",
    items: [],
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesDealsPage() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchAll() {
    const supabase = createClient();
    const [dealsRes, clientsRes, productsRes] = await Promise.all([
      supabase
        .from("sales_deals")
        .select(
          "id, title, status, subtotal, notes, client_id, created_at, client:crm_clients(id, name), items:sales_deal_items(id, product_id, description, qty, unit_price, line_total)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("crm_clients").select("id, name").order("name"),
      supabase
        .from("sales_products")
        .select("id, category, name, description, unit, unit_price, is_active")
        .eq("is_active", true)
        .order("category")
        .order("name"),
    ]);
    return {
      deals: (dealsRes.data ?? []) as unknown as Deal[],
      clients: (clientsRes.data ?? []) as unknown as ClientLite[],
      products: (productsRes.data ?? []) as unknown as Product[],
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
      setDeals(data.deals);
      setClients(data.clients);
      setProducts(data.products);

      // Open a specific deal / pre-select a client from the URL.
      const params = new URLSearchParams(window.location.search);
      const openId = params.get("id");
      const clientParam = params.get("client");
      if (openId) {
        const d = data.deals.find((x) => x.id === openId);
        if (d) setEditing(draftFromDeal(d));
      } else if (clientParam !== null) {
        setEditing(emptyDraft(clientParam || null, data.clients.length === 0));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function reload() {
    const data = await fetchAll();
    setDeals(data.deals);
    setClients(data.clients);
    setProducts(data.products);
  }

  function draftFromDeal(d: Deal): Draft {
    return {
      id: d.id,
      title: d.title,
      client_id: d.client_id,
      useNewClient: false,
      newClientName: "",
      status: d.status,
      notes: d.notes ?? "",
      items: (d.items ?? []).map((it) => ({
        key: newKey(),
        product_id: it.product_id,
        description: it.description ?? "",
        qty: it.qty,
        unit_price: Number(it.unit_price),
      })),
    };
  }

  function openNew() {
    setErr(null);
    setEditing(emptyDraft(null, clients.length === 0));
  }

  function patch(p: Partial<Draft>) {
    setEditing((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function patchItem(key: string, p: Partial<DraftItem>) {
    setEditing((prev) =>
      prev ? { ...prev, items: prev.items.map((it) => (it.key === key ? { ...it, ...p } : it)) } : prev,
    );
  }

  function addItem() {
    setEditing((prev) =>
      prev
        ? { ...prev, items: [...prev.items, { key: newKey(), product_id: null, description: "", qty: 1, unit_price: 0 }] }
        : prev,
    );
  }

  function removeItem(key: string) {
    setEditing((prev) => (prev ? { ...prev, items: prev.items.filter((it) => it.key !== key) } : prev));
  }

  function onPickProduct(key: string, productId: string) {
    if (!productId) {
      patchItem(key, { product_id: null });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    patchItem(key, { product_id: p.id, description: p.name, unit_price: Number(p.unit_price) });
  }

  const draftSubtotal = editing
    ? round2(editing.items.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0))
    : 0;

  async function save() {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const supabase = createClient();

    if (!editing.title.trim()) {
      setErr("Enter a deal title.");
      setSaving(false);
      return;
    }

    // Resolve client
    let clientId = editing.client_id;
    if (editing.useNewClient) {
      const nm = editing.newClientName.trim();
      if (!nm) {
        setErr("Enter a name for the new client.");
        setSaving(false);
        return;
      }
      const { data: c, error: ce } = await supabase
        .from("crm_clients")
        .insert({ name: nm, created_by: userId, owner_user_id: userId })
        .select("id")
        .single();
      if (ce || !c) {
        setErr(ce?.message ?? "Could not create the client.");
        setSaving(false);
        return;
      }
      clientId = c.id;
    }

    const subtotal = draftSubtotal;
    let dealId = editing.id;

    if (dealId) {
      const { error } = await supabase
        .from("sales_deals")
        .update({
          title: editing.title.trim(),
          client_id: clientId,
          status: editing.status,
          notes: editing.notes.trim() || null,
          subtotal,
        })
        .eq("id", dealId);
      if (error) {
        setErr(error.message);
        setSaving(false);
        return;
      }
      await supabase.from("sales_deal_items").delete().eq("deal_id", dealId);
    } else {
      const { data: d, error } = await supabase
        .from("sales_deals")
        .insert({
          title: editing.title.trim(),
          client_id: clientId,
          associate_id: userId,
          status: editing.status,
          notes: editing.notes.trim() || null,
          subtotal,
        })
        .select("id")
        .single();
      if (error || !d) {
        setErr(error?.message ?? "Could not save the deal.");
        setSaving(false);
        return;
      }
      dealId = d.id;
    }

    if (editing.items.length) {
      const rows = editing.items.map((it) => ({
        deal_id: dealId,
        product_id: it.product_id,
        description: it.description.trim() || null,
        qty: it.qty || 0,
        unit_price: it.unit_price || 0,
        line_total: round2((it.qty || 0) * (it.unit_price || 0)),
      }));
      const { error: ie } = await supabase.from("sales_deal_items").insert(rows);
      if (ie) {
        setErr(ie.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setEditing(null);
    await reload();
  }

  async function removeDeal() {
    if (!editing?.id) return;
    if (!window.confirm("Delete this deal? This cannot be undone.")) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("sales_deals").delete().eq("id", editing.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setEditing(null);
    await reload();
  }

  const loading = deals === null;
  const dealList = deals ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/my/sales"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Sales Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#74ddc7]" />
            Deal Pipeline
          </h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors self-start"
        >
          <Plus className="h-4 w-4" />
          New Deal
        </button>
      </div>

      {/* Pipeline */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          Loading pipeline…
        </div>
      ) : dealList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-16">
          <Layers className="h-9 w-9 text-foreground/20" />
          <p className="text-sm font-medium text-foreground">No deals yet</p>
          <p className="text-xs text-muted-foreground">
            Create a deal, add line items from the rate card, and move it through the pipeline.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors mt-1"
          >
            <Plus className="h-4 w-4" /> New Deal
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {STATUS_ORDER.map((status) => {
            const col = dealList.filter((d) => d.status === status);
            const sum = col.reduce((s, d) => s + (d.subtotal ?? 0), 0);
            return (
              <div key={status} className="w-[260px] shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                    <span className="text-sm font-semibold text-foreground">{STATUS_LABEL[status]}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-bold">
                      {col.length}
                    </span>
                  </div>
                  {sum > 0 && (
                    <span className="text-[11px] text-muted-foreground font-medium">{formatCurrency(sum)}</span>
                  )}
                </div>
                <div className="space-y-2 rounded-xl bg-foreground/[0.02] p-2 min-h-[80px]">
                  {col.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setEditing(draftFromDeal(d));
                      }}
                      className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-[#74ddc7]/40 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-2">{d.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{d.client?.name ?? "No client"}</span>
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-[#74ddc7]">
                        {formatCurrency(d.subtotal ?? 0)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="flex h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-2xl flex-col rounded-none sm:rounded-2xl border border-border bg-card shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-foreground">
                {editing.id ? "Edit Deal" : "New Deal"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Deal title</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="e.g. Spring Auto Sale — Q2 airtime"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                />
              </div>

              {/* Client + Status */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Client</label>
                    <button
                      type="button"
                      onClick={() => patch({ useNewClient: !editing.useNewClient })}
                      className="text-[11px] font-medium text-[#74ddc7] hover:underline"
                    >
                      {editing.useNewClient ? "Pick existing" : "+ New client"}
                    </button>
                  </div>
                  {editing.useNewClient ? (
                    <input
                      type="text"
                      value={editing.newClientName}
                      onChange={(e) => patch({ newClientName: e.target.value })}
                      placeholder="New client name"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                    />
                  ) : (
                    <select
                      value={editing.client_id ?? ""}
                      onChange={(e) => patch({ client_id: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                    >
                      <option value="">— Select a client —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={editing.status}
                    onChange={(e) => patch({ status: e.target.value as DealStatus })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Line items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#74ddc7] hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add item
                  </button>
                </div>

                {editing.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-foreground/[0.02] px-3 py-4 text-center text-xs text-muted-foreground">
                    No line items. Add an airtime spot, sponsorship, production service, or DJ/event from the rate card.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editing.items.map((it) => (
                      <div key={it.key} className="rounded-lg border border-border bg-background p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={it.product_id ?? ""}
                            onChange={(e) => onPickProduct(it.key, e.target.value)}
                            className="flex-1 min-w-0 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                          >
                            <option value="">Custom line…</option>
                            {CATEGORY_ORDER.map((cat) => {
                              const inCat = products.filter((p) => p.category === cat);
                              if (!inCat.length) return null;
                              return (
                                <optgroup key={cat} label={CATEGORY_LABEL[cat] ?? cat}>
                                  {inCat.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({formatCurrency(Number(p.unit_price))}/{p.unit})
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeItem(it.key)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
                            title="Remove line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => patchItem(it.key, { description: e.target.value })}
                          placeholder="Description"
                          className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Qty</span>
                            <input
                              type="number"
                              min={0}
                              value={it.qty}
                              onChange={(e) => patchItem(it.key, { qty: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Unit $</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.unit_price}
                              onChange={(e) =>
                                patchItem(it.key, { unit_price: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                            />
                          </div>
                          <span className="ml-auto text-sm font-semibold text-foreground">
                            {formatCurrency(round2((it.qty || 0) * (it.unit_price || 0)))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold text-[#74ddc7]">{formatCurrency(draftSubtotal)}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={editing.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={2}
                  placeholder="Internal notes (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none"
                />
              </div>

              {err && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {err}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
              {editing.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={removeDeal}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <Link
                    href={`/my/sales/quote?deal=${editing.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" /> Quote
                  </Link>
                </div>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing.id ? "Save changes" : "Create deal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
