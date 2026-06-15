"use client";

/**
 * Rate-card admin (SP5) — staff CRUD over sales_products (the catalog behind the
 * deal builder). Supabase-direct; staff-RLS gated. Add / edit / set price /
 * activate-deactivate; deactivated products drop out of the deal-builder catalog.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, Plus, Pencil, X, Loader2, Check, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Category = "ad_spot" | "sponsorship" | "production" | "dj_event";

interface Product {
  id: string;
  category: Category;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  is_active: boolean;
}

interface Draft {
  id: string | null;
  category: Category;
  name: string;
  description: string;
  unit: string;
  unit_price: number;
  is_active: boolean;
}

const CATEGORY_ORDER: Category[] = ["ad_spot", "sponsorship", "production", "dj_event"];
const CATEGORY_LABEL: Record<Category, string> = {
  ad_spot: "Ad Spots / Airtime",
  sponsorship: "Sponsorships",
  production: "Production",
  dj_event: "DJ & Events",
};
const UNIT_SUGGESTIONS = ["spot", "week", "month", "episode", "package", "hour", "event"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

function emptyDraft(): Draft {
  return { id: null, category: "ad_spot", name: "", description: "", unit: "spot", unit_price: 0, is_active: true };
}

export default function RateCardPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchProducts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("sales_products")
      .select("id, category, name, description, unit, unit_price, is_active")
      .order("category")
      .order("name");
    return (data ?? []) as unknown as Product[];
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await fetchProducts();
      if (!active) return;
      setProducts(data);
    })();
    return () => { active = false; };
  }, []);

  async function reload() {
    setProducts(await fetchProducts());
  }

  function openNew() {
    setErr(null);
    setEditing(emptyDraft());
  }

  function openEdit(p: Product) {
    setErr(null);
    setEditing({
      id: p.id,
      category: p.category,
      name: p.name,
      description: p.description ?? "",
      unit: p.unit,
      unit_price: Number(p.unit_price),
      is_active: p.is_active,
    });
  }

  function patch(p: Partial<Draft>) {
    setEditing((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setErr("Enter a product name."); return; }
    setSaving(true);
    setErr(null);
    const supabase = createClient();
    const payload = {
      category: editing.category,
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      unit: editing.unit.trim() || "unit",
      unit_price: editing.unit_price || 0,
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("sales_products").update(payload).eq("id", editing.id)
      : await supabase.from("sales_products").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setEditing(null);
    await reload();
  }

  async function toggleActive(p: Product) {
    setBusy(p.id);
    const supabase = createClient();
    const { error } = await supabase.from("sales_products").update({ is_active: !p.is_active }).eq("id", p.id);
    setBusy(null);
    if (error) { setErr(error.message); return; }
    await reload();
  }

  const loading = products === null;
  const list = products ?? [];
  const activeCount = list.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/my/sales" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-purple-400" />
            Rate Card
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            The product catalog behind the deal builder. {loading ? "" : `${activeCount} active`}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </button>
      </div>

      {err && !editing && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">Loading rate card…</div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const inCat = list.filter((p) => p.category === cat);
            return (
              <section key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">{CATEGORY_LABEL[cat]}</h2>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-bold">{inCat.length}</span>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {inCat.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-muted-foreground">No products in this category yet.</p>
                  ) : (
                    inCat.map((p) => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${p.is_active ? "" : "opacity-55"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            {!p.is_active && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border rounded-full px-1.5 py-0.5">Inactive</span>
                            )}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(p.unit_price))}</p>
                          <p className="text-[10px] text-muted-foreground">/ {p.unit}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-[#74ddc7] hover:bg-[#74ddc7]/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(p)}
                            disabled={busy === p.id}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                              p.is_active ? "text-muted-foreground hover:text-red-400 hover:bg-red-500/10" : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                            title={p.is_active ? "Deactivate" : "Activate"}
                          >
                            {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.is_active ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-foreground">{editing.id ? "Edit product" : "Add product"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={editing.category}
                  onChange={(e) => patch({ category: e.target.value as Category })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                >
                  {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="e.g. :30 Radio Spot - Drive Time"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={2}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Unit</label>
                  <input
                    type="text"
                    list="rate-units"
                    value={editing.unit}
                    onChange={(e) => patch({ unit: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                  />
                  <datalist id="rate-units">
                    {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Unit price ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editing.unit_price}
                    onChange={(e) => patch({ unit_price: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => patch({ is_active: e.target.checked })} className="h-4 w-4 rounded border-border" />
                Active (shown in the deal builder)
              </label>
              {err && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button type="button" onClick={() => setEditing(null)} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-bold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing.id ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
