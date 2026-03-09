"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Megaphone,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  ArrowLeft,
  Save,
  Receipt,
  Users,
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderType = "specific" | "non_specific";
type DaypartId =
  | "morning_drive"
  | "midday"
  | "afternoon_drive"
  | "evening"
  | "overnight";

interface DaypartConfig {
  id: DaypartId;
  label: string;
  startHour: number;
  endHour: number;
  defaultRate: number;
}

interface SalesClient {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
}

interface SpecificBreakSlot {
  hour: number;
  break18: boolean;
  break48: boolean;
}

interface DaypartOrder {
  daypartId: DaypartId;
  rate: number;
  // Non-specific
  spotsPerWeek: number;
  // Specific
  slots: SpecificBreakSlot[];
}

interface InvoiceLineItem {
  daypartLabel: string;
  orderType: string;
  slotsPerDay: number;
  spotsPerWeek: number;
  weeks: number;
  ratePerSpot: number;
  lineTotal: number;
}

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

interface SavedCampaign {
  id: string;
  campaignName: string;
  client: SalesClient;
  flightStart: string;
  flightEnd: string;
  total: number;
  status: "draft" | "active" | "completed";
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  campaignName: string;
  client: SalesClient;
  flightStart: string;
  flightEnd: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYPARTS: DaypartConfig[] = [
  { id: "morning_drive", label: "Morning Drive", startHour: 6, endHour: 10, defaultRate: 75 },
  { id: "midday", label: "Midday", startHour: 10, endHour: 15, defaultRate: 50 },
  { id: "afternoon_drive", label: "Afternoon Drive", startHour: 15, endHour: 19, defaultRate: 65 },
  { id: "evening", label: "Evening", startHour: 19, endHour: 24, defaultRate: 40 },
  { id: "overnight", label: "Overnight", startHour: 0, endHour: 6, defaultRate: 25 },
];

const CATEGORIES = [
  "Retail",
  "Healthcare",
  "Automotive",
  "Restaurant",
  "Education",
  "Real Estate",
  "Legal",
  "Financial",
  "Entertainment",
  "Non-Profit",
  "Other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// localStorage keys (shared with dashboard & invoices)
// ---------------------------------------------------------------------------

const CAMPAIGNS_KEY = "wccg_sales_campaigns";
const CLIENTS_KEY = "wccg_sales_clients";
const INVOICES_KEY = "wccg_sales_invoices";

// ---------------------------------------------------------------------------
// Seed clients (same as dashboard)
// ---------------------------------------------------------------------------

const SEED_CLIENTS: SalesClient[] = [
  { id: "c1", businessName: "Cross Creek Mall", contactName: "Sarah Johnson", email: "sarah@crosscreekmall.com", phone: "(910) 555-0101", address: "419 Cross Creek Mall, Fayetteville, NC", category: "Retail" },
  { id: "c2", businessName: "Cape Fear Valley Health", contactName: "Dr. Michael Brown", email: "mbrown@capefearvalley.com", phone: "(910) 555-0202", address: "1638 Owen Dr, Fayetteville, NC", category: "Healthcare" },
  { id: "c3", businessName: "Fort Liberty Auto Group", contactName: "James Williams", email: "james@ftlibertyauto.com", phone: "(910) 555-0303", address: "5925 Yadkin Rd, Fayetteville, NC", category: "Automotive" },
  { id: "c4", businessName: "Mash House Brewing", contactName: "Kim Taylor", email: "kim@mashhouse.com", phone: "(910) 555-0404", address: "4150 Sycamore Dairy Rd, Fayetteville, NC", category: "Restaurant" },
  { id: "c5", businessName: "Cumberland County Schools", contactName: "Angela Davis", email: "adavis@ccs.k12.nc.us", phone: "(910) 555-0505", address: "2465 Gillespie St, Fayetteville, NC", category: "Education" },
];

function loadOrSeed<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch {
    return seed;
  }
}

function persist<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ number, title, icon: Icon }: { number: number; title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#74ddc7]/10 text-[#74ddc7] text-xs font-bold">
        {number}
      </div>
      <Icon className="h-4 w-4 text-[#74ddc7]" />
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignBuilderPage() {
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<SalesClient[]>([]);

  // Section 1 — Client
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SalesClient | null>(null);
  const [editingClient, setEditingClient] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState<Omit<SalesClient, "id">>({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    category: "Other",
  });

  // Section 2 — Flight Dates
  const [flightStart, setFlightStart] = useState("");
  const [flightEnd, setFlightEnd] = useState("");

  // Section 3 — Order Configuration
  const [orderType, setOrderType] = useState<OrderType>("non_specific");
  const [selectedDayparts, setSelectedDayparts] = useState<DaypartId[]>([]);
  const [daypartOrders, setDaypartOrders] = useState<Record<DaypartId, DaypartOrder>>(() => {
    const initial: Record<string, DaypartOrder> = {};
    DAYPARTS.forEach((dp) => {
      const slots: SpecificBreakSlot[] = [];
      for (let h = dp.startHour; h < dp.endHour; h++) {
        slots.push({ hour: h >= 24 ? h - 24 : h, break18: false, break48: false });
      }
      initial[dp.id] = {
        daypartId: dp.id,
        rate: dp.defaultRate,
        spotsPerWeek: 10,
        slots,
      };
    });
    return initial as Record<DaypartId, DaypartOrder>;
  });

  // Section 4 — Summary
  const [campaignName, setCampaignName] = useState("");
  const [taxRate, setTaxRate] = useState(7);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setMounted(true);
    setClients(loadOrSeed(CLIENTS_KEY, SEED_CLIENTS));
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.businessName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const weeks = useMemo(() => {
    if (!flightStart || !flightEnd) return 0;
    const start = new Date(flightStart);
    const end = new Date(flightEnd);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.ceil(diff / 7) : 0;
  }, [flightStart, flightEnd]);

  const lineItems: InvoiceLineItem[] = useMemo(() => {
    if (weeks === 0 || selectedDayparts.length === 0) return [];
    return selectedDayparts.map((dpId) => {
      const dp = DAYPARTS.find((d) => d.id === dpId)!;
      const order = daypartOrders[dpId];
      if (orderType === "non_specific") {
        return {
          daypartLabel: dp.label,
          orderType: "ROS",
          slotsPerDay: 0,
          spotsPerWeek: order.spotsPerWeek,
          weeks,
          ratePerSpot: order.rate,
          lineTotal: order.rate * order.spotsPerWeek * weeks,
        };
      } else {
        const slotsPerDay = order.slots.reduce(
          (acc, s) => acc + (s.break18 ? 1 : 0) + (s.break48 ? 1 : 0),
          0
        );
        return {
          daypartLabel: dp.label,
          orderType: "Specific",
          slotsPerDay,
          spotsPerWeek: slotsPerDay * 7,
          weeks,
          ratePerSpot: order.rate,
          lineTotal: order.rate * slotsPerDay * 7 * weeks,
        };
      }
    });
  }, [selectedDayparts, daypartOrders, orderType, weeks]);

  const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const selectClient = useCallback((client: SalesClient) => {
    setSelectedClient(client);
    setClientSearch("");
    setShowDropdown(false);
    setShowNewClient(false);
    setEditingClient(false);
  }, []);

  const saveNewClient = useCallback(() => {
    if (!newClient.businessName.trim()) return;
    const client: SalesClient = { ...newClient, id: generateId() };
    const updated = [...clients, client];
    setClients(updated);
    persist(CLIENTS_KEY, updated);
    selectClient(client);
    setNewClient({ businessName: "", contactName: "", email: "", phone: "", address: "", category: "Other" });
  }, [newClient, clients, selectClient]);

  const saveClientEdits = useCallback(() => {
    if (!selectedClient) return;
    const updated = clients.map((c) => (c.id === selectedClient.id ? selectedClient : c));
    setClients(updated);
    persist(CLIENTS_KEY, updated);
    setEditingClient(false);
  }, [selectedClient, clients]);

  const toggleDaypart = useCallback((dpId: DaypartId) => {
    setSelectedDayparts((prev) =>
      prev.includes(dpId) ? prev.filter((id) => id !== dpId) : [...prev, dpId]
    );
  }, []);

  const updateDaypartRate = useCallback((dpId: DaypartId, rate: number) => {
    setDaypartOrders((prev) => ({
      ...prev,
      [dpId]: { ...prev[dpId], rate },
    }));
  }, []);

  const updateSpotsPerWeek = useCallback((dpId: DaypartId, spw: number) => {
    setDaypartOrders((prev) => ({
      ...prev,
      [dpId]: { ...prev[dpId], spotsPerWeek: spw },
    }));
  }, []);

  const toggleHourRow = useCallback((dpId: DaypartId, hour: number) => {
    setDaypartOrders((prev) => {
      const order = prev[dpId];
      const updated = order.slots.map((s) => {
        if (s.hour !== hour) return s;
        const anyChecked = s.break18 || s.break48;
        return { ...s, break18: !anyChecked, break48: !anyChecked };
      });
      return { ...prev, [dpId]: { ...order, slots: updated } };
    });
  }, []);

  const toggleSlot = useCallback((dpId: DaypartId, hour: number, slot: "break18" | "break48") => {
    setDaypartOrders((prev) => {
      const order = prev[dpId];
      const updated = order.slots.map((s) => {
        if (s.hour !== hour) return s;
        return { ...s, [slot]: !s[slot] };
      });
      return { ...prev, [dpId]: { ...order, slots: updated } };
    });
  }, []);

  const saveCampaign = useCallback(
    (generateInvoice: boolean) => {
      if (!selectedClient || !campaignName.trim() || weeks === 0 || lineItems.length === 0) return;
      setSaving(true);

      const campaign: SavedCampaign = {
        id: generateId(),
        campaignName: campaignName.trim(),
        client: selectedClient,
        flightStart,
        flightEnd,
        total,
        status: generateInvoice ? "active" : "draft",
        createdAt: new Date().toISOString(),
      };

      // Save campaign
      const existingCampaigns = loadOrSeed<SavedCampaign>(CAMPAIGNS_KEY, []);
      persist(CAMPAIGNS_KEY, [...existingCampaigns, campaign]);

      // Generate invoice if requested
      if (generateInvoice) {
        const existingInvoices = loadOrSeed<Invoice>(INVOICES_KEY, []);
        const invNum = `INV-${new Date().getFullYear()}-${String(existingInvoices.length + 1).padStart(4, "0")}`;
        const invoice: Invoice = {
          id: generateId(),
          invoiceNumber: invNum,
          campaignName: campaignName.trim(),
          client: selectedClient,
          flightStart,
          flightEnd,
          lineItems,
          subtotal,
          taxRate,
          taxAmount,
          total,
          status: "Draft",
          createdAt: new Date().toISOString(),
        };
        persist(INVOICES_KEY, [...existingInvoices, invoice]);
      }

      setSavedMessage(
        generateInvoice
          ? "Campaign saved & invoice generated!"
          : "Campaign saved as draft!"
      );
      setSaving(false);
      setTimeout(() => setSavedMessage(""), 4000);
    },
    [selectedClient, campaignName, flightStart, flightEnd, weeks, total, subtotal, taxRate, taxAmount, lineItems]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!mounted) return null;

  const canSave = !!selectedClient && !!campaignName.trim() && weeks > 0 && lineItems.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/my/sales"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-foreground/[0.04] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-[#74ddc7]" />
            Campaign Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build a commercial advertising campaign for a client.
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1 — Client */}
      {/* ================================================================= */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader number={1} title="Client" icon={Users} />

        {!selectedClient ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients by name, contact, or category..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
              />
              {/* Dropdown */}
              {showDropdown && filteredClients.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-foreground/[0.04] transition-colors border-b border-border last:border-0"
                    >
                      <div className="text-sm font-medium text-foreground">{c.businessName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.contactName} &middot; {c.category}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* New Client button */}
            <button
              onClick={() => {
                setShowNewClient(!showNewClient);
                setShowDropdown(false);
              }}
              className="flex items-center gap-2 text-sm font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Client
            </button>

            {/* New Client Form */}
            {showNewClient && (
              <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Business Name *</label>
                    <input
                      type="text"
                      value={newClient.businessName}
                      onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Contact Name</label>
                    <input
                      type="text"
                      value={newClient.contactName}
                      onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Email</label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Phone</label>
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Address</label>
                    <input
                      type="text"
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Category</label>
                    <select
                      value={newClient.category}
                      onChange={(e) => setNewClient({ ...newClient, category: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    >
                      {CATEGORIES.map((cat) => (
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
          /* Selected Client Card */
          <div className="rounded-lg border border-border bg-background/50 p-4">
            {editingClient ? (
              /* Edit mode */
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Business Name</label>
                    <input
                      type="text"
                      value={selectedClient.businessName}
                      onChange={(e) => setSelectedClient({ ...selectedClient, businessName: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Contact Name</label>
                    <input
                      type="text"
                      value={selectedClient.contactName}
                      onChange={(e) => setSelectedClient({ ...selectedClient, contactName: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Email</label>
                    <input
                      type="email"
                      value={selectedClient.email}
                      onChange={(e) => setSelectedClient({ ...selectedClient, email: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Phone</label>
                    <input
                      type="tel"
                      value={selectedClient.phone}
                      onChange={(e) => setSelectedClient({ ...selectedClient, phone: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Address</label>
                    <input
                      type="text"
                      value={selectedClient.address}
                      onChange={(e) => setSelectedClient({ ...selectedClient, address: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Category</label>
                    <select
                      value={selectedClient.category}
                      onChange={(e) => setSelectedClient({ ...selectedClient, category: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={saveClientEdits}
                    className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-4 py-2 text-xs font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingClient(false)}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-foreground/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
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
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {selectedClient.contactName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedClient.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedClient.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {selectedClient.address}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingClient(true)}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-foreground/[0.04] transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setEditingClient(false);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-foreground/[0.04] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* SECTION 2 — Flight Dates */}
      {/* ================================================================= */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader number={2} title="Flight Dates" icon={Calendar} />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Start Date</label>
            <input
              type="date"
              value={flightStart}
              onChange={(e) => setFlightStart(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">End Date</label>
            <input
              type="date"
              value={flightEnd}
              onChange={(e) => setFlightEnd(e.target.value)}
              min={flightStart}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
            />
          </div>
          {weeks > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-[#74ddc7]" />
              <span className="font-semibold text-foreground">{weeks} week{weeks !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 3 — Order Configuration */}
      {/* ================================================================= */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader number={3} title="Order Configuration" icon={FileText} />

        {/* Order Type Toggle */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Order Type</label>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setOrderType("non_specific")}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${
                orderType === "non_specific"
                  ? "bg-[#74ddc7] text-[#0a0a0f]"
                  : "bg-background text-muted-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              Non-Specific (ROS)
            </button>
            <button
              onClick={() => setOrderType("specific")}
              className={`px-4 py-2 text-xs font-semibold transition-colors border-l border-border ${
                orderType === "specific"
                  ? "bg-[#74ddc7] text-[#0a0a0f]"
                  : "bg-background text-muted-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              Specific
            </button>
          </div>
        </div>

        {/* Daypart Selection */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Dayparts</label>
          <div className="flex flex-wrap gap-2">
            {DAYPARTS.map((dp) => {
              const active = selectedDayparts.includes(dp.id);
              return (
                <button
                  key={dp.id}
                  onClick={() => toggleDaypart(dp.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all border ${
                    active
                      ? "bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/30"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/20"
                  }`}
                >
                  {dp.label}
                  <span className="ml-1 text-[10px] opacity-60">
                    ({formatHour(dp.startHour)}-{formatHour(dp.endHour)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daypart Configuration Cards */}
        {selectedDayparts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Select one or more dayparts above to configure.</p>
        )}

        <div className="space-y-4">
          {selectedDayparts.map((dpId) => {
            const dp = DAYPARTS.find((d) => d.id === dpId)!;
            const order = daypartOrders[dpId];
            const slotsPerDay = order.slots.reduce(
              (acc, s) => acc + (s.break18 ? 1 : 0) + (s.break48 ? 1 : 0),
              0
            );

            return (
              <div key={dpId} className="rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {dp.label}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({formatHour(dp.startHour)} – {formatHour(dp.endHour)})
                    </span>
                  </h3>
                  <button
                    onClick={() => toggleDaypart(dpId)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Rate input */}
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Rate / Spot</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="number"
                        min={0}
                        value={order.rate}
                        onChange={(e) => updateDaypartRate(dpId, Number(e.target.value) || 0)}
                        className="w-28 rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                      />
                    </div>
                  </div>

                  {orderType === "non_specific" ? (
                    /* Non-specific — Spots per week */
                    <>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Spots / Week</label>
                        <input
                          type="number"
                          min={1}
                          value={order.spotsPerWeek}
                          onChange={(e) => updateSpotsPerWeek(dpId, Number(e.target.value) || 1)}
                          className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground pb-2">
                        Weekly subtotal:{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(order.rate * order.spotsPerWeek)}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Specific — show slot count */
                    <div className="text-sm text-muted-foreground pb-2">
                      <span className="font-semibold text-foreground">{slotsPerDay}</span> spot{slotsPerDay !== 1 ? "s" : ""}/day selected
                    </div>
                  )}
                </div>

                {/* Specific Mode — Hour Grid */}
                {orderType === "specific" && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left font-medium pr-6 pb-2">Hour</th>
                          <th className="text-center font-medium px-3 pb-2">:18</th>
                          <th className="text-center font-medium px-3 pb-2">:48</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.slots.map((slot) => (
                          <tr key={slot.hour} className="border-t border-border/50">
                            <td className="pr-6 py-1.5">
                              <button
                                onClick={() => toggleHourRow(dpId, slot.hour)}
                                className="text-foreground font-medium hover:text-[#74ddc7] transition-colors text-left"
                              >
                                {formatHour(slot.hour)}
                              </button>
                            </td>
                            <td className="text-center px-3 py-1.5">
                              <button
                                onClick={() => toggleSlot(dpId, slot.hour, "break18")}
                                className={`h-6 w-6 rounded border transition-all ${
                                  slot.break18
                                    ? "bg-[#74ddc7] border-[#74ddc7] text-[#0a0a0f]"
                                    : "border-border bg-background hover:border-foreground/30"
                                }`}
                              >
                                {slot.break18 && <Check className="h-3.5 w-3.5 mx-auto" />}
                              </button>
                            </td>
                            <td className="text-center px-3 py-1.5">
                              <button
                                onClick={() => toggleSlot(dpId, slot.hour, "break48")}
                                className={`h-6 w-6 rounded border transition-all ${
                                  slot.break48
                                    ? "bg-[#74ddc7] border-[#74ddc7] text-[#0a0a0f]"
                                    : "border-border bg-background hover:border-foreground/30"
                                }`}
                              >
                                {slot.break48 && <Check className="h-3.5 w-3.5 mx-auto" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 4 — Summary & Invoice */}
      {/* ================================================================= */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeader number={4} title="Summary & Invoice" icon={Receipt} />

        {/* Campaign Name */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Campaign Name *</label>
          <input
            type="text"
            placeholder="e.g. Spring Auto Sale — March 2026"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/50"
          />
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground bg-foreground/[0.02]">
                  <th className="text-left font-medium px-4 py-2.5">Daypart</th>
                  <th className="text-left font-medium px-4 py-2.5">Type</th>
                  <th className="text-right font-medium px-4 py-2.5">Slots/Day</th>
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
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        li.orderType === "ROS"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-purple-500/10 text-purple-400"
                      }`}>
                        {li.orderType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {li.orderType === "Specific" ? li.slotsPerDay : "—"}
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
          <p className="text-sm text-muted-foreground italic mb-4">
            Select dayparts and configure spots to see the summary.
          </p>
        )}

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="flex justify-end mb-5">
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => saveCampaign(false)}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            Save as Draft
          </button>
          <button
            onClick={() => saveCampaign(true)}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 rounded-lg bg-[#74ddc7] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:bg-[#74ddc7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Receipt className="h-4 w-4" />
            Generate Invoice
          </button>

          {savedMessage && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <Check className="h-4 w-4" />
              {savedMessage}
            </span>
          )}
        </div>

        {/* Validation hints */}
        {!canSave && (
          <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
            {!selectedClient && <p>Select or create a client.</p>}
            {!campaignName.trim() && <p>Enter a campaign name.</p>}
            {weeks === 0 && <p>Set valid flight dates (end must be after start).</p>}
            {lineItems.length === 0 && <p>Select and configure at least one daypart.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
