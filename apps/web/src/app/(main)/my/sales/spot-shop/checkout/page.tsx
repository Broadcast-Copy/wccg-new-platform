"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Users, Building2, Mail, Phone, MapPin, Tag,
  Calendar, FileText, Receipt, DollarSign, Search, Plus, X, ShoppingCart,
  ChevronDown, CheckCircle2,
} from "lucide-react";
import { useSpotCart } from "@/hooks/use-spot-cart";
import {
  DAYPARTS, CLIENT_CATEGORIES, SEED_CLIENTS, CAMPAIGNS_KEY, CLIENTS_KEY,
  INVOICES_KEY, formatCurrency, formatDate, formatHour, generateId,
  loadOrSeed, persist, computeWeeks,
  type SalesClient, type InvoiceLineItem, type SavedCampaign, type Invoice,
} from "@/lib/sales-shared";

// ---------------------------------------------------------------------------
// Step indicator config
// ---------------------------------------------------------------------------

const STEPS = [
  { num: 1, label: "Client", icon: Users },
  { num: 2, label: "Campaign Details", icon: Calendar },
  { num: 3, label: "Review & Generate", icon: Receipt },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SpotShopCheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useSpotCart();

  // ── State ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<SalesClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<SalesClient | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    category: "Retail",
  });
  const [campaignName, setCampaignName] = useState("");
  const [flightStart, setFlightStart] = useState("");
  const [flightEnd, setFlightEnd] = useState("");
  const [taxRate, setTaxRate] = useState(7);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setClients(loadOrSeed<SalesClient>(CLIENTS_KEY, SEED_CLIENTS));
    setMounted(true);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
  const filteredClients: SalesClient[] = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c: SalesClient) =>
        c.businessName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [clients, clientSearch]);

  const weeks = useMemo(() => computeWeeks(flightStart, flightEnd), [flightStart, flightEnd]);

  const lineItems: InvoiceLineItem[] = useMemo(() => {
    if (weeks === 0 || items.length === 0) return [];
    return items.map((item) => ({
      daypartLabel: item.label,
      orderType: "ROS",
      slotsPerDay: 0,
      spotsPerWeek: item.quantity,
      weeks,
      ratePerSpot: item.rate,
      lineTotal: item.rate * item.quantity * weeks,
    }));
  }, [items, weeks]);

  const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;

  // ── Handlers ───────────────────────────────────────────────────────────
  function selectClient(client: SalesClient) {
    setSelectedClient(client);
    setClientSearch("");
    setShowNewClient(false);
  }

  function saveNewClient() {
    if (!newClient.businessName.trim()) return;
    const client: SalesClient = { ...newClient, id: generateId() };
    const updated = [...clients, client];
    setClients(updated);
    persist(CLIENTS_KEY, updated);
    selectClient(client);
    setNewClient({ businessName: "", contactName: "", email: "", phone: "", address: "", category: "Retail" });
  }

  function handleSave(withInvoice: boolean) {
    if (!selectedClient || !campaignName.trim() || weeks === 0 || items.length === 0) return;
    setSaving(true);

    const builtLineItems: InvoiceLineItem[] = items.map((item) => ({
      daypartLabel: item.label,
      orderType: "ROS",
      slotsPerDay: 0,
      spotsPerWeek: item.quantity,
      weeks,
      ratePerSpot: item.rate,
      lineTotal: item.rate * item.quantity * weeks,
    }));
    const builtSubtotal = builtLineItems.reduce((s, li) => s + li.lineTotal, 0);
    const builtTaxAmount = Math.round(builtSubtotal * (taxRate / 100));
    const builtTotal = builtSubtotal + builtTaxAmount;

    // Save campaign
    const campaign: SavedCampaign = {
      id: generateId(),
      campaignName: campaignName.trim(),
      client: selectedClient,
      flightStart,
      flightEnd,
      total: builtTotal,
      status: withInvoice ? "active" : "draft",
      createdAt: new Date().toISOString(),
    };
    const existing = loadOrSeed<SavedCampaign>(CAMPAIGNS_KEY, []);
    persist(CAMPAIGNS_KEY, [...existing, campaign]);

    // Save invoice if requested
    if (withInvoice) {
      const existingInv = loadOrSeed<Invoice>(INVOICES_KEY, []);
      const invNum = `INV-${new Date().getFullYear()}-${String(existingInv.length + 1).padStart(4, "0")}`;
      const invoice: Invoice = {
        id: generateId(),
        invoiceNumber: invNum,
        campaignName: campaignName.trim(),
        client: selectedClient,
        flightStart,
        flightEnd,
        lineItems: builtLineItems,
        subtotal: builtSubtotal,
        taxRate,
        taxAmount: builtTaxAmount,
        total: builtTotal,
        status: "Draft",
        createdAt: new Date().toISOString(),
      };
      persist(INVOICES_KEY, [...existingInv, invoice]);
    }

    clearCart();
    setSavedMessage(withInvoice ? "Campaign created & invoice generated!" : "Campaign saved as draft!");
    setSaving(false);
    setTimeout(() => router.push("/my/sales"), 1500);
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#74ddc7] border-t-transparent" />
      </div>
    );
  }

  // ── Empty cart state ───────────────────────────────────────────────────
  if (items.length === 0 && !savedMessage) {
    return (
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/my/sales/spot-shop"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-[#74ddc7]" />
              Checkout
            </h1>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Add some spot packages from the Spot Shop before checking out.
          </p>
          <Link
            href="/my/sales/spot-shop"
            className="inline-flex items-center gap-2 rounded-lg bg-[#74ddc7] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            Go to Spot Shop
          </Link>
        </div>
      </div>
    );
  }

  // ── Success message (briefly shown after save) ─────────────────────────
  if (savedMessage) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">{savedMessage}</h2>
          <p className="text-sm text-muted-foreground">Redirecting to your Sales Portal...</p>
        </div>
      </div>
    );
  }

  const canAdvanceStep2 = !!selectedClient;
  const canAdvanceStep3 = !!campaignName.trim() && weeks > 0;
  const canSave = !!selectedClient && !!campaignName.trim() && weeks > 0 && items.length > 0;

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/my/sales/spot-shop"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[#74ddc7]" />
            Checkout
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Convert your spot cart into a campaign and invoice.
          </p>
        </div>
      </div>

      {/* ── Step Indicator ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isComplete = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={`h-px w-8 sm:w-12 transition-colors ${
                    isComplete ? "bg-[#74ddc7]" : "bg-border"
                  }`}
                />
              )}
              <button
                onClick={() => {
                  // Allow going back to completed steps
                  if (isComplete) setStep(s.num);
                }}
                disabled={!isComplete && !isActive}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#74ddc7] text-[#0a0a0f]"
                    : isComplete
                      ? "bg-[#74ddc7]/10 text-[#74ddc7] cursor-pointer hover:bg-[#74ddc7]/20"
                      : "bg-foreground/[0.06] text-muted-foreground cursor-default"
                }`}
              >
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* STEP 1 — Client Selection                                        */}
      {/* ================================================================ */}
      {step === 1 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] text-xs font-bold">
              1
            </div>
            <Users className="h-4 w-4 text-[#74ddc7]" />
            <h2 className="text-base font-bold text-foreground">Select Client</h2>
          </div>

          {!selectedClient ? (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search clients by name, contact, or email..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                />
              </div>

              {/* Client list */}
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredClients.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No clients found. Create a new one below.
                  </div>
                ) : (
                  filteredClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.04] transition-colors"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {c.businessName}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded shrink-0">
                            {c.category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.contactName}
                          {c.email ? ` \u00b7 ${c.email}` : ""}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* New Client button */}
              <button
                onClick={() => setShowNewClient(!showNewClient)}
                className="flex items-center gap-2 text-sm font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New Client
              </button>

              {/* New Client Form */}
              {showNewClient && (
                <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        value={newClient.businessName}
                        onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={newClient.contactName}
                        onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                        Address
                      </label>
                      <input
                        type="text"
                        value={newClient.address}
                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                        Category
                      </label>
                      <select
                        value={newClient.category}
                        onChange={(e) => setNewClient({ ...newClient, category: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      >
                        {CLIENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={saveNewClient}
                      disabled={!newClient.businessName.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Add Client
                    </button>
                    <button
                      onClick={() => setShowNewClient(false)}
                      className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-foreground/[0.04] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Selected client card */
            <div className="rounded-lg border border-[#74ddc7]/20 bg-[#74ddc7]/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#74ddc7]" />
                    <span className="font-semibold text-foreground">{selectedClient.businessName}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                      {selectedClient.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {selectedClient.contactName && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {selectedClient.contactName}
                      </span>
                    )}
                    {selectedClient.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {selectedClient.email}
                      </span>
                    )}
                    {selectedClient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {selectedClient.phone}
                      </span>
                    )}
                    {selectedClient.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {selectedClient.address}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-foreground/[0.04] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step nav */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!canAdvanceStep2}
              className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* STEP 2 — Campaign Details                                        */}
      {/* ================================================================ */}
      {step === 2 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] text-xs font-bold">
              2
            </div>
            <Calendar className="h-4 w-4 text-[#74ddc7]" />
            <h2 className="text-base font-bold text-foreground">Campaign Details</h2>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Campaign Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Spring Auto Sale \u2014 March 2026"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
            />
          </div>

          {/* Flight Dates */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Flight Start *
              </label>
              <input
                type="date"
                value={flightStart}
                onChange={(e) => setFlightStart(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Flight End *
              </label>
              <input
                type="date"
                value={flightEnd}
                onChange={(e) => setFlightEnd(e.target.value)}
                min={flightStart}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
              />
            </div>
            {weeks > 0 && (
              <div className="flex items-center gap-2 text-sm pb-1">
                <Calendar className="h-4 w-4 text-[#74ddc7]" />
                <span className="font-semibold text-foreground">
                  {weeks} week{weeks !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {weeks === 0 && flightStart && flightEnd && (
            <p className="text-xs text-red-400">End date must be after start date.</p>
          )}

          {/* Step nav */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canAdvanceStep3}
              className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* STEP 3 — Review & Generate                                       */}
      {/* ================================================================ */}
      {step === 3 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] text-xs font-bold">
              3
            </div>
            <Receipt className="h-4 w-4 text-[#74ddc7]" />
            <h2 className="text-base font-bold text-foreground">Review &amp; Generate</h2>
          </div>

          {/* Client info card */}
          {selectedClient && (
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Client
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#74ddc7]" />
                  <span className="font-semibold text-foreground">{selectedClient.businessName}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                    {selectedClient.category}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {selectedClient.contactName && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {selectedClient.contactName}
                    </span>
                  )}
                  {selectedClient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedClient.email}
                    </span>
                  )}
                  {selectedClient.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {selectedClient.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Campaign info */}
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Campaign
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#74ddc7]" />
                <span className="font-semibold text-foreground">{campaignName}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {flightStart ? formatDate(flightStart) : "TBD"} &ndash;{" "}
                  {flightEnd ? formatDate(flightEnd) : "TBD"}
                </span>
                <span className="font-semibold text-foreground">
                  {weeks} week{weeks !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          {lineItems.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground bg-foreground/[0.02]">
                    <th className="text-left font-medium px-4 py-2.5">Daypart</th>
                    <th className="text-left font-medium px-4 py-2.5">Type</th>
                    <th className="text-right font-medium px-4 py-2.5">Spots/Wk</th>
                    <th className="text-right font-medium px-4 py-2.5">Weeks</th>
                    <th className="text-right font-medium px-4 py-2.5">Rate</th>
                    <th className="text-right font-medium px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.daypartLabel} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-foreground">{li.daypartLabel}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          {li.orderType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{li.spotsPerWeek}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{li.weeks}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(li.ratePerSpot)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">{formatCurrency(li.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No line items to display. Your cart may be empty.
            </p>
          )}

          {/* Totals */}
          {lineItems.length > 0 && (
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Tax
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                      className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                    %
                  </span>
                  <span className="font-medium text-foreground">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-[#74ddc7]">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={!canSave || saving}
                className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="h-4 w-4" />
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={!canSave || saving}
                className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Receipt className="h-4 w-4" />
                Generate Invoice
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
