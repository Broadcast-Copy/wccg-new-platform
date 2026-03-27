"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ImageIcon,
  Coins,
  Search,
  ShoppingBag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  inventory: number;
  tokenEligible: boolean;
}

type ProductCategory = "Food" | "Fashion" | "Services" | "Entertainment" | "Other";

const CATEGORIES: ProductCategory[] = [
  "Food",
  "Fashion",
  "Services",
  "Entertainment",
  "Other",
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const SEED_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Crown City Hot Sauce",
    description: "Locally crafted hot sauce with Carolina Reaper peppers.",
    price: 12.99,
    category: "Food",
    imageUrl: "",
    inventory: 48,
    tokenEligible: true,
  },
  {
    id: "p2",
    name: "WCCG Logo Tee",
    description: "Premium cotton t-shirt with the WCCG 104.5 FM logo.",
    price: 24.99,
    category: "Fashion",
    imageUrl: "",
    inventory: 120,
    tokenEligible: true,
  },
  {
    id: "p3",
    name: "DJ Workshop Pass",
    description: "Two-hour hands-on DJ workshop in the Crown City studio.",
    price: 49.99,
    category: "Services",
    imageUrl: "",
    inventory: 15,
    tokenEligible: false,
  },
  {
    id: "p4",
    name: "Vinyl Sticker Pack",
    description: "Set of 6 WCCG-themed vinyl stickers, weatherproof.",
    price: 7.99,
    category: "Other",
    imageUrl: "",
    inventory: 200,
    tokenEligible: true,
  },
  {
    id: "p5",
    name: "Live Show VIP Ticket",
    description: "Front-row VIP access to the next WCCG live broadcast.",
    price: 35.0,
    category: "Entertainment",
    imageUrl: "",
    inventory: 30,
    tokenEligible: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Fashion: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Services: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Entertainment: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Other: "bg-foreground/[0.06] text-muted-foreground border-border",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "Food" as ProductCategory,
  imageUrl: "",
  inventory: "",
  tokenEligible: false,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  // Search filter
  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category as ProductCategory,
      imageUrl: product.imageUrl,
      inventory: product.inventory.toString(),
      tokenEligible: product.tokenEligible,
    });
    setEditingId(product.id);
    setShowForm(true);
  }

  function handleSubmit() {
    const price = parseFloat(form.price) || 0;
    const inventory = parseInt(form.inventory) || 0;

    if (!form.name.trim()) return;

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: form.name.trim(),
                description: form.description.trim(),
                price,
                category: form.category,
                imageUrl: form.imageUrl.trim(),
                inventory,
                tokenEligible: form.tokenEligible,
              }
            : p
        )
      );
    } else {
      const newProduct: Product = {
        id: `p_${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        category: form.category,
        imageUrl: form.imageUrl.trim(),
        inventory,
        tokenEligible: form.tokenEligible,
      };
      setProducts((prev) => [newProduct, ...prev]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleDelete(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Manager</h1>
          <p className="text-sm text-muted-foreground">
            Add, edit, and manage your storefront products.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* ── Add / Edit Form (slide-down) ─────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-[#f59e0b]/30 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Product" : "New Product"}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-xl p-1.5 transition-colors hover:bg-foreground/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Product Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Crown City Hot Sauce"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as ProductCategory })
                  }
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short description of the product"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Inventory Count
              </label>
              <input
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) =>
                  setForm({ ...form, inventory: e.target.value })
                }
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Image URL
              </label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="https://..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
              />
            </div>
            <div className="flex items-center gap-3 self-end pb-1">
              <button
                onClick={() =>
                  setForm({ ...form, tokenEligible: !form.tokenEligible })
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  form.tokenEligible ? "bg-[#f59e0b]" : "bg-foreground/20"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    form.tokenEligible ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">Token-Eligible</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              className="rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
            >
              {editingId ? "Save Changes" : "Add Product"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-[#f59e0b]"
        />
      </div>

      {/* ── Product Grid ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first product to get started.
          </p>
          <button
            onClick={openAddForm}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl border border-border bg-card transition-colors hover:border-[#f59e0b]/30"
            >
              {/* Image placeholder */}
              <div className="flex h-40 items-center justify-center rounded-t-2xl bg-foreground/[0.04]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full rounded-t-2xl object-cover"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{product.name}</h3>
                  <span className="whitespace-nowrap text-lg font-bold text-[#f59e0b]">
                    {formatCurrency(product.price)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {product.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      CATEGORY_COLORS[product.category] || CATEGORY_COLORS.Other
                    }`}
                  >
                    {product.category}
                  </span>
                  <span className="rounded-full bg-foreground/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {product.inventory} in stock
                  </span>
                  {product.tokenEligible && (
                    <span className="flex items-center gap-1 rounded-full bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#f59e0b]">
                      <Coins className="h-3 w-3" />
                      Token
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEditForm(product)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-foreground/[0.06]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
