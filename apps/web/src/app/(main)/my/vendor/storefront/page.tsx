"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  ShoppingBag,
  CalendarCheck,
  Ticket,
  Coins,
  Clock,
  Phone,
  Mail,
  MapPin,
  Settings,
  ArrowRight,
  CheckCircle2,
  Package,
  CalendarDays,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EcommerceType = "products" | "bookings" | "events" | "all";

interface StoreSettings {
  businessName: string;
  description: string;
  hours: string;
  phone: string;
  email: string;
  address: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const INITIAL_SETTINGS: StoreSettings = {
  businessName: "Crown City Goods",
  description:
    "Local Fayetteville vendor offering curated products, services, and community events powered by WCCG 104.5 FM.",
  hours: "Mon-Fri 9:00 AM - 6:00 PM, Sat 10:00 AM - 4:00 PM",
  phone: "(910) 555-1234",
  email: "vendor@crowncitygoods.com",
  address: "210 Hay St, Fayetteville, NC 28301",
};

const ECOMMERCE_TYPES: {
  key: EcommerceType;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    key: "products",
    label: "Products",
    description: "Sell physical or digital products",
    icon: ShoppingBag,
  },
  {
    key: "bookings",
    label: "Bookings",
    description: "Appointments, classes & rentals",
    icon: CalendarCheck,
  },
  {
    key: "events",
    label: "Events",
    description: "Host ticketed or free events",
    icon: Ticket,
  },
  {
    key: "all",
    label: "All",
    description: "Enable every commerce type",
    icon: Sparkles,
  },
];

const STATS = [
  { label: "Total Products", value: "24", icon: Package, color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10" },
  { label: "Active Bookings", value: "8", icon: CalendarCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Upcoming Events", value: "3", icon: CalendarDays, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Token Balance", value: "1,240", icon: Coins, color: "text-purple-400", bg: "bg-purple-500/10" },
];

const QUICK_ACTIONS = [
  { href: "/my/vendor/products", label: "Manage Products", icon: ShoppingBag, bg: "bg-[#f59e0b]/10", color: "text-[#f59e0b]" },
  { href: "/my/vendor/bookings", label: "Manage Bookings", icon: CalendarCheck, bg: "bg-emerald-500/10", color: "text-emerald-400" },
  { href: "/my/vendor/events", label: "Manage Events", icon: Ticket, bg: "bg-blue-500/10", color: "text-blue-400" },
  { href: "/my/vendor/tokens", label: "Token Dashboard", icon: Coins, bg: "bg-purple-500/10", color: "text-purple-400" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StorefrontPage() {
  const [selectedTypes, setSelectedTypes] = useState<EcommerceType[]>(["all"]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(INITIAL_SETTINGS);

  function toggleType(type: EcommerceType) {
    if (type === "all") {
      setSelectedTypes(["all"]);
      return;
    }
    const filtered = selectedTypes.filter((t): t is EcommerceType => t !== "all");
    const next: EcommerceType[] = filtered.includes(type)
      ? filtered.filter((t) => t !== type)
      : [...filtered, type];
    setSelectedTypes(next.length === 0 ? ["all"] : next);
  }

  function saveSettings() {
    setSettings(settingsForm);
    setEditingSettings(false);
  }

  return (
    <div className="space-y-8">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b]/10">
              <Store className="h-7 w-7 text-[#f59e0b]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{settings.businessName}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#f59e0b]">
                  Vendor
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/my/vendor/storefront"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.06] px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/[0.1]"
          >
            <Settings className="h-4 w-4" />
            Store Settings
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{settings.description}</p>
      </div>

      {/* ── Ecommerce Type Selector ──────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Commerce Type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select what you want to sell through your storefront.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ECOMMERCE_TYPES.map(({ key, label, description, icon: Icon }) => {
            const active = selectedTypes.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`group relative rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-[#f59e0b] bg-[#f59e0b]/10"
                    : "border-border bg-card hover:border-[#f59e0b]/40"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    active ? "text-[#f59e0b]" : "text-muted-foreground"
                  }`}
                />
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </p>
                {active && (
                  <div className="absolute right-2 top-2">
                    <CheckCircle2 className="h-4 w-4 text-[#f59e0b]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Quick Stats ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Quick Stats</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className={`inline-flex rounded-xl p-2 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Store Settings ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Store Settings</h2>
          {!editingSettings && (
            <button
              onClick={() => {
                setSettingsForm(settings);
                setEditingSettings(true);
              }}
              className="rounded-xl bg-[#f59e0b]/10 px-4 py-2 text-sm font-medium text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/20"
            >
              Edit
            </button>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          {editingSettings ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settingsForm.businessName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, businessName: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.description}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Hours
                  </label>
                  <input
                    type="text"
                    value={settingsForm.hours}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, hours: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Address
                  </label>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, address: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveSettings}
                  className="rounded-xl bg-[#f59e0b] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f59e0b]/90"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSettings(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/[0.06]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Store className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="text-sm font-medium">{settings.businessName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="text-sm font-medium">{settings.hours}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{settings.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{settings.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{settings.address}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, bg, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-[#f59e0b]/40"
            >
              <div className={`rounded-xl p-2 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-sm font-medium">{label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
